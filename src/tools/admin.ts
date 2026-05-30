import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { anyPayload, anyQuery, fail, ok } from "./utils.js";

export function registerAdminUtilityTools(server: McpServer, client: ApiClient) {
  server.tool(
    "api_keys_list",
    "List API keys for the authenticated owner/entity.",
    {},
    async () => {
      try {
        return ok(await client.get("/api-keys/list"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "api_keys_generate",
    "Generate a new API key. This creates a secret and should require owner confirmation when used by an agent.",
    { payload: anyPayload },
    async ({ payload }) => {
      try {
        return ok(await client.post("/api-keys/generate", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "api_keys_revoke",
    "Revoke an API key. This is security-sensitive and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /api-keys/revoke request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/api-keys/revoke", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "api_keys_delete",
    "Delete an API key. This is destructive and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /api-keys/delete request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/api-keys/delete", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "fields_list",
    "List custom fields.",
    {},
    async () => {
      try {
        return ok(await client.get("/fields/get/all"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "fields_get_by_entity",
    "List custom fields for an entity.",
    { entityId: z.string().describe("Entity ID.") },
    async ({ entityId }) => {
      try {
        return ok(await client.get(`/fields/get/entity/${entityId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "fields_create",
    "Create a custom field. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /fields/create request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/fields/create", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "fields_update",
    "Update a custom field. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /fields/update request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/fields/update", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "fields_delete",
    "Delete a custom field. This is destructive and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /fields/delete request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/fields/delete", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "logs_get",
    "Search audit logs.",
    { payload: anyPayload },
    async ({ payload }) => {
      try {
        return ok(await client.post("/logs/get", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "logs_stats",
    "Get audit log stats.",
    { payload: anyPayload },
    async ({ payload }) => {
      try {
        return ok(await client.post("/logs/stats", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "logs_actions",
    "List audit log action types.",
    { payload: anyPayload },
    async ({ payload }) => {
      try {
        return ok(await client.post("/logs/actions", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "nav_counts",
    "Get sidebar/navigation badge counts for the authenticated owner.",
    { query: anyQuery },
    async ({ query }) => {
      try {
        return ok(await client.get("/nav/counts", query));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
