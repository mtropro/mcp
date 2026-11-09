import { z } from "zod";

export function enumValues(schema) {
  if (schema instanceof z.ZodEnum) return schema.options;
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodDefault) return enumValues(schema.unwrap());
  return null;
}

export function jsonSchemaFor(schema) {
  const result = z.toJSONSchema(schema, { target: "openapi-3.0", io: "input", unrepresentable: "any", reused: "inline" });
  delete result.$schema;
  return result;
}
