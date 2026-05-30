import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { anyQuery, fail, ok } from "./utils.js";

export function registerSubscriptionTools(server: McpServer, client: ApiClient) {
  server.tool(
    "subscriptions_plans",
    "List public subscription plans available to the current owner.",
    {},
    async () => {
      try {
        return ok(await client.get("/subscriptions/plans"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "subscriptions_plans_all",
    "List all subscription plans. Usually admin-only.",
    {},
    async () => {
      try {
        return ok(await client.get("/subscriptions/plans/all"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "subscriptions_my",
    "Get the current entity subscription.",
    {},
    async () => {
      try {
        return ok(await client.get("/subscriptions/my"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "subscriptions_payments",
    "Get subscription payment history.",
    { query: anyQuery },
    async ({ query }) => {
      try {
        return ok(await client.get("/subscriptions/payments", query));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "subscriptions_checkout",
    "Create a subscription checkout session. This starts billing flow and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /subscriptions/checkout request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/subscriptions/checkout", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "subscriptions_cancel",
    "Cancel the current subscription. This changes billing state and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).optional().describe("Optional cancellation request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/subscriptions/cancel", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "subscriptions_cancel_pending",
    "Cancel a pending subscription change. This changes billing state and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).optional().describe("Optional request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/subscriptions/cancel-pending", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
