import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerReminderTools(server: McpServer, client: ApiClient) {
  server.tool(
    "reminders_list",
    "List all reminders across all leads and bookings.",
    {},
    async () => {
      try {
        const data = await client.get("/reminders/get/all");
        return {
          content: [{ type: "text", text: JSON.stringify(data.reminders, null, 2) }],
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
    "reminders_list_by_entity",
    "List all reminders for a specific lead or booking.",
    {
      entityId: z.string().describe("The lead or booking ID"),
      entityType: z.enum(["lead", "booking"]).describe("Type of entity: 'lead' or 'booking'"),
    },
    async ({ entityId, entityType }) => {
      try {
        const data = await client.get(`/reminders/get/${entityType}/${entityId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.reminders, null, 2) }],
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
    "reminders_create",
    "Create a reminder for a lead or booking.",
    {
      entityId: z.string().describe("The lead or booking ID"),
      entityType: z.enum(["lead", "booking"]).describe("Type of entity: 'lead' or 'booking'"),
      title: z.string().describe("Reminder title"),
      note: z.string().optional().describe("Additional notes for the reminder"),
      reminderDate: z.number().describe("When to trigger the reminder (timestamp ms)"),
    },
    async (params) => {
      try {
        const data = await client.post("/reminders/create", params);
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
    "reminders_update",
    "Update a reminder. Can mark as completed, change date, title, or notes.",
    {
      reminderId: z.string().describe("The reminder ID to update"),
      title: z.string().optional().describe("Updated title"),
      note: z.string().optional().describe("Updated notes"),
      reminderDate: z.number().optional().describe("Updated reminder date (timestamp ms)"),
      completed: z.boolean().optional().describe("Mark as completed (true) or uncompleted (false)"),
    },
    async (params) => {
      try {
        const data = await client.post("/reminders/update", params);
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
    "reminders_delete",
    "Delete a reminder. This action cannot be undone.",
    { reminderId: z.string().describe("The reminder ID to delete") },
    async ({ reminderId }) => {
      try {
        const data = await client.post("/reminders/delete", { reminderId });
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
