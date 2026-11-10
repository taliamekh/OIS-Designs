const {
  chromium,
} = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  ts = require("typescript");
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
const G = require("../src/domain/geometry.ts"),
  D = require("../src/domain/project.ts"),
  P = require("../src/domain/persistence.ts");
const p = D.makeProject("living", 4.1234567, 3.14159265, 2.789876),
  f = p.floors[0],
  r = f.rooms[0];
const kitchen = D.makeRoom(
  "kitchen",
  "Kitchen",
  G.shapePolygon("rectangle", 4, 3.14159265, { x: 4.1234567, z: 0 }),
);
f.rooms.push(kitchen);
f.walls = G.rebuildWalls(f.rooms);
const shared = f.walls.find((w) => w.faces.length === 2);
f.openings = [
  {
    id: "door-hydration",
    wallId: shared.id,
    type: "single",
    offset: 0.874321,
    width: 0.901237,
    height: 2.103451,
    sill: 0,
    hinge: "left",
    flip: false,
  },
];
const walls = f.walls.filter((w) => w.faces.some((v) => v.roomId === r.id));
r.wallFaces[walls[0].id] = {
  colour: "#abcdef",
  texture: "brick",
  sheen: "matte",
};
r.wallFaces[walls[1].id] = {
  colour: "#123456",
  texture: "limewash",
  sheen: "satin",
};
const fixture = {
  version: 1,
  projects: [{ past: [], present: p, future: [] }],
  activeId: p.id,
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
assert.ok(P.validProject(p));
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
    field = (name) => page.getByRole("textbox", { name, exact: true });
  await page.goto(((process.env.OIS_QA_BASE_URL || "http://localhost:8081") + '/settings'), {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await click("Back");
  await page
    .getByRole("button", { name: "Create room or floor plan", exact: true })
    .waitFor();
  checks.push("cold Settings Back falls back to Projects");
  await click("Settings");
  await field("Paste an OIS backup to inspect").fill(P.encode(fixture));
  await click("Import validated backup");
  await page.getByText("Backup imported.", { exact: true }).waitFor();
  await click("Back");
  await click("Open " + p.name);
  await click("View 2D");
  const saved = () =>
    page.evaluate(() => {
      const l = globalThis.__oisReadLibrary();
      return l.projects.find((h) => h.present.id === l.activeId).present;
    });
  let probe = await page.evaluate(() => globalThis.__oisPlanProbe()),
    b = await page.getByTestId("plan-canvas").boundingBox(),
    centre = G.lerp(
      shared.a,
      shared.b,
      (f.openings[0].offset + f.openings[0].width / 2) /
        G.distance(shared.a, shared.b),
    );
  await page.mouse.click(
    b.x + probe.ox + centre.x * probe.scale,
    b.y + probe.oz + centre.z * probe.scale,
  );
  await field("Width (m)").fill("0.8");
  await field("Height (m)").fill("2");
  await click("Apply opening");
  await click("Undo");
  assert.equal(await field("Width (m)").inputValue(), "0.90");
  assert.equal(await field("Height (m)").inputValue(), "2.10");
  await click("Redo");
  assert.equal(await field("Width (m)").inputValue(), "0.80");
  checks.push("open opening inspector follows Undo/Redo without closing");
  await click("Close Opening");
  await click("Surfaces");
  await click("Walls");
  assert.equal(await field("HEX colour").inputValue(), "#abcdef");
  await click("Trim");
  await click("Selected wall");
  await click("Wall 2");
  await click("Walls");
  assert.equal(await field("HEX colour").inputValue(), "#123456");
  await field("HEX colour").fill("#987654");
  await click("Paint selected wall");
  await click("Undo");
  assert.equal(await field("HEX colour").inputValue(), "#123456");
  await click("Redo");
  assert.equal(await field("HEX colour").inputValue(), "#987654");
  checks.push(
    "wall fields follow Trim wall selection and open-panel Undo/Redo",
  );
  await click("Close Surfaces");
  const canonical = await saved();
  await click("Settings");
  await click("ft");
  await click("Back");
  await click("Build");
  await click("Room dimensions");
  await click("Apply dimensions");
  assert.deepEqual(
    (await saved()).floors[0].rooms.map((v) => v.polygon),
    canonical.floors[0].rooms.map((v) => v.polygon),
  );
  assert.equal((await saved()).floors[0].ceiling, canonical.floors[0].ceiling);
  checks.push(
    "untouched feet dimension Apply preserves exact polygons and ceiling",
  );
  await click("Close Room dimensions");
  await click("Choose room, current Living room");
  const oldFloor = (await saved()).floors[0];
  await field("X alignment (ft)").fill("2.75");
  await field("Z alignment (ft)").fill("-1.25");
  await field("Floor elevation (ft)").fill("4.25");
  await field("Default ceiling (ft)").fill("9.5");
  await click("Apply to " + oldFloor.name);
  await click("Undo");
  assert.equal(
    await field("X alignment (ft)").inputValue(),
    G.toDisplay(oldFloor.alignment.x, "ft").toFixed(3),
  );
  assert.equal(
    await field("Default ceiling (ft)").inputValue(),
    G.toDisplay(oldFloor.ceiling, "ft").toFixed(3),
  );
  await click("Redo");
  assert.equal(await field("X alignment (ft)").inputValue(), "2.750");
  checks.push("open floor settings follow Undo and Redo");
  await click("Close Floors and rooms");
  await click("Furnish");
  await field("Search furniture").fill("sofa");
  await click("Close Furniture");
  await click("Choose room, current Living room");
  await click("Kitchen");
  await click("Furnish");
  assert.equal(await field("Search furniture").inputValue(), "");
  const kitchenCount = require("../src/catalogue/assets.json").filter((a) =>
    a.roomTags.includes("kitchen"),
  ).length;
  await page.getByText(`${kitchenCount} results`, { exact: true }).waitFor();
  await field("Search furniture").fill("cabinet");
  await click("Close Furniture");
  await click("Choose room, current Kitchen");
  await click("Living room");
  await click("Furnish");
  assert.equal(await field("Search furniture").inputValue(), "sofa");
  checks.push("catalogue defaults by room and restores room-specific search");
  await page.screenshot({
    path: path.join(out, "screens/forms-room-catalogue.png"),
  });
  const result = {
    at: new Date().toISOString(),
    checks,
    errors,
    nativeValidation: false,
  };
  fs.writeFileSync(
    path.join(out, "forms-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (page) {
    await page
      .screenshot({ path: path.join(out, "screens/forms-failure.png") })
      .catch(() => {});
    fs.writeFileSync(
      path.join(out, "forms-failure-body.txt"),
      await page.locator("body").innerText(),
    );
  }
  if (browser) await browser.close();
  console.error(e);
  console.log(JSON.stringify({ checks, errors }));
  process.exitCode = 1;
});
