/* Real integrated phone UI, imported GLBs and actual Three camera matrices. */
const {
  chromium,
} = require("C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  assert = require("node:assert/strict"),
  THREE = require("three");
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
  { createScenePlan } = require("../src/scene/spatialView.ts"),
  { resolveItemAsset } = require("../src/catalogue/resolve.ts");
const output = path.resolve(__dirname, "../../docs/build"),
  checks = [],
  samples = [],
  errors = [];
const clone = (v) => JSON.parse(JSON.stringify(v));
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
let browser, page;
const click = (name) => page.getByRole("button", { name, exact: true }).click();
const read = () =>
  page.evaluate(() => globalThis.__oisReadLibrary().projects[0]);
const probe = () => page.evaluate(() => globalThis.__oisSceneProbe?.());
async function open(lib, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({
    viewport,
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(
    (raw) => localStorage.setItem("ois.library.v1", raw),
    P.encode(lib),
  );
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(process.env.OIS_QA_BASE_URL || "http://localhost:8081", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await click("Open " + lib.projects[0].present.name);
  await page.waitForFunction(
    () => globalThis.__oisSceneProbe?.().rooms.length > 0,
  );
  return context;
}
async function settled(roomCount, itemCount) {
  let last,
    previous = "",
    count = 0;
  for (let i = 0; i < 240; i++) {
    const current = await probe(),
      box = await page.locator("canvas").boundingBox();
    last = current;
    const key = JSON.stringify([
      current?.camera,
      current?.projectionMatrix,
      current?.items.map((i) => [i.id, i.x, i.y]),
    ]);
    const aspect =
      current?.projectionMatrix?.[5] / current?.projectionMatrix?.[0];
    if (
      current?.rooms.length === roomCount &&
      current?.items.length === itemCount &&
      Math.abs(aspect - box.width / box.height) < 0.001 &&
      key === previous
    )
      count++;
    else count = 0;
    if (count >= 3) return current;
    previous = key;
    await page.waitForTimeout(80);
  }
  throw Error("Scene did not settle: " + JSON.stringify(last));
}
async function actualProjection(project, plan, snapshot) {
  const canvas = await page.locator("canvas").boundingBox(),
    camera = new THREE.PerspectiveCamera();
  camera.position.fromArray(snapshot.camera);
  camera.quaternion.fromArray(snapshot.cameraQuaternion);
  camera.projectionMatrix.fromArray(snapshot.projectionMatrix);
  camera.updateMatrixWorld();
  const errors = [];
  for (const floorPlan of plan.floors) {
    const floor = project.floors.find((f) => f.id === floorPlan.id);
    for (const id of floorPlan.itemIds) {
      const item = floor.items.find((i) => i.id === id),
        asset = resolveItemAsset(item),
        bounds = new THREE.Box3(
          new THREE.Vector3(...asset.bounds.min),
          new THREE.Vector3(...asset.bounds.max),
        );
      bounds.applyMatrix4(new THREE.Matrix4().makeRotationY(item.yaw));
      const offsetVector = new THREE.Vector3(
        item.x + floorPlan.displayOffset.x,
        floorPlan.displayOffset.y,
        item.z + floorPlan.displayOffset.z,
      );
      bounds.translate(offsetVector);
      const actual = snapshot.items.find((i) => i.id === id);
      assert.ok(actual?.worldBounds, "Actual model bounds missing: " + id);
      const rendered = new THREE.Box3(
        new THREE.Vector3(...actual.worldBounds.min),
        new THREE.Vector3(...actual.worldBounds.max),
      );
      assert.ok(
        bounds.clone().expandByScalar(0.002).containsBox(rendered),
        "Actual model outside expected exact-revision cage: " + id,
      );
      const point = rendered.getCenter(new THREE.Vector3()).project(camera);
      const expected = {
        x: ((point.x + 1) * canvas.width) / 2,
        y: ((1 - point.y) * canvas.height) / 2,
      };
      assert.ok(actual, "Actual GLB missing: " + id);
      errors.push({
        id,
        pixels: Math.hypot(actual.x - expected.x, actual.y - expected.y),
        actual,
        expected,
        asset: asset.id,
        yaw: item.yaw,
      });
    }
  }
  fs.writeFileSync(
    path.join(output, "spatial-projection-debug.json"),
    JSON.stringify(
      errors.sort((a, b) => b.pixels - a.pixels),
      null,
      2,
    ),
  );
  assert.ok(
    Math.max(...errors.map((e) => e.pixels)) < 2,
    "Actual imported-model/world transform differs: " +
      Math.max(...errors.map((e) => e.pixels)),
  );
  return {
    models: errors.length,
    maxProjectionErrorPixels: Math.max(...errors.map((e) => e.pixels)),
  };
}
(async () => {
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-webgl"],
  });
  const house = P.decode(
    fs.readFileSync(
      path.resolve(
        __dirname,
        "../../spatial/evidence/production-fixture-r2/six-room-house.backup.json",
      ),
      "utf8",
    ),
  );
  const h = house.projects[0],
    project = h.present;
  h.past = [{ ...clone(project), name: "Previous house" }];
  h.future = [{ ...clone(project), name: "Future house" }];
  const context = await open(house),
    original = JSON.stringify(await read());
  await click("Build");
  await click("View options");
  await click("House");
  await click("Fit house");
  let snapshot = await settled(6, 40);
  assert.equal(
    await page.getByRole("button", { name: "Undo", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "Redo", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "Furnish", exact: true }).count(),
    0,
  );
  const planFor = (gap = 0) =>
    createScenePlan(project, resolveItemAsset, {
      activeFloorId: project.floors[0].id,
      scope: { kind: "house" },
      mode: "3d",
      shell: "cutaway",
      camera: { x: 0, y: 0, z: 0 },
      separatedFloorGap: gap,
      showCeilings: false,
    });
  samples.push({
    step: "aligned-house",
    ...(await actualProjection(project, planFor(), snapshot)),
  });
  const alignedBounds = new Map(
    snapshot.items.map((item) => [item.id, item.worldBounds]),
  );
  const canvas = await page.locator("canvas").boundingBox(),
    target = snapshot.items[0];
  await page.touchscreen.tap(canvas.x + target.x, canvas.y + target.y);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: canvas.x + target.x, y: canvas.y + target.y, id: 0 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: canvas.x + target.x + 25, y: canvas.y + target.y + 15, id: 0 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.equal(JSON.stringify(await read()), original);
  checks.push(
    "House overview renders all six rooms/40 exact GLBs; nonempty Undo/Redo and editing controls are unavailable; touch preserves complete history",
  );
  await click("View options");
  await click("Separate floors");
  await click("Fit house");
  snapshot = await settled(6, 40);
  const gap = Math.min(
    20,
    Math.max(
      1.5,
      ...project.floors.flatMap((f) =>
        f.rooms.map((r) => (r.ceiling ?? f.ceiling) + 0.5),
      ),
    ),
  );
  samples.push({
    step: "separated-house",
    ...(await actualProjection(project, planFor(gap), snapshot)),
  });
  for (const planned of planFor(gap).floors)
    for (const id of planned.itemIds) {
      const actual = snapshot.items.find((item) => item.id === id).worldBounds,
        baseline = alignedBounds.get(id),
        delta =
          planned.displayOffset.y -
          planFor().floors.find((f) => f.id === planned.id).displayOffset.y;
      for (const end of ["min", "max"])
        for (let axis = 0; axis < 3; axis++)
          assert.ok(
            Math.abs(
              actual[end][axis] -
                baseline[end][axis] -
                (axis === 1 ? delta : 0),
            ) < 1e-5,
          );
    }
  assert.equal(JSON.stringify(await read()), original);
  checks.push(
    "Separated floor presentation matches real GLB world projections and preserves all saved alignments/elevations/history",
  );
  await page.screenshot({
    path: path.join(output, "screens/integrated-house-separated.png"),
  });
  await click("View options");
  await click("Top");
  snapshot = await settled(6, 40);
  let direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
    new THREE.Quaternion(...snapshot.cameraQuaternion),
  );
  assert.ok(direction.y < -0.999);
  await click("Front");
  snapshot = await settled(6, 40);
  direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
    new THREE.Quaternion(...snapshot.cameraQuaternion),
  );
  assert.ok(direction.z < -0.999 && Math.abs(direction.y) < 0.002);
  await click("Perspective");
  await click("Show ceilings");
  await click("Hide ceilings");
  await click("Align floors");
  await click("Floor");
  await click("Fit floor");
  await settled(project.floors[0].rooms.length, project.floors[0].items.length);
  assert.equal(JSON.stringify(await read()), original);
  assert.ok(
    await page.getByRole("button", { name: "Undo", exact: true }).isEnabled(),
  );
  await click("Undo");
  assert.equal((await read()).present.name, "Previous house");
  await click("Redo");
  assert.deepEqual((await read()).present, project);
  checks.push(
    "Top/Front camera directions are real; ceilings and scope controls preserve history; returning Floor restores functional Undo/Redo",
  );
  await context.close();

  const movedProject = D.makeProject("living", 6, 5),
    floor = movedProject.floors[0],
    room = floor.rooms[0];
  movedProject.name = "Room move phone";
  floor.rooms.push(
    D.makeRoom(
      "kitchen",
      "Kitchen",
      G.shapePolygon("rectangle", 4, 5, { x: 6, z: 0 }),
    ),
    D.makeRoom(
      "bedroom",
      "Detached",
      G.shapePolygon("rectangle", 3, 3, { x: 20, z: 0 }),
    ),
  );
  floor.walls = G.rebuildWalls(floor.rooms);
  const shared = floor.walls.find((w) => w.faces.length === 2);
  floor.openings.push({
    id: "move-door",
    wallId: shared.id,
    type: "single",
    offset: 1.5,
    width: 0.9,
    height: 2.1,
    sill: 0,
    hinge: "left",
    flip: false,
  });
  const asset = require("../src/catalogue/assets.json").find(
    (a) =>
        a.subtype.includes("coffee") &&
      a.stage === "internally-accepted" &&
      a.dimensionsMetres.width < 1.5,
  );
  assert.ok(asset);
  floor.items.push({
    id: "locked-move",
    roomId: room.id,
    assetId: asset.id,
    assetVersion: asset.version,
    assetHash: asset.sha256,
    x: 2,
    z: 2,
    yaw: 0,
    locked: true,
    materialOverrides: {},
  });
  const second = await open(library(movedProject), { width: 320, height: 568 }),
    before = JSON.stringify(await read());
  await click("Build");
  await click("Room dimensions");
  assert.equal(
    Number(
      await page
        .getByRole("textbox", { name: "Width (m)", exact: true })
        .inputValue(),
    ),
    5.88,
  );
  assert.equal(
    Number(
      await page
        .getByRole("textbox", { name: "Depth (m)", exact: true })
        .inputValue(),
    ),
    4.88,
  );
  assert.equal(JSON.stringify(await read()), before);
  await click("Close Room dimensions");
  await click("Build");
  await click("Move room");
  assert.equal(JSON.stringify(await read()), before);
  await click("Unlock selected furniture");
  const unlocked = await read(),
    unlockedBytes = JSON.stringify(unlocked);
  await click("Build");
  await click("Move room");
  const planProbe = await page.evaluate(() => globalThis.__oisPlanProbe()),
    box = await page.getByTestId("plan-canvas").boundingBox();
  await page.screenshot({path:path.join(output,"screens/room-move-preview-320.png")});
  const x = box.x + planProbe.ox + 3 * planProbe.scale,
    y = box.y + planProbe.oz + 2.5 * planProbe.scale,
    channel = await second.newCDPSession(page);
  await channel.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 0 }],
  });
  for (let i = 1; i <= 8; i++)
    await channel.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + (40 * i) / 8, y: y - (15 * i) / 8, id: 0 }],
    });
  await channel.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.notEqual(
    Number(
      await page
        .getByRole("textbox", { name: "Move X (m)", exact: true })
        .inputValue(),
    ),
    0,
  );
  assert.equal(JSON.stringify(await read()), unlockedBytes);
  await click("Cancel room move");
  assert.equal(JSON.stringify(await read()), unlockedBytes);
  await click("Build");
  await click("Move room");
  await page
    .getByRole("textbox", { name: "Move X (m)", exact: true })
    .fill("-1.2");
  await page
    .getByRole("textbox", { name: "Move Z (m)", exact: true })
    .fill("2.3");
  assert.equal(JSON.stringify(await read()), unlockedBytes);
  await click("Apply room move");
  const moved = await read();
  assert.equal(moved.past.length, 2);
  assert.equal(moved.present.floors[0].items[0].locked, false);
  assert.equal(moved.present.floors[0].items[0].x, 0.8);
  assert.deepEqual(moved.present.floors[0].rooms[2], floor.rooms[2]);
  await click("Undo");
  assert.deepEqual((await read()).present, unlocked.present);
  await click("Redo");
  assert.deepEqual((await read()).present, moved.present);
  await page.screenshot({
    path: path.join(output, "screens/room-move-320.png"),
  });
  checks.push(
    "320px phone shows honest legacy inside dimensions; actual touch previews/cancels without saving; locked move is blocked, unlock/retry moves its contents and has one exact Undo/Redo",
  );
  await click("Back");
  await page
    .getByText(/Saved locally/)
    .first()
    .waitFor();
  await page.reload({ waitUntil: "domcontentloaded" });
  await click("Open " + movedProject.name);
  assert.deepEqual(await read(), moved);
  checks.push(
    "Room move and unlocked state survive durable save, full browser reload and reopening with exact history",
  );
  await click("Back");
  await click("Create room or floor plan");
  await click("Living room");
  await click("Rectangle");
  await page.getByRole("textbox", { name: "Width (m)", exact: true }).fill("5");
  await page.getByRole("textbox", { name: "Depth (m)", exact: true }).fill("4");
  await click("Create room");
  await page.waitForFunction(
    () => globalThis.__oisReadLibrary().projects.length === 2,
  );
  const created = (await read()).present,
    createdFloor = created.floors[0],
    actualInside = G.roomInsideDimensions(createdFloor, createdFloor.rooms[0]);
  assert.ok(
    Math.abs(actualInside.width - 5) < 1e-8 &&
      Math.abs(actualInside.depth - 4) < 1e-8,
  );
  assert.equal(G.bounds(createdFloor.rooms[0].polygon).maxX, 5.12);
  await click("Build");
  await click("Room dimensions");
  assert.equal(
    Number(
      await page
        .getByRole("textbox", { name: "Width (m)", exact: true })
        .inputValue(),
    ),
    5,
  );
  assert.equal(
    Number(
      await page
        .getByRole("textbox", { name: "Depth (m)", exact: true })
        .inputValue(),
    ),
    4,
  );
  checks.push(
    "Actual Create/Dimensions UI roundtrips5×4m inside faces and stores explicit5.12×4.12m reference outline",
  );
  await second.close();
  assert.deepEqual(errors, []);
})()
  .then(() => {
    fs.writeFileSync(
      path.join(output, "spatial-measurements-ui.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          checks,
          samples,
          errors,
          nativeValidation: false,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ checks, samples, errors }));
  })
  .catch((error) => {
    fs.writeFileSync(
      path.join(output, "spatial-measurements-ui.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          checks,
          samples,
          errors,
          failure: error.stack,
          nativeValidation: false,
        },
        null,
        2,
      ),
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => browser?.close());
