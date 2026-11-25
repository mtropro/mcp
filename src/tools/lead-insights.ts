import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, okForAssistant } from "./utils.js";

export function registerLeadInsightTools(server: McpServer, client: ApiClient) {
  server.tool(
    "leads_get_external_reservation_candidates",
    "Read-only. External calendar reservations (e.g. Airbnb) that could belong to one lead, so the owner can decide whether to link them. Linking is not available to the assistant.",
    {
      leadId: z.string().describe("Lead ObjectId."),
      query: z
        .object({
          propertyId: z.string().describe("Property ObjectId the lead is for."),
          scope: z.enum(["matching", "property"]).optional().describe("matching (default): reservations matching the lead; property: every reservation of the property."),
        })
        .describe("Property and search scope."),
    },
    async ({ leadId, query }) => {
      try {
        return okForAssistant(await client.get(`/leads/${leadId}/external-reservation-candidates`, query));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
