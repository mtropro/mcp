import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, ok } from "./utils.js";

export function registerCampaignTools(server: McpServer, client: ApiClient) {
  server.tool(
    "campaigns_list",
    "List notification campaigns.",
    {},
    async () => {
      try {
        return ok(await client.get("/campaigns/get/all"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "campaigns_get",
    "Get a notification campaign by ID.",
    { campaignId: z.string().describe("Campaign ID.") },
    async ({ campaignId }) => {
      try {
        return ok(await client.get(`/campaigns/get/${campaignId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "campaigns_create",
    "Create a notification campaign. This can send external communication and should require owner/admin confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /campaigns/create request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/campaigns/create", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "campaigns_stop",
    "Stop a notification campaign. This changes external communication state and should require confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /campaigns/stop request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/campaigns/stop", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "campaigns_resume",
    "Resume a notification campaign. This changes external communication state and should require confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /campaigns/resume request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/campaigns/resume", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "campaigns_delete",
    "Delete a notification campaign. This is destructive and should require confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /campaigns/delete request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/campaigns/delete", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
