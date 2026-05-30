import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coreAppPath = process.env.CORE_APP_PATH || resolve(root, "../core/app.ts");
const toolsDir = resolve(root, "src/tools");

function listTsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(full);
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

function normalize(path) {
  return path.replace(/\$\{[^}]+}/g, ":param");
}

function parts(path) {
  return path.split("/").filter(Boolean);
}

function routeMatches(call, route) {
  const callParts = parts(call.path);
  const routeParts = parts(route.path);
  return (
    call.method === route.method &&
    callParts.length === routeParts.length &&
    callParts.every((part, index) => {
      const routePart = routeParts[index];
      return part === routePart || part.startsWith(":") || routePart.startsWith(":");
    })
  );
}

const coreApp = readFileSync(coreAppPath, "utf8");
const coreRoutes = [...coreApp.matchAll(/app\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g)]
  .map((match) => ({ method: match[1], path: match[2] }))
  .sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));

const toolFiles = listTsFiles(toolsDir);
const toolNames = [];
const coreCalls = [];
for (const file of toolFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/server\.tool\(\s*"([^"]+)"/g)) {
    toolNames.push(match[1]);
  }
  for (const match of source.matchAll(/client\.(get|post|patch|delete)\((`([^`]+)`|"([^"]+)")/g)) {
    coreCalls.push({
      method: match[1],
      path: normalize(match[3] || match[4]),
      file: file.replace(`${root}/`, ""),
    });
  }
}

const unmatchedCalls = coreCalls.filter((call) => !coreRoutes.some((route) => routeMatches(call, route)));
const coveredRoutes = coreRoutes.filter((route) => coreCalls.some((call) => routeMatches(call, route)));

console.log(`MCP tools: ${toolNames.length}`);
console.log(`MCP Core calls: ${coreCalls.length}`);
console.log(`Core app routes: ${coreRoutes.length}`);
console.log(`Core routes directly covered by MCP calls: ${coveredRoutes.length}`);
console.log(`Unmatched MCP Core calls: ${unmatchedCalls.length}`);

if (unmatchedCalls.length > 0) {
  for (const call of unmatchedCalls) {
    console.error(`- ${call.method.toUpperCase()} ${call.path} (${call.file})`);
  }
  process.exitCode = 1;
}
