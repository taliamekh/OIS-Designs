const {
  chromium,
} = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
let browser, page;
const fixture = path.resolve(
    __dirname,
    "../../docs/qa/runtime/runs/2026-11-10T02-16-02-194Z-save-size/house-300-primary.json",
  ),
  raw = fs.readFileSync(fixture, "utf8"),
  out = path.resolve(__dirname, "../../docs/build"),
  errors = [],
  checks = [];
(async () => {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(((process.env.OIS_QA_BASE_URL || "http://localhost:8081") + '/settings'), {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  await page
    .getByRole("button", { name: "Export project library", exact: true })
    .waitFor({ timeout: 60000 });
  const read = () => page.evaluate(() => globalThis.__oisReadLibrary());
  const before = await read();
  let chooserPromise = page.waitForEvent("filechooser");
  await click("Choose backup file");
  await (await chooserPromise).setFiles(fixture);
  await page
    .getByText(/house-300-primary.json: 1 projects/)
    .waitFor({ timeout: 60000 });
  assert.deepEqual(await read(), before);
  checks.push(
    "selecting a300-item/50-Undo backup previews it without changing the library",
  );
  await click("Import validated backup");
  await page
    .getByText("Backup imported.", { exact: true })
    .waitFor({ timeout: 60000 });
  const imported = await read();
  assert.equal(imported.projects[0].past.length, 50);
  assert.equal(
    imported.projects[0].present.floors.flatMap((f) => f.items).length,
    300,
  );
  checks.push(
    "actual file import persists the complete populated project and history",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Export project library", exact: true })
    .waitFor();
  assert.deepEqual(await read(), imported);
  checks.push("300-item library and50Undo snapshots survive browser reload");
  const downloadPromise = page.waitForEvent("download");
  await click("Export project library");
  const download = await downloadPromise,
    destination = path.resolve(__dirname, "../.tools/backup-transport.json");
  await download.saveAs(destination);
  const bytes = fs.readFileSync(destination, "utf8");
  assert.equal(bytes, raw);
  checks.push("actual download preserves every original backup byte");
  chooserPromise = page.waitForEvent("filechooser");
  await click("Choose backup file");
  await (
    await chooserPromise
  ).setFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...JSON.parse(raw), schema: 99 })),
  });
  await page
    .getByText(
      /newer app|newer version|Unsupported backup|Unsupported save|future/i,
    )
    .first()
    .waitFor();
  assert.deepEqual(await read(), imported);
  assert.equal(
    await page
      .getByRole("button", { name: "Import validated backup", exact: true })
      .getAttribute("aria-disabled"),
    "true",
  );
  checks.push(
    "invalid future backup leaves the open library intact and cannot import a stale selection",
  );
  const result = {
    at: new Date().toISOString(),
    fixture: path.relative(path.resolve(__dirname, "../.."), fixture),
    bytes: Buffer.byteLength(bytes),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    checks,
    errors,
    nativeValidation: false,
  };
  fs.writeFileSync(
    path.join(out, "backup-file-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (page) {
    await page
      .screenshot({ path: path.join(out, "screens/backup-file-failure.png") })
      .catch(() => {});
    console.log((await page.locator("body").innerText()).slice(-1000));
  }
  if (browser) await browser.close();
  console.error(e);
  console.log(JSON.stringify({ checks, errors }));
  process.exitCode = 1;
});
