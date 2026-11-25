import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { WITHHELD_NOTE, fail, okForAssistant } from "./utils.js";

export function registerSmartLockTools(server: McpServer, client: ApiClient) {
  server.tool(
    "smart_locks_devices_list",
    "Read-only. Smart lock devices connected through Seam, with their property mapping, online/locked state and battery. Requires the Smart Locks feature.",
    {},
    async () => {
      try {
        return okForAssistant(await client.get("/seam/devices"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "smart_locks_booking_access_list",
    `Read-only. Guest access records created for bookings and vendor tasks: status, validity window, delivery to the guest, automation paused, last error. ${WITHHELD_NOTE}`,
    {
      query: z
        .object({
          propertyId: z.string().optional().describe("Only this property."),
          bookingId: z.string().optional().describe("Only this booking."),
          taskId: z.string().optional().describe("Only this vendor task."),
        })
        .optional()
        .describe("Optional filters."),
    },
    async ({ query }) => {
      try {
        return okForAssistant(await client.get("/seam/booking-access", query));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "smart_locks_device_activity",
    "Read-only. Recent lock/unlock and access events for one mapped smart lock device.",
    {
      deviceId: z.string().describe("Seam device ID from smart_locks_devices_list."),
      query: z
        .object({ bookingId: z.string().optional().describe("Only events for this booking's access.") })
        .optional()
        .describe("Optional filters."),
    },
    async ({ deviceId, query }) => {
      try {
        return okForAssistant(await client.get(`/seam/devices/${deviceId}/activity`, query));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
