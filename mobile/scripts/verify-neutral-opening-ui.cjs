/* Actual floor registration on the immutable legacy fixture, quick-door
 * corner clamps and explicit correction of a recoverable old aperture. */
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
  G = require("../src/domain/geometry.ts"),
  P = require("../src/domain/persistence.ts"),
  out = path.resolve(__dirname, "../../docs/build"),
  checks = [],
  errors = [];
let browser, page;
const click = (name) => page.getByRole("button", { name, exact: true }).click();
const read = () =>
  page.evaluate(() => globalThis.__oisReadLibrary().projects[0]);
const library = (p) => ({
  version: 1,
  projects: [{ past: [], present: p, future: [] }],
  activeId: p.id,
  favourites: [],
  recent: [],
  settings: { unit: "m", grid: false, quickMove: true, appearance: "light" },
  lastDoor: {
    type: "open",
    width: 0.9,
    height: 2.1,
    hinge: "left",
    flip: false,
    repeat: true,
  },
});
async function open(lib, raw = P.encode(lib)) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(
    (raw) => localStorage.setItem("ois.library.v1", raw),
    raw,
  );
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(process.env.OIS_QA_BASE_URL || "http://localhost:8081", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await click("Open " + lib.projects[0].present.name);
  return context;
}
async function wallTap(wall, offset) {
  const p = await page.evaluate(() => globalThis.__oisPlanProbe()),
    box = await page.getByTestId("plan-canvas").boundingBox(),
    length = G.distance(wall.a, wall.b);
  await page.touchscreen.tap(
    box.x +
      p.ox +
      (wall.a.x + ((wall.b.x - wall.a.x) * offset) / length) * p.scale,
    box.y +
      p.oz +
      (wall.a.z + ((wall.b.z - wall.a.z) * offset) / length) * p.scale,
  );
}
function openingProject(name, legacy = false) {
  const project = D.makeProject("living", 6, 5);
  project.name = name;
  const floor = project.floors[0],
    wall = floor.walls.find(
      (w) => Math.abs(w.a.z) < 1e-8 && Math.abs(w.b.z) < 1e-8,
    ),
    left = floor.walls.find(
      (w) => Math.abs(w.a.x) < 1e-8 && Math.abs(w.b.x) < 1e-8,
    );
  left.thickness = 0.6;
  if (legacy)
    floor.openings.push({
      id: "legacy-corner",
      wallId: wall.id,
      type: "open",
      offset: 0.1,
      width: 0.9,
      height: 2.1,
      sill: 0,
      hinge: "left",
      flip: false,
    });
  return { project, floor, wall };
}
(async () => {
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-webgl"],
  });
  const raw = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../docs/qa/runtime/artifacts/legacy-floor-settings-fixture.json",
      ),
      "utf8",
    ),
    legacy = P.decode(raw),
    original = legacy.projects[0],
    floor = original.present.floors[0];
  let context = await open(legacy, raw);
  await page.getByRole("button", { name: /^Choose room, current/ }).click();
  await click("Apply to " + floor.name);
  assert.deepEqual(await read(), original);
  for (const [label, value] of [
    ["X alignment (m)", "1"],
    ["Z alignment (m)", "-2"],
  ])
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
  await click("Apply to " + floor.name);
  let saved = await read();
  assert.deepEqual(saved.present.floors[0].alignment, { x: 1, z: -2 });
  assert.equal(saved.past.length, 1);
  await page
    .getByRole("textbox", { name: "Floor elevation (m)", exact: true })
    .fill("3.2");
  await click("Apply to " + floor.name);
  saved = await read();
  assert.equal(saved.present.floors[0].elevation, 3.2);
  assert.equal(saved.past.length, 2);
  for (const key of ["items", "rooms", "walls", "openings"])
    assert.deepEqual(saved.present.floors[0][key], floor[key]);
  const exact = JSON.stringify(saved);
  await click("Apply to " + floor.name);
  assert.equal(JSON.stringify(await read()), exact);
  await click("Close Floors and rooms");
  await click("Settings");
  const download = page.waitForEvent("download");
  await click("Export project library");
  const file = await download,
    target = path.join(out, "legacy-floor-current.backup.json");
  await file.saveAs(target);
  assert.deepEqual(
    P.decode(fs.readFileSync(target, "utf8")).projects[0],
    saved,
  );
  checks.push(
    "Exact old cabinet fixture: unchanged Apply has no history; alignment/elevation each add one Undo while all local geometry/model/locks stay exact; actual public export matches",
  );
  await context.close();

  const first = openingProject("Quick physical corners");
  context = await open(library(first.project));
  await click("Build");
  await click("Quick door · Open doorway");
  await wallTap(first.wall, 0.55);
  let h = await read();
  assert.equal(h.present.floors[0].openings.length, 1);
  let placed = h.present.floors[0].openings[0],
    range = G.openingOffsetRange(h.present.floors[0], placed);
  assert.ok(Math.abs(placed.offset - range.min) < 1e-6);
  assert.equal(G.openingPhysicalError(h.present.floors[0], placed), null);
  await page
    .getByText("Adjusted to clear the inside corner.", { exact: true })
    .filter({ visible: true })
    .waitFor();
  const overlaps = await page
    .getByTestId("plan-canvas")
    .locator("svg")
    .evaluate((svg) => {
      const all = [];
      for (const group of svg.querySelectorAll("g")) {
        const texts = [...group.children].filter(
          (node) => node.tagName.toLowerCase() === "text",
        );
        if (texts.length !== 4) continue;
        for (let a = 0; a < texts.length; a++)
          for (let b = a + 1; b < texts.length; b++) {
            const x = texts[a].getBoundingClientRect(),
              y = texts[b].getBoundingClientRect(),
              area =
                Math.max(
                  0,
                  Math.min(x.right, y.right) - Math.max(x.left, y.left),
                ) *
                Math.max(
                  0,
                  Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top),
                );
            if (area > 1)
              all.push([texts[a].textContent, texts[b].textContent, area]);
          }
      }
      return all;
    });
  assert.deepEqual(
    overlaps,
    [],
    "Short-corner numbers and face names must not overprint",
  );
  await page.screenshot({
    path: path.join(out, "screens/quick-opening-corner-clamp.png"),
  });
  await wallTap(first.wall, 5.45);
  h = await read();
  assert.equal(h.present.floors[0].openings.length, 2);
  assert.equal(h.past.length, 2);
  await click("Last opening");
  const before = JSON.stringify(await read());
  await page
    .getByRole("textbox", { name: "Offset from wall start (m)", exact: true })
    .fill((range.max + 0.01).toFixed(4));
  await click("Apply opening");
  assert.equal(JSON.stringify(await read()), before);
  await page
    .getByText(/frame and full travel/)
    .filter({ visible: true })
    .first()
    .waitFor();
  await page
    .getByRole("textbox", { name: "Offset from wall start (m)", exact: true })
    .fill("3");
  await click("Apply opening");
  assert.equal((await read()).past.length, 3);
  assert.ok(
    Math.abs((await read()).present.floors[0].openings[1].offset - 3) < 1e-8,
  );
  checks.push(
    "Quick repeat clamps both corners to physical frame-safe ranges, explains the adjustment, rejects a bad numeric edit exactly and accepts explicit correction",
  );
  await context.close();

  const old = openingProject("Saved aperture correction", true);
  context = await open(library(old.project));
  await click("View 2D");
  await wallTap(old.wall, 0.55);
  await page
    .getByText(/Saved opening needs correction:/)
    .filter({ visible: true })
    .waitFor();
  const unchanged = await read();
  await click("Apply opening");
  assert.deepEqual(await read(), unchanged);
  await page
    .getByRole("textbox", { name: "Offset from wall start (m)", exact: true })
    .fill(".6");
  await click("Apply opening");
  const corrected = await read();
  assert.equal(corrected.past.length, 1);
  assert.equal(corrected.present.floors[0].openings[0].offset, 0.6);
  await click("Undo");
  assert.deepEqual((await read()).present, old.project);
  await page
    .getByText(/Saved opening needs correction:/)
    .filter({ visible: true })
    .waitFor();
  await click("Redo");
  assert.deepEqual((await read()).present, corrected.present);
  checks.push(
    "A legacy blocked aperture remains readable and unchanged by no-op Apply; inspector explains its correction range, explicit correction and Undo/Redo preserve exact history",
  );
  await context.close();
  const imperial = openingProject("Signed legacy corner", true),
    imperialLibrary = library(imperial.project);
  imperialLibrary.settings.unit = "ft";
  context = await open(imperialLibrary);
  await click("View 2D");
  await wallTap(imperial.wall, 0.55);
  const imperialTexts = await page
    .getByTestId("plan-canvas")
    .locator("svg text")
    .allTextContents();
  assert.ok(imperialTexts.includes("-0′ 8″"), JSON.stringify(imperialTexts));
  assert.deepEqual((await read()).present, imperial.project);
  await page.screenshot({
    path: path.join(out, "screens/legacy-opening-signed-feet.png"),
  });
  checks.push(
    "Actual negative inside-corner feet label has one sign and correct8-inch magnitude; reading it leaves stored metres unchanged",
  );
  await context.close();
  assert.deepEqual(errors, []);
})()
  .then(() => {
    fs.writeFileSync(
      path.join(out, "neutral-opening-ui.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          checks,
          errors,
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
      ?.screenshot({
        path: path.join(out, "screens/neutral-opening-failure.png"),
      })
      .catch(() => {});
    fs.writeFileSync(
      path.join(out, "neutral-opening-ui.json"),
      JSON.stringify(
        { at: new Date().toISOString(), checks, errors, failure: error.stack },
        null,
        2,
      ),
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => browser?.close());
