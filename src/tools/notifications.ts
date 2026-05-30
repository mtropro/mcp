import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerNotificationTools(server: McpServer, client: ApiClient) {
  server.tool(
    "notifications_list",
    "List your notifications. Supports pagination and filtering for unread only.",
    {
      limit: z.number().optional().describe("Number of notifications to return (default 50)"),
      skip: z.number().optional().describe("Number of notifications to skip for pagination (default 0)"),
      unreadOnly: z.boolean().optional().describe("Only return unread notifications"),
    },
    async (params) => {
      try {
        const data = await client.get("/notifications/get", params);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "notifications_unread_count",
    "Get the count of unread notifications.",
    {},
    async () => {
      try {
        const data = await client.get("/notifications/unread-count");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "notifications_mark_read",
    "Mark a specific notification as read.",
    { notificationId: z.string().describe("The notification ID to mark as read") },
    async ({ notificationId }) => {
      try {
        const data = await client.post("/notifications/mark-read", { notificationId });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "notifications_mark_all_read",
    "Mark all notifications as read.",
    {},
    async () => {
      try {
        const data = await client.post("/notifications/mark-all-read");
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "notifications_delete",
    "Delete a notification. This is destructive and should require owner confirmation when used by an agent.",
    { notificationId: z.string().describe("The notification ID to delete") },
    async ({ notificationId }) => {
      try {
        const data = await client.post("/notifications/delete", { notificationId });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "notifications_create",
    "Create an in-app notification. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /notifications/create request body.") },
    async ({ payload }) => {
      try {
        const data = await client.post("/notifications/create", payload);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "notifications_send_email",
    "Send an email with notification context. This sends external communication and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /notifications/send-email request body.") },
    async ({ payload }) => {
      try {
        const data = await client.post("/notifications/send-email", payload);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: String(error instanceof Error ? error.message : error) }],
          isError: true,
        };
      }
    }
  );
}
