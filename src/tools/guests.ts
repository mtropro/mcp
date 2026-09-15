import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerGuestTools(server: McpServer, client: ApiClient) {
  server.tool(
    "guests_search",
    "Search for guests by name, email, or other criteria. Returns matching guest profiles.",
    {
      search: z.string().optional().describe("Search term matched against guest name, surname, and email. Omit to list every guest."),
    },
    async (params) => {
      try {
        const data = await client.post("/guests/search", params);
        return {
          content: [{ type: "text", text: JSON.stringify(data.guests, null, 2) }],
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
    "guests_create",
    "Create a new guest profile. Required: email, name, surname, password. The password must contain at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character.",
    {
      email: z.string().describe("Guest email address"),
      name: z.string().describe("Guest first name"),
      surname: z.string().describe("Guest last name"),
      password: z.string().describe("Initial account password. At least 8 characters with uppercase, lowercase, a number, and a special character."),
      mobile: z.string().optional().describe("Guest mobile number"),
      birthday: z.number().optional().describe("Birthday as millisecond timestamp"),
      country: z.string().optional().describe("Guest country"),
      source: z.string().optional().describe("Source of the guest (e.g. LANDING_PAGE, MANUAL)"),
    },
    async (params) => {
      try {
        const data = await client.post("/guests/register", params);
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
    "guests_update",
    "Update a guest's profile information.",
    {
      guestId: z.string().describe("The guest ID to update"),
      name: z.string().describe("First name. Core requires it on every update, so send the current value when it is unchanged."),
      surname: z.string().describe("Surname. Core requires it on every update, so send the current value when it is unchanged."),
      email: z.string().describe("Email address. Core requires it on every update, so send the current value when it is unchanged."),
      mobile: z.string().optional().describe("Updated mobile number"),
      birthday: z.number().optional().describe("Updated birthday (timestamp ms)"),
      country: z.string().optional().describe("Updated country"),
    },
    async (params) => {
      try {
        const data = await client.post("/guests/edit", params);
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
    "guests_delete",
    "Delete a guest profile. This action cannot be undone.",
    { guestId: z.string().describe("The guest ID to delete") },
    async ({ guestId }) => {
      try {
        const data = await client.post("/guests/delete", { guestId });
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
