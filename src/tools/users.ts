import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient } from "../api-client.js";

export function registerUserTools(server: McpServer, client: ApiClient) {
  server.tool(
    "whoami",
    "Get the currently authenticated user's profile information including name, email, role, and entity.",
    {},
    async () => {
      try {
        const data = await client.get("/users/get");
        return {
          content: [{ type: "text", text: JSON.stringify(data.user, null, 2) }],
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
