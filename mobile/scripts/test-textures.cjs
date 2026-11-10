/* Installed native upload contract, exercised with actual Three objects; no EXGL claim. */
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  ts = require("typescript"),
  fs = require("node:fs"),
  path = require("node:path"),
  THREE = require("three");
test("actual surface clone preserves native localUri upload mode and independent UV transforms", () => {
  const file = path.resolve(__dirname, "../src/scene/RoomScene.tsx"),
    source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
  let callback;
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === "raw.map"
    )
      callback = node.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(callback);
  const code = ts.transpileModule("module.exports = " + callback, {
      fileName: "clone.ts",
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText,
    moduleValue = { exports: null };
  new Function(
    "THREE",
    "repeatX",
    "repeatY",
    "angle",
    "offsetX",
    "offsetY",
    "module",
    code,
  )(THREE, 2, 3, 0.5, 0.2, 0.3, moduleValue);
  const clone = moduleValue.exports;
  const native = new THREE.Texture({
    data: { localUri: "file:///native/floor.png" },
    width: 512,
    height: 512,
  });
  native.isDataTexture = true;
  const q = clone(native, 0);
  assert.equal(q.isDataTexture, true);
  assert.equal(q.image.data.localUri, native.image.data.localUri);
  assert.notEqual(q.repeat, native.repeat);
  assert.notEqual(q.offset, native.offset);
  assert.deepEqual(q.repeat.toArray(), [2, 3]);
  assert.deepEqual(native.repeat.toArray(), [1, 1]);
  assert.equal(q.colorSpace, THREE.SRGBColorSpace);
  const web = new THREE.Texture({ src: "browser-image" }),
    webClone = clone(web, 1);
  assert.equal(webClone.isDataTexture, undefined);
  assert.equal(webClone.colorSpace, THREE.NoColorSpace);
  q.dispose();
  webClone.dispose();
  native.dispose();
  web.dispose();
});
