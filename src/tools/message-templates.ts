import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, ok } from "./utils.js";

export function registerMessageTemplateTools(server: McpServer, client: ApiClient) {
  server.tool(
    "message_templates_list",
    "List message templates for an entity.",
    { entityId: z.string().describe("Entity ID.") },
    async ({ entityId }) => {
      try {
        return ok(await client.get(`/message-templates/get/entity/${entityId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "message_templates_get",
    "Get a message template by ID.",
    { templateId: z.string().describe("Message template ID.") },
    async ({ templateId }) => {
      try {
        return ok(await client.get(`/message-templates/get/${templateId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "message_templates_create",
    "Create a reusable message template. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /message-templates/create request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/message-templates/create", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "message_templates_update",
    "Update a reusable message template. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /message-templates/update request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/message-templates/update", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "message_templates_delete",
    "Delete a reusable message template. This is destructive and should require owner confirmation when used by an agent.",
    { templateId: z.string().describe("Message template ID.") },
    async ({ templateId }) => {
      try {
        return ok(await client.post("/message-templates/delete", { templateId }));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
