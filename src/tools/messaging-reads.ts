import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, okForAssistant } from "./utils.js";

export function registerMessagingReadTools(server: McpServer, client: ApiClient) {
  server.tool(
    "conversations_scheduled_pending",
    "Read-only. Messages scheduled to be sent later that have not gone out yet, with recipient conversation, channel and send time. Opening the list recomputes the send time of timezone-anchored schedules, exactly as the Inbox does.",
    {},
    async () => {
      try {
        return okForAssistant(await client.get("/conversations/scheduled/pending"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "conversations_automated",
    "Read-only. Automated messages (templates and automations) MTRO sent or will send, per contact and channel, with delivery stats.",
    {
      query: z
        .object({
          contact: z
            .string()
            .regex(/^(lead|guest|booking):[a-f0-9]{24}$/i)
            .optional()
            .describe("Only this contact: lead:<leadId>, guest:<guestId> or booking:<bookingId>."),
          channel: z.enum(["in_app", "email", "sms", "whatsapp"]).optional().describe("Only this channel."),
          limit: z.number().int().positive().max(200).optional().describe("Maximum rows."),
          includeContacts: z.boolean().optional().describe("Include the per-contact summary."),
        })
        .optional()
        .describe("Optional filters."),
    },
    async ({ query }) => {
      try {
        return okForAssistant(await client.get("/conversations/automated", query));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "communication_templates_list",
    "Read-only. Platform communication templates (booking, payment, lease and reminder messages) per channel, showing which are customized by the owner, plus the email footer.",
    {},
    async () => {
      try {
        return okForAssistant(await client.get("/communication-templates"));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
