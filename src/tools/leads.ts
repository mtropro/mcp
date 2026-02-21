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
      name: z.string().describe("Lead contact name"),
      email: z.string().optional().describe("Lead email address"),
      phone: z.string().optional().describe("Lead phone number"),
      source: z.string().optional().describe("Lead source (e.g. MANUAL, WEBSITE)"),
      notes: z.string().optional().describe("Notes about the lead"),
      stageId: z.string().optional().describe("Pipeline stage ID"),
      propertyId: z.string().optional().describe("Property ID if lead is interested in a specific property"),
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
      name: z.string().optional().describe("Updated name"),
      email: z.string().optional().describe("Updated email"),
      phone: z.string().optional().describe("Updated phone"),
      notes: z.string().optional().describe("Updated notes"),
      propertyId: z.string().optional().describe("Updated property ID"),
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
