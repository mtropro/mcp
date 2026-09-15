import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const NON_TOOL_FILES = new Set(["index.ts", "utils.ts", "refs.ts"]);

function templatePath(node, sourceFile) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (!ts.isTemplateExpression(node)) return null;
  return (
    node.head.text +
    node.templateSpans
      .map((span) => `\${${span.expression.getText(sourceFile)}}${span.literal.text}`)
      .join("")
  );
}

function objectKeys(node, sourceFile) {
  return node.properties.map((property) =>
    ts.isSpreadAssignment(property)
      ? `...${property.expression.getText(sourceFile)}`
      : property.name?.getText(sourceFile) ?? "?"
  );
}

/**
 * Handlers come in two shapes:
 *   async (params) => client.post(path, params)         → whole input object
 *   async ({ payload }) => client.post(path, payload)   → one input key
 * Knowing which one applies decides whether the request body is described by
 * the full tool schema or by a single property of it.
 */
function handlerInputBinding(handler) {
  const parameter = handler?.parameters?.[0];
  if (!parameter) return { kind: "none" };
  if (ts.isIdentifier(parameter.name)) return { kind: "whole", name: parameter.name.text };
  if (ts.isObjectBindingPattern(parameter.name)) {
    return {
      kind: "destructured",
      names: parameter.name.elements
        .map((element) => (ts.isIdentifier(element.name) ? element.name.text : null))
        .filter(Boolean),
    };
  }
  return { kind: "none" };
}

function describePayload(argument, sourceFile, binding) {
  if (!argument) return { kind: "none" };
  if (ts.isObjectLiteralExpression(argument)) {
    return { kind: "object", keys: objectKeys(argument, sourceFile) };
  }
  if (ts.isIdentifier(argument)) {
    if (binding.kind === "whole" && argument.text === binding.name) {
      return { kind: "whole-input" };
    }
    if (binding.kind === "destructured" && binding.names.includes(argument.text)) {
      return { kind: "input-key", key: argument.text };
    }
    return { kind: "identifier", name: argument.text };
  }
  return { kind: "expression", text: argument.getText(sourceFile).slice(0, 120) };
}

function isServerToolCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "tool" &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "server"
  );
}

function isClientCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "client" &&
    ["get", "post", "put", "patch", "delete"].includes(node.expression.name.text)
  );
}

export function extractToolCalls(toolsDir) {
  const files = readdirSync(toolsDir).filter(
    (file) => file.endsWith(".ts") && !NON_TOOL_FILES.has(file)
  );

  const tools = [];
  for (const file of files) {
    const fullPath = join(toolsDir, file);
    const sourceFile = ts.createSourceFile(
      fullPath,
      readFileSync(fullPath, "utf8"),
      ts.ScriptTarget.ES2022,
      true
    );

    const visit = (node) => {
      if (isServerToolCall(node)) {
        const [nameArgument, , , handlerArgument] = node.arguments;
        const name = nameArgument && ts.isStringLiteral(nameArgument) ? nameArgument.text : null;
        const binding = handlerArgument ? handlerInputBinding(handlerArgument) : { kind: "none" };

        const calls = [];
        const walkHandler = (child) => {
          if (isClientCall(child)) {
            calls.push({
              method: child.expression.name.text,
              path: templatePath(child.arguments[0], sourceFile),
              payload: describePayload(child.arguments[1], sourceFile, binding),
            });
          }
          ts.forEachChild(child, walkHandler);
        };
        if (handlerArgument) walkHandler(handlerArgument);

        if (name) tools.push({ name, file, calls });
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return tools;
}
