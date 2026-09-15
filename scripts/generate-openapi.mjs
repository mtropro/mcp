import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { registerAllTools } from "../dist/tools/index.js";
import { extractToolCalls } from "./lib/tool-calls.mjs";
import {
  readCoreRoutes,
  findCoreRoute,
  pathParameterNames,
  toOpenApiPath,
  interpolationExpressions,
  expandEnumPaths,
} from "./lib/core-routes.mjs";
import { readRouteScopes } from "./lib/core-scopes.mjs";
import { readRouteBodyFields } from "./lib/core-body-fields.mjs";
import { readUploadRoutes } from "./lib/core-uploads.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coreAppPath = process.env.CORE_APP_PATH || resolve(root, "../core/app.ts");
const accessControlPath =
  process.env.CORE_ACCESS_CONTROL_PATH || resolve(root, "../core/libs/access-control.ts");
const outputPath = process.env.OPENAPI_OUT || resolve(root, "../core/openapi/openapi.json");
const reportPath = process.env.OPENAPI_REPORT || resolve(root, "openapi/generation-report.json");

const TAG_TITLES = {
  "admin.ts": "Admin utilities",
  "bookings.ts": "Bookings",
  "campaigns.ts": "Campaigns",
  "conversations.ts": "Conversations",
  "entities.ts": "Entities",
  "guests.ts": "Guests",
  "import-jobs.ts": "Import jobs",
  "inventory.ts": "Inventory",
  "leads.ts": "Leads",
  "message-templates.ts": "Message templates",
  "notes.ts": "Notes",
  "notifications.ts": "Notifications",
  "payments.ts": "Payments",
  "pipeline-stages.ts": "Pipeline stages",
  "polls.ts": "Polls",
  "properties.ts": "Properties",
  "reminders.ts": "Reminders",
  "report-widgets.ts": "Report widgets",
  "reports.ts": "Reports",
  "subscriptions.ts": "Subscriptions",
  "tasks.ts": "Tasks",
  "templates.ts": "Templates",
  "users.ts": "Users",
  "vendors.ts": "Vendors",
};

const TAG_DESCRIPTIONS = {
  "Admin utilities": "API keys, custom fields, activity logs, and navigation counters.",
  Bookings: "Reservations and date blocks, from availability checks to lease signing.",
  Campaigns: "Bulk notification campaigns.",
  Conversations: "Guest and owner messaging across SMS, email, and in-app channels.",
  Entities: "The organizations a user belongs to. Every other resource is scoped to one.",
  Guests: "Guest records and their contact details.",
  "Import jobs": "Bulk imports, including Furnished Finder scraping runs.",
  Inventory: "Per-property inventory items and the shared catalog.",
  Leads: "Inbound rental enquiries and their pipeline stage. Note that these endpoints are mounted under `/webhooks`, alongside unrelated provider callbacks.",
  "Message templates": "Reusable message bodies for conversations.",
  Notes: "Free-form notes attached to a lead or a booking.",
  Notifications: "In-app notifications and transactional email sends.",
  Payments: "One-off and recurring payments, including Stripe checkout links.",
  "Pipeline stages": "The configurable stages a lead moves through.",
  Polls: "Owner polls and their results.",
  Properties: "Rental properties, their rates, availability, and public listings.",
  Reminders: "Scheduled reminders attached to a lead or a booking.",
  "Report widgets": "Configurable dashboard widgets and their data.",
  Reports: "Aggregate reporting across properties and bookings.",
  Subscriptions: "Platform subscription plans and billing state.",
  Tasks: "Maintenance and operational tasks, optionally assigned to a vendor.",
  Templates: "Lease and document templates, including rendering and generation.",
  Users: "The authenticated principal behind the API key.",
  Vendors: "Service providers that tasks can be assigned to.",
};

function recordMcpTools() {
  const tools = new Map();
  const server = {
    tool(name, description, shape) {
      tools.set(name, { name, description, shape: shape || {} });
    },
  };
  const noop = async () => ({});
  registerAllTools(server, { get: noop, post: noop, put: noop, patch: noop, delete: noop });
  return tools;
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

function jsonSchemaFor(zodType) {
  const schema = zodToJsonSchema(zodType, { target: "openApi3", $refStrategy: "none" });
  delete schema.$schema;
  return schema;
}

function objectSchemaFrom(shape, omit = []) {
  const kept = Object.fromEntries(Object.entries(shape).filter(([key]) => !omit.includes(key)));
  if (Object.keys(kept).length === 0) return null;
  return jsonSchemaFor(z.object(kept));
}

function isOpaqueSchema(schema) {
  if (!schema || schema.type !== "object") return false;
  return Object.keys(schema.properties || {}).length === 0;
}

/**
 * Passthrough tools declare their body as an untyped record, which tells an
 * integrator nothing about what to send. The Core handler does know: the fields
 * it reads off `req.body` are the real contract. Types and descriptions are not
 * recoverable this way, but field names are the part a caller cannot guess.
 */
function schemaFromCoreFields(route, pathParameterNames) {
  if (!route || route.fields.size === 0) return null;
  const names = [...route.fields]
    .filter((field) => !pathParameterNames.includes(field))
    .sort();
  if (names.length === 0) return null;
  return {
    type: "object",
    description: route.forwards
      ? "Field names are taken from the Core handler. It also passes the body on " +
        "to internal helpers, so it may accept fields beyond those listed here. " +
        "Types are not yet documented."
      : "Field names are taken from the Core handler, which reads exactly these. " +
        "Types and which of them are required are not yet documented.",
    properties: Object.fromEntries(names.map((name) => [name, {}])),
    additionalProperties: true,
    "x-mtro-fields-source": "core-handler",
  };
}

/**
 * The literal that an expanded enum path contributed, used to keep one
 * operationId per endpoint when a single tool covers several routes.
 */
function enumDiscriminator(templatePath, concretePath) {
  const templateSegments = templatePath.split("/");
  const concreteSegments = concretePath.split("/");
  for (let index = 0; index < templateSegments.length; index += 1) {
    if (templateSegments[index] !== concreteSegments[index] && !concreteSegments[index]?.startsWith("${")) {
      return concreteSegments[index];
    }
  }
  return null;
}

function summaryOf(description) {
  if (!description) return undefined;
  const sentence = description.split(/(?<=\.)\s/)[0];
  return sentence.length > 120 ? `${sentence.slice(0, 117)}...` : sentence;
}

/**
 * `paymentRef` / `bookingRef` are MCP conveniences: the tool resolves them to a
 * real ObjectId before calling Core, so they must not appear in the HTTP
 * contract alongside the id they resolve to.
 */
function mcpOnlyRefKeys(shape) {
  return Object.keys(shape).filter(
    (key) => key.endsWith("Ref") && Object.hasOwn(shape, `${key.slice(0, -3)}Id`)
  );
}

function buildRequestSchema(call, shape, reservedKeys, report, toolName) {
  switch (call.payload.kind) {
    case "none":
      return null;
    case "whole-input":
      return objectSchemaFrom(shape, reservedKeys);
    case "input-key": {
      const zodType = shape[call.payload.key];
      return zodType ? jsonSchemaFor(zodType) : null;
    }
    case "object": {
      const literalKeys = call.payload.keys.filter((key) => !key.startsWith("..."));
      const known = literalKeys.filter((key) => Object.hasOwn(shape, key));
      if (known.length !== literalKeys.length) {
        report.needsManualPayloadMapping.push({
          tool: toolName,
          unresolvedKeys: literalKeys.filter((key) => !known.includes(key)),
        });
      }
      if (known.length === 0) return null;
      return objectSchemaFrom(
        Object.fromEntries(known.map((key) => [key, shape[key]])),
        reservedKeys
      );
    }
    default:
      report.needsManualPayloadMapping.push({ tool: toolName, payload: call.payload });
      return null;
  }
}

function main() {
  const coreRoutes = readCoreRoutes(coreAppPath);
  const { scopes, accessActions } = readRouteScopes(coreAppPath, accessControlPath);
  const bodyFields = readRouteBodyFields(coreAppPath);
  const uploadRoutes = readUploadRoutes(coreAppPath);
  const recorded = recordMcpTools();
  const extracted = extractToolCalls(resolve(root, "src/tools"));

  const report = {
    source: { coreAppPath, mcpTools: recorded.size, coreRoutes: coreRoutes.length },
    operations: 0,
    unmatchedToolCalls: [],
    sharedEndpoints: [],
    multipartEndpoints: [],
    requestSchemaFromCoreHandler: [],
    needsManualRequestSchema: [],
    needsManualPayloadMapping: [],
    operationsWithoutScope: [],
  };

  // Group by Core endpoint: several MCP tools can be convenience wrappers over
  // the same route, and one tool can call more than one route.
  const endpoints = new Map();

  for (const tool of extracted) {
    const meta = recorded.get(tool.name);
    if (!meta) continue;

    for (const call of tool.calls) {
      if (!call.path) continue;

      const enumKeys = interpolationExpressions(call.path).filter((expression) =>
        enumValues(meta.shape[expression])
      );
      const candidates = expandEnumPaths(call.path, (expression) =>
        enumValues(meta.shape[expression])
      );

      let matched = false;
      for (const candidate of candidates) {
        const route = findCoreRoute(coreRoutes, call.method, candidate);
        if (!route) continue;
        matched = true;
        const key = `${call.method} ${route.path}`;
        const entry = endpoints.get(key) || { route, method: call.method, tools: [] };
        // An expanded enum path needs a distinct operationId, since one tool
        // then documents more than one endpoint.
        const discriminator = candidates.length > 1 ? enumDiscriminator(call.path, candidate) : null;
        entry.tools.push({ tool, meta, call, enumKeys, discriminator });
        endpoints.set(key, entry);
      }
      if (!matched) {
        report.unmatchedToolCalls.push({ tool: tool.name, method: call.method, path: call.path });
      }
    }
  }

  const paths = {};
  const tagSet = new Set();

  for (const [key, endpoint] of [...endpoints.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const { route, method } = endpoint;
    const parameterNames = pathParameterNames(route.path);

    const built = endpoint.tools.map(({ tool, meta, call, enumKeys, discriminator }) => {
      const reservedKeys = [...parameterNames, ...enumKeys, ...mcpOnlyRefKeys(meta.shape)];
      return {
        tool,
        meta,
        call,
        discriminator,
        reservedKeys,
        schema: buildRequestSchema(call, meta.shape, reservedKeys, report, tool.name),
      };
    });

    // When several tools share an endpoint, the single-purpose tool describes
    // it better than a wrapper that dispatches across several routes, and a
    // real schema beats a passthrough.
    const primary = [...built].sort((a, b) => {
      const calls = a.tool.calls.length - b.tool.calls.length;
      if (calls !== 0) return calls;
      const schema =
        Number(Boolean(b.schema && !isOpaqueSchema(b.schema))) -
        Number(Boolean(a.schema && !isOpaqueSchema(a.schema)));
      if (schema !== 0) return schema;
      return a.tool.name.localeCompare(b.tool.name);
    })[0];

    if (built.length > 1) {
      report.sharedEndpoints.push({
        endpoint: key,
        tools: built.map((candidate) => candidate.tool.name).sort(),
        documentedFrom: primary.tool.name,
      });
    }

    const tag = TAG_TITLES[primary.tool.file] || primary.tool.file.replace(/\.ts$/, "");
    tagSet.add(tag);

    const parameters = parameterNames.map((name) => {
      const zodType = primary.meta.shape[name];
      const schema = zodType ? jsonSchemaFor(zodType) : { type: "string" };
      const { description, ...rest } = schema;
      return { name, in: "path", required: true, description: description || undefined, schema: rest };
    });

    const usesQuery = method === "get";
    if (primary.schema && usesQuery && primary.schema.properties) {
      for (const [name, schema] of Object.entries(primary.schema.properties)) {
        const { description, ...rest } = schema;
        parameters.push({
          name,
          in: "query",
          required: (primary.schema.required || []).includes(name),
          description: description || undefined,
          schema: rest,
        });
      }
    }

    const routeScopes = scopes.get(key);
    if (!routeScopes) report.operationsWithoutScope.push({ endpoint: key, tool: primary.tool.name });

    const upload = uploadRoutes.get(key);
    if (upload) report.multipartEndpoints.push({ endpoint: key, field: upload.field });

    if (!upload && primary.schema && isOpaqueSchema(primary.schema)) {
      const recovered = schemaFromCoreFields(bodyFields.get(key), parameterNames);
      if (recovered) {
        primary.schema = recovered;
        report.requestSchemaFromCoreHandler.push({ endpoint: key, tool: primary.tool.name });
      } else {
        report.needsManualRequestSchema.push({ endpoint: key, tool: primary.tool.name });
      }
    }

    const operation = {
      operationId: primary.discriminator
        ? `${primary.tool.name}_${primary.discriminator}`
        : primary.tool.name,
      tags: [tag],
      summary: summaryOf(primary.meta.description),
      description: primary.meta.description,
      parameters: parameters.length > 0 ? parameters : undefined,
      responses: {
        200: {
          description: "Successful response.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SuccessEnvelope" } },
          },
        },
        401: {
          description: "Missing, invalid, expired, or revoked API key.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
          },
        },
        403: {
          description: "The API key is valid but lacks the required scope.",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
          },
        },
      },
    };

    if (routeScopes) operation["x-mtro-scopes"] = routeScopes;
    operation["x-mtro-mcp-tools"] = built.map((candidate) => candidate.tool.name).sort();

    if (upload) {
      const fileSchema = upload.multiple
        ? { type: "array", items: { type: "string", format: "binary" }, maxItems: upload.maxCount || undefined }
        : { type: "string", format: "binary" };
      operation.requestBody = {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: { [upload.field]: fileSchema },
              required: [upload.field],
            },
          },
        },
      };
    } else if (primary.schema && !usesQuery) {
      operation.requestBody = {
        required: !isOpaqueSchema(primary.schema),
        content: { "application/json": { schema: primary.schema } },
      };
    }

    const openApiPath = toOpenApiPath(route.path);
    paths[openApiPath] = paths[openApiPath] || {};
    paths[openApiPath][method] = operation;
    report.operations += 1;
  }

  const document = {
    openapi: "3.0.3",
    info: {
      title: "MTRO PRO API",
      version: "1.0.0",
      description: [
        "HTTP API for the MTRO PRO property management platform.",
        "",
        "Authenticate every request with an API key issued from the admin panel:",
        "`Authorization: Bearer mtro_...`. Each key carries a set of scopes, and the",
        "scope an operation requires is listed under `x-mtro-scopes`.",
        "",
        "This document covers the endpoints exposed for external integrations. It is",
        "generated from the MTRO PRO MCP tool registry and the Core route table, so",
        "every documented operation corresponds to a mounted endpoint.",
      ].join("\n"),
    },
    servers: [
      { url: "https://core.mtro.app", description: "Production" },
      { url: "https://dev.core.mtro.app", description: "Development" },
    ],
    tags: [...tagSet]
      .sort()
      .map((name) => ({ name, description: TAG_DESCRIPTIONS[name] })),
    paths: Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: [
            "An MTRO PRO API key, prefixed with `mtro_`. Generate one in the admin",
            "panel under Settings, or with `POST /api-keys/generate` using a key that",
            "already holds the `api_keys.manage` scope.",
          ].join("\n"),
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: "object",
          description: [
            "Successful responses are plain JSON objects. The payload key varies by",
            "endpoint (`property`, `properties`, `booking`, and so on).",
          ].join("\n"),
          additionalProperties: true,
        },
        ErrorResponse: {
          type: "object",
          description: [
            "The error envelope. Core returns some errors with HTTP 200 and",
            "`error: true` in the body, so clients must check this field rather than",
            "relying on the status code alone.",
          ].join("\n"),
          properties: {
            error: { type: "boolean", enum: [true] },
            message: { type: "string" },
          },
          required: ["error", "message"],
        },
      },
    },
    security: [{ bearerAuth: [] }],
    "x-mtro-scopes-available": accessActions,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`MCP tools:                     ${recorded.size}`);
  console.log(`Core routes:                   ${coreRoutes.length}`);
  console.log(`Documented operations:         ${report.operations}`);
  console.log(`With a scope from Core:        ${report.operations - report.operationsWithoutScope.length}`);
  console.log(`Body fields from the handler:  ${report.requestSchemaFromCoreHandler.length}`);
  console.log(`Multipart upload endpoints:    ${report.multipartEndpoints.length}`);
  console.log(`Still needing a request schema:${String(report.needsManualRequestSchema.length).padStart(4)}`);
  console.log(`Endpoints shared by tools:     ${report.sharedEndpoints.length}`);
  console.log(`Unmatched tool calls:          ${report.unmatchedToolCalls.length}`);
  console.log(`Spec:   ${outputPath}`);
  console.log(`Report: ${reportPath}`);
}

main();
