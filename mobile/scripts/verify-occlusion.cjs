/* Actual touch selection/orbit through opaque walls and cutaway visibility. */
const {
    chromium,
  } = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"),
  fs = require("node:fs"),
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
  assets = require("../src/catalogue/assets.json"),
  a = assets.find((a) => a.id === "ois.calm-oak.sofa"),
  project = D.makeProject("living", 6, 5),
  floor = project.floors[0],
  out = path.resolve(__dirname, "../../docs/build"),
  checks = [],
  errors = [];
project.name = "Opaque wall touch";
floor.items.push({
  id: "occluded-sofa",
  roomId: floor.rooms[0].id,
  assetId: a.id,
  assetVersion: a.version,
  assetHash: a.sha256,
  x: 3,
  z: 4.1,
  yaw: Math.PI,
  locked: false,
  materialOverrides: {},
});
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
    hasTouch: true,
    isMobile: true,
  });
  await context.addInitScript(
    (raw) => localStorage.setItem("ois.library.v1", raw),
    P.encode(library),
  );
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const click = (name) =>
      page.getByRole("button", { name, exact: true }).click(),
    probe = () => page.evaluate(() => globalThis.__oisSceneProbe()),
    history = () =>
      page.evaluate(() =>
        JSON.stringify(globalThis.__oisReadLibrary().projects[0]),
      ),
    target = async () => {
      const s = await probe(),
        box = await page.locator("canvas").boundingBox(),
        point = s.items.find((i) => i.id === "occluded-sofa");
      return { x: box.x + point.x, y: box.y + point.y };
    };
  await page.goto(process.env.OIS_QA_BASE_URL || "http://localhost:8081", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await click("Open " + project.name);
  await page.waitForFunction(() =>
    globalThis.__oisSceneProbe?.().items.some((i) => i.id === "occluded-sofa"),
  );
  await click("Build");
  await click("Cut away near walls");
  await click("Close Build");
  await page.waitForTimeout(150);
  const before = await history(),
    beforeProbe = await probe(),
    point = await target();
  await page.screenshot({
    path: path.join(out, "screens/opaque-wall-before-touch.png"),
  });
  await page.touchscreen.tap(point.x, point.y);
  assert.equal(
    await page
      .getByRole("button", { name: "Furniture properties", exact: true })
      .count(),
    0,
  );
  assert.equal(await history(), before);
  checks.push(
    "touching the hidden sofa's projection selects no furniture and preserves the complete project/history",
  );
  const cdp = await context.newCDPSession(page),
    send = (type, x, y) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints:
          type === "touchEnd"
            ? []
            : [{ x, y, id: 0, radiusX: 5, radiusY: 5, force: 1 }],
      });
  await send("touchStart", point.x, point.y);
  for (let n = 1; n <= 12; n++)
    await send("touchMove", point.x + (n * 25) / 12, point.y - (n * 20) / 12);
  await send("touchEnd");
  await page.waitForTimeout(150);
  const after = await probe();
  assert.notDeepEqual(after.camera, beforeProbe.camera);
  assert.equal(await history(), before);
  checks.push(
    "a real touch drag on the opaque wall orbits the camera without moving the hidden sofa or adding Undo",
  );
  await page.screenshot({
    path: path.join(out, "screens/opaque-wall-after-orbit.png"),
  });
  await click("Build");
  await click("Cut away near walls");
  await click("Close Build");
  await page.waitForTimeout(150);
  const visiblePoint = await target();
  await page.touchscreen.tap(visiblePoint.x, visiblePoint.y);
  await page
    .getByRole("button", { name: "Furniture properties", exact: true })
    .waitFor();
  assert.equal(await history(), before);
  checks.push(
    "the now-visible sofa still selects through cutaway wall ancestors without mutating its saved data",
  );
  await page.screenshot({
    path: path.join(out, "screens/cutaway-visible-selection.png"),
  });
  const result = {
    at: new Date().toISOString(),
    checks,
    errors,
    beforeCamera: beforeProbe.camera,
    afterCamera: after.camera,
    nativeValidation: false,
  };
  fs.writeFileSync(
    path.join(out, "occlusion-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (page)
    await page
      .screenshot({ path: path.join(out, "screens/occlusion-failure.png") })
      .catch(() => {});
  if (browser) await browser.close();
  console.error(e);
  console.log(JSON.stringify({ checks, errors }));
  process.exitCode = 1;
});
