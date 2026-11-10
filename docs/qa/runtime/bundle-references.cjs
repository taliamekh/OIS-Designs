const fs = require('node:fs');
const path = require('node:path');
const mobile = path.resolve(__dirname, '../../../mobile');
const ts = require(path.join(mobile, 'node_modules/typescript'));
module.exports = function bundleReferences(file, bytes = fs.readFileSync(file)) {
  const source = ts.createSourceFile(file, bytes.toString(), ts.ScriptTarget.Latest, true);
  const models = new Map();
  function visit(node) {
    if (ts.isPropertyAssignment(node) && (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name) || ts.isNumericLiteral(node.name)) && ts.isCallExpression(node.initializer)) {
      const call = node.initializer, arg = call.arguments[0];
      if (ts.isIdentifier(call.expression) && call.expression.text === 'require' && arg && ts.isStringLiteral(arg) && arg.text.endsWith('.glb')) models.set(node.name.text, arg.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source); return models;
};
