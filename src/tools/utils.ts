import { z } from "zod";

export const anyPayload = z.record(z.string(), z.any()).optional().describe("Optional request body passed to MTRO Core.");
export const anyQuery = z.record(z.string(), z.any()).optional().describe("Optional query parameters passed to MTRO Core.");

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

const WITHHELD_KEYS = new Set([
  "code",
  "url",
  "fileUrl",
  "resumeUrl",
  "reportUrl",
  "checkoutUrl",
  "paymentCheckoutUrl",
  "paymentShortUrl",
  "signedUrl",
  "publicToken",
]);
const TIMESTAMP_KEY = /(At|Date)$/;

export const WITHHELD_NOTE =
  "Door codes, document files and tokenized guest/payment links are withheld (shown as <field>Withheld: true); send the owner to the MTRO screen to view or share them.";

export function formatCents(cents: number, currency = "usd"): string {
  const code = String(currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

/**
 * Shapes a Core read for an assistant: integer cents become explicit
 * `<name>Cents` + `<name>Formatted` pairs, epoch-millisecond timestamps become
 * ISO strings, and secrets an assistant must never relay are withheld.
 */
export function assistantView(value: unknown, options: { centsKeys?: string[]; currency?: string } = {}): unknown {
  const centsKeys = new Set(options.centsKeys || []);
  const walk = (node: unknown, currency: string): unknown => {
    if (Array.isArray(node)) return node.map((item) => walk(item, currency));
    if (!node || typeof node !== "object" || node instanceof Date) return node;
    const record = node as Record<string, unknown>;
    const ownCurrency = typeof record.currency === "string" && record.currency ? record.currency : currency;
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(record)) {
      if (WITHHELD_KEYS.has(key) || /Token$/.test(key)) {
        if (raw !== null && raw !== undefined && raw !== "") out[`${key}Withheld`] = true;
        continue;
      }
      if ((key.endsWith("Cents") || centsKeys.has(key)) && typeof raw === "number" && Number.isFinite(raw)) {
        const base = key.endsWith("Cents") ? key.slice(0, -5) : key;
        out[`${base}Cents`] = raw;
        out[`${base}Formatted`] = formatCents(raw, ownCurrency);
        continue;
      }
      if (TIMESTAMP_KEY.test(key) && typeof raw === "number" && raw > 1e11 && raw < 1e14) {
        out[key] = new Date(raw).toISOString();
        continue;
      }
      out[key] = walk(raw, ownCurrency);
    }
    return out;
  };
  return walk(value, options.currency || "usd");
}

export function okForAssistant(data: unknown, options: { centsKeys?: string[]; currency?: string } = {}) {
  return ok(assistantView(data, options));
}
