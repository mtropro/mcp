import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, okForAssistant } from "./utils.js";

export function registerCoHostingTools(server: McpServer, client: ApiClient) {
  server.tool(
    "co_hosting_portfolio",
    "Read-only. Properties the authenticated user co-hosts for other owners, with the permissions each owner granted.",
    {},
    async () => {
      try {
        return okForAssistant(await client.get("/co-hosting/portfolio"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "co_hosting_invitations_list",
    "Read-only. Co-hosting invitations sent and received, with their status and permissions.",
    {},
    async () => {
      try {
        return okForAssistant(await client.get("/co-hosting/invitations"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "co_hosting_property_bookings",
    "Read-only. Bookings of one co-hosted property, as the granted permissions allow.",
    { propertyId: z.string().describe("Co-hosted property ID from co_hosting_portfolio.") },
    async ({ propertyId }) => {
      try {
        return okForAssistant(await client.get(`/co-hosting/properties/${propertyId}/bookings`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "co_hosting_property_calendar",
    "Read-only. Calendar events (bookings, blocks, external calendars) of one co-hosted property.",
    {
      propertyId: z.string().describe("Co-hosted property ID from co_hosting_portfolio."),
      query: z
        .object({
          from: z.number().int().positive().describe("Start, epoch milliseconds."),
          to: z.number().int().positive().describe("End, epoch milliseconds; after from and at most 366 days later."),
        })
        .describe("Calendar range."),
    },
    async ({ propertyId, query }) => {
      try {
        return okForAssistant(await client.get(`/co-hosting/properties/${propertyId}/calendar`, query));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
