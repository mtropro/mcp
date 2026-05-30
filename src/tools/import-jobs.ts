import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../api-client.js";
import { anyQuery, fail, ok } from "./utils.js";

export function registerImportJobTools(server: McpServer, client: ApiClient) {
  server.tool(
    "import_jobs_list",
    "List async import jobs.",
    { query: anyQuery },
    async ({ query }) => {
      try {
        return ok(await client.get("/import-jobs/list", query));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "import_jobs_get",
    "Get an async import job by ID.",
    { jobId: z.string().describe("Import job ID.") },
    async ({ jobId }) => {
      try {
        return ok(await client.get(`/import-jobs/${jobId}`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "import_jobs_create",
    "Create an async import job. This writes account data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /import-jobs request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/import-jobs", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "import_jobs_cancel",
    "Cancel an async import job. This changes import state and should require owner confirmation when used by an agent.",
    { jobId: z.string().describe("Import job ID.") },
    async ({ jobId }) => {
      try {
        return ok(await client.post(`/import-jobs/${jobId}/cancel`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "import_jobs_mark_reviewed",
    "Mark an async import job as reviewed. This writes account data and should require owner confirmation when used by an agent.",
    { jobId: z.string().describe("Import job ID.") },
    async ({ jobId }) => {
      try {
        return ok(await client.post(`/import-jobs/${jobId}/mark-reviewed`));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "ff_import_scrape",
    "Start a Furnished Finder scrape through the Core proxy. This can create import data and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /ff-import/scrape request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/ff-import/scrape", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );

  server.tool(
    "ff_import_upload_images",
    "Upload Furnished Finder scraped images through the Core proxy. This writes media and should require owner confirmation when used by an agent.",
    { payload: z.record(z.any()).describe("Core /ff-import/upload-images request body.") },
    async ({ payload }) => {
      try {
        return ok(await client.post("/ff-import/upload-images", payload));
      } catch (error) {
        return fail(error);
      }
    }
  );
}
