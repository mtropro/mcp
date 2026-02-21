import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerEntityTools(server: McpServer, client: ApiClient) {
  server.tool(
    "entities_list",
    "List all entities (property management companies/owners). Admin only.",
    {},
    async () => {
      try {
        const data = await client.get("/entities/get/all");
        return {
          content: [{ type: "text", text: JSON.stringify(data.entities, null, 2) }],
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
    "entities_get",
    "Get detailed information about a specific entity.",
    { entityId: z.string().describe("The entity ID") },
    async ({ entityId }) => {
      try {
        const data = await client.get(`/entities/get/${entityId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.entity, null, 2) }],
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
