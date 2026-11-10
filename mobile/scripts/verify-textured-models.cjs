/* Actual app loader/material/Walk/cache integration with frozen textured assets. Web only. */
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
const D = require("../src/domain/project.ts"),
  G = require("../src/domain/geometry.ts"),
  P = require("../src/domain/persistence.ts");
const accepted = require("./fixtures/texture-load.json").assets.map((pin) => {
  const asset = require("../src/catalogue/revisions.json").find(
    (a) =>
      a.id === pin.id && a.version === pin.version && a.sha256 === pin.sha256,
  );
  assert.ok(
    asset,
    "Frozen runtime fixture exact revision must remain available",
  );
  return asset;
});
assert.equal(accepted.length, 16);
const project = D.makeProject("living", 6, 6, 2.8),
  floor = project.floors[0];
project.name = "Frozen texture integration";
floor.rooms = [];
floor.items = [];
for (let n = 0; n < 8; n++) {
  const ox = (n % 4) * 6,
    oz = Math.floor(n / 4) * 6,
    kind = ["living", "office", "bedroom", "kitchen"][n % 4],
    room = D.makeRoom(
      kind,
      "Room " + (n + 1),
      G.shapePolygon("rectangle", 6, 6, { x: ox, z: oz }),
    );
  floor.rooms.push(room);
  for (let i = 0; i < 4; i++) {
    const a = accepted[(n * 4 + i) % 16];
    floor.items.push({
      id: "textured-" + n + "-" + i,
      roomId: room.id,
      assetId: a.id,
      assetVersion: a.version,
      assetHash: a.sha256,
      x: ox + 1.5 + (i % 2) * 3,
      z: oz + 1.5 + Math.floor(i / 2) * 3,
      yaw: 0,
      locked: i === 1,
      materialOverrides: {},
    });
  }
}
floor.walls = G.rebuildWalls(floor.rooms);
assert.ok(P.validProject(project));
for (const item of floor.items) {
  const a = accepted.find((a) => a.id === item.assetId);
  assert.equal(
    G.canPlace(
      floor,
      floor.rooms.find((r) => r.id === item.roomId),
      item,
      a,
      accepted,
    ),
    null,
  );
}
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
  page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const abandon = process.argv.includes("--abandon");
  let delayedModels = 0;
  if (abandon)
    await page.route(/\.glb(?:\?|$)/, async (route) => {
      delayedModels++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue().catch(() => {});
    });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
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
  await click("Build");
  await click("Whole-floor view");
  if (abandon) {
    const deadline = Date.now() + 30000;
    while (delayedModels < 12 && Date.now() < deadline)
      await page.waitForTimeout(30);
    assert.ok(delayedModels >= 12);
    await page.waitForFunction(() => !!globalThis.__oisSceneProbe);
    const oldProbe = await page.evaluateHandle(
      () => globalThis.__oisSceneProbe,
    );
    await click("Back");
    await page
      .getByRole("button", { name: "Create room or floor plan", exact: true })
      .waitFor();
    await page.waitForTimeout(3500);
    const idle = await oldProbe.evaluate((probe) => probe().cache);
    assert.equal(idle.active, 0);
    assert.ok(idle.idle <= 8);
    assert.ok(idle.sourceBytes <= 16 * 1024 * 1024);
    assert.ok(idle.sharedTextures.textures <= 9);
    await click("Open " + project.name);
    await page.waitForFunction(
      () => globalThis.__oisSceneProbe?.().items.length === 4,
      null,
      { timeout: 60000 },
    );
    const reopened = await page.evaluate(() => globalThis.__oisSceneProbe());
    assert.equal(reopened.cache.active, 4);
    assert.ok(reopened.items.every((i) => i.materials.some((m) => m.mapped)));
    const result = {
      at: new Date().toISOString(),
      delayedModels,
      idle,
      reopened: { cache: reopened.cache, memory: reopened.memory },
      errors,
      nativeValidation: false,
    };
    fs.writeFileSync(
      path.join(out, "texture-abandon-result.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
    await browser.close();
    if (errors.length) process.exitCode = 1;
    return;
  }
  await page.waitForFunction(
    () => globalThis.__oisSceneProbe?.().items.length === 32,
    null,
    { timeout: 120000 },
  );
  await page.waitForTimeout(1000);
  let probe = await page.evaluate(() => globalThis.__oisSceneProbe());
  assert.equal(probe.cache.active, 16);
  assert.ok(probe.items.every((i) => i.materials.some((m) => m.mapped)));
  checks.push(
    "actual GLTF/image loader renders32items from16frozen textured hashes",
  );
  const target = probe.items.find((i) => i.id === "textured-0-0"),
    copy = probe.items.find((i) => i.id === "textured-4-0"),
    beforeCopy = copy.materials,
    slot = target.materials.find(
      (m) => m.mapped && accepted[0].variantSlots.includes(m.slot),
    ).slot,
    canvas = await page.locator("canvas").boundingBox();
  await page.mouse.click(canvas.x + target.x, canvas.y + target.y);
  await click("Furniture properties");
  await click("Set " + slot + " to #333d40");
  await click("Close Furniture properties");
  probe = await page.evaluate(() => globalThis.__oisSceneProbe());
  assert.ok(
    probe.items
      .find((i) => i.id === target.id)
      .materials.some(
        (m) => m.slot === slot && m.colour === "333d40" && m.mapped,
      ),
  );
  assert.deepEqual(
    probe.items.find((i) => i.id === copy.id).materials,
    beforeCopy,
  );
  checks.push(
    "instance material tint keeps texture maps and leaves the duplicate model untouched",
  );
  const library = () => page.evaluate(() => globalThis.__oisReadLibrary()),
    before = JSON.stringify((await library()).projects[0].present),
    samples = [];
  for (let i = 0; i < 6; i++) {
    await click("View Walk");
    await page.waitForTimeout(180);
    assert.equal(JSON.stringify((await library()).projects[0].present), before);
    await click("View 3D");
    await page.waitForTimeout(180);
    samples.push(await page.evaluate(() => globalThis.__oisSceneProbe()));
  }
  assert.ok(
    samples
      .slice(2)
      .every((s) => s.items.length === 32 && s.cache.active === 16),
  );
  const textureCounts = samples.slice(2).map((s) => s.memory.textures);
  assert.ok(Math.max(...textureCounts) - Math.min(...textureCounts) <= 2);
  checks.push(
    "six Walk/3Dcycles preserve32transforms/locks and reach a bounded browser texture count",
  );
  await page.screenshot({
    path: path.join(out, "screens/textured-models-32.png"),
  });
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Furnish", exact: true }).waitFor();
  assert.equal(JSON.stringify((await library()).projects[0].present), before);
  checks.push(
    "frozen exact versions and per-instance override survive actual reload",
  );
  const result = {
    at: new Date().toISOString(),
    sourceManifestSha256:
      "78e0cd986309ca1236a805f5df607d55431cf898c602189df7faf7ef1bb72939",
    assets: accepted.map((a) => ({
      id: a.id,
      version: a.version,
      sha256: a.sha256,
    })),
    checks,
    errors,
    samples: samples.map((s) => ({
      memory: s.memory,
      draw: s.draw,
      cache: s.cache,
    })),
    nativeValidation: false,
  };
  fs.writeFileSync(
    path.join(out, "textured-models-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      at: result.at,
      checks,
      errors,
      last: result.samples.at(-1),
    }),
  );
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (page)
    await page
      .screenshot({
        path: path.join(out, "screens/textured-models-failure.png"),
      })
      .catch(() => {});
  if (browser) await browser.close();
  console.error(e);
  console.log(JSON.stringify({ checks, errors }));
  process.exitCode = 1;
});
