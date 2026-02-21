import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerTaskTools(server: McpServer, client: ApiClient) {
  server.tool(
    "tasks_list",
    "List all maintenance/service tasks. Returns task details including property, vendor, date, status, and notes.",
    {},
    async () => {
      try {
        const data = await client.get("/tasks/get/all");
        return {
          content: [{ type: "text", text: JSON.stringify(data.tasks, null, 2) }],
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
    "tasks_get",
    "Get detailed information about a specific task.",
    { taskId: z.string().describe("The task ID") },
    async ({ taskId }) => {
      try {
        const data = await client.get(`/tasks/get/${taskId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.task, null, 2) }],
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
    "tasks_get_by_entity",
    "Get all tasks belonging to a specific entity.",
    { entityId: z.string().describe("The entity ID") },
    async ({ entityId }) => {
      try {
        const data = await client.get(`/tasks/get/entity/${entityId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.tasks, null, 2) }],
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
    "tasks_get_by_vendor",
    "Get all tasks assigned to a specific vendor.",
    { vendorId: z.string().describe("The vendor ID") },
    async ({ vendorId }) => {
      try {
        const data = await client.get(`/tasks/get/vendor/${vendorId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.tasks, null, 2) }],
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
    "tasks_create",
    "Create a new maintenance/service task. Required: propertyId, date (timestamp ms), vendorId. Optional: notes, status.",
    {
      propertyId: z.string().describe("Property ID where the task takes place"),
      date: z.number().describe("Task date as millisecond timestamp"),
      vendorId: z.string().describe("Vendor ID assigned to the task"),
      notes: z.string().optional().describe("Task notes/description"),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("Task status (default: pending)"),
    },
    async (params) => {
      try {
        const data = await client.post("/tasks/create", params);
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
    "tasks_update",
    "Update an existing task.",
    {
      taskId: z.string().describe("The task ID to update"),
      propertyId: z.string().optional().describe("Updated property ID"),
      date: z.number().optional().describe("Updated task date (timestamp ms)"),
      vendorId: z.string().optional().describe("Updated vendor ID"),
      notes: z.string().optional().describe("Updated notes"),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("Updated status"),
    },
    async (params) => {
      try {
        const data = await client.post("/tasks/update", params);
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
    "tasks_delete",
    "Delete a task. This action cannot be undone.",
    { taskId: z.string().describe("The task ID to delete") },
    async ({ taskId }) => {
      try {
        const data = await client.post("/tasks/delete", { taskId });
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
