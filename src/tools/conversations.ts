import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { anyPayload, fail, ok } from "./utils.js";
import { resolveRef } from "./refs.js";

export function registerConversationTools(server: McpServer, client: ApiClient) {
  server.tool(
    "conversations_list",
    "List owner conversations. Supports Core /conversations/get filters through payload. For a booking, pass payload.bookingRef or payload.bookingId to return the booking conversation directly.",
    { payload: anyPayload },
    async ({ payload }) => {
      try {
        const bookingId = resolveBookingIdFromPayload(payload);
        if (bookingId) {
          return ok(await client.get(`/conversations/get/entity/${bookingId}`, {
            entityType: "booking",
            conversationScope: stringValue(payload?.conversationScope) || "guest",
          }));
        }
        return ok(await client.post("/conversations/get", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_get",
    "Get a conversation by ID, including messages.",
    { conversationId: z.string().describe("Conversation ID.") },
    async ({ conversationId }) => {
      try {
        return ok(await client.get(`/conversations/get/${conversationId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_get_by_entity",
    "Get conversations for an entity.",
    { entityId: z.string().describe("Entity ID.") },
    async ({ entityId }) => {
      try {
        return ok(await client.get(`/conversations/get/entity/${entityId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_create",
    "Create a conversation. This may start guest-facing communication and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /conversations/create request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/conversations/create", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_add_message",
    "Add an internal/in-app conversation message. External delivery should use conversations_send_message and require owner confirmation.",
    { payload: z.record(z.any()).describe("Core /conversations/add-message request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/conversations/add-message", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_send_message",
    [
      "Send a message through email or SMS. This sends external communication and should require owner confirmation when used by an agent.",
      "Required final Core payload is conversationId, channel, and message.",
      "Convenience: instead of conversationId, pass bookingRef or bookingId and the MCP will find or create the booking guest conversation first.",
    ].join(" "),
    {
      conversationId: z.string().optional().describe("Conversation ID. Preferred when already known."),
      bookingRef: z.string().optional().describe("Simple booking ref returned by bookings_list, e.g. B017."),
      bookingId: z.string().optional().describe("Raw booking ObjectId. Use only if already known."),
      channel: z.enum(["email", "sms"]).optional().describe("External channel. Use email unless the owner requested SMS."),
      message: z.string().optional().describe("Message body to send."),
      attachments: z.array(z.record(z.any())).optional().describe("Optional uploaded conversation attachments."),
      payload: z.record(z.any()).optional().describe("Backward-compatible payload. May include conversationId, bookingRef, bookingId, channel, message, or attachments."),
    },
    async (input) => {
      try {
        const payload = await normalizeSendMessagePayload(client, input);
        return ok(await client.post("/conversations/send-message", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_update",
    "Update conversation metadata or status. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /conversations/update request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/conversations/update", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_mark_read",
    "Mark a conversation read.",
    { conversationId: z.string().describe("Conversation ID.") },
    async ({ conversationId }) => {
      try {
        return ok(await client.post(`/conversations/mark-read/${conversationId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_mark_unread",
    "Mark a conversation unread.",
    { conversationId: z.string().describe("Conversation ID.") },
    async ({ conversationId }) => {
      try {
        return ok(await client.post(`/conversations/mark-unread/${conversationId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_retry_message",
    "Retry delivery of a failed conversation message. This may send external communication and should require owner confirmation when used by an agent.",
    {
      conversationId: z.string().describe("Conversation ID."),
      messageId: z.string().describe("Message ID."),
    },
    async ({ conversationId, messageId }) => {
      try {
        return ok(await client.post(`/conversations/retry-message/${conversationId}/${messageId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_edit_message",
    "Edit an owner-authored message. This writes account data and should require owner confirmation when used by an agent.",
    {
      conversationId: z.string().describe("Conversation ID."),
      messageId: z.string().describe("Message ID."),
      payload: z.record(z.any()).describe("Message edit body."),
    },
    async ({ conversationId, messageId, payload }) => {
      try {
        return ok(await client.post(`/conversations/edit-message/${conversationId}/${messageId}`, payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_delete_message",
    "Delete an owner-authored message. This is destructive and should require owner confirmation when used by an agent.",
    {
      conversationId: z.string().describe("Conversation ID."),
      messageId: z.string().describe("Message ID."),
    },
    async ({ conversationId, messageId }) => {
      try {
        return ok(await client.post(`/conversations/delete-message/${conversationId}/${messageId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );
}

type SendMessageInput = {
  conversationId?: string;
  bookingRef?: string;
  bookingId?: string;
  channel?: "email" | "sms";
  message?: string;
  attachments?: Record<string, any>[];
  payload?: Record<string, any>;
};

async function normalizeSendMessagePayload(client: ApiClient, input: SendMessageInput) {
  const raw = input.payload || {};
  const message =
    stringValue(input.message) ||
    stringValue(raw.message) ||
    stringValue(raw.body) ||
    stringValue(raw.text);
  const channel = stringValue(input.channel) || stringValue(raw.channel) || "email";
  const attachments = input.attachments || (Array.isArray(raw.attachments) ? raw.attachments : undefined);
  const conversationId =
    stringValue(input.conversationId) ||
    stringValue(raw.conversationId) ||
    await resolveBookingConversationId(client, input, raw);

  if (!conversationId) {
    throw new Error("conversationId is required unless bookingRef or bookingId is provided.");
  }
  if (!message) {
    throw new Error("message is required.");
  }
  if (channel !== "email" && channel !== "sms") {
    throw new Error("channel must be email or sms.");
  }

  return {
    conversationId,
    channel,
    message,
    ...(attachments ? { attachments } : {}),
  };
}

async function resolveBookingConversationId(
  client: ApiClient,
  input: SendMessageInput,
  raw: Record<string, any>,
): Promise<string | undefined> {
  const bookingId = resolveBookingIdFromPayload({
    bookingRef: input.bookingRef || raw.bookingRef,
    bookingId: input.bookingId || raw.bookingId,
    entityId: raw.entityType === "booking" ? raw.entityId : undefined,
  });
  if (!bookingId) return undefined;

  const existing = await client.get<any>(`/conversations/get/entity/${bookingId}`, {
    entityType: "booking",
    conversationScope: stringValue(raw.conversationScope) || "guest",
  });
  const firstConversation = existing?.conversations?.[0];
  if (firstConversation?.id) return firstConversation.id;

  const bookingResponse = await client.get<any>(`/bookings/get/${bookingId}`);
  const booking = bookingResponse?.booking || bookingResponse;
  const guestId = stringValue(booking?.guestId);
  if (!guestId) {
    throw new Error("Cannot create a booking conversation without a guestId.");
  }

  const created = await client.post<any>("/conversations/create", {
    entityId: bookingId,
    entityType: "booking",
    conversationScope: stringValue(raw.conversationScope) || "guest",
    guestId,
    subject: stringValue(raw.subject) || stringValue(booking?.source) || "Booking follow-up",
  });
  const conversationId = created?.conversation?.id;
  if (!conversationId) {
    throw new Error("Could not create booking conversation.");
  }
  return conversationId;
}

function resolveBookingIdFromPayload(payload: any): string | undefined {
  const bookingRef = stringValue(payload?.bookingRef);
  const bookingId = stringValue(payload?.bookingId);
  const entityId = payload?.entityType === "booking" ? stringValue(payload?.entityId) : undefined;
  const value = bookingRef || bookingId || entityId;
  if (!value) return undefined;
  return resolveRef("booking", value, "bookingRef");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
