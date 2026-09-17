import ts from "typescript";
import { readFileSync } from "node:fs";

/**
 * Routes that mount a multer middleware accept `multipart/form-data`, not JSON.
 * Documenting them with a JSON body would send an integrator down a path the
 * server rejects, so the field name and cardinality are read from the
 * middleware call itself.
 */
export function readUploadRoutes(coreAppPath) {
  const sourceFile = ts.createSourceFile(
    coreAppPath,
    readFileSync(coreAppPath, "utf8"),
    ts.ScriptTarget.ES2022,
    true
  );
  const uploads = new Map();

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "app" &&
      ["post", "put", "patch"].includes(node.expression.name.text) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      for (const argument of node.arguments.slice(1)) {
        if (
          ts.isCallExpression(argument) &&
          ts.isPropertyAccessExpression(argument.expression) &&
          ["single", "array", "fields", "any"].includes(argument.expression.name.text)
        ) {
          const kind = argument.expression.name.text;
          const field =
            argument.arguments[0] && ts.isStringLiteral(argument.arguments[0])
              ? argument.arguments[0].text
              : "file";
          const maxCount =
            argument.arguments[1] && ts.isNumericLiteral(argument.arguments[1])
              ? Number(argument.arguments[1].text)
              : null;
          uploads.set(`${node.expression.name.text} ${node.arguments[0].text}`, {
            field,
            multiple: kind === "array" || kind === "any",
            maxCount,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return uploads;
}
