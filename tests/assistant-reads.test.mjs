import assert from "node:assert/strict";
import test from "node:test";
import { registerAllTools } from "../dist/tools/index.js";
import { assistantView, formatCents } from "../dist/tools/utils.js";

const READ_TOOLS = {
  bookings_get_guest_workflow_status: ["/bookings/guest-workflow-status/507f1f77bcf86cd799439011", { bookingId: "507f1f77bcf86cd799439011" }],
  bookings_get_lease_payment_options: ["/bookings/lease-payment-options/507f1f77bcf86cd799439011", { bookingId: "507f1f77bcf86cd799439011" }],
  bookings_get_external_calendar_status: ["/bookings/external-calendar-status/507f1f77bcf86cd799439011", { bookingId: "507f1f77bcf86cd799439011" }],
  bookings_get_survey_reviews: ["/survey-reviews/booking/507f1f77bcf86cd799439011", { bookingId: "507f1f77bcf86cd799439011" }],
  leads_get_external_reservation_candidates: ["/leads/L1/external-reservation-candidates", { leadId: "L1", query: { propertyId: "P1" } }],
  payments_autopay_get: ["/payments/autopay/G1", { groupId: "G1" }],
  payments_property_split_get: ["/payments/property-splits/P1", { propertyId: "P1" }],
  ledger_entries_list: ["/ledger-entries", {}],
  background_checks_list: ["/background-checks", {}],
  background_checks_get: ["/background-checks/BC1", { backgroundCheckId: "BC1" }],
  background_checks_options: ["/background-checks/options", {}],
  documents_list: ["/documents/list", {}],
  documents_list_for_guest: ["/documents/get/guest/G1", { guestId: "G1" }],
  smart_locks_devices_list: ["/seam/devices", {}],
  smart_locks_booking_access_list: ["/seam/booking-access", {}],
  smart_locks_device_activity: ["/seam/devices/D1/activity", { deviceId: "D1" }],
  conversations_scheduled_pending: ["/conversations/scheduled/pending", {}],
  conversations_automated: ["/conversations/automated", {}],
  communication_templates_list: ["/communication-templates", {}],
  co_hosting_portfolio: ["/co-hosting/portfolio", {}],
  co_hosting_invitations_list: ["/co-hosting/invitations", {}],
  co_hosting_property_bookings: ["/co-hosting/properties/P1/bookings", { propertyId: "P1" }],
  co_hosting_property_calendar: ["/co-hosting/properties/P1/calendar", { propertyId: "P1", query: { from: 1, to: 2 } }],
  users_my_memberships: ["/users/me/memberships", {}],
};

function harness(reply) {
  const tools = new Map();
  const calls = [];
  const record = (method) => async (path, body) => {
    calls.push({ method, path, body });
    return reply(path);
  };
  const client = { get: record("get"), post: record("post"), put: record("put"), patch: record("patch"), delete: record("delete") };
  registerAllTools({ tool: (name, _description, _shape, handler) => tools.set(name, handler) }, client);
  return { tools, calls };
}

test("formatCents renders integer cents as currency", () => {
  assert.equal(formatCents(100), "$1.00");
  assert.equal(formatCents(123456, "usd"), "$1,234.56");
  assert.equal(formatCents(500, "eur"), "€5.00");
});

test("assistantView labels cents, converts epoch timestamps and withholds secrets", () => {
  const view = assistantView(
    {
      currency: "usd",
      payments: [{ amount: 100, packagePriceCents: 4500, chargeAt: 1795046400000, dueDate: "2026-11-30" }],
      access: [{ code: "482913", status: "active", url: "https://files.example/doc.pdf", publicToken: "t", guestNotificationError: null }],
      totals: { netCents: -250 },
    },
    { centsKeys: ["amount"] }
  );
  assert.deepEqual(view.payments[0], {
    amountCents: 100,
    amountFormatted: "$1.00",
    packagePriceCents: 4500,
    packagePriceFormatted: "$45.00",
    chargeAt: "2026-11-19T00:00:00.000Z",
    dueDate: "2026-11-30",
  });
  assert.deepEqual(view.access[0], { codeWithheld: true, status: "active", urlWithheld: true, publicTokenWithheld: true, guestNotificationError: null });
  assert.equal(view.totals.netFormatted, "-$2.50");
  assert.equal(JSON.stringify(view).includes("482913"), false);
});

test("every new read tool issues exactly one GET to its Core route", async () => {
  const { tools, calls } = harness(() => ({ error: false }));
  for (const [name, [path, args]] of Object.entries(READ_TOOLS)) {
    assert.ok(tools.has(name), `${name} is registered`);
    calls.length = 0;
    const result = await tools.get(name)(args);
    assert.notEqual(result.isError, true, `${name}: ${result.content?.[0]?.text}`);
    assert.deepEqual(calls.map((call) => [call.method, call.path]), [["get", path]], name);
  }
});

test("smart lock and document reads never return codes or file links", async () => {
  const { tools } = harness((path) =>
    path === "/seam/booking-access"
      ? { access: [{ id: "A1", code: "771122", status: "active", startsAt: 1795046400000 }], taskAccess: [], error: false }
      : { documents: [{ id: "D1", originalName: "id.pdf", fileUrl: "s3://bucket/id.pdf", url: "https://signed.example/id.pdf?sig=1" }], error: false }
  );
  const access = await tools.get("smart_locks_booking_access_list")({});
  assert.equal(access.content[0].text.includes("771122"), false);
  assert.match(access.content[0].text, /"codeWithheld": true/);
  const documents = await tools.get("documents_list")({});
  assert.equal(/signed\.example|s3:\/\//.test(documents.content[0].text), false);
  assert.match(documents.content[0].text, /"originalName": "id.pdf"/);
});

test("ledger and autopay amounts are explicit cents with a formatted dollar value", async () => {
  const { tools } = harness((path) =>
    path === "/ledger-entries"
      ? { rows: [{ amount: 100, direction: "income" }], totals: { incomeCents: 100, expenseCents: 0, netCents: 100 }, error: false }
      : { id: "G1", currency: "usd", installments: [{ amount: 125000, maximumAmount: 128625, chargeAt: 1795046400000 }], error: false }
  );
  const ledger = JSON.parse((await tools.get("ledger_entries_list")({})).content[0].text);
  assert.deepEqual(ledger.rows[0], { amountCents: 100, amountFormatted: "$1.00", direction: "income" });
  assert.equal(ledger.totals.netFormatted, "$1.00");
  const autopay = JSON.parse((await tools.get("payments_autopay_get")({ groupId: "G1" })).content[0].text);
  assert.equal(autopay.installments[0].amountFormatted, "$1,250.00");
  assert.equal(autopay.installments[0].maximumAmountFormatted, "$1,286.25");
});

test("leads_count stays out of the registry: Core serves it to platform admins only", () => {
  const { tools } = harness(() => ({}));
  assert.equal(tools.has("leads_count"), false);
});
