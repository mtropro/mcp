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
    "bookings_reverse_to_lead",
    "Reverse a booking back to a lead. This changes workflow state and should require owner confirmation when used by an agent.",
    {
      bookingId: z.string().describe("The booking ID"),
    },
    async ({ bookingId }) => {
      try {
        const data = await client.post(`/bookings/reverse-to-lead/${bookingId}`);
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
    "bookings_sign",
    "Sign a booking/lease as owner. This is legally significant and should require owner confirmation when used by an agent.",
    {
      bookingId: z.string().describe("The booking ID"),
      payload: z.record(z.any()).optional().describe("Optional signature payload."),
    },
    async ({ bookingId, payload }) => {
      try {
        const data = await client.post(`/bookings/sign/${bookingId}`, payload);
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
    "bookings_set_primary_guest",
    "Set the primary guest for a booking. This writes account data and should require owner confirmation when used by an agent.",
    {
      bookingId: z.string().describe("The booking ID"),
      guestId: z.string().describe("The guest ID to set as primary."),
    },
    async ({ bookingId, guestId }) => {
      try {
        const data = await client.post(`/bookings/set-primary-guest/${bookingId}`, { guestId });
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
    "bookings_request_background_check",
    "Request a background check for a booking. This can trigger external workflow and should require owner confirmation when used by an agent.",
    {
      bookingId: z.string().describe("The booking ID"),
      payload: z.record(z.any()).optional().describe("Optional background check request body."),
    },
    async ({ bookingId, payload }) => {
      try {
        const data = await client.post(`/bookings/request-background-check/${bookingId}`, payload);
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
    "bookings_set_background_check_approval",
    "Approve or reject a booking background check. This changes booking state and should require owner confirmation when used by an agent.",
    {
      bookingId: z.string().describe("The booking ID"),
      payload: z.record(z.any()).describe("Approval request body."),
    },
    async ({ bookingId, payload }) => {
      try {
        const data = await client.post(`/bookings/set-background-check-approval/${bookingId}`, payload);
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
    "bookings_set_lease_prepared",
    "Mark lease preparation state for a booking. This writes account data and should require owner confirmation when used by an agent.",
    {
      bookingId: z.string().describe("The booking ID"),
      payload: z.record(z.any()).optional().describe("Optional request body."),
    },
    async ({ bookingId, payload }) => {
      try {
        const data = await client.post(`/bookings/set-lease-prepared/${bookingId}`, payload);
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
    "bookings_update_block_dates",
    "Update an owner block/blocked-dates booking. This writes calendar state and should require owner confirmation when used by an agent.",
    {
      bookingId: z.string().describe("Blocked-dates booking ID"),
      payload: z.record(z.any()).describe("Updated block fields."),
    },
    async ({ bookingId, payload }) => {
      try {
        const data = await client.post(`/bookings/block-dates/update/${bookingId}`, payload);
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
    "bookings_delete_block_dates",
    "Delete an owner block/blocked-dates booking. This is destructive and should require owner confirmation when used by an agent.",
    {
      bookingId: z.string().describe("Blocked-dates booking ID"),
    },
    async ({ bookingId }) => {
      try {
        const data = await client.post(`/bookings/block-dates/delete/${bookingId}`);
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
