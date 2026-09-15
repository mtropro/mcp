import ts from "typescript";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

function parse(filePath) {
  return ts.createSourceFile(filePath, readFileSync(filePath, "utf8"), ts.ScriptTarget.ES2022, true);
}

function routeModuleAliases(appSourceFile, coreRoot) {
  const aliases = new Map();
  const visit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.namedBindings &&
      ts.isNamespaceImport(node.importClause.namedBindings) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.startsWith("./routes/")
    ) {
      const file = resolve(coreRoot, `${node.moduleSpecifier.text.slice(2)}.ts`);
      if (existsSync(file)) aliases.set(node.importClause.namedBindings.name.text, file);
    }
    ts.forEachChild(node, visit);
  };
  visit(appSourceFile);
  return aliases;
}

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

/**
 * Collects the request body keys a handler actually reads, whether through
 * `req.body.field`, `const { field } = req.body`, or a variable that was first
 * assigned `req.body`. These names are the real contract: a field the handler
 * never reads is silently ignored, however well documented it is.
 */
function bodyFieldsIn(node, sourceFile) {
  const fields = new Set();
  const bodyAliases = new Set(["req.body"]);
  // `req.body` handed to a helper, a spread, or a model constructor means the
  // handler may accept fields this pass cannot see, so the field list stops
  // being exhaustive and must not be used to call a documented field wrong.
  let forwards = false;

  const isReqBody = (expression) => {
    const text = expression.getText(sourceFile);
    return text === "req.body" || bodyAliases.has(text);
  };

  const collectBinding = (bindingName) => {
    if (!ts.isObjectBindingPattern(bindingName)) return;
    for (const element of bindingName.elements) {
      const name = element.propertyName || element.name;
      if (ts.isIdentifier(name)) fields.add(name.text);
      else if (ts.isStringLiteral(name)) fields.add(name.text);
    }
  };

  // First pass: find `const body = req.body` style aliases.
  const aliasPass = (child) => {
    if (
      ts.isVariableDeclaration(child) &&
      ts.isIdentifier(child.name) &&
      child.initializer &&
      isReqBody(child.initializer)
    ) {
      bodyAliases.add(child.name.text);
    }
    ts.forEachChild(child, aliasPass);
  };
  aliasPass(node);

  const visit = (child) => {
    if ((ts.isCallExpression(child) || ts.isNewExpression(child)) && child.arguments) {
      for (const argument of child.arguments) {
        if (isReqBody(argument)) forwards = true;
      }
    }
    if (ts.isSpreadAssignment(child) && isReqBody(child.expression)) forwards = true;
    if (ts.isSpreadElement(child) && isReqBody(child.expression)) forwards = true;
    if (ts.isPropertyAccessExpression(child) && isReqBody(child.expression)) {
      fields.add(child.name.text);
    }
    if (
      ts.isElementAccessExpression(child) &&
      isReqBody(child.expression) &&
      child.argumentExpression &&
      ts.isStringLiteral(child.argumentExpression)
    ) {
      fields.add(child.argumentExpression.text);
    }
    if (ts.isVariableDeclaration(child) && child.initializer && isReqBody(child.initializer)) {
      collectBinding(child.name);
    }
    ts.forEachChild(child, visit);
  };
  visit(node);

  return { fields, forwards };
}

/**
 * Handlers in this codebase open with a single guard of the form
 *   if (req.body.a !== undefined && req.body.b !== undefined) { ... }
 * and answer "Malformed request." when it does not hold. Reading only that
 * first guard, and only when every operand has that exact shape, keeps this
 * from mistaking an optional branch such as `if (req.body.expiresAt !== undefined)`
 * for a requirement.
 */
function requiredBodyFieldsIn(body, sourceFile) {
  const firstStatement = body.statements?.find((statement) => !ts.isVariableStatement(statement));
  if (!firstStatement || !ts.isIfStatement(firstStatement)) return null;

  const operands = [];
  const flatten = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      flatten(node.left);
      flatten(node.right);
      return;
    }
    operands.push(node);
  };
  flatten(firstStatement.expression);

  const fields = [];
  for (const operand of operands) {
    if (
      !ts.isBinaryExpression(operand) ||
      operand.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken ||
      !ts.isPropertyAccessExpression(operand.left) ||
      operand.right.getText(sourceFile) !== "undefined"
    ) {
      return null;
    }
    const target = operand.left.expression.getText(sourceFile);
    if (target === "req.body") fields.push(operand.left.name.text);
    else if (target !== "req.params") return null;
  }
  return fields.length > 0 ? fields : null;
}

export function readRouteBodyFields(coreAppPath) {
  const coreRoot = dirname(coreAppPath);
  const appSourceFile = parse(coreAppPath);
  const aliases = routeModuleAliases(appSourceFile, coreRoot);
  const cache = new Map();
  const byRoute = new Map();

  const handlersIn = (filePath) => {
    if (cache.has(filePath)) return cache.get(filePath);
    const sourceFile = parse(filePath);
    const found = new Map();
    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name && node.body) {
        found.set(node.name.text, {
          ...bodyFieldsIn(node.body, sourceFile),
          required: requiredBodyFieldsIn(node.body, sourceFile),
        });
      }
      if (
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.length === 1 &&
        ts.isIdentifier(node.declarationList.declarations[0].name) &&
        node.declarationList.declarations[0].initializer
      ) {
        const declaration = node.declarationList.declarations[0];
        found.set(declaration.name.text, bodyFieldsIn(declaration.initializer, sourceFile));
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    cache.set(filePath, found);
    return found;
  };

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
      const handler = handlerReference(node, aliases);
      if (handler) {
        const fields = handlersIn(handler.file).get(handler.exportName);
        if (fields) {
          byRoute.set(`${node.expression.name.text} ${node.arguments[0].text}`, fields);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(appSourceFile);

  return byRoute;
}
