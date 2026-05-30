import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerTemplateTools(server: McpServer, client: ApiClient) {
  server.tool(
    "templates_list",
    "List all lease templates available to you.",
    {},
    async () => {
      try {
        const data = await client.get("/templates/get/all");
        return {
          content: [{ type: "text", text: JSON.stringify(data.templates, null, 2) }],
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
    "templates_get",
    "Get detailed information about a specific lease template, including its pages and merge fields.",
    { templateId: z.string().describe("The template ID") },
    async ({ templateId }) => {
      try {
        const data = await client.get(`/templates/get/${templateId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.template, null, 2) }],
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
    "templates_get_by_entity",
    "Get all lease templates belonging to a specific entity.",
    { entityId: z.string().describe("The entity ID") },
    async ({ entityId }) => {
      try {
        const data = await client.get(`/templates/get/entity/${entityId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.templates, null, 2) }],
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
    "templates_get_public",
    "List public lease templates.",
    {},
    async () => {
      try {
        const data = await client.get("/templates/get/public");
        return {
          content: [{ type: "text", text: JSON.stringify(data.templates || data, null, 2) }],
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
    "templates_create",
    "Create a lease template. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /templates/create request body.") },
    async ({ payload }) => {
      try {
        const data = await client.post("/templates/create", payload);
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
    "templates_update",
    "Update a lease template. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /templates/update request body.") },
    async ({ payload }) => {
      try {
        const data = await client.post("/templates/update", payload);
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
    "templates_delete",
    "Delete a lease template. This is destructive and should require owner confirmation when used by an agent.",
    { templateId: z.string().describe("Template ID.") },
    async ({ templateId }) => {
      try {
        const data = await client.post("/templates/delete", { templateId });
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
    "templates_generate_lease",
    "Generate a lease from a booking/template. This may produce guest-facing documents and should require owner confirmation before sending externally.",
    { payload: z.record(z.any()).describe("Core /templates/generate-lease request body.") },
    async ({ payload }) => {
      try {
        const data = await client.post("/templates/generate-lease", payload);
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
    "templates_preview_render",
    "Preview-render a template with merge fields without saving a booking document.",
    { payload: z.record(z.any()).describe("Core /templates/preview-render request body.") },
    async ({ payload }) => {
      try {
        const data = await client.post("/templates/preview-render", payload);
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
    "templates_import_word",
    "Import a Word document as a lease template. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /templates/import-word request body.") },
    async ({ payload }) => {
      try {
        const data = await client.post("/templates/import-word", payload);
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
