import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerReportTools(server: McpServer, client: ApiClient) {
  server.tool(
    "reports_property_summary",
    "Get a financial summary report for properties, including revenue, occupancy rates, and per-property breakdowns. Defaults to current month if no dates provided.",
    {
      startTimestamp: z.number().optional().describe("Start of reporting period (timestamp ms). Defaults to start of current month."),
      endTimestamp: z.number().optional().describe("End of reporting period (timestamp ms). Defaults to end of current month."),
      entityId: z.string().optional().describe("Entity ID to report on (admin only, defaults to your entity)"),
    },
    async (params) => {
      try {
        const data = await client.get("/reports/property-summary", params);
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
    "reports_trends",
    "Get trend data and analytics for properties over time.",
    {
      startTimestamp: z.number().optional().describe("Start of trend period (timestamp ms)"),
      endTimestamp: z.number().optional().describe("End of trend period (timestamp ms)"),
      entityId: z.string().optional().describe("Entity ID (admin only)"),
    },
    async (params) => {
      try {
        const data = await client.get("/reports/trends", params);
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
