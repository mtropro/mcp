import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerVendorTools(server: McpServer, client: ApiClient) {
  server.tool(
    "vendors_list",
    "List all vendors (service providers like plumbers, electricians, cleaners, etc.).",
    {},
    async () => {
      try {
        const data = await client.get("/vendors/get/all");
        return {
          content: [{ type: "text", text: JSON.stringify(data.vendors, null, 2) }],
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
    "vendors_get",
    "Get detailed information about a specific vendor.",
    { vendorId: z.string().describe("The vendor ID") },
    async ({ vendorId }) => {
      try {
        const data = await client.get(`/vendors/get/${vendorId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.vendor, null, 2) }],
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
    "vendors_get_by_entity",
    "Get all vendors belonging to a specific entity.",
    { entityId: z.string().describe("The entity ID") },
    async ({ entityId }) => {
      try {
        const data = await client.get(`/vendors/get/entity/${entityId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.vendors, null, 2) }],
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
    "vendors_create",
    "Create a new vendor (service provider). Required: name, role, mobile, email.",
    {
      name: z.string().describe("Vendor name"),
      role: z.string().describe("Vendor role (e.g. Plumber, Electrician, Cleaner)"),
      mobile: z.string().describe("Vendor mobile number"),
      email: z.string().describe("Vendor email address"),
    },
    async (params) => {
      try {
        const data = await client.post("/vendors/create", params);
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
    "vendors_update",
    "Update a vendor's information.",
    {
      vendorId: z.string().describe("The vendor ID to update"),
      name: z.string().optional().describe("Updated name"),
      role: z.string().optional().describe("Updated role"),
      mobile: z.string().optional().describe("Updated mobile number"),
      email: z.string().optional().describe("Updated email"),
    },
    async (params) => {
      try {
        const data = await client.post("/vendors/update", params);
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
    "vendors_delete",
    "Delete a vendor. This action cannot be undone.",
    { vendorId: z.string().describe("The vendor ID to delete") },
    async ({ vendorId }) => {
      try {
        const data = await client.post("/vendors/delete", { vendorId });
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
