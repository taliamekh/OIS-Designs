/* Actual UI creation/reload evidence. No native-device claim. */
const {
  chromium,
} = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
let browser, page;
const checks = [],
  errors = [],
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
    page.getByRole("button", { name, exact: true }).click();
  const library = () => page.evaluate(() => globalThis.__oisReadLibrary());
  const current = async () => {
    const l = await library();
    return l.projects.find((h) => h.present.id === l.activeId).present;
  };
  const home = () =>
    page.goto(((process.env.OIS_QA_BASE_URL || "http://localhost:8081") + ''), {
      timeout: 120000,
      waitUntil: "domcontentloaded",
    });
  await home();
  await click("Create room or floor plan");
  await click("Bedroom");
  await click("Rectangle");
  await page
    .getByRole("textbox", { name: "Width (m)", exact: true })
    .fill("4.2317");
  await page
    .getByRole("textbox", { name: "Depth (m)", exact: true })
    .fill("3.1732");
  await page
    .getByRole("textbox", { name: "Ceiling height (m)", exact: true })
    .fill("2.6123");
  await click("Create room");
  await page.getByRole("button", { name: "View 3D", exact: true }).waitFor();
  let p = await current(),
    saved = JSON.stringify(p);
  assert.equal(p.floors[0].rooms[0].kind, "bedroom");
  assert.equal(p.floors[0].ceiling, 2.6123);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "View 3D", exact: true }).waitFor();
  assert.equal(JSON.stringify(await current()), saved);
  checks.push(
    "combined room dimensions persist before editor navigation and survive reload",
  );
  const openDraft = async () => {
    await home();
    await click("Create room or floor plan");
    await click("Whole floor plan");
    await click("Draw walls");
  };
  const corner = async (x, z) => {
    const b = await page.getByTestId("floor-plan-drawing").boundingBox(),
      scale = Math.min((b.width - 48) / 10, (b.height - 48) / 8);
    await page.mouse.click(b.x + 24 + x * scale, b.y + 24 + z * scale);
  };
  await openDraft();
  await page.getByTestId("floor-plan-drawing").waitFor();
  for (const [x, z] of [
    [0, 0],
    [4, 0],
    [4, 3],
    [0, 3],
  ])
    await corner(x, z);
  await click("Close room");
  await click("Kitchen");
  await corner(4, 0);
  await corner(8, 0);
  await page.waitForTimeout(200);
  await openDraft();
  await click("Resume saved draft");
  await page
    .getByText("1 room · 2 unclosed corners", { exact: true })
    .waitFor();
  checks.push(
    "unfinished floor-plan rooms and next-room corners resume after route reload",
  );
  await corner(8, 3);
  await corner(4, 3);
  await click("Close room");
  await page.screenshot({
    path: path.join(out, "screens/floor-plan-draft.png"),
  });
  await click("Create floor plan");
  await page.getByRole("button", { name: "View 3D", exact: true }).waitFor();
  p = await current();
  assert.equal(p.name, "Untitled floor plan");
  assert.equal(p.floors[0].rooms.length, 2);
  assert.equal(p.floors[0].walls.filter((w) => w.faces.length === 2).length, 1);
  assert.deepEqual(
    p.floors[0].rooms.map((r) => r.kind),
    ["living", "kitchen"],
  );
  saved = JSON.stringify(p);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "View 3D", exact: true }).waitFor();
  assert.equal(JSON.stringify(await current()), saved);
  checks.push(
    "whole-floor drawing creates two canonical shared-wall rooms and survives reload",
  );
  await openDraft();
  await page.getByTestId("floor-plan-drawing").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Resume saved draft", exact: true })
      .count(),
    0,
  );
  checks.push(
    "durable project creation clears the consumed draft without recreating it",
  );
  const result = {
    at: new Date().toISOString(),
    checks,
    errors,
    nativeValidation: false,
  };
  fs.writeFileSync(
    path.join(out, "creation-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (page)
    await page
      .screenshot({ path: path.join(out, "screens/creation-failure.png") })
      .catch(() => {});
  if (browser) await browser.close();
  console.error(e);
  process.exitCode = 1;
});
