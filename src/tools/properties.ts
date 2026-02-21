import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerPropertyTools(server: McpServer, client: ApiClient) {
  server.tool(
    "properties_list",
    "List all properties you have access to. Returns property names, addresses, bedrooms, bathrooms, rates, and more.",
    {},
    async () => {
      try {
        const data = await client.get("/properties/get/all");
        return {
          content: [{ type: "text", text: JSON.stringify(data.properties, null, 2) }],
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
    "properties_get",
    "Get detailed information about a specific property by its ID.",
    { propertyId: z.string().describe("The property ID") },
    async ({ propertyId }) => {
      try {
        const data = await client.get(`/properties/get/${propertyId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.property, null, 2) }],
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
    "properties_get_by_entity",
    "Get all properties belonging to a specific entity (admin only).",
    { entityId: z.string().describe("The entity ID") },
    async ({ entityId }) => {
      try {
        const data = await client.get(`/properties/get/entity/${entityId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.properties, null, 2) }],
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
    "properties_create",
    "Create a new property. Required fields: propertyName, address, bedrooms, bathrooms, squareFootage. Optional: description, amenities, rate, minimumDays, maxGuests, pets, templateId, location.",
    {
      propertyName: z.string().describe("Property name (must be unique)"),
      address: z.string().describe("Full address of the property"),
      bedrooms: z.number().describe("Number of bedrooms"),
      bathrooms: z.number().describe("Number of bathrooms"),
      squareFootage: z.number().describe("Square footage of the property"),
      description: z.string().optional().describe("Property description (max 500 chars)"),
      amenities: z.record(z.boolean()).optional().describe("Amenities object, e.g. {wifi: true, pool: true}"),
      rate: z.array(z.object({ month: z.number(), rate: z.number() })).optional().describe("Monthly rates array, e.g. [{month: 1, rate: 150}, {month: 6, rate: 200}]"),
      minimumDays: z.number().optional().describe("Minimum booking days (default 1)"),
      maxGuests: z.object({ adults: z.number(), children: z.number().optional(), infants: z.number().optional() }).optional().describe("Maximum guests allowed"),
      templateId: z.string().optional().describe("Lease template ID to use for this property"),
    },
    async (params) => {
      try {
        const data = await client.post("/properties/create", params);
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
    "properties_update",
    "Update an existing property. Pass the propertyId and any fields to update.",
    {
      propertyId: z.string().describe("The property ID to update"),
      propertyName: z.string().optional().describe("New property name"),
      address: z.string().optional().describe("New address"),
      bedrooms: z.number().optional().describe("Number of bedrooms"),
      bathrooms: z.number().optional().describe("Number of bathrooms"),
      squareFootage: z.number().optional().describe("Square footage"),
      description: z.string().optional().describe("Property description"),
      amenities: z.record(z.boolean()).optional().describe("Amenities to update"),
      rate: z.array(z.object({ month: z.number(), rate: z.number() })).optional().describe("Monthly rates array"),
      minimumDays: z.number().optional().describe("Minimum booking days"),
      maxGuests: z.object({ adults: z.number().optional(), children: z.number().optional(), infants: z.number().optional() }).optional().describe("Maximum guests"),
      templateId: z.string().optional().describe("Lease template ID"),
    },
    async (params) => {
      try {
        const data = await client.post("/properties/update", params);
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
    "properties_delete",
    "Delete a property by its ID. This action cannot be undone.",
    { propertyId: z.string().describe("The property ID to delete") },
    async ({ propertyId }) => {
      try {
        const data = await client.post("/properties/delete", { propertyId });
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
