import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerTemplateTools(server: McpServer, client: ApiClient) {
  server.tool(
    "templates_list",
    "List all lease templates available to you.",
    {},
    async () => {
      try {
        const data = await client.get("/templates/get/all");
        return {
          content: [{ type: "text", text: JSON.stringify(data.templates, null, 2) }],
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
    "templates_get",
    "Get detailed information about a specific lease template, including its pages and merge fields.",
    { templateId: z.string().describe("The template ID") },
    async ({ templateId }) => {
      try {
        const data = await client.get(`/templates/get/${templateId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.template, null, 2) }],
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
    "templates_get_by_entity",
    "Get all lease templates belonging to a specific entity.",
    { entityId: z.string().describe("The entity ID") },
    async ({ entityId }) => {
      try {
        const data = await client.get(`/templates/get/entity/${entityId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.templates, null, 2) }],
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
