import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { WITHHELD_NOTE, fail, okForAssistant } from "./utils.js";

export function registerDocumentTools(server: McpServer, client: ApiClient) {
  server.tool(
    "documents_list",
    `Read-only. Guest documents stored in MTRO (name, type, size, guest, booking, source, upload date). ${WITHHELD_NOTE}`,
    {},
    async () => {
      try {
        return okForAssistant(await client.get("/documents/list"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "documents_list_for_guest",
    `Read-only. Documents stored for one guest. ${WITHHELD_NOTE}`,
    { guestId: z.string().describe("Guest ObjectId.") },
    async ({ guestId }) => {
      try {
        return okForAssistant(await client.get(`/documents/get/guest/${guestId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
