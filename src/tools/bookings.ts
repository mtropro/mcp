import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";

export function registerBookingTools(server: McpServer, client: ApiClient) {
  server.tool(
    "bookings_list",
    "List all bookings you have access to. Returns booking details including property, guest, dates, status, and rate.",
    {},
    async () => {
      try {
        const data = await client.get("/bookings/get/all");
        return {
          content: [{ type: "text", text: JSON.stringify(data.bookings, null, 2) }],
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
    "bookings_get",
    "Get detailed information about a specific booking by its ID.",
    { bookingId: z.string().describe("The booking ID") },
    async ({ bookingId }) => {
      try {
        const data = await client.get(`/bookings/get/${bookingId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(data.booking, null, 2) }],
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
    "bookings_create",
    "Create a new booking. Required: propertyId, guestId, startDate (timestamp ms), endDate (timestamp ms), rate (per day). Optional: source, status, notes, travelers, guests (adults/children/infants), pets, customFields, templateId.",
    {
      propertyId: z.string().describe("Property ID for the booking"),
      guestId: z.string().describe("Guest ID (main booking owner)"),
      startDate: z.number().describe("Start date as millisecond timestamp"),
      endDate: z.number().describe("End date as millisecond timestamp"),
      rate: z.number().describe("Rate per day"),
      source: z.string().optional().describe("Booking source"),
      status: z.string().optional().describe("Booking status: confirmed, pending, cancelled"),
      notes: z.string().optional().describe("Booking notes"),
      travelers: z.number().optional().describe("Number of travelers"),
      guests: z.object({
        adults: z.number().optional(),
        children: z.number().optional(),
        infants: z.number().optional(),
      }).optional().describe("Guest breakdown"),
      templateId: z.string().optional().describe("Lease template ID"),
    },
    async (params) => {
      try {
        const data = await client.post("/bookings/create", params);
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
    "bookings_update",
    "Update an existing booking. Pass the bookingId and any fields to update.",
    {
      bookingId: z.string().describe("The booking ID to update"),
      startDate: z.number().optional().describe("New start date (timestamp ms)"),
      endDate: z.number().optional().describe("New end date (timestamp ms)"),
      rate: z.number().optional().describe("New rate per day"),
      status: z.string().optional().describe("New status: confirmed, pending, cancelled"),
      notes: z.string().optional().describe("Updated notes"),
      travelers: z.number().optional().describe("Number of travelers"),
      guests: z.object({
        adults: z.number().optional(),
        children: z.number().optional(),
        infants: z.number().optional(),
      }).optional().describe("Guest breakdown"),
      templateId: z.string().optional().describe("Lease template ID"),
    },
    async ({ bookingId, ...params }) => {
      try {
        const data = await client.post(`/bookings/update/${bookingId}`, params);
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
    "bookings_delete",
    "Delete a booking by its ID. This action cannot be undone.",
    { bookingId: z.string().describe("The booking ID to delete") },
    async ({ bookingId }) => {
      try {
        const data = await client.post(`/bookings/delete/${bookingId}`);
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
    "bookings_check_availability",
    "Check if a property is available for specific dates.",
    {
      propertyId: z.string().describe("Property ID to check"),
      startDate: z.number().describe("Start date as millisecond timestamp"),
      endDate: z.number().describe("End date as millisecond timestamp"),
    },
    async (params) => {
      try {
        const data = await client.post("/bookings/public/check-availability", params);
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
    "bookings_block_dates",
    "Block dates on a property (e.g. for maintenance or owner use). Creates a blocked-dates booking.",
    {
      propertyId: z.string().describe("Property ID to block dates on"),
      startDate: z.number().describe("Block start date (timestamp ms)"),
      endDate: z.number().describe("Block end date (timestamp ms)"),
      notes: z.string().optional().describe("Reason for blocking dates"),
    },
    async (params) => {
      try {
        const data = await client.post("/bookings/block-dates", params);
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
    "bookings_invite_guests",
    "Invite additional guests to an existing booking.",
    {
      bookingId: z.string().describe("The booking ID"),
      guestIds: z.array(z.string()).describe("Array of guest IDs to invite"),
    },
    async ({ bookingId, guestIds }) => {
      try {
        const data = await client.post(`/bookings/invite-guests/${bookingId}`, { guestIds });
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
