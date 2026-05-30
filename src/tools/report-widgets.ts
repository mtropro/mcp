import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { anyQuery, fail, ok } from "./utils.js";

export function registerReportWidgetTools(server: McpServer, client: ApiClient) {
  server.tool(
    "report_widgets_list",
    "List dashboard report widgets.",
    { query: anyQuery },
    async ({ query }) => {
      try {
        return ok(await client.get("/report-widgets/get/all", query));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "report_widgets_get",
    "Get a dashboard report widget by ID.",
    { widgetId: z.string().describe("Report widget ID.") },
    async ({ widgetId }) => {
      try {
        return ok(await client.get(`/report-widgets/get/${widgetId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "report_widgets_data",
    "Run a report widget and return its data.",
    { payload: z.record(z.any()).describe("Core /report-widgets/data request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/report-widgets/data", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "report_widgets_ai_assist",
    "Ask Core's report widget assistant to help generate widget logic.",
    { payload: z.record(z.any()).describe("Core /report-widgets/ai-assist request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/report-widgets/ai-assist", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "report_widgets_create",
    "Create a report widget. This writes dashboard configuration and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /report-widgets/create request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/report-widgets/create", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "report_widgets_update",
    "Update a report widget. This writes dashboard configuration and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /report-widgets/update request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/report-widgets/update", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "report_widgets_delete",
    "Delete a report widget. This is destructive and should require owner confirmation when used by an agent.",
    { widgetId: z.string().describe("Report widget ID.") },
    async ({ widgetId }) => {
      try {
        return ok(await client.post("/report-widgets/delete", { widgetId }));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
