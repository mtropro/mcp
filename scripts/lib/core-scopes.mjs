import ts from "typescript";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

function parse(filePath) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.ES2022,
    true
  );
}

function readAccessActions(accessControlPath) {
  const sourceFile = parse(accessControlPath);
  const actions = new Set();
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "ACCESS_ACTIONS" &&
      node.initializer
    ) {
      const literal = ts.isAsExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
      if (ts.isArrayLiteralExpression(literal)) {
        for (const element of literal.elements) {
          if (ts.isStringLiteral(element)) actions.add(element.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return actions;
}

function readRouteModuleAliases(appSourceFile, coreRoot) {
  const aliases = new Map();
  const visit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.namedBindings &&
      ts.isNamespaceImport(node.importClause.namedBindings) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.startsWith("./routes/")) {
        const file = resolve(coreRoot, `${specifier.slice(2)}.ts`);
        if (existsSync(file)) {
          aliases.set(node.importClause.namedBindings.name.text, file);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(appSourceFile);
  return aliases;
}

/**
 * Route registrations carry optional rate-limit middleware before the handler
 * (`app.post("/users/login", authLimiter, users.loginUser)`), so the handler is
 * the last argument that reads as `<routeModule>.<exportedFunction>`.
 */
function handlerReference(callNode, aliases) {
  for (let index = callNode.arguments.length - 1; index >= 1; index -= 1) {
    const argument = callNode.arguments[index];
    if (
      ts.isPropertyAccessExpression(argument) &&
      ts.isIdentifier(argument.expression) &&
      aliases.has(argument.expression.text)
    ) {
      return { file: aliases.get(argument.expression.text), exportName: argument.name.text };
    }
  }
  return null;
}

function collectFunctionScopes(filePath, accessActions, cache) {
  if (cache.has(filePath)) return cache.get(filePath);
  const sourceFile = parse(filePath);
  const byExport = new Map();

  const scopesIn = (node) => {
    const found = new Set();
    const visit = (child) => {
      if (ts.isStringLiteral(child) && accessActions.has(child.text)) found.add(child.text);
      ts.forEachChild(child, visit);
    };
    visit(node);
    return [...found].sort();
  };

  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      byExport.set(node.name.text, scopesIn(node.body));
    }
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.length === 1 &&
      ts.isIdentifier(node.declarationList.declarations[0].name) &&
      node.declarationList.declarations[0].initializer
    ) {
      const declaration = node.declarationList.declarations[0];
      byExport.set(declaration.name.text, scopesIn(declaration.initializer));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  cache.set(filePath, byExport);
  return byExport;
}

/**
 * Maps `"<method> <path>"` to the access-control actions the Core handler
 * checks. Reading the handler body is the only source that cannot drift from
 * what the API actually enforces.
 */
export function readRouteScopes(coreAppPath, accessControlPath) {
  const coreRoot = dirname(coreAppPath);
  const appSourceFile = parse(coreAppPath);
  const accessActions = readAccessActions(accessControlPath);
  const aliases = readRouteModuleAliases(appSourceFile, coreRoot);
  const cache = new Map();
  const scopes = new Map();

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "app" &&
      ["get", "post", "put", "patch", "delete"].includes(node.expression.name.text) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const method = node.expression.name.text;
      const path = node.arguments[0].text;
      const handler = handlerReference(node, aliases);
      if (handler) {
        const byExport = collectFunctionScopes(handler.file, accessActions, cache);
        const found = byExport.get(handler.exportName);
        if (found && found.length > 0) scopes.set(`${method} ${path}`, found);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(appSourceFile);

  return { scopes, accessActions: [...accessActions].sort() };
}
