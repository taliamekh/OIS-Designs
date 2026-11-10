/* Actual phone-sized browser regression for measured door labels, inherited
 * ceiling edits and catalogue scroll restoration. No physical-device claim. */
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
  G = require("../src/domain/geometry.ts"),
  P = require("../src/domain/persistence.ts"),
  project = D.makeProject("living", 6, 6, 3),
  floor = project.floors[0],
  kitchen = D.makeRoom(
    "kitchen",
    "Kitchen",
    G.shapePolygon("rectangle", 4, 3, { x: 6, z: 1 }),
  ),
  out = path.resolve(__dirname, "../../docs/build"),
  checks = [],
  errors = [];
project.name = "Phone repairs";
floor.rooms.push(kitchen);
floor.walls = G.rebuildWalls(floor.rooms);
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
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const click = (name) =>
      page.getByRole("button", { name, exact: true }).click(),
    read = () => page.evaluate(() => globalThis.__oisReadLibrary().projects[0]),
    wait = (predicate) => page.waitForFunction(predicate);
  await page.goto(process.env.OIS_QA_BASE_URL || "http://localhost:8081", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await click("Open " + project.name);
  await click("Build");
  await click("Room dimensions");
  await page
    .getByRole("textbox", { name: "Ceiling height (m)", exact: true })
    .fill("3.4");
  await click("Apply dimensions");
  await wait(
    () =>
      globalThis.__oisReadLibrary().projects[0].present.floors[0].rooms[0]
        .ceiling === 3.4,
  );
  assert.equal((await read()).present.floors[0].ceiling, 3);
  assert.equal((await read()).present.floors[0].rooms[1].ceiling, null);
  checks.push(
    "typing an inherited ceiling creates the explicit3.4m override and preserves adjacent/floor defaults",
  );
  await click("Undo");
  await wait(
    () =>
      globalThis.__oisReadLibrary().projects[0].present.floors[0].rooms[0]
        .ceiling === null,
  );
  assert.equal(
    Number(
      await page
        .getByRole("textbox", { name: "Ceiling height (m)", exact: true })
        .inputValue(),
    ),
    3,
  );
  await click("Redo");
  checks.push(
    "the open ceiling inspector rehydrates the override and inheritance through Undo/Redo",
  );
  await click("Close Room dimensions");
  await click("Build");
  await click("Doors and openings");
  await click("Place on floor plan");
  const wall = floor.walls.find((w) => w.faces.length === 2),
    probe = await page.evaluate(() => globalThis.__oisPlanProbe()),
    box = await page.getByTestId("plan-canvas").boundingBox(),
    openingCentre = {
      x: wall.a.x + ((wall.b.x - wall.a.x) * 1.1) / 3,
      z: wall.a.z + ((wall.b.z - wall.a.z) * 1.1) / 3,
    };
  await page.touchscreen.tap(
    box.x + probe.ox + openingCentre.x * probe.scale,
    box.y + probe.oz + openingCentre.z * probe.scale,
  );
  await wait(
    () =>
      globalThis.__oisReadLibrary().projects[0].present.floors[0].openings
        .length === 1,
  );
  const saved = (await read()).present.floors[0],
    opening = saved.openings[0],
    expected = G.openingDimensions(saved, opening);
  const rows = await page
    .getByTestId("plan-canvas")
    .locator("svg")
    .evaluate((svg) =>
      [...svg.querySelectorAll("g")].flatMap((group) => {
        const texts = [...group.children].filter(
          (e) => e.tagName.toLowerCase() === "text",
        );
        return texts.length === 4
          ? [
              {
                name: texts[3].textContent,
                values: texts.slice(0, 3).map((e) => e.textContent),
                boxes: texts.slice(0, 3).map((e) => {
                  const b = e.getBoundingClientRect();
                  return { x: b.x, right: b.right, y: b.y, bottom: b.bottom };
                }),
              },
            ]
          : [];
      }),
    );
  for (const chain of expected) {
    const row = rows.find((r) => r.name === chain.name);
    assert.ok(row, chain.name);
    assert.deepEqual(
      [...row.values].sort(),
      [
        G.measure(chain.before, "m"),
        G.measure(opening.width, "m"),
        G.measure(chain.after, "m"),
      ].sort(),
    );
    row.boxes.forEach((b) =>
      assert.ok(
        b.x >= box.x &&
          b.right <= box.x + box.width &&
          b.y >= box.y &&
          b.bottom <= box.y + box.height,
        JSON.stringify(b),
      ),
    );
  }
  checks.push(
    "both partial-shared-wall chains use the actual room corners and every numeric label fits inside the390px canvas",
  );
  await page.screenshot({
    path: path.join(out, "screens/phone-door-chains.png"),
  });
  await click("Done");
  await click("View 3D");
  await click("Furnish");
  await click("Expand panel");
  const scrollState = (offset) =>
    page
      .getByRole("button", { name: /^Place / })
      .first()
      .evaluate((el, offset) => {
        let node = el.parentElement;
        while (
          node &&
          !(
            node.scrollHeight > node.clientHeight + 10 &&
            ["auto", "scroll"].includes(getComputedStyle(node).overflowY)
          )
        )
          node = node.parentElement;
        if (!node) throw Error("No actual catalogue scroller");
        if (offset !== undefined) node.scrollTop = offset;
        return {
          top: node.scrollTop,
          viewport: node.clientHeight,
          content: node.scrollHeight,
        };
      }, offset);
  await scrollState(512);
  await page.waitForTimeout(250);
  const oldOffset = (await scrollState()).top;
  const browsingProps = () =>
    page
      .getByRole("button", { name: /^Place / })
      .first()
      .evaluate((el) => {
        const key = Object.keys(el).find((key) =>
          key.startsWith("__reactFiber$"),
        );
        const values = [];
        for (let fiber = el[key]; fiber; fiber = fiber.return) {
          const p = fiber.memoizedProps;
          if (p && p.offset !== undefined && p.onOffset)
            values.push({ offset: p.offset, filters: p.filters });
        }
        return values;
      });
  console.log(
    JSON.stringify({
      beforePlacement: await scrollState(),
      browsing: await browsingProps(),
    }),
  );
  assert.ok(oldOffset >= 400, "fixture actually scrolls catalogue");
  const target = await page
    .getByRole("button", { name: /^Place / })
    .evaluateAll((els) => {
      const el = els.find((e) => {
        const b = e.getBoundingClientRect();
        return (
          e.getAttribute("aria-disabled") !== "true" &&
          b.y > 350 &&
          b.bottom < 810
        );
      });
      return el?.getAttribute("aria-label");
    });
  assert.ok(target, "a visible supported row is available");
  await click(target);
  await page.getByRole("button", { name: "Furnish", exact: true }).waitFor();
  await click("Furnish");
  await page.waitForTimeout(1000);
  const restored = (await scrollState()).top;
  console.log(
    JSON.stringify({
      afterReopen: await scrollState(),
      browsing: await browsingProps(),
    }),
  );
  assert.ok(
    Math.abs(restored - oldOffset) <= 2,
    `catalogue offset ${oldOffset} -> ${restored}`,
  );
  checks.push(
    "placing a visible furniture row and reopening the compact sheet restores the exact prior browsing offset",
  );
  await page.screenshot({
    path: path.join(out, "screens/phone-catalogue-restored.png"),
  });
  const result = {
    at: new Date().toISOString(),
    checks,
    rows,
    oldOffset,
    restored,
    errors,
    physicalNativeValidation: false,
  };
  fs.writeFileSync(
    path.join(out, "phone-repairs-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (page)
    await page
      .screenshot({ path: path.join(out, "screens/phone-repairs-failure.png") })
      .catch(() => {});
  if (browser) await browser.close();
  console.error(e);
  console.log(JSON.stringify({ checks, errors }));
  process.exitCode = 1;
});
