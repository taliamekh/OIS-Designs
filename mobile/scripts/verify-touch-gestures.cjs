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
  assets = require("../src/catalogue/assets.json"),
  a = assets.find((a) => a.geometryFamily === "coffee-table"),
  project = D.makeProject("living", 4.8, 3.8),
  floor = project.floors[0];
project.name = "Touch gesture fixture";
floor.items = [
  {
    id: "touch-table",
    roomId: floor.rooms[0].id,
    assetId: a.id,
    assetVersion: a.version,
    assetHash: a.sha256,
    x: 2.4,
    z: 1.9,
    yaw: 0,
    locked: false,
    materialOverrides: {},
  },
];
const fixture = {
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
const errors = [],
  checks = [],
  out = path.resolve(__dirname, "../../docs/build");
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
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const click = (name) =>
      page.getByRole("button", { name, exact: true }).click(),
    state = () =>
      page.evaluate(() => {
        const l = globalThis.__oisReadLibrary();
        return l.projects.find((h) => h.present.id === l.activeId);
      });
  await page.goto(
    (process.env.OIS_QA_BASE_URL || "http://localhost:8081") + "/settings",
    {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    },
  );
  await page
    .getByRole("textbox", {
      name: "Paste an OIS backup to inspect",
      exact: true,
    })
    .fill(P.encode(fixture));
  await click("Import validated backup");
  await page.getByText("Backup imported.", { exact: true }).waitFor();
  await click("Back");
  await click("Open " + project.name);
  await page.waitForFunction(
    () => globalThis.__oisSceneProbe?.().items.length === 1,
  );
  const cdp = await context.newCDPSession(page);
  const send = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map((p, i) => ({
        x: p.x,
        y: p.y,
        id: i,
        radiusX: 5,
        radiusY: 5,
        force: 1,
      })),
    });
  async function pinch(x, y, delta = 35) {
    await send("touchStart", [
      { x: x - 30, y },
      { x: x + 30, y },
    ]);
    await send("touchMove", [
      { x: x - 30 - delta, y },
      { x: x + 30 + delta, y },
    ]);
    await send("touchEnd", []);
    await page.waitForTimeout(150);
  }
  let probe = await page.evaluate(() => globalThis.__oisSceneProbe()),
    canvas = await page.locator("canvas").boundingBox(),
    table = probe.items[0],
    before = JSON.stringify(await state());
  await pinch(canvas.x + table.x, canvas.y + table.y, 25);
  const after3D = await page.evaluate(() => globalThis.__oisSceneProbe());
  assert.notDeepEqual(after3D.camera, probe.camera);
  assert.equal(JSON.stringify(await state()), before);
  checks.push(
    "real browser two-touch3Dpinch changes camera while a furniture-origin gesture preserves history and transforms",
  );
  await click("View 2D");
  await page.getByTestId("plan-canvas").waitFor();
  const planBefore = await page.evaluate(() => globalThis.__oisPlanProbe()),
    box = await page.getByTestId("plan-canvas").boundingBox();
  await pinch(box.x + 195, box.y + 300, 30);
  let plan = await page.evaluate(() => globalThis.__oisPlanProbe());
  assert.ok(plan.scale > planBefore.scale * 1.2);
  assert.equal(JSON.stringify(await state()), before);
  checks.push(
    "real browser two-touch plan zoom changes scale without moving the item",
  );
  await click("Build");
  await click("Doors and openings");
  await click("Place on floor plan");
  plan = await page.evaluate(() => globalThis.__oisPlanProbe());
  let drawing = await page.getByTestId("plan-canvas").boundingBox(),
    x = drawing.x + plan.ox + 2.4 * plan.scale,
    y = drawing.y + plan.oz + 3.8 * plan.scale;
  assert.ok(x > 0 && x < 390 && y > 100 && y < 720);
  const openings = (await state()).present.floors[0].openings.length;
  await send("touchStart", [
    { x, y },
    { x: x + 25, y: y - 20 },
  ]);
  await send("touchEnd", []);
  await page.waitForTimeout(150);
  assert.equal((await state()).present.floors[0].openings.length, openings);
  checks.push("two-finger tap on an eligible wall does not stamp an opening");
  await pinch(x, y - 5, 15);
  assert.equal((await state()).present.floors[0].openings.length, openings);
  checks.push(
    "pinch during door placement is navigation-only and creates no Undo entry",
  );
  plan = await page.evaluate(() => globalThis.__oisPlanProbe());
  drawing = await page.getByTestId("plan-canvas").boundingBox();
  x = drawing.x + plan.ox + 2.4 * plan.scale;
  y = drawing.y + plan.oz + 3.8 * plan.scale;
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(150);
  assert.equal((await state()).present.floors[0].openings.length, openings + 1);
  checks.push("a deliberate single touch still places one opening");
  const result = {
    at: new Date().toISOString(),
    checks,
    errors,
    nativeTouchValidation: false,
  };
  fs.writeFileSync(
    path.join(out, "touch-gesture-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (page)
    await page
      .screenshot({ path: path.join(out, "screens/touch-gesture-failure.png") })
      .catch(() => {});
  if (browser) await browser.close();
  console.error(e);
  console.log(JSON.stringify({ checks, errors }));
  process.exitCode = 1;
});
