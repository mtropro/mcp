import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerLeadTools(server: McpServer, client: ApiClient) {
  server.tool(
    "leads_list",
    "List all leads/inquiries in the CRM pipeline.",
    {},
    async () => {
      try {
        const data = await client.get("/webhooks/get/all");
        return {
          content: [{ type: "text", text: JSON.stringify(data.webhooks || data.leads, null, 2) }],
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
      monthlyRate: z.number().optional().describe("Monthly rate the lead was quoted"),
      staffingCompany: z.string().optional().describe("Staffing or contracting company the lead works for"),
      petInformation: z.string().optional().describe("Pets travelling with the lead"),
    },
    async (params) => {
      try {
        const data = await client.post("/webhooks/create-lead", params);
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
      monthlyRate: z.number().optional().describe("Updated monthly rate"),
      staffingCompany: z.string().optional().describe("Updated staffing or contracting company"),
      petInformation: z.string().optional().describe("Updated pet information"),
    },
    async (params) => {
      try {
        const data = await client.post("/webhooks/update-lead", params);
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
        const data = await client.post("/webhooks/update-stage", params);
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
        const data = await client.post("/webhooks/delete-lead", { leadId });
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
