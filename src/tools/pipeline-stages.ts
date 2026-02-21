import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerPipelineStageTools(server: McpServer, client: ApiClient) {
  server.tool(
    "pipeline_stages_list",
    "List all pipeline stages for a given entity. Pipeline stages define the CRM workflow for leads.",
    { entityId: z.string().describe("The entity ID to get stages for") },
    async ({ entityId }) => {
      try {
        const data = await client.get(`/pipeline-stages/get/entity/${entityId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.stages, null, 2) }],
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
    "pipeline_stages_create",
    "Create a new pipeline stage for the CRM.",
    {
      name: z.string().describe("Stage name (e.g. New, Contacted, Qualified, Won, Lost)"),
      color: z.string().optional().describe("Hex color code for the stage (e.g. #3B82F6)"),
      isDefault: z.boolean().optional().describe("Whether this is the default stage for new leads"),
      isTerminal: z.boolean().optional().describe("Whether this is a terminal/final stage"),
    },
    async (params) => {
      try {
        const data = await client.post("/pipeline-stages/create", params);
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
    "pipeline_stages_update",
    "Update a pipeline stage.",
    {
      stageId: z.string().describe("The stage ID to update"),
      name: z.string().optional().describe("Updated stage name"),
      color: z.string().optional().describe("Updated hex color code"),
      isDefault: z.boolean().optional().describe("Whether this is the default stage"),
      isTerminal: z.boolean().optional().describe("Whether this is a terminal stage"),
    },
    async (params) => {
      try {
        const data = await client.post("/pipeline-stages/update", params);
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
    "pipeline_stages_delete",
    "Delete a pipeline stage. This action cannot be undone.",
    { stageId: z.string().describe("The stage ID to delete") },
    async ({ stageId }) => {
      try {
        const data = await client.post("/pipeline-stages/delete", { stageId });
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
