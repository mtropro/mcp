import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { anyPayload, anyQuery, fail, ok } from "./utils.js";

export function registerPaymentTools(server: McpServer, client: ApiClient) {
  server.tool(
    "payments_list",
    "List payments visible to the authenticated owner. Supports the same filters as Core /payments/list through query.",
    { query: anyQuery },
    async ({ query }) => {
      try {
        return ok(await client.get("/payments/list", query));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_create",
    "Create an online Stripe payment. This is externally visible and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /payments/create request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/payments/create", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_create_manual",
    "Create a manual payment record. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /payments/create-manual request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/payments/create-manual", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_mark_paid",
    "Mark a payment as paid. This changes financial state and should require owner confirmation when used by an agent.",
    {
      paymentId: z.string().describe("Payment ID."),
      payload: anyPayload,
    },
    async ({ paymentId, payload }) => {
      try {
        return ok(await client.post(`/payments/mark-paid/${paymentId}`, payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_check",
    "Check a payment's current provider status and synchronize MTRO state.",
    { paymentId: z.string().describe("Payment ID.") },
    async ({ paymentId }) => {
      try {
        return ok(await client.post(`/payments/check/${paymentId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_capture",
    "Capture a payment when supported. This changes financial state and should require owner confirmation when used by an agent.",
    { paymentId: z.string().describe("Payment ID.") },
    async ({ paymentId }) => {
      try {
        return ok(await client.post(`/payments/capture/${paymentId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_cancel",
    "Cancel a payment. This changes financial state and should require owner confirmation when used by an agent.",
    { paymentId: z.string().describe("Payment ID.") },
    async ({ paymentId }) => {
      try {
        return ok(await client.post(`/payments/cancel/${paymentId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_update",
    "Update a payment. This writes account data and should require owner confirmation when used by an agent.",
    {
      paymentId: z.string().describe("Payment ID."),
      payload: z.record(z.any()).describe("Core /payments/update/:id request body."),
    },
    async ({ paymentId, payload }) => {
      try {
        return ok(await client.post(`/payments/update/${paymentId}`, payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_generate_link",
    "Generate or refresh a payment checkout link. This may create a new Stripe session and should require owner confirmation when sent externally.",
    { paymentId: z.string().describe("Payment ID.") },
    async ({ paymentId }) => {
      try {
        return ok(await client.post(`/payments/generate-link/${paymentId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_send_reminder",
    "Send a payment reminder to a guest. This sends external communication and should require owner confirmation when used by an agent.",
    {
      paymentId: z.string().describe("Payment ID."),
      customMessage: z.string().optional().describe("Optional owner-written message included in the reminder."),
    },
    async ({ paymentId, customMessage }) => {
      try {
        return ok(await client.post(`/payments/send-reminder/${paymentId}`, { customMessage }));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_recurring_list",
    "List recurring payment groups.",
    { query: anyQuery },
    async ({ query }) => {
      try {
        return ok(await client.get("/payments/recurring/list", query));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_recurring_create",
    "Create a recurring payment group. This writes financial records and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /payments/recurring/create request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/payments/recurring/create", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_recurring_cancel",
    "Cancel a recurring payment group. This changes financial state and should require owner confirmation when used by an agent.",
    { groupId: z.string().describe("Recurring group ID.") },
    async ({ groupId }) => {
      try {
        return ok(await client.post(`/payments/recurring/cancel/${groupId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_recurring_reschedule",
    "Reschedule a recurring payment group. This changes financial state and should require owner confirmation when used by an agent.",
    {
      groupId: z.string().describe("Recurring group ID."),
      payload: z.record(z.any()).describe("Core /payments/recurring/reschedule/:groupId request body."),
    },
    async ({ groupId, payload }) => {
      try {
        return ok(await client.post(`/payments/recurring/reschedule/${groupId}`, payload));
      } catch (error) {
        return fail(error);
      }
    }
  );
}

export function registerStripeAccountTools(server: McpServer, client: ApiClient) {
  server.tool(
    "stripe_accounts_list",
    "List Stripe Connect accounts and routing metadata for the authenticated entity.",
    {},
    async () => {
      try {
        return ok(await client.get("/payments/stripe/accounts"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "stripe_accounts_create",
    "Create a Stripe Connect account and onboarding link. This changes payout routing setup and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Body with label, paymentTypes, and linkedPropertyIds.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/payments/stripe/accounts", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "stripe_accounts_get_onboarding_link",
    "Get a refreshed onboarding link for a Stripe account.",
    { accountId: z.string().describe("Stripe account document ID.") },
    async ({ accountId }) => {
      try {
        return ok(await client.get(`/payments/stripe/accounts/${accountId}/onboarding-link`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "stripe_accounts_refresh_status",
    "Refresh and return Stripe account onboarding/status information.",
    { accountId: z.string().describe("Stripe account document ID.") },
    async ({ accountId }) => {
      try {
        return ok(await client.get(`/payments/stripe/accounts/${accountId}/status`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "stripe_accounts_get_dashboard",
    "Get a Stripe Express dashboard link for a connected account.",
    { accountId: z.string().describe("Stripe account document ID.") },
    async ({ accountId }) => {
      try {
        return ok(await client.get(`/payments/stripe/accounts/${accountId}/dashboard`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "stripe_accounts_get_references",
    "Get references that would block disconnecting a Stripe account.",
    { accountId: z.string().describe("Stripe account document ID.") },
    async ({ accountId }) => {
      try {
        return ok(await client.get(`/payments/stripe/accounts/${accountId}/references`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "stripe_accounts_set_default",
    "Set a Stripe account as the entity default. This changes routing and should require owner confirmation when used by an agent.",
    { accountId: z.string().describe("Stripe account document ID.") },
    async ({ accountId }) => {
      try {
        return ok(await client.post(`/payments/stripe/accounts/${accountId}/set-default`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "stripe_accounts_update",
    "Update Stripe account label, payment type routing, linked properties, or property defaults. This changes routing and should require owner confirmation when used by an agent.",
    {
      accountId: z.string().describe("Stripe account document ID."),
      payload: z.record(z.any()).describe("Core /payments/stripe/accounts/:id/update request body."),
    },
    async ({ accountId, payload }) => {
      try {
        return ok(await client.post(`/payments/stripe/accounts/${accountId}/update`, payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "stripe_accounts_delete",
    "Disconnect/delete a Stripe account. This changes payout routing and should require owner confirmation when used by an agent.",
    { accountId: z.string().describe("Stripe account document ID.") },
    async ({ accountId }) => {
      try {
        return ok(await client.delete(`/payments/stripe/accounts/${accountId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
