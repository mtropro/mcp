import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { anyPayload, fail, ok } from "./utils.js";

export function registerConversationTools(server: McpServer, client: ApiClient) {
  server.tool(
    "conversations_list",
    "List owner conversations. Supports Core /conversations/get filters through payload.",
    { payload: anyPayload },
    async ({ payload }) => {
      try {
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
    "Send a message through email/SMS/WhatsApp/in-app channels. This sends external communication and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /conversations/send-message request body.") },
    async ({ payload }) => {
      try {
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
