import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { formatRef, rememberRef, resetRefs, resolveRef } from "./refs.js";

export function registerBookingTools(server: McpServer, client: ApiClient) {
  server.tool(
    "bookings_list",
    "List all bookings you have access to. Returns compact live booking rows with simple bookingRef values like B001. Prefer bookingRef over raw ObjectIds in later tool calls.",
    {},
    async () => {
      try {
        const data = await client.get("/bookings/get/all");
        if (Array.isArray(data.bookings)) {
          return {
            content: [{ type: "text", text: JSON.stringify(compactBookings(data.bookings), null, 2) }],
          };
        }
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
    "Get detailed information about a specific booking by bookingRef or raw booking ID.",
    {
      bookingId: z.string().optional().describe("Raw booking ObjectId."),
      bookingRef: z.string().optional().describe("Simple booking ref returned by bookings_list, e.g. B001."),
    },
    async ({ bookingId, bookingRef }) => {
      try {
        const resolvedBookingId = resolveBookingId(bookingId, bookingRef);
        const data = await client.get(`/bookings/get/${resolvedBookingId}`);
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
    "Update an existing booking. Use bookingRef from bookings_list, plus any fields to update.",
    {
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
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
    async ({ bookingRef, ...params }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const data = await client.post(`/bookings/update/${resolvedBookingId}`, params);
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
    "Delete a booking by bookingRef. This action cannot be undone.",
    {
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
    },
    async ({ bookingRef }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const data = await client.post(`/bookings/delete/${resolvedBookingId}`);
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
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
    },
    async ({ bookingRef }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const data = await client.post(`/bookings/reverse-to-lead/${resolvedBookingId}`);
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
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
      payload: z.record(z.any()).optional().describe("Optional signature payload."),
    },
    async ({ bookingRef, payload }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const data = await client.post(`/bookings/sign/${resolvedBookingId}`, payload);
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
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
      guestId: z.string().describe("The guest ID to set as primary."),
    },
    async ({ bookingRef, guestId }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const data = await client.post(`/bookings/set-primary-guest/${resolvedBookingId}`, { guestId });
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
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
      payload: z.record(z.any()).optional().describe("Optional background check request body."),
    },
    async ({ bookingRef, payload }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const data = await client.post(`/bookings/request-background-check/${resolvedBookingId}`, payload);
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
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
      approval: z.boolean().optional().describe("Set true to approve the background check, false to reject it."),
      approved: z.boolean().optional().describe("Backward-compatible alias for approval."),
      payload: z.record(z.any()).optional().describe("Optional request body. Use approval, not approved, when possible."),
    },
    async ({ bookingRef, approval, approved, payload }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const normalizedApproval =
          approval ??
          approved ??
          (typeof payload?.approval === "boolean" ? payload.approval : undefined) ??
          (typeof payload?.approved === "boolean" ? payload.approved : undefined);
        if (typeof normalizedApproval !== "boolean") {
          throw new Error("approval is required and must be a boolean.");
        }
        const data = await client.post(`/bookings/set-background-check-approval/${resolvedBookingId}`, {
          ...(payload || {}),
          approval: normalizedApproval,
        });
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
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
      payload: z.record(z.any()).optional().describe("Optional request body."),
    },
    async ({ bookingRef, payload }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const data = await client.post(`/bookings/set-lease-prepared/${resolvedBookingId}`, payload);
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
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
      payload: z.record(z.any()).describe("Updated block fields."),
    },
    async ({ bookingRef, payload }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const data = await client.post(`/bookings/block-dates/update/${resolvedBookingId}`, payload);
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
      bookingRef: z.string().describe("Simple booking ref returned by bookings_list, e.g. B001. Required for writes."),
    },
    async ({ bookingRef }) => {
      try {
        const resolvedBookingId = resolveBookingWriteId(bookingRef);
        const data = await client.post(`/bookings/block-dates/delete/${resolvedBookingId}`);
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

function resolveBookingId(bookingId: string | undefined, bookingRef: string | undefined): string {
  return resolveRef("booking", bookingRef || bookingId, "bookingRef");
}

function resolveBookingWriteId(bookingRef: string | undefined): string {
  const ref = typeof bookingRef === "string" ? bookingRef.trim() : "";
  if (!/^B\d{3,}$/i.test(ref)) {
    throw new Error(
      "bookingRef is required for booking write tools. Run bookings_list and use a simple ref like B001; raw booking ObjectIds are not accepted for agent writes.",
    );
  }
  return resolveRef("booking", ref, "bookingRef");
}

function compactBookings(bookings: any[]) {
  resetRefs("booking");
  return {
    guidance: [
      "Use bookingRef values like B001 in booking write tools instead of raw ObjectIds.",
      "Refs are generated from the live bookings_list result and prevent stale ID mixups.",
      "Run bookings_list again before writing if a ref is unknown or the conversation was resumed.",
    ],
    count: bookings.length,
    bookings: bookings.map((booking, index) => {
      const id = String(booking.id || booking._id || "");
      const bookingRef = formatRef("B", index);
      rememberRef("booking", bookingRef, id);
      return {
        bookingRef,
        idHint: id ? id.slice(-6) : undefined,
        status: booking.status,
        guestName: guestName(booking),
        propertyName: booking.property?.propertyName || booking.propertyName,
        startDate: booking.startDate,
        endDate: booking.endDate,
        rate: booking.rate,
        source: booking.source,
        backgroundCheck: {
          hasReport: Boolean(booking.backgroundChecksReport),
          approval: booking.backgroundChecksApproval,
        },
        lease: {
          hasTemplate: Boolean(booking.templateId),
          guestSignCount: Array.isArray(booking.guestSign) ? booking.guestSign.length : 0,
          ownerSignCount: Array.isArray(booking.ownerSign) ? booking.ownerSign.length : 0,
          additionalGuestCount: Array.isArray(booking.additionalGuests) ? booking.additionalGuests.length : 0,
        },
      };
    }),
  };
}

function guestName(booking: any): string | undefined {
  const guest = booking.guest;
  if (guest && typeof guest === "object") {
    const name = [guest.name, guest.surname].filter(Boolean).join(" ").trim();
    return name || guest.email;
  }
  return booking.guestName || booking.guestId;
}
