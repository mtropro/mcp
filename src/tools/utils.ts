import { z } from "zod";

export const anyPayload = z.record(z.any()).optional().describe("Optional request body passed to MTRO Core.");
export const anyQuery = z.record(z.any()).optional().describe("Optional query parameters passed to MTRO Core.");

export function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function fail(error: unknown) {
  return {
    content: [{ type: "text" as const, text: String(error instanceof Error ? error.message : error) }],
    isError: true,
  };
}
