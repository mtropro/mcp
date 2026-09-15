import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readRouteBodyFields } from "./lib/core-body-fields.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coreAppPath = process.env.CORE_APP_PATH || resolve(root, "../core/app.ts");
const specPath = process.env.OPENAPI_OUT || resolve(root, "../core/openapi/openapi.json");

function toExpressPath(openApiPath) {
  return openApiPath.replace(/\{([^}]+)\}/g, ":$1");
}

if (!existsSync(specPath)) {
  // Same reasoning as the route audit: a spec that is not there yet is a setup
  // condition, while a spec that documents a field Core ignores is a defect.
  console.log(`OpenAPI spec not found at ${specPath}; skipping the field check.`);
  console.log("Run `pnpm generate:openapi` to produce it.");
  process.exit(0);
}

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const byRoute = readRouteBodyFields(coreAppPath);

const problems = [];
let checked = 0;
let skippedForwarding = 0;
let skippedUnknown = 0;

for (const [path, byMethod] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(byMethod)) {
    const schema = operation.requestBody?.content?.["application/json"]?.schema;
    const documented = Object.keys(schema?.properties || {});
    if (documented.length === 0) continue;

    const route = byRoute.get(`${method} ${toExpressPath(path)}`);
    if (!route) {
      skippedUnknown += 1;
      continue;
    }
    if (route.forwards) {
      // The handler passes the body on, so a field it does not name directly
      // may still be honoured downstream. Not something to flag.
      skippedForwarding += 1;
      continue;
    }

    checked += 1;
    const unread = documented.filter((field) => !route.fields.has(field));
    if (unread.length > 0) {
      problems.push({
        endpoint: `${method.toUpperCase()} ${path}`,
        operationId: operation.operationId,
        documentedButUnread: unread,
        readByCore: [...route.fields].sort(),
      });
    }
  }
}

console.log(`Operations with a documented body:  ${checked + skippedForwarding + skippedUnknown}`);
console.log(`  verified against the handler:     ${checked}`);
console.log(`  handler forwards the whole body:  ${skippedForwarding}`);
console.log(`  handler not resolvable:           ${skippedUnknown}`);
console.log(`Operations documenting a field Core never reads: ${problems.length}`);

for (const problem of problems) {
  console.log(`\n${problem.endpoint}  (${problem.operationId})`);
  console.log(`  documented but never read: ${problem.documentedButUnread.join(", ")}`);
  console.log(`  Core reads:                ${problem.readByCore.join(", ")}`);
}

if (problems.length > 0) process.exitCode = 1;
