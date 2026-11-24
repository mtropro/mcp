import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentMcpHarness, parseTextResult } from "./support/agent-mcp-harness.mjs";

test("stdio previews, declines, schedules and cancels exactly one dated message", async () => {
  const conversationId = "a".repeat(24), id = "b".repeat(24);
  const input = { conversationId, channel: "sms", message: "Fixture only", sendAt: new Date(Date.now() + 86400000).toISOString(), scheduleTimeZone: "America/Denver" };
  const prompts = [], writes = [];
  let saved, accept = false;
  const harness = new AgentMcpHarness({
    elicit: request => {
      prompts.push(request.params.message);
      return accept ? { action: "accept", content: { confirm: true } } : { action: "decline" };
    },
    responseForRequest: ({ method, path, body }) => {
      if (method === "GET") return { conversationId, leadId: "fixture", status: "open", contactName: "Test Lead", contactPhone: "+12025550123", scheduledMessage: saved };
      writes.push(path);
      if (path === "/conversations/schedule-message") saved = { ...body, id, status: "pending" };
      else if (path === "/conversations/scheduled/cancel") saved = { ...saved, status: "cancelled" };
      return { scheduledMessage: saved };
    },
  });
  await harness.start();
  try {
    const schedule = "conversations_schedule_message", cancel = "conversations_cancel_scheduled_message";
    const preview = await harness.client.callTool({ name: schedule, arguments: input, _meta: { previewOnly: true } });
    const summary = parseTextResult(preview).summary;
    for (const field of ["Test Lead", "+12025550123", "SMS", "America/Denver", conversationId, input.message]) assert.ok(summary.includes(field));
    assert.equal(prompts.length, 0);
    assert.equal((await harness.callTool(schedule, { ...input, confirm: true })).isError, true);
    assert.deepEqual(writes, []);
    accept = true;
    assert.match(parseTextResult(await harness.callTool(schedule, input)).receipt, /pending/);
    assert.deepEqual(prompts, [summary, summary]);
    accept = false;
    const selection = { conversationId, scheduledMessageId: id };
    assert.equal((await harness.callTool(cancel, selection)).isError, true);
    assert.equal(writes.length, 1);
    accept = true;
    assert.match(parseTextResult(await harness.callTool(cancel, selection)).receipt, /cancelled/);
    assert.equal(writes.length, 2);
    assert.equal((await harness.callTool(cancel, selection)).isError, true);
    assert.equal(writes.length, 2);
  } finally { await harness.stop(); }
});
