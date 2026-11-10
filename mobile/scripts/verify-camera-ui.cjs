/* Actual committed camera matrices after structural edits and mixed heights. */
const {
    chromium,
  } = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  THREE = require("three"),
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
  samples = [],
  errors = [];
const library = (project) => ({
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
});
const read = (page) =>
  page.evaluate(() => {
    const box = document.querySelector("canvas")?.getBoundingClientRect();
    return {
      probe: globalThis.__oisSceneProbe?.(),
      history: globalThis.__oisReadLibrary?.().projects[0],
      canvas: box ? { width: box.width, height: box.height } : null,
    };
  });
function containment(snapshot, allRooms) {
  if (!snapshot.probe?.projectionMatrix) return null;
  const camera = new THREE.PerspectiveCamera();
  camera.position.fromArray(snapshot.probe.camera);
  camera.quaternion.fromArray(snapshot.probe.cameraQuaternion);
  camera.projectionMatrix.fromArray(snapshot.probe.projectionMatrix);
  camera.updateMatrixWorld();
  const floor = snapshot.history.present.floors[0],
    rooms = allRooms
      ? floor.rooms
      : floor.rooms.filter((r) => snapshot.probe.rooms.includes(r.id)),
    points = [];
  for (const room of rooms)
    for (const p of room.polygon)
      for (const y of [0, room.ceiling ?? floor.ceiling])
        points.push(new THREE.Vector3(p.x, y, p.z).project(camera));
  return {
    maxX: Math.max(...points.map((p) => Math.abs(p.x))),
    maxY: Math.max(...points.map((p) => Math.abs(p.y))),
    maxDepth: Math.max(...points.map((p) => p.z)),
    minDepth: Math.min(...points.map((p) => p.z)),
  };
}
async function fitted(page, predicate = () => true, allRooms = false) {
  let last,
    previous = "",
    settled = 0;
  for (let n = 0; n < 160; n++) {
    const snapshot = await read(page),
      bounds = containment(snapshot, allRooms);
    last = { camera: snapshot.probe?.camera, bounds };
    const projectionAspect =
        snapshot.probe?.projectionMatrix?.[5] /
        snapshot.probe?.projectionMatrix?.[0],
      layoutMatches =
        snapshot.canvas &&
        Math.abs(
          projectionAspect - snapshot.canvas.width / snapshot.canvas.height,
        ) < 0.001,
      stamp = JSON.stringify([
        snapshot.probe?.camera,
        snapshot.probe?.projectionMatrix,
      ]);
    settled = stamp === previous ? settled + 1 : 0;
    previous = stamp;
    if (
      layoutMatches &&
      settled >= 2 &&
      snapshot.history &&
      predicate(snapshot) &&
      bounds &&
      bounds.maxX <= 0.901 &&
      bounds.maxY <= 0.721 &&
      bounds.maxDepth <= 1 &&
      bounds.minDepth >= -1
    )
      return { snapshot, bounds };
    await page.waitForTimeout(50);
  }
  throw Error("Committed visible bounds did not fit: " + JSON.stringify(last));
}
let browser, page;
(async () => {
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-webgl"],
  });
  const open = async (project, viewport) => {
    const context = await browser.newContext({
      viewport,
      isMobile: true,
      hasTouch: true,
    });
    await context.addInitScript(
      (raw) => localStorage.setItem("ois.library.v1", raw),
      P.encode(library(project)),
    );
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(process.env.OIS_QA_BASE_URL || "http://localhost:8081", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page
      .getByRole("button", { name: "Open " + project.name, exact: true })
      .click();
    await fitted(page);
    return context;
  };
  const click = (name) =>
    page.getByRole("button", { name, exact: true }).click();
  const project = D.makeProject("living", 4.8, 3.8, 2.7);
  project.name = "Structural camera";
  let context = await open(project, { width: 390, height: 844 }),
    original = JSON.stringify((await read(page)).history.present);
  await click("Build");
  await click("Room dimensions");
  await page
    .getByRole("textbox", { name: "Width (m)", exact: true })
    .fill("40");
  await page
    .getByRole("textbox", { name: "Depth (m)", exact: true })
    .fill("30");
  await click("Apply dimensions");
  const width = (s) => {
    const b = G.bounds(s.history.present.floors[0].rooms[0].polygon);
    return b.maxX - b.minX;
  };
  samples.push({
    step: "resize-open",
    ...(await fitted(page, (s) => Math.abs(width(s) - 40.12) < 1e-8)),
  });
  checks.push(
    "40×30inside dimensions with40.12×30.12reference bounds fit immediately with the dimensions sheet open",
  );
  await page.screenshot({
    path: path.join(out, "screens/camera-large-open.png"),
  });
  await click("Close Room dimensions");
  await fitted(page, (s) => Math.abs(width(s) - 40.12) < 1e-8);
  await click("Undo");
  samples.push({
    step: "undo-closed",
    ...(await fitted(page, (s) => Math.abs(width(s) - 4.8) < 1e-8)),
  });
  assert.equal(JSON.stringify((await read(page)).history.present), original);
  checks.push(
    "Undo restores the exact small project and refits while the sheet stays closed",
  );
  await page.screenshot({
    path: path.join(out, "screens/camera-small-undo.png"),
  });
  await click("Redo");
  samples.push({
    step: "redo-closed",
    ...(await fitted(page, (s) => Math.abs(width(s) - 40.12) < 1e-8)),
  });
  checks.push("Redo refits the large committed geometry again");
  await context.close();
  const mixed = D.makeProject("living", 4, 4, 2.7),
    floor = mixed.floors[0],
    tall = D.makeRoom(
      "bedroom",
      "Tall room",
      G.shapePolygon("rectangle", 4, 4, { x: 4, z: 0 }),
    );
  mixed.name = "Mixed-height camera";
  tall.ceiling = 8;
  floor.rooms.push(tall);
  floor.walls = G.rebuildWalls(floor.rooms);
  context = await open(mixed, { width: 844, height: 390 });
  original = JSON.stringify((await read(page)).history);
  await click("Build");
  await click("View options");
  await click("Floor");
  await click("Fit floor");
  const lowActive = await fitted(page, (s) => s.probe.rooms.length === 2, true);
  samples.push({ step: "mixed-low-active", ...lowActive });
  checks.push(
    "landscape whole-floor view contains every8m-room corner with the2.7m room active",
  );
  await page.screenshot({
    path: path.join(out, "screens/camera-mixed-low-active.png"),
  });
  await click("Choose room, current Living room");
  await click("Tall room");
  const tallActive = await fitted(
    page,
    (s) => s.probe.rooms.length === 2,
    true,
  );
  samples.push({ step: "mixed-tall-active", ...tallActive });
  assert.deepEqual(
    tallActive.snapshot.probe.camera,
    lowActive.snapshot.probe.camera,
  );
  assert.equal(JSON.stringify((await read(page)).history), original);
  checks.push(
    "changing active room preserves whole-floor framing and exact project/history bytes",
  );
  await context.close();
  const result = {
    at: new Date().toISOString(),
    checks,
    errors,
    samples,
    nativeValidation: false,
    measurementConventionRepairPending: true,
  };
  fs.writeFileSync(
    path.join(out, "camera-ui-result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      at: result.at,
      checks,
      errors,
      bounds: samples.map(({ step, bounds }) => ({ step, bounds })),
    }),
  );
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(async (e) => {
  if (page)
    await page
      .screenshot({ path: path.join(out, "screens/camera-ui-failure.png") })
      .catch(() => {});
  if (browser) await browser.close();
  console.error(e);
  console.log(JSON.stringify({ checks, errors }));
  process.exitCode = 1;
});
