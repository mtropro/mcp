#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config.js";
import { ApiClient } from "./api-client.js";
import { authenticateViaBrowser } from "./auth.js";
import { registerAllTools } from "./tools/index.js";

async function main() {
  const config = getConfig();
  let apiKey = config.apiKey;

  const server = new McpServer({
    name: "mtropro",
    version: "1.0.0",
  });

  if (apiKey) {
    const client = new ApiClient(config.apiUrl, apiKey);
    registerAllTools(server, client);
  } else {
    server.tool(
      "authenticate",
      "Connect to MTROPRO by logging in via the browser. This opens the admin panel where you can authorize access to your account. Run this first before using any other tools.",
      {},
      async () => {
        try {
          apiKey = await authenticateViaBrowser();
          const client = new ApiClient(config.apiUrl, apiKey);
          registerAllTools(server, client);
          return {
            content: [
              {
                type: "text",
                text: "Successfully connected to MTROPRO! All tools are now available. You can start managing properties, bookings, guests, and more.",
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Authentication failed";
          return {
            content: [{ type: "text", text: message }],
            isError: true,
          };
        }
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
