import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, ok } from "./utils.js";

export function registerInventoryTools(server: McpServer, client: ApiClient) {
  server.tool(
    "inventory_catalog",
    "List common property inventory catalog items, categories, and units.",
    {},
    async () => {
      try {
        return ok(await client.get("/inventory/catalog"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "inventory_list",
    "List inventory rows for a property.",
    { propertyId: z.string().describe("Property ID.") },
    async ({ propertyId }) => {
      try {
        return ok(await client.get(`/inventory/${propertyId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "inventory_create_item",
    "Create an inventory row for a property. This writes account data and should require owner confirmation when used by an agent.",
    {
      propertyId: z.string().describe("Property ID."),
      payload: z.record(z.any()).describe("Inventory item fields."),
    },
    async ({ propertyId, payload }) => {
      try {
        return ok(await client.post(`/inventory/${propertyId}/items`, payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "inventory_update_item",
    "Update an inventory row for a property. This writes account data and should require owner confirmation when used by an agent.",
    {
      propertyId: z.string().describe("Property ID."),
      itemId: z.string().describe("Inventory item ID."),
      payload: z.record(z.any()).describe("Inventory item fields to update."),
    },
    async ({ propertyId, itemId, payload }) => {
      try {
        return ok(await client.patch(`/inventory/${propertyId}/items/${itemId}`, payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "inventory_delete_item",
    "Delete an inventory row for a property. This is destructive and should require owner confirmation when used by an agent.",
    {
      propertyId: z.string().describe("Property ID."),
      itemId: z.string().describe("Inventory item ID."),
    },
    async ({ propertyId, itemId }) => {
      try {
        return ok(await client.delete(`/inventory/${propertyId}/items/${itemId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
