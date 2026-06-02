import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { AgentMcpHarness, parseTextResult } from "./support/agent-mcp-harness.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("agent harness lists and calls MCP tools through stdio against mocked Core", async () => {
  const harness = new AgentMcpHarness();
  await harness.start();

  try {
    const list = await harness.listTools();
    const toolNames = list.tools.map((tool) => tool.name);
    assert.equal(new Set(toolNames).size, toolNames.length);
    assert.ok(toolNames.length >= 170);
    assert.ok(toolNames.includes("payments_list"));
    assert.ok(toolNames.includes("inventory_update_item"));
    assert.ok(toolNames.includes("conversations_send_message"));
    assert.ok(toolNames.includes("stripe_accounts_delete"));

    const whoami = parseTextResult(await harness.callTool("whoami"));
    const whoamiRequest = harness.lastRequest();
    assert.equal(whoami.email, "owner@example.com");
    assert.equal(whoamiRequest.method, "GET");
    assert.equal(whoamiRequest.path, "/users/get");
    assert.equal(whoamiRequest.headers.authorization, "Bearer mtro_test_key");

    const payments = parseTextResult(
      await harness.callTool("payments_list", { query: { status: "pending", limit: 5 } }),
    );
    assert.equal(payments.request.method, "GET");
    assert.equal(payments.request.path, "/payments/list");
    assert.deepEqual(payments.request.searchParams, { status: "pending", limit: "5" });

    const inventory = parseTextResult(
      await harness.callTool("inventory_update_item", {
        propertyId: "property_1",
        itemId: "item_1",
        payload: { quantity: 2, notes: "Restocked" },
      }),
    );
    assert.equal(inventory.request.method, "PATCH");
    assert.equal(inventory.request.path, "/inventory/property_1/items/item_1");
    assert.deepEqual(inventory.request.body, { quantity: 2, notes: "Restocked" });

    const stripeDelete = parseTextResult(
      await harness.callTool("stripe_accounts_delete", { accountId: "stripe_account_1" }),
    );
    assert.equal(stripeDelete.request.method, "DELETE");
    assert.equal(stripeDelete.request.path, "/payments/stripe/accounts/stripe_account_1");
  } finally {
    await harness.stop();
  }
});

test("MCP list tools expose simple refs that write tools can resolve", async () => {
  const harness = new AgentMcpHarness({
    responseForRequest(request) {
      if (request.path === "/bookings/get/all") {
        return {
          error: false,
          bookings: [
            {
              id: "aaaaaaaaaaaaaaaaaaaaaaaa",
              status: "pending",
              guest: { name: "Ada", surname: "Lovelace" },
              property: { propertyName: "Main House" },
              startDate: 1780264800000,
              endDate: 1780351200000,
              rate: 100,
            },
          ],
        };
      }
      if (request.path === "/payments/list") {
        return {
          error: false,
          payments: [
            {
              id: "bbbbbbbbbbbbbbbbbbbbbbbb",
              status: "overdue",
              name: "Initial deposit",
              amount: 100000,
              bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa",
            },
          ],
        };
      }
      return { error: false, request };
    },
  });
  await harness.start();

  try {
    const bookings = parseTextResult(await harness.callTool("bookings_list"));
    assert.equal(bookings.bookings[0].bookingRef, "B001");
    assert.equal(bookings.bookings[0].guestName, "Ada Lovelace");
    assert.equal(bookings.bookings[0].idHint, "aaaaaa");
    assert.equal(bookings.bookings[0].id, undefined);

    await harness.callTool("bookings_update", {
      bookingRef: "B001",
      status: "confirmed",
    });
    const bookingUpdate = harness.lastRequest();
    assert.equal(bookingUpdate.path, "/bookings/update/aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.deepEqual(bookingUpdate.body, { status: "confirmed" });

    const payments = parseTextResult(await harness.callTool("payments_list"));
    assert.equal(payments.payments[0].paymentRef, "PAY001");
    assert.equal(payments.payments[0].idHint, "bbbbbb");
    assert.equal(payments.payments[0].id, undefined);

    await harness.callTool("payments_send_reminder", {
      paymentRef: "PAY001",
      customMessage: "Please pay.",
    });
    const paymentReminder = harness.lastRequest();
    assert.equal(paymentReminder.path, "/payments/send-reminder/bbbbbbbbbbbbbbbbbbbbbbbb");
    assert.deepEqual(paymentReminder.body, { customMessage: "Please pay." });
  } finally {
    await harness.stop();
  }
});

test("MCP Core route audit has no missing endpoints", () => {
  const output = execFileSync(process.execPath, ["scripts/audit-core-routes.mjs"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  assert.match(output, /Unmatched MCP Core calls: 0/);
});
