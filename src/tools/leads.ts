import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerLeadTools(server: McpServer, client: ApiClient) {
  server.tool(
    "leads_list",
    "Search compact Lead records for the current owner. Date bounds are inclusive move-in calendar dates (YYYY-MM-DD). Closed/converted leads are excluded unless includeClosed is true. Follow pagination.nextCursor with the same filters until hasMore is false; an empty page can still have more records. Do not infer a complete count from one page.",
    {
      leadId: z.string().regex(/^[a-f0-9]{24}$/i).optional().describe("Read exactly one Lead from a previous search."),
      startDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Inclusive earliest desired move-in date."),
      startDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Inclusive latest desired move-in date."),
      includeClosed: z.boolean().optional().describe("Include converted/lost/closed leads only when requested."),
      search: z.string().max(100).optional().describe("Literal name, email or destination filter."),
      cursor: z.string().max(400).optional().describe("Exact nextCursor from the previous page, with unchanged filters."),
      limit: z.number().int().min(1).max(50).optional().describe("Maximum matching leads in this page; defaults to 40."),
    },
    async (params) => {
      try {
        const data = await client.get("/leads/search", params);
        return {
          content: [{ type: "text", text: JSON.stringify(data) }],
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
    "leads_create",
    "Create a new lead in the CRM pipeline.",
    {
      tenantName: z.string().describe("Lead contact name. Required by Core."),
      emailAddress: z.string().optional().describe("Lead email address"),
      phoneNumber: z.string().optional().describe("Lead phone number"),
      service: z.string().optional().describe("Lead source, e.g. Furnished Finder, Airbnb, Manual. Defaults to Manual."),
      specialNotes: z.string().optional().describe("Notes about the lead"),
      stageId: z.string().optional().describe("Pipeline stage ID. Read the stage list first, ids are per-entity."),
      propertyId: z.string().optional().describe("Property ID if the lead is interested in a specific property"),
      destination: z.string().optional().describe("Destination the lead is looking for"),
      startDate: z.number().optional().describe("Desired start date as millisecond timestamp"),
      endDate: z.number().optional().describe("Desired end date as millisecond timestamp"),
      lengthOfStay: z.string().optional().describe("Desired length of stay"),
      numberOfTravelers: z.number().optional().describe("Number of travelers"),
      budget: z.number().nonnegative().optional().describe("Guest budget in USD"),
      monthlyRate: z.number().optional().describe("Monthly rate the lead was quoted"),
      staffingCompany: z.string().optional().describe("Staffing or contracting company the lead works for"),
      petInformation: z.string().optional().describe("Pets travelling with the lead"),
    },
    async (params) => {
      try {
        const data = await client.post("/leads", params);
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
    "leads_update",
    "Update an existing lead's information.",
    {
      leadId: z.string().describe("The lead ID to update"),
      tenantName: z.string().optional().describe("Updated contact name"),
      emailAddress: z.string().optional().describe("Updated email address"),
      phoneNumber: z.string().optional().describe("Updated phone number"),
      specialNotes: z.string().optional().describe("Updated notes"),
      propertyId: z.string().optional().describe("Updated property ID"),
      destination: z.string().optional().describe("Updated destination"),
      startDate: z.number().optional().describe("Updated start date as millisecond timestamp"),
      endDate: z.number().optional().describe("Updated end date as millisecond timestamp"),
      lengthOfStay: z.string().optional().describe("Updated length of stay"),
      numberOfTravelers: z.number().optional().describe("Updated number of travelers"),
      budget: z.number().nonnegative().optional().describe("Guest budget in USD"),
      monthlyRate: z.number().optional().describe("Updated monthly rate"),
      staffingCompany: z.string().optional().describe("Updated staffing or contracting company"),
      petInformation: z.string().optional().describe("Updated pet information"),
    },
    async (params) => {
      try {
        const data = await client.patch(`/leads/${params.leadId}`, params);
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
    "leads_update_stage",
    "Move a lead to a different pipeline stage.",
    {
      leadId: z.string().describe("The lead ID to move"),
      stageId: z.string().describe("The target pipeline stage ID"),
    },
    async (params) => {
      try {
        const data = await client.post("/leads/update-stage", params);
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
    "leads_delete",
    "Delete a lead from the CRM. This action cannot be undone.",
    { leadId: z.string().describe("The lead ID to delete") },
    async ({ leadId }) => {
      try {
        const data = await client.delete(`/leads/${leadId}`);
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
