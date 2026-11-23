import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient } from "../api-client.js";
import { fail, okForAssistant } from "./utils.js";

export function registerMembershipTools(server: McpServer, client: ApiClient) {
  server.tool(
    "users_my_memberships",
    "Read-only. The businesses the authenticated user belongs to, with role and which one is active.",
    {},
    async () => {
      try {
        return okForAssistant(await client.get("/users/me/memberships"));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
