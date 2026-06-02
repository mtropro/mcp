type RefKind = "booking" | "payment";

const refStore = new Map<RefKind, Map<string, string>>();

export function resetRefs(kind: RefKind): void {
  refStore.set(kind, new Map());
}

export function rememberRef(kind: RefKind, ref: string, id: string): void {
  const normalizedRef = normalizeRef(ref);
  if (!normalizedRef || !id) return;
  const refs = refStore.get(kind) || new Map<string, string>();
  refs.set(normalizedRef, id);
  refStore.set(kind, refs);
}

export function resolveRef(kind: RefKind, idOrRef: string | undefined, fieldName: string): string {
  const value = typeof idOrRef === "string" ? idOrRef.trim() : "";
  if (!value) {
    throw new Error(`${fieldName} is required. Use the simple ref returned by the list tool.`);
  }
  const refs = refStore.get(kind);
  const resolved = refs?.get(normalizeRef(value));
  if (resolved) return resolved;
  if (looksLikeObjectId(value)) return value;
  throw new Error(`${fieldName} "${value}" is not known. Run the matching list tool first and use its simple ref.`);
}

export function formatRef(prefix: string, index: number): string {
  return `${prefix}${String(index + 1).padStart(3, "0")}`;
}

function normalizeRef(value: string): string {
  return value.trim().toUpperCase();
}

function looksLikeObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value);
}
