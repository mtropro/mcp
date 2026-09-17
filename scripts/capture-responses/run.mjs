import { spawn, execFileSync } from "node:child_process";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// The Core checkout to run. Defaults to the sibling repository.
const CORE = process.env.CORE_DIR || resolve(here, "../../../core");
const PORT = Number(process.env.CAPTURE_PORT || 5601);
const BASE = `http://127.0.0.1:${PORT}`;
const DB = "mtro-openapi-capture";
const MONGO = `mongodb://127.0.0.1:27017/${DB}`;
const PASSWORD = `${process.env.SEED_SECRET || ""}Aa1!`;
const OUT = process.env.CAPTURE_OUT || resolve(here, "../../openapi/response-shapes.json");

// Mirrors tests/setup.ts: fake but present integration config, so the handlers
// take their normal paths instead of throwing on missing configuration.
const childEnv = {
  ...process.env,
  mongodb_connection: MONGO,
  PORT: String(PORT),
  NODE_ENV: "development",
  SECRET: "local-capture-secret-not-a-real-key",
  OPENAI_API_KEY: "sk-test-fake-key",
  RESEND_API_KEY: "re_test_fake_key",
  RESEND_WEBHOOK_SECRET: "whsec_test_fake_secret",
  BASE_ALIAS_DOMAIN: "test.resend.app",
  AUTOMATION_ENVIRONMENT: "dev",
  ADMIN_PANEL_URL: "http://localhost:8080",
  landing_url: "http://localhost:5002",
  platform_url: "http://localhost:8080",
  sender_host: "smtp.test.com",
  sender_port: "587",
  sender_secure: "false",
  sender_username: "test@test.com",
  sender_password: "testpass",
  sender_name: "MTROPRO Capture",
  sender_email: "capture@example.com",
  SMS_PROVIDER: "twilio",
  twilio_account_sid: "ACtest",
  twilio_auth_token: "testtoken",
  twilio_phone_number: "+10000000000",
};

function log(...args) {
  console.log(...args);
}

async function request(method, path, { token, body, query } = {}) {
  const url = new URL(BASE + path);
  for (const [key, value] of Object.entries(query || {})) url.searchParams.set(key, String(value));
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    return { status: 0, body: null, raw: "", transportError: String(error?.cause?.code || error?.message || error) };
  }
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  return { status: response.status, body: parsed, raw: text };
}

/** Infers a JSON Schema from an observed value. Only names and types are kept;
 *  no captured value ever reaches the output. */
function inferSchema(value) {
  // A single observation of null says nothing about the type, and OpenAPI 3.0
  // rejects `nullable` without one. An empty schema is the honest reading.
  if (value === null) return {};
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array", items: {} };
    return { type: "array", items: mergeSchemas(value.slice(0, 25).map(inferSchema)) };
  }
  switch (typeof value) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: Number.isInteger(value) ? "integer" : "number" };
    case "boolean":
      return { type: "boolean" };
    case "object": {
      const properties = {};
      for (const [key, item] of Object.entries(value)) properties[key] = inferSchema(item);
      return { type: "object", properties };
    }
    default:
      return {};
  }
}

function mergeSchemas(schemas) {
  const real = schemas.filter((schema) => schema && schema.type);
  if (real.length === 0) return {};
  const first = real[0];
  if (first.type !== "object") {
    const types = new Set(real.map((schema) => schema.type));
    if (types.size > 1 && types.has("integer") && types.has("number")) return { type: "number" };
    return types.size === 1 ? { ...first } : {};
  }
  const properties = {};
  for (const schema of real) {
    for (const [key, propertySchema] of Object.entries(schema.properties || {})) {
      properties[key] = properties[key] ? mergeSchemas([properties[key], propertySchema]) : propertySchema;
    }
  }
  // Required-ness is deliberately not inferred: one captured reply cannot
  // establish which fields are always present.
  return { type: "object", properties };
}

// ts-node resolves imports relative to the Core checkout, so the seed script is
// copied in for the run and removed afterwards.
const seedScript = ".capture-seed.ts";

function dropDatabase() {
  try {
    execFileSync(process.execPath, ["-e", `
      const { MongoClient } = require("${CORE}/node_modules/mongodb");
      (async () => { const c = new MongoClient("mongodb://127.0.0.1:27017"); await c.connect(); await c.db("${DB}").dropDatabase(); await c.close(); })();
    `]);
  } catch {}
}

copyFileSync(resolve(here, "seed.ts"), resolve(CORE, seedScript));

// Start from an empty database so a rerun is not tripped by its own fixtures.
dropDatabase();

// Outbound mail and SMS cannot succeed against fake credentials, and some of
// those failures surface as unhandled rejections that would take the process
// down mid-capture. Downgrading them to warnings keeps the server alive; it
// changes nothing about how Core runs in production.
const core = spawn("npx", ["ts-node", "--transpile-only", "./main.ts"], {
  cwd: CORE,
  env: { ...childEnv, NODE_OPTIONS: "--unhandled-rejections=warn" },
  stdio: ["ignore", "pipe", "pipe"],
});
let coreLog = "";
core.stdout.on("data", (chunk) => { coreLog += chunk; });
core.stderr.on("data", (chunk) => { coreLog += chunk; });

async function shutdown(code) {
  core.kill("SIGKILL");
  dropDatabase();
  try { rmSync(resolve(CORE, seedScript)); } catch {}
  process.exit(code);
}

let ready = false;
for (let attempt = 0; attempt < 90; attempt += 1) {
  await delay(1000);
  try {
    const probe = await fetch(`${BASE}/status`);
    if (probe.ok) { ready = true; break; }
  } catch {}
}
if (!ready) {
  console.error("Core did not start:\n" + coreLog.slice(-2500));
  await shutdown(1);
}
log("core is up");

const seedOutput = execFileSync("npx", ["ts-node", "--transpile-only", seedScript], {
  cwd: CORE,
  env: childEnv,
  encoding: "utf8",
});
const { entityId } = JSON.parse(seedOutput.trim().split("\n").pop());
log("database seeded, entity", entityId);

const ownerLogin = await request("POST", "/users/login", {
  body: { email: "owner@example.com", password: PASSWORD },
});
const ownerToken = ownerLogin.body?.session || ownerLogin.body?.token;
if (!ownerToken) {
  // Never print the response body: a successful login carries a session token.
  console.error("owner login failed with status", ownerLogin.status, "message:", ownerLogin.body?.message);
  await shutdown(1);
}
log("owner session established");

// --- fixtures -------------------------------------------------------------
// Synthetic records so every read endpoint returns a populated response.
// Nothing here resembles real guest data, which is the point: these shapes end
// up in public documentation.

async function create(path, body, label) {
  const response = await request("POST", path, { token: ownerToken, body });
  const failed = response.status === 0 || response.status >= 400 || response.body?.error === true;
  const reason = response.transportError || response.body?.message || response.status;
  log(`  ${failed ? "skip" : "ok  "} ${label}${failed ? ` (${reason})` : ""}`);
  if (response.transportError) log("    core log tail:", coreLog.slice(-400).replace(/\n/g, " | "));
  return failed ? null : response.body;
}

log("creating fixtures");

const property = await create("/properties/create", {
  propertyName: "Maple Street Duplex",
  address: "118 Maple Street, Dallas, TX 75201",
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1450,
  description: "Furnished three-bedroom unit close to the interstate.",
  minimumDays: 30,
}, "property");
const propertyId = property?.property?.id || property?.property?._id || property?.id;

const vendor = await create("/vendors/create", {
  name: "Lone Star Cleaning",
  role: "Cleaner",
  mobile: "+14695550111",
  email: "dispatch@lonestarcleaning.example",
}, "vendor");
const vendorId = vendor?.vendor?.id || vendor?.vendor?._id || vendor?.id;

const stage = await create("/pipeline-stages/create", {
  name: "New enquiry",
  color: "#3b82f6",
  isDefault: true,
}, "pipeline stage");
const stageId = stage?.stage?.id || stage?.stage?._id || stage?.pipelineStage?.id || stage?.id;

const guest = await create("/guests/register", {
  email: "jordan.ellis@example.com",
  name: "Jordan",
  surname: "Ellis",
  password: PASSWORD,
  mobile: "+14695550122",
}, "guest");

const lead = await create("/webhooks/create-lead", {
  tenantName: "Jordan Ellis",
  emailAddress: "jordan.ellis@example.com",
  phoneNumber: "+14695550122",
  service: "Manual",
  destination: "Dallas, TX",
  numberOfTravelers: 4,
  ...(stageId ? { stageId } : {}),
  ...(propertyId ? { propertyId } : {}),
}, "lead");
const leadId = lead?.lead?.id || lead?.lead?._id || lead?.webhook?._id || lead?.id;

const START = Date.now() + 30 * 24 * 60 * 60 * 1000;
const END = START + 90 * 24 * 60 * 60 * 1000;

const booking = propertyId
  ? await create("/bookings/create", {
      propertyId,
      startDate: START,
      endDate: END,
      guestEmail: "jordan.ellis@example.com",
      guestName: "Jordan",
      guestSurname: "Ellis",
      rate: 120,
      status: "pending",
      source: "Manual",
    }, "booking")
  : null;
const bookingId = booking?.booking?.id || booking?.booking?._id || booking?.id;

if (propertyId && vendorId) {
  await create("/tasks/create", {
    propertyId,
    vendorId,
    date: START,
    notes: "Turnover clean between stays",
    status: "pending",
  }, "task");
}

if (leadId) {
  await create("/notes/create", { entityId: leadId, entityType: "lead", text: "Called, waiting on dates." }, "note");
  await create("/reminders/create", { entityId: leadId, entityType: "lead", title: "Follow up", reminderDate: START }, "reminder");
}

await create("/message-templates/create", {
  name: "Check-in details",
  body: "Hi {{guestName}}, here are your check-in details.",
  channel: "sms",
  category: "checkin",
  entityOwner: entityId,
}, "message template");

// Ids are read back from the list endpoints rather than parsed out of each
// create response, whose envelope differs per resource.
async function firstId(path, key, method = "GET", body) {
  const response = await request(method, path, { token: ownerToken, body });
  const items = response.body?.[key];
  const first = Array.isArray(items) ? items[0] : null;
  return first?.id || first?._id || null;
}

const resolvedPropertyId = propertyId || (await firstId("/properties/get/all", "properties"));
const resolvedVendorId = vendorId || (await firstId("/vendors/get/all", "vendors"));

if (resolvedPropertyId) {
  const created = await create("/bookings/create", {
    propertyId: resolvedPropertyId,
    startDate: START,
    endDate: END,
    guestEmail: "jordan.ellis@example.com",
    guestName: "Jordan",
    guestSurname: "Ellis",
    rate: 120,
    status: "pending",
    source: "Manual",
  }, "booking (retry with resolved id)");
  if (created) log("    booking created");
}

if (resolvedPropertyId && resolvedVendorId) {
  await create("/tasks/create", {
    propertyId: resolvedPropertyId,
    vendorId: resolvedVendorId,
    date: START,
    notes: "Turnover clean between stays",
    status: "pending",
  }, "task (retry with resolved id)");
}

const resolvedBookingId = bookingId || (await firstId("/bookings/get/all", "bookings"));
const resolvedTaskId = await firstId("/tasks/get/all", "tasks");
const resolvedTemplateId = await firstId("/templates/get/all", "templates");
const resolvedGuestId = await firstId("/guests/search", "guests", "POST", {});
const resolvedLeadId = leadId || (await firstId("/webhooks/get/all", "webhooks"));
const resolvedConversationId = await firstId("/conversations/get", "conversations", "POST", {});

// --- capture --------------------------------------------------------------

const spec = JSON.parse(readFileSync(process.env.SPEC || `${CORE}/openapi/openapi.json`, "utf8"));

const substitutions = {
  entityId,
  propertyId: resolvedPropertyId,
  vendorId: resolvedVendorId,
  bookingId: resolvedBookingId,
  leadId: resolvedLeadId,
  guestId: resolvedGuestId,
  taskId: resolvedTaskId,
  templateId: resolvedTemplateId,
  conversationId: resolvedConversationId,
};

log("resolved ids: " + Object.entries({
  propertyId: resolvedPropertyId,
  vendorId: resolvedVendorId,
  bookingId: resolvedBookingId,
  leadId: resolvedLeadId,
  guestId: resolvedGuestId,
  taskId: resolvedTaskId,
  templateId: resolvedTemplateId,
  conversationId: resolvedConversationId,
}).map(([k, v]) => `${k}=${v ? "yes" : "no"}`).join(" "));

function fillPath(path) {
  const names = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  let filled = path;
  for (const name of names) {
    const value = substitutions[name];
    if (!value) return null;
    filled = filled.replace(`{${name}}`, value);
  }
  return filled;
}

const READ_POSTS = new Set(["/conversations/get", "/guests/search", "/logs/get"]);

const shapes = {};
let captured = 0;
let skipped = 0;

log("capturing responses");

for (const [path, byMethod] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(byMethod)) {
    const isRead = method === "get" || (method === "post" && READ_POSTS.has(path));
    if (!isRead) continue;

    const concrete = fillPath(path);
    if (!concrete) { skipped += 1; continue; }

    const response = await request(method.toUpperCase(), concrete, {
      token: ownerToken,
      body: method === "post" ? {} : undefined,
    });

    if (response.transportError) {
      log(`    transport error on ${method.toUpperCase()} ${concrete}: ${response.transportError}`);
    }
    if (response.status !== 200 || response.body === null || response.body?.error === true) {
      skipped += 1;
      continue;
    }

    shapes[`${method} ${path}`] = {
      operationId: operation.operationId,
      schema: inferSchema(response.body),
    };
    captured += 1;
  }
}

// Sorted so a rerun produces a readable diff rather than a reordered file.
const sorted = Object.fromEntries(Object.entries(shapes).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`);
log(`captured ${captured} response shapes, skipped ${skipped}`);
log(`written to ${OUT}`);

await shutdown(0);
