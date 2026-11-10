/* Actual 2D/3D touch drags against a physical wall, using an exact real GLB. */
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
  asset = require("../src/catalogue/revisions.json").find((a) =>
    a.sha256.startsWith("50feb5b7"),
  );
assert.ok(asset, "Exact cabinet revision required");
const out = path.resolve(__dirname, "../../docs/build"),
  checks = [],
  errors = [];
let browser, page;
async function drag(context, from, to) {
  const cdp = await context.newCDPSession(page),
    send = (type, point) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints:
          type === "touchEnd"
            ? []
            : [
                {
                  x: point.x,
                  y: point.y,
                  id: 0,
                  radiusX: 4,
                  radiusY: 4,
                  force: 1,
                },
              ],
      });
  await send("touchStart", from);
  for (let n = 1; n <= 14; n++)
    await send("touchMove", {
      x: from.x + ((to.x - from.x) * n) / 14,
      y: from.y + ((to.y - from.y) * n) / 14,
    });
  await send("touchEnd", to);
  await cdp.detach();
}
(async () => {
  browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-webgl"],
  });
  for (const mode of ["2D", "3D"]) {
    const project = D.makeProject("kitchen", 6, 5),
      floor = project.floors[0],
      room = floor.rooms[0];
    project.name = "Wall touch " + mode;
    const item = {
      id: "wall-cabinet",
      roomId: room.id,
      assetId: asset.id,
      assetVersion: asset.version,
      assetHash: asset.sha256,
      x: 2,
      z: 2.5,
      yaw: 0,
      locked: false,
      materialOverrides: {},
    };
    floor.items.push(item);
    assert.equal(G.canPlace(floor, room, item, asset, [asset]), null);
    const library = {
      version: 1,
      projects: [{ past: [], present: project, future: [] }],
      activeId: project.id,
      favourites: [],
      recent: [],
      settings: {
        unit: "m",
        grid: false,
        quickMove: true,
        appearance: "light",
      },
      lastDoor: {
        type: "single",
        width: 0.9,
        height: 2.1,
        sill: 0,
        hinge: "left",
        flip: false,
        repeat: true,
      },
    };
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
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    const click = (name) =>
        page.getByRole("button", { name, exact: true }).click(),
      read = () =>
        page.evaluate(() => globalThis.__oisReadLibrary().projects[0]);
    await page.goto(process.env.OIS_QA_BASE_URL || "http://localhost:8081", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await click("Open " + project.name);
    await page.waitForFunction(() =>
      globalThis.__oisSceneProbe?.().items.some((i) => i.id === "wall-cabinet"),
    );
    if (mode === "2D") await click("View 2D");
    const original = JSON.stringify(await read());
    async function points(targetX) {
      if (mode === "2D") {
        const p = await page.evaluate(() => globalThis.__oisPlanProbe()),
          box = await page.getByTestId("plan-canvas").boundingBox(),
          from = p.items.find((i) => i.id === item.id);
        return {
          from: { x: box.x + from.x, y: box.y + from.y },
          to: {
            x: box.x + p.ox + targetX * p.scale,
            y: box.y + p.oz + item.z * p.scale,
          },
        };
      }
      const p = await page.evaluate(() => globalThis.__oisSceneProbe()),
        box = await page.locator("canvas").boundingBox(),
        from = p.items.find((i) => i.id === item.id),
        camera = new THREE.PerspectiveCamera();
      camera.position.fromArray(p.camera);
      camera.quaternion.fromArray(p.cameraQuaternion);
      camera.projectionMatrix.fromArray(p.projectionMatrix);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      camera.updateMatrixWorld();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          (from.x / box.width) * 2 - 1,
          1 - (from.y / box.height) * 2,
        ),
        camera,
      );
      const plane = ray.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        new THREE.Vector3(),
      );
      assert.ok(plane);
      const to = plane
        .add(new THREE.Vector3(targetX - item.x, 0, 0))
        .project(camera);
      return {
        from: { x: box.x + from.x, y: box.y + from.y },
        to: {
          x: box.x + ((to.x + 1) * box.width) / 2,
          y: box.y + ((1 - to.y) * box.height) / 2,
        },
      };
    }
    const near = -asset.bounds.min[0] + 0.02,
      nearPoints = await points(near);
    await drag(context, nearPoints.from, nearPoints.to);
    await page
      .getByText(/physical wall/)
        .filter({ visible: true })
      .first()
      .waitFor();
    assert.equal(JSON.stringify(await read()), original);
    await page.screenshot({
      path: path.join(out, "screens/wall-pointer-reject-" + mode + ".png"),
    });
    checks.push({
      mode,
      step: "near-wall-rejected",
      targetX: near,
      logicalFootprintMinX: 0.02,
      physicalWallInsideFaceX: 0.06,
      historyExact: true,
    });
    const safe = -asset.bounds.min[0] + 0.06 + room.trim.projection + 0.03,
      safePoints = await points(safe);
    await drag(context, safePoints.from, safePoints.to);
    const saved = await read();
    assert.equal(saved.past.length, 1);
    assert.ok(Math.abs(saved.present.floors[0].items[0].x - safe) < 0.001);
    await click("Undo");
    assert.deepEqual((await read()).present, project);
    checks.push({
      mode,
      step: "safe-control-committed",
      targetX: safe,
      oneUndo: true,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
})()
  .then(() => {
    fs.writeFileSync(
      path.join(out, "wall-pointer-ui.json"),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          asset: { id: asset.id, version: asset.version, sha256: asset.sha256 },
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
      ?.screenshot({ path: path.join(out, "screens/wall-pointer-failure.png") })
      .catch(() => {});
    fs.writeFileSync(
      path.join(out, "wall-pointer-ui.json"),
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
