import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { fail, ok } from "./utils.js";

export function registerPollTools(server: McpServer, client: ApiClient) {
  server.tool(
    "polls_list",
    "List polls.",
    {},
    async () => {
      try {
        return ok(await client.get("/polls/get/all"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "polls_get",
    "Get a poll by ID.",
    { pollId: z.string().describe("Poll ID.") },
    async ({ pollId }) => {
      try {
        return ok(await client.get(`/polls/get/${pollId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "polls_active",
    "List polls active for the current owner.",
    {},
    async () => {
      try {
        return ok(await client.get("/polls/active"));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "polls_results",
    "Get poll results.",
    { pollId: z.string().describe("Poll ID.") },
    async ({ pollId }) => {
      try {
        return ok(await client.get(`/polls/results/${pollId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "polls_vote",
    "Vote on a poll. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /polls/vote request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/polls/vote", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
