import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { WITHHELD_NOTE, fail, okForAssistant } from "./utils.js";

export function registerScreeningTools(server: McpServer, client: ApiClient) {
  server.tool(
    "background_checks_list",
    `Read-only. Background checks (screening applications) with status, payment state, owner decision and whether action is required. Filter by lead or booking. ${WITHHELD_NOTE}`,
    {
      query: z
        .object({
          leadId: z.string().optional().describe("Only checks for this lead."),
          bookingId: z.string().optional().describe("Only checks for this booking."),
          status: z.string().optional().describe("Only checks with this status; action_required lists every check waiting on the owner."),
          limit: z.number().int().positive().max(100).optional().describe("Maximum rows."),
          updatedBefore: z.number().int().positive().optional().describe("Pagination cursor: updatedAt (epoch milliseconds) of the last row seen."),
        })
        .optional()
        .describe("Optional filters."),
    },
    async ({ query }) => {
      try {
        return okForAssistant(await client.get("/background-checks", query));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "background_checks_get",
    `Read-only. One background check with applicant, provider status, report availability, payment state and owner decision. ${WITHHELD_NOTE}`,
    { backgroundCheckId: z.string().describe("Background check ID from background_checks_list.") },
    async ({ backgroundCheckId }) => {
      try {
        return okForAssistant(await client.get(`/background-checks/${backgroundCheckId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "background_checks_options",
    "Read-only. Screening packages available to the owner, with prices and whether a credit check can be requested.",
    {},
    async () => {
      try {
        return okForAssistant(await client.get("/background-checks/options"));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
