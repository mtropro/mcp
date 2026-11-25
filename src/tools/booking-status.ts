import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, okForAssistant } from "./utils.js";
import { resolveRef } from "./refs.js";

const bookingIdInput = {
  bookingId: z.string().optional().describe("Raw booking ObjectId."),
  bookingRef: z.string().optional().describe("Simple booking ref returned by bookings_list, e.g. B001."),
};

function bookingIdFrom(bookingId: string | undefined, bookingRef: string | undefined): string {
  return resolveRef("booking", bookingRef || bookingId, "bookingRef");
}

export function registerBookingStatusTools(server: McpServer, client: ApiClient) {
  server.tool(
    "bookings_get_guest_workflow_status",
    "Read-only. The guest workflow of one booking as MTRO tracks it: application, screening, lease preparation and signatures (guest and host), and payment steps, with what is done and what is still pending. Use it before stating where a booking stands.",
    bookingIdInput,
    async ({ bookingId, bookingRef }) => {
      try {
        return okForAssistant(await client.get(`/bookings/guest-workflow-status/${bookingIdFrom(bookingId, bookingRef)}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "bookings_get_lease_payment_options",
    "Read-only. Payments that can be attached to the lease of one booking (paid, or pending/overdue online payments). Amounts are integer cents, returned as amountCents with amountFormatted.",
    bookingIdInput,
    async ({ bookingId, bookingRef }) => {
      try {
        return okForAssistant(await client.get(`/bookings/lease-payment-options/${bookingIdFrom(bookingId, bookingRef)}`), {
          centsKeys: ["amount"],
        });
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "bookings_get_external_calendar_status",
    "Read-only. Whether one booking came from or is mirrored on an external calendar (Airbnb, VRBO, iCal) and whether it can still be cancelled or contacted there.",
    bookingIdInput,
    async ({ bookingId, bookingRef }) => {
      try {
        return okForAssistant(await client.get(`/bookings/external-calendar-status/${bookingIdFrom(bookingId, bookingRef)}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "bookings_get_survey_reviews",
    "Read-only. Guest survey reviews and their status for one booking.",
    bookingIdInput,
    async ({ bookingId, bookingRef }) => {
      try {
        return okForAssistant(await client.get(`/survey-reviews/booking/${bookingIdFrom(bookingId, bookingRef)}`));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
