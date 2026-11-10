const {
  chromium,
} = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  assert = require("node:assert/strict");
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
const D = require("../src/domain/project.ts"),
  P = require("../src/domain/persistence.ts"),
  project = D.makeProject("office", 4, 3, 2.8);
project.name = "Imported library wins";
const target = {
  version: 1,
  projects: [{ past: [], present: project, future: [] }],
  activeId: project.id,
  favourites: [],
  recent: [],
  settings: { unit: "m", grid: true, quickMove: true, appearance: "dark" },
  lastDoor: {
    type: "single",
    width: 0.9,
    height: 2.1,
    hinge: "left",
    flip: false,
    repeat: true,
  },
};
let browser, page;
const errors = [],
  checks = [],
  out = path.resolve(__dirname, "../../docs/build");
(async () => {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put,
      get = IDBObjectStore.prototype.get,
      held = new WeakSet();
    globalThis.__saveFault = { delay: 0, abort: false, writes: [] };
    IDBObjectStore.prototype.put = function (value, key) {
      const result = put.call(this, value, key),
        fault = globalThis.__saveFault,
        tx = this.transaction;
      if (typeof key === "string" && key.startsWith("ois.library"))
        fault.writes.push({ key, value, at: performance.now() });
      if (fault.abort && key === "ois.library.v1")
        queueMicrotask(() => tx.abort());
      if (fault.delay && !held.has(tx)) {
        held.add(tx);
        const until = performance.now() + fault.delay,
          store = this;
        const keep = () => {
          const q = get.call(store, "__qa_keepalive__");
          q.onsuccess = () => {
            if (performance.now() < until) keep();
          };
        };
        keep();
      }
      return result;
    };
  });
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  await page.goto(((process.env.OIS_QA_BASE_URL || "http://localhost:8081") + '/settings'), {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page
    .getByRole("button", { name: "Show backup text", exact: true })
    .waitFor();
  await page.waitForTimeout(600);
  await page
    .getByRole("textbox", {
      name: "Paste an OIS backup to inspect",
      exact: true,
    })
    .fill(P.encode(target));
  await page.evaluate(() => {
    globalThis.__saveFault.delay = 700;
    globalThis.__saveFault.writes = [];
  });
  await click("ft");
  await click("Import validated backup");
  await page
    .getByText("Backup imported.", { exact: true })
    .waitFor({ timeout: 30000 });
  await page.waitForTimeout(1600);
  const records = await page.evaluate(() =>
    globalThis.__saveFault.writes
      .filter((w) => w.key === "ois.library.v1")
      .map((w) => ({
        id: JSON.parse(JSON.parse(w.value).payload).activeId,
        at: w.at,
      })),
  );
  assert.ok(records.length > 0);
  assert.ok(
    records.every((w) => w.id === project.id),
    "older pending autosave must not follow explicit recovery",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Show backup text", exact: true })
    .waitFor();
  const loaded = await page.evaluate(() => globalThis.__oisReadLibrary());
  assert.deepEqual(loaded, target);
  checks.push(
    "700ms database writes cannot let a pre-import autosave overwrite confirmed recovery",
  );
  await page.evaluate(() => {
    globalThis.__saveFault.abort = true;
  });
  await click("ft");
  await page
    .getByRole("button", { name: "Retry local save", exact: true })
    .waitFor({ timeout: 10000 });
  await click("Back");
  await page.getByText(/Changes not saved/).waitFor();
  checks.push("an aborted primary write never claims Saved locally");
  await click("Settings");
  await page.evaluate(() => {
    globalThis.__saveFault.abort = false;
  });
  await click("Retry local save");
  await page.waitForTimeout(600);
  await click("Back");
  await page.getByText(/Saved locally/).waitFor();
  assert.equal(await page.getByText(/Save failed/).count(), 0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Settings", exact: true }).waitFor();
  assert.equal(
    (await page.evaluate(() => globalThis.__oisReadLibrary())).settings.unit,
    "ft",
  );
  checks.push(
    "explicit retry clears the failure only after the current snapshot is durable",
  );
  const result = {
    at: new Date().toISOString(),
    checks,
    primaryWrites: records,
    errors,
    nativeValidation: false,
  };
  fs.writeFileSync(
    path.join(out, "save-order-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (page)
    await page
      .screenshot({ path: path.join(out, "screens/save-order-failure.png") })
      .catch(() => {});
  if (browser) await browser.close();
  console.error(e);
  console.log(JSON.stringify({ checks, errors }));
  process.exitCode = 1;
});
