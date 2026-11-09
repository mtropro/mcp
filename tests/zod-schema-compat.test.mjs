import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { enumValues, jsonSchemaFor } from "../scripts/lib/zod-schemas.mjs";

test("expanded path enums retain optional/default values", () => {
  const type = z.enum(["lead", "booking"]);
  assert.deepEqual(enumValues(type), ["lead", "booking"]);
  assert.deepEqual(enumValues(type.optional()), ["lead", "booking"]);
  assert.deepEqual(enumValues(type.default("lead")), ["lead", "booking"]);
  assert.equal(enumValues(z.string()), null);
});

test("published input schemas retain required fields, bounds and descriptions", () => {
  const schema = jsonSchemaFor(z.object({
    leadId: z.string().min(1).describe("Exact Lead reference"),
    budget: z.number().nonnegative().optional(),
    payload: z.record(z.string(), z.any()).optional(),
  }));
  assert.deepEqual(schema.required, ["leadId"]);
  assert.equal(schema.properties.leadId.type, "string");
  assert.equal(schema.properties.leadId.minLength, 1);
  assert.equal(schema.properties.leadId.description, "Exact Lead reference");
  assert.equal(schema.properties.budget.minimum, 0);
  assert.equal(schema.properties.payload.type, "object");
  assert.deepEqual(schema.properties.payload.additionalProperties, {});
  assert(!schema.$schema);
});
