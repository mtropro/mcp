import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, ok } from "./utils.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);
const channelSchema = z.enum(["email", "sms"]);
type Channel = z.infer<typeof channelSchema>;

type Message = {
  id?: string;
  conversationId: string;
  channel: Channel;
  message: string;
  sendAt: number;
  scheduleTimeZone: string;
  status?: string;
  confirmedRecipient?: string;
};

type Context = {
  conversationId: string;
  leadId: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  propertyTimeZone?: string;
  status: string;
  scheduledMessage?: Message;
};

function recipient(context: Context, channel: Channel) {
  const address = channel === "email" ? context.contactEmail : context.contactPhone;
  if (!address) throw new Error("The lead has no address for this channel.");
  return address;
}

function localTime(record: Message) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "long", timeZone: record.scheduleTimeZone }).format(record.sendAt) + " (" + record.scheduleTimeZone + ")";
}

function preview(context: Context, record: Message, cancel: boolean, address: string) {
  if (record.sendAt <= Date.now() + 300000) throw new Error("Choose a send time outside the five-minute cancellation window.");
  return [
    cancel ? "Cancel this scheduled message. MTRO will remove it from the delivery queue." : "Schedule this message. MTRO will attempt delivery at the time below.",
    "Lead: " + (context.contactName || context.leadId) + " (" + address + ")",
    "Conversation: " + context.conversationId + (record.id ? "\nMessage ID: " + record.id : ""),
    "Channel: " + record.channel.toUpperCase(),
    "Delivery time: " + localTime(record),
    "Message:\n" + record.message,
  ].join("\n");
}

async function confirm(server: McpServer, summary: string, meta?: Record<string, unknown>) {
  const reply = await server.server.elicitInput({
    mode: "form", message: summary,
    requestedSchema: { type: "object", properties: { confirm: { type: "boolean", title: "Confirm this action" } }, required: ["confirm"] },
    _meta: { correlation: meta?.correlation },
  });
  if (reply.action !== "accept" || reply.content?.confirm !== true) throw new Error("Action declined. No change was made.");
}

function receipt(saved: Message | undefined, expected: Message, status: "pending" | "cancelled") {
  if (!saved?.id || saved.status !== status || saved.conversationId !== expected.conversationId ||
      saved.channel !== expected.channel || saved.message !== expected.message || saved.sendAt !== expected.sendAt ||
      (expected.id && expected.id !== saved.id) || (expected.confirmedRecipient && expected.confirmedRecipient !== saved.confirmedRecipient)) {
    throw new Error("The saved result could not be verified. Check the conversation before trying again.");
  }
  const outcome = status === "pending" ? "Scheduled" : "Cancelled";
  const receiptText = outcome + " " + saved.channel.toUpperCase() + (saved.confirmedRecipient ? " to " + saved.confirmedRecipient : "") +
    " for " + localTime(saved) + ". Message " + saved.id + " in conversation " + saved.conversationId + " is " + saved.status + ".";
  return ok({ receipt: receiptText, ...saved });
}

export function registerScheduledMessageTools(server: McpServer, client: ApiClient) {
  server.tool("conversations_schedule_message", "Schedule one email or SMS in an open lead conversation after human confirmation. Use an exact time with an offset and the owner's IANA time zone.",
    { conversationId: id, channel: channelSchema, message: z.string().trim().min(1).max(2000), sendAt: z.iso.datetime({ offset: true }), scheduleTimeZone: z.string().min(1).max(80) },
    async ({ conversationId, channel, message, sendAt, scheduleTimeZone }, extra) => {
      try {
        const context = await client.get<Context>(`/conversations/${conversationId}/scheduling-context`);
        if (context.conversationId !== conversationId || context.status !== "open") throw new Error("Choose an open lead conversation.");
        const address = recipient(context, channel);
        const record = { conversationId, channel, message, sendAt: Date.parse(sendAt), scheduleTimeZone: context.propertyTimeZone || scheduleTimeZone, confirmedRecipient: address };
        const summary = preview(context, record, false, address);
        if (extra._meta?.previewOnly === true) return ok({ summary });
        await confirm(server, summary, extra._meta);
        const result = await client.post("/conversations/schedule-message", {
          conversationId, channel, message, sendAt: record.sendAt, scheduleTimeZone: record.scheduleTimeZone,
          schedule: "fixed_delay", scheduleFixed: { amount: 1, unit: "minute" }, channelOnly: true, confirmedRecipient: address, clientMessageId: randomUUID(),
        });
        return receipt(result.scheduledMessage, record, "pending");
      } catch (error) { return fail(error); }
    });

  server.tool("conversations_cancel_scheduled_message", "Cancel one pending lead email or SMS after human confirmation. Use its exact conversation and scheduled message IDs.",
    { conversationId: id, scheduledMessageId: id },
    async ({ conversationId, scheduledMessageId }, extra) => {
      try {
        const context = await client.get<Context>(`/conversations/${conversationId}/scheduling-context`, { scheduledMessageId });
        const record = context.scheduledMessage;
        if (!record || record.id !== scheduledMessageId || record.conversationId !== conversationId || record.status !== "pending") throw new Error("The selected pending message is unavailable.");
        const address = record.confirmedRecipient || recipient(context, record.channel);
        const summary = preview(context, record, true, address);
        if (extra._meta?.previewOnly === true) return ok({ summary });
        await confirm(server, summary, extra._meta);
        const result = await client.post("/conversations/scheduled/cancel", { scheduledMessageId, expectedSendAt: record.sendAt });
        return receipt(result.scheduledMessage, record, "cancelled");
      } catch (error) { return fail(error); }
    });
}
