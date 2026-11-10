/* Isolated browser storage. Check the real development origin after cold loads. */
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
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
const D = require("../src/domain/project.ts"),
  P = require("../src/domain/persistence.ts"),
  project = D.makeProject("living", 4.8, 3.8),
  out = path.resolve(__dirname, "../../docs/build"),
  errors = [],
  checks = [];
project.name = "Cold preview check";
const library = {
  version: 1,
  projects: [{ past: [], present: project, future: [] }],
  activeId: project.id,
  favourites: [],
  recent: [],
  settings: { unit: "m", grid: true, quickMove: true, appearance: "light" },
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
(async () => {
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-webgl"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(
    (raw) => localStorage.setItem("ois.library.v1", raw),
    P.encode(library),
  );
  page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:8081", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page
    .getByRole("button", { name: "Open " + project.name, exact: true })
    .click();
  await page.getByRole("button", { name: "Build", exact: true }).waitFor();
  await page.locator("canvas").waitFor();
  checks.push("Initial real development-origin editor loads");
  for (let n = 1; n <= 2; n++) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    await page.getByRole("button", { name: "Build", exact: true }).waitFor();
    await page.locator("canvas").waitFor();
    assert.ok(!errors.some((e) => /Requiring unknown module/.test(e)));
    checks.push("Cold editor reload " + n + " remains interactive");
  }
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: path.join(out, "screens/cold-preview-verified.png"),
  });
})()
  .then(() => {
    fs.writeFileSync(
      path.join(out, "cold-preview-verified.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          checks,
          errors,
          isolatedStorage: true,
          originalQALibraryTouched: false,
          nativeValidation: false,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ checks, errors }));
  })
  .catch(async (error) => {
    await page
      ?.screenshot({ path: path.join(out, "screens/cold-preview-failure.png") })
      .catch(() => {});
    fs.writeFileSync(
      path.join(out, "cold-preview-verified.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          checks,
          errors,
          failure: error.stack,
          originalQALibraryTouched: false,
        },
        null,
        2,
      ),
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => browser?.close());
