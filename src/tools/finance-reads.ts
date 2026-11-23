import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, okForAssistant } from "./utils.js";

export function registerFinanceReadTools(server: McpServer, client: ApiClient) {
  server.tool(
    "payments_autopay_get",
    "Read-only. Guest automatic-payment (autopay) state for one recurring payment group: offered/active/stopped, card on file (brand and last digits only), and each installment's charge date, amount and collection status. groupId is the recurringGroupId returned by payments_recurring_list. Amounts are returned as <name>Cents with <name>Formatted.",
    { groupId: z.string().describe("recurringGroupId from payments_recurring_list.") },
    async ({ groupId }) => {
      try {
        return okForAssistant(await client.get(`/payments/autopay/${groupId}`), { centsKeys: ["amount", "maximumAmount"] });
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "payments_property_split_get",
    "Read-only. How payouts for one property are split between Stripe accounts and external recipients.",
    { propertyId: z.string().describe("Property ObjectId.") },
    async ({ propertyId }) => {
      try {
        return okForAssistant(await client.get(`/payments/property-splits/${propertyId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "ledger_entries_list",
    "Read-only. The owner's ledger: payments and manual income/expense entries in one list with totals. Amounts are integer cents, returned as amountCents with amountFormatted; totals as incomeCents/expenseCents/netCents with formatted values.",
    {
      query: z
        .object({
          propertyId: z.string().optional().describe("Only this property."),
          from: z.number().int().positive().optional().describe("Start, epoch milliseconds."),
          to: z.number().int().positive().optional().describe("End, epoch milliseconds."),
          direction: z.enum(["income", "expense"]).optional().describe("Only income or only expenses."),
          category: z.string().optional().describe("Ledger category."),
          status: z.enum(["due", "paid"]).optional().describe("Only due or only paid rows."),
          page: z.number().int().positive().optional().describe("Page number, from 1."),
          limit: z.number().int().positive().max(200).optional().describe("Rows per page."),
        })
        .optional()
        .describe("Optional filters."),
    },
    async ({ query }) => {
      try {
        return okForAssistant(await client.get("/ledger-entries", query), { centsKeys: ["amount"] });
      } catch (error) {
        return fail(error);
      }
    }
  );
}
