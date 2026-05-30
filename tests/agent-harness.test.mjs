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

test("MCP Core route audit has no missing endpoints", () => {
  const output = execFileSync(process.execPath, ["scripts/audit-core-routes.mjs"], {
    cwd: rootDir,
    encoding: "utf8",
  });
  assert.match(output, /Unmatched MCP Core calls: 0/);
});
