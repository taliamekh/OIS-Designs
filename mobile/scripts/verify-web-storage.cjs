const {
  chromium,
} = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"),
  ts = require("typescript"),
  path = require("node:path"),
  assert = require("node:assert/strict");
let browser;
(async () => {
  const source = fs.readFileSync(
      path.resolve(__dirname, "../src/storage/indexedStore.ts"),
      "utf8",
    ),
    code = ts.transpileModule(source, {
      fileName: "indexedStore.ts",
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  await page.goto(
    (process.env.OIS_QA_BASE_URL || "http://localhost:8081") + "",
    {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    },
  );
  const run = async () =>
    page.evaluate(async (code) => {
      const moduleExports = {};
      new Function("exports", code)(moduleExports);
      const legacy = {
        getItem: async (k) =>
          ({
            old: "legacy-original",
            primary: "stale-primary",
            fresh: "fresh-legacy",
          })[k] ?? null,
        setItem: async () => {
          throw Error("Legacy writes are forbidden");
        },
      };
      const store = new moduleExports.IndexedStorage(legacy, "ois-storage-qa");
      if ((await store.getItem("old")) !== "legacy-original")
        throw Error("Legacy fallback failed");
      const large = "start:" + "x".repeat(8 * 1024 * 1024) + ":end";
      await store.setItem("primary", large);
      await store.setItem("backup", large);
      if (
        (await store.getItem("primary")) !== large ||
        (await store.getItem("backup")) !== large
      )
        throw Error("8MiB primary/backup mismatch");
      const db = await store.database(),
        original = db.transaction.bind(db);
      db.transaction = (...args) => {
        const tr = original(...args);
        if (args[1] === "readwrite") queueMicrotask(() => tr.abort());
        return tr;
      };
      let rejected = false;
      try {
        await store.setItem("primary", "replacement must abort");
      } catch {
        rejected = true;
      }
      db.transaction = original;
      if (!rejected || (await store.getItem("primary")) !== large)
        throw Error("Aborted transaction changed committed primary");
      await new Promise((resolve, reject) => {
        const tr = db.transaction("payloads", "readwrite");
        tr.objectStore("payloads").delete("primary");
        tr.oncomplete = resolve;
        tr.onabort = reject;
      });
      if ((await store.getItem("primary")) !== null)
        throw Error("Missing migrated primary resurrected stale legacy bytes");
      await store.setItem("primary", large);
      db.transaction = (...args) => {
        const tr = original(...args);
        if (args[1] === "readwrite") queueMicrotask(() => tr.abort());
        return tr;
      };
      let freshRejected = false;
      try {
        await store.setItem("fresh", "must abort with marker");
      } catch {
        freshRejected = true;
      }
      db.transaction = original;
      if (!freshRejected || (await store.getItem("fresh")) !== "fresh-legacy")
        throw Error(
          "Aborted migration published its marker or lost legacy access",
        );
      db.close();
      return {
        bytes: large.length,
        abortPreserved: true,
        legacyPreserved: true,
        missingMigratedPrimaryDoesNotResurrectLegacy: true,
        abortedMigrationPreservesLegacy: true,
      };
    }, code);
  const first = await run();
  await page.reload({ waitUntil: "domcontentloaded" });
  const restored = await page.evaluate(async (code) => {
    const e = {};
    new Function("exports", code)(e);
    const s = new e.IndexedStorage(
      { getItem: async () => null, setItem: async () => {} },
      "ois-storage-qa",
    );
    const p = await s.getItem("primary"),
      b = await s.getItem("backup");
    return {
      primary: p.length,
      backup: b.length,
      starts: p.startsWith("start:"),
      ends: p.endsWith(":end"),
    };
  }, code);
  assert.equal(restored.primary, first.bytes);
  assert.equal(restored.backup, first.bytes);
  assert.equal(restored.starts, true);
  assert.equal(restored.ends, true);
  const result = {
    at: new Date().toISOString(),
    first,
    restored,
    nativeValidation: false,
  };
  fs.writeFileSync(
    path.resolve(__dirname, "../../docs/build/web-storage-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
})().catch(async (e) => {
  if (browser) await browser.close();
  console.error(e);
  process.exitCode = 1;
});
