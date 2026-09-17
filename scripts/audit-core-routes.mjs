import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerAllTools } from "../dist/tools/index.js";
import { extractToolCalls } from "./lib/tool-calls.mjs";
import {
  readCoreRoutes,
  findCoreRoute,
  toOpenApiPath,
  interpolationExpressions,
  expandEnumPaths,
} from "./lib/core-routes.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coreAppPath = process.env.CORE_APP_PATH || resolve(root, "../core/app.ts");
const specPath = process.env.OPENAPI_OUT || resolve(root, "../core/openapi/openapi.json");

function recordShapes() {
  const shapes = new Map();
  const server = { tool: (name, _description, shape) => shapes.set(name, shape || {}) };
  const noop = async () => ({});
  registerAllTools(server, { get: noop, post: noop, put: noop, patch: noop, delete: noop });
  return shapes;
}

function enumValues(zodType) {
  const definition = zodType?._def;
  if (!definition) return null;
  if (definition.typeName === "ZodEnum") return definition.values;
  if (definition.typeName === "ZodOptional" || definition.typeName === "ZodDefault") {
    return enumValues(definition.innerType);
  }
  return null;
}

const coreRoutes = readCoreRoutes(coreAppPath);
const shapes = recordShapes();
const tools = extractToolCalls(resolve(root, "src/tools"));

const unmatchedCalls = [];
const reachedEndpoints = new Set();

for (const tool of tools) {
  const shape = shapes.get(tool.name) || {};
  for (const call of tool.calls) {
    if (!call.path) continue;
    const candidates = expandEnumPaths(call.path, (expression) => enumValues(shape[expression]));
    const matches = candidates
      .map((candidate) => findCoreRoute(coreRoutes, call.method, candidate))
      .filter(Boolean);
    if (matches.length === 0) {
      unmatchedCalls.push({ tool: tool.name, file: tool.file, method: call.method, path: call.path });
      continue;
    }
    for (const route of matches) reachedEndpoints.add(`${route.method} ${route.path}`);
  }
}

console.log(`MCP tools:                          ${tools.length}`);
console.log(`Core app routes:                    ${coreRoutes.length}`);
console.log(`Core endpoints reached by MCP:      ${reachedEndpoints.size}`);
console.log(`Unmatched MCP Core calls:           ${unmatchedCalls.length}`);

let failed = false;

if (unmatchedCalls.length > 0) {
  failed = true;
  console.error("\nMCP tools calling an endpoint that is not mounted in Core:");
  for (const call of unmatchedCalls) {
    console.error(`- ${call.method.toUpperCase()} ${call.path} (${call.tool}, ${call.file})`);
  }
}

// The published spec must describe exactly the endpoints the MCP registry
// reaches. Drift in either direction means the documentation no longer matches
// what integrators can actually call.
if (!existsSync(specPath)) {
  // Absence is a setup condition, not a defect: the spec lives in the Core
  // repository, which may be on a branch that does not carry it yet. Drift in
  // a spec that IS present is a different matter and fails below.
  console.log(`\nOpenAPI spec not found at ${specPath}; skipping the spec sync check.`);
  console.log("Run `pnpm generate:openapi` to produce it.");
} else {
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const documented = new Set();
  for (const [path, operations] of Object.entries(spec.paths || {})) {
    for (const method of Object.keys(operations)) documented.add(`${method} ${path}`);
  }
  const reachedAsOpenApi = new Set(
    [...reachedEndpoints].map((entry) => {
      const [method, path] = entry.split(" ");
      return `${method} ${toOpenApiPath(path)}`;
    })
  );

  const missingFromSpec = [...reachedAsOpenApi].filter((entry) => !documented.has(entry)).sort();
  const extraInSpec = [...documented].filter((entry) => !reachedAsOpenApi.has(entry)).sort();

  console.log(`Endpoints documented in the spec:   ${documented.size}`);

  if (missingFromSpec.length > 0) {
    failed = true;
    console.error("\nReached by an MCP tool but missing from the OpenAPI spec:");
    for (const entry of missingFromSpec) console.error(`- ${entry}`);
  }
  if (extraInSpec.length > 0) {
    failed = true;
    console.error("\nDocumented in the OpenAPI spec but no longer reached by any MCP tool:");
    for (const entry of extraInSpec) console.error(`- ${entry}`);
  }
  if (missingFromSpec.length === 0 && extraInSpec.length === 0) {
    console.log("Spec is in sync with the MCP registry and the Core route table.");
  }
}

if (failed) process.exitCode = 1;
