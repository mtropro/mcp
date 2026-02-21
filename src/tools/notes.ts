import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerNoteTools(server: McpServer, client: ApiClient) {
  server.tool(
    "notes_list",
    "List all notes for a specific lead or booking.",
    {
      entityId: z.string().describe("The lead or booking ID to get notes for"),
      entityType: z.enum(["lead", "booking"]).describe("Type of entity: 'lead' or 'booking'"),
    },
    async ({ entityId, entityType }) => {
      try {
        const data = await client.get(`/notes/get/${entityType}/${entityId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.notes, null, 2) }],
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
    "notes_create",
    "Add a note to a lead or booking.",
    {
      entityId: z.string().describe("The lead or booking ID to add the note to"),
      entityType: z.enum(["lead", "booking"]).describe("Type of entity: 'lead' or 'booking'"),
      text: z.string().describe("The note text content"),
    },
    async (params) => {
      try {
        const data = await client.post("/notes/create", params);
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
    "notes_delete",
    "Delete a note. This action cannot be undone.",
    { noteId: z.string().describe("The note ID to delete") },
    async ({ noteId }) => {
      try {
        const data = await client.post("/notes/delete", { noteId });
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
