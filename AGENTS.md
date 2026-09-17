# MTRO PRO MCP Server

MCP server exposing MTRO PRO Core to AI assistants, and the source of the
published OpenAPI document.

Global agent rules live in `~/.agents/AGENTS.md`. Monorepo-wide notes live in
the `AGENTS.md` at the root of the `@mtropro` working directory.

## The tool registry is the API's documented surface

`src/tools/*.ts` is not only what an assistant calls. `scripts/generate-openapi.mjs`
reads this registry — the tool names, descriptions, and zod schemas — together
with the Core route table, and writes `../core/openapi/openapi.json`, which Core
serves at `/openapi.json` and the documentation site renders.

So a change to a tool's schema is a change to published documentation. Regenerate
after editing:

```bash
pnpm generate:openapi
```

## The checks, and why each exists

| Command | What it protects |
|---|---|
| `pnpm audit:core-routes` | Every tool call hits a mounted Core route, and the spec documents exactly the endpoints the registry reaches. Drift in either direction fails. |
| `pnpm verify:spec-fields` | Every documented request field is one the Core handler reads, and every field the handler requires is documented as required. |
| `pnpm capture:responses` | Regenerates `openapi/response-shapes.json` from real replies. |

`audit:core-routes` and `verify:spec-fields` run in `pnpm test`.

The field check exists because a tool can send field names Core silently ignores
and nothing fails loudly: `leads_create` sent `name` where Core reads
`tenantName`, and `guests_search` sent `query` where Core reads `search`, so
every search quietly returned the unfiltered list. Reading the handler is the
only way to catch that class of defect.

## Capturing response shapes

`pnpm capture:responses` starts the sibling Core checkout against a throwaway
local MongoDB, seeds one entity and one property manager, creates synthetic
fixtures through the API, and records the shape of every read endpoint's reply.

- It needs a MongoDB on `127.0.0.1:27017`. It creates and drops its own database.
- Values are synthetic on purpose: these shapes end up in public documentation,
  so no real guest data can leak into it.
- Required-ness is deliberately not inferred — one captured reply cannot
  establish which fields are always present.
- `CORE_DIR` points at a different Core checkout; `CAPTURE_PORT` moves the port.

## Conventions

- Route matching is strict: an interpolated path segment matches a route
  parameter, never a literal. Loosening it silently maps tools onto the wrong
  endpoints.
- Do not commit `openapi/generation-report.json`; it is regenerated output.
- `openapi/response-shapes.json` is committed, so the spec can be regenerated
  without running Core.
