import { readFileSync } from "node:fs";

const ROUTE_RE = /app\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g;

export function readCoreRoutes(coreAppPath) {
  const source = readFileSync(coreAppPath, "utf8");
  return [...source.matchAll(ROUTE_RE)]
    .map((match) => ({ method: match[1], path: match[2] }))
    .sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}

export function normalizeToolPath(path) {
  return path.replace(/\$\{[^}]+}/g, ":param");
}

function segments(path) {
  return path.split("/").filter(Boolean);
}

/**
 * A tool path segment that came from a `${...}` interpolation always fills a
 * Core route parameter, and a literal segment always names itself. Matching
 * strictly on that rule is what keeps `/conversations/mark-read/:param` from
 * being absorbed by `/conversations/:conversationId/attachments`, which shares
 * its shape but not its meaning.
 */
export function routeMatches(toolPath, method, route) {
  if (route.method !== method) return false;
  const toolSegments = segments(toolPath);
  const routeSegments = segments(route.path);
  if (toolSegments.length !== routeSegments.length) return false;
  return toolSegments.every((segment, index) => {
    const routeSegment = routeSegments[index];
    return segment.startsWith(":") ? routeSegment.startsWith(":") : segment === routeSegment;
  });
}

export function findCoreRoute(routes, method, toolPath) {
  const normalized = normalizeToolPath(toolPath);
  const matches = routes.filter((route) => routeMatches(normalized, method, route));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  const exact = matches.find((route) => route.path === normalized);
  return exact || matches[0];
}

export function pathParameterNames(routePath) {
  return segments(routePath)
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1));
}

export function toOpenApiPath(routePath) {
  return (
    "/" +
    segments(routePath)
      .map((segment) => (segment.startsWith(":") ? `{${segment.slice(1)}}` : segment))
      .join("/")
  );
}

const INTERPOLATION_RE = /\$\{([^}]+)\}/g;

export function interpolationExpressions(toolPath) {
  return [...toolPath.matchAll(INTERPOLATION_RE)].map((match) => match[1]);
}

/**
 * A tool may interpolate an enum into a position that Core spells out as a
 * literal, as `/notes/get/${entityType}/${entityId}` does for the separate
 * `/notes/get/lead/:entityId` and `/notes/get/booking/:entityId` routes. Each
 * enum value is its own endpoint, so expand them rather than guessing one.
 */
export function expandEnumPaths(toolPath, enumValuesFor) {
  let candidates = [toolPath];
  for (const expression of interpolationExpressions(toolPath)) {
    const values = enumValuesFor(expression);
    if (!values || values.length === 0) continue;
    candidates = candidates.flatMap((candidate) =>
      values.map((value) => candidate.replace(`\${${expression}}`, value))
    );
  }
  return candidates;
}
