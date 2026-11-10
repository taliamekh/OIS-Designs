/* Production cache logic with renderer clear mocked; no native/GPU claim. */
const fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module"),
  assert = require("node:assert/strict"),
  { test } = require("node:test"),
  THREE = require("three");
require.extensions[".ts"] = (mod, file) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
const original = Module._load;
Module._load = function (request, parent, ...rest) {
  if (request === "./fiber" && parent.filename.endsWith("resources.ts"))
    return { useLoader: { clear() {} } };
  return original.call(this, request, parent, ...rest);
};
const R = require("../src/scene/resources.ts");
Module._load = original;
const flush = () => Promise.resolve().then(() => Promise.resolve());
test("wanted but uncommitted40-model loads survive LRU; released/abandoned sources are bounded with exact clear keys", async () => {
  const hashes = Array.from({ length: 40 }, (_, i) => "model-" + i),
    clears = [],
    sources = hashes.map((hash, i) => ({
      hash,
      key: i + 1000,
      gltf: { scene: new THREE.Group() },
      bytes: 1024 * 1024,
    }));
  const releaseIntent = R.retainWantedModels(hashes);
  for (const s of sources)
    R.registerLoadedModel(s.hash, s.key, s.gltf, s.bytes, () =>
      clears.push(s.key),
    );
  await flush();
  assert.equal(R.modelCacheStats().entries, 40);
  assert.equal(R.modelCacheStats().pending, 40);
  assert.equal(clears.length, 0);
  // Replacing one viewport scope must not expose its still-wanted pending hashes.
  releaseIntent();
  const releaseReplacement = R.retainWantedModels(hashes);
  await flush();
  assert.equal(clears.length, 0);
  const releases = sources.map((s) =>
    R.retainModel(s.hash, s.key, s.gltf, s.bytes),
  );
  releaseReplacement();
  await flush();
  assert.equal(R.modelCacheStats().active, 40);
  assert.equal(clears.length, 0);
  for (const release of releases.slice(0, -1)) release();
  await flush();
  assert.equal(R.modelCacheStats().active, 1);
  assert.ok(R.modelCacheStats().idle <= 8);
  assert.ok(
    !clears.includes(sources.at(-1).key),
    "active source cannot be cleared",
  );
  assert.ok(
    clears.every((k) => Number.isInteger(k) && k >= 1000 && k < 1040),
    "preserve exact native numeric cache keys",
  );
  releases.at(-1)();
  await flush();
  assert.equal(R.modelCacheStats().active, 0);
  assert.equal(R.modelCacheStats().wanted, 0);
  assert.ok(R.modelCacheStats().idle <= 8);
  for (let i = 40; i < 80; i++) {
    const scene = new THREE.Group();
    R.registerLoadedModel(
      "abandoned-" + i,
      "url-" + i,
      { scene },
      1024 * 1024,
      () => clears.push("url-" + i),
    );
  }
  await flush();
  assert.ok(R.modelCacheStats().idle <= 8);
  assert.ok(R.modelCacheStats().sourceBytes <= 16 * 1024 * 1024);
});
