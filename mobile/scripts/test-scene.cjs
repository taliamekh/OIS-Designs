/* CPU geometry and save-I/O regressions; not a native rendering test. */
const fs = require("node:fs"),
  ts = require("typescript"),
  assert = require("node:assert/strict"),
  { test } = require("node:test"),
  THREE = require("three");
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
const M = require("../src/scene/meshes.ts"),
  C = require("../src/scene/camera.ts"),
  W = require("../src/scene/walk.ts"),
  O = require("../src/scene/openingPose.ts"),
  D = require("../src/domain/project.ts"),
  G = require("../src/domain/geometry.ts"),
  P = require("../src/domain/persistence.ts");
const assets = require("../src/catalogue/assets.json");
const { pickItem } = require("../src/scene/picking.ts");

test("opaque walls block hidden furniture picks; cutaway ancestors and transparent surfaces do not", () => {
  const scene = new THREE.Scene(),
    wallGroup = new THREE.Group(),
    wall = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3, 0.1),
      new THREE.MeshBasicMaterial(),
    ),
    item = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
  wall.position.set(0, 0.5, 1);
  wallGroup.add(wall);
  scene.add(wallGroup, item);
  item.userData.itemId = "visible-sofa";
  scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 5),
      new THREE.Vector3(0, 0, -1),
    ),
    pick = () => pickItem(ray.intersectObjects(scene.children, true));
  assert.equal(pick(), undefined, "opaque wall prevents selection through it");
  wallGroup.visible = false;
  assert.equal(
    pick(),
    item.userData.itemId,
    "invisible parent no longer occludes the visible model",
  );
  wallGroup.visible = true;
  wall.material.visible = false;
  assert.equal(pick(), item.userData.itemId);
  wall.material.visible = true;
  wall.material.transparent = true;
  wall.material.opacity = 0.2;
  assert.equal(
    pick(),
    item.userData.itemId,
    "transparent non-item surface permits the visible furniture",
  );
  wall.material.opacity = 1;
  assert.equal(pick(), undefined);
  wall.material.depthTest = false;
  assert.equal(
    pick(),
    item.userData.itemId,
    "overlay decoration is not a depth occluder",
  );
  item.visible = false;
  assert.equal(
    pick(),
    undefined,
    "invisible furniture cannot capture gestures",
  );
  item.visible = true;
  item.userData.itemId = "missing-model-marker";
  assert.equal(
    pick(),
    "missing-model-marker",
    "visible recovery marker still selects",
  );
  [wall, item].forEach((m) => {
    m.geometry.dispose();
    m.material.dispose();
  });
});

test("picking uses the hit face's actual material rather than an unused opaque slot", () => {
  const scene = new THREE.Scene(),
    transparent = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.2,
    }),
    opaque = new THREE.MeshBasicMaterial(),
    geometry = new THREE.PlaneGeometry(4, 4),
    wall = new THREE.Mesh(geometry, [opaque, transparent]),
    item = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
  geometry.clearGroups();
  geometry.addGroup(0, 6, 1);
  wall.position.z = 1;
  item.userData.itemId = "sofa";
  scene.add(wall, item);
  scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 0, 5),
    new THREE.Vector3(0, 0, -1),
  );
  assert.equal(pickItem(ray.intersectObjects(scene.children, true)), "sofa");
  geometry.dispose();
  opaque.dispose();
  transparent.dispose();
  item.geometry.dispose();
  item.material.dispose();
});
const fixture = () => {
  const p = D.makeProject("living", 4, 4),
    f = p.floors[0],
    r = f.rooms[0];
  return { p, f, r };
};
test("portrait camera contains room corners and expands far clipping for40×30m rooms", () => {
  for (const [w, d, aspect] of [
    [4.8, 3.8, 390 / 779],
    [40, 30, 320 / 844],
    [0.5, 0.5, 390 / 250],
    [50, 50, 320 / 800],
  ]) {
    const points = G.shapePolygon("rectangle", w, d),
      h = 2.7,
      fit = C.fitCamera(points, h, aspect),
      clip = C.clippingRange(fit.radius, fit.extent),
      camera = new THREE.PerspectiveCamera(43, aspect, clip.near, clip.far),
      theta = 0.75,
      phi = 0.88;
    camera.position.set(
      fit.target.x + fit.radius * Math.sin(phi) * Math.sin(theta),
      fit.target.y + fit.radius * Math.cos(phi),
      fit.target.z + fit.radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(fit.target.x, fit.target.y, fit.target.z);
    camera.updateMatrixWorld();
    for (const p of points)
      for (const y of [0, h]) {
        const q = new THREE.Vector3(p.x, y, p.z).project(camera);
        assert.ok(
          Math.abs(q.x) < 1 && Math.abs(q.y) < 1 && q.z < 1 && q.z > -1,
          `visible corner for${w}×${d}: ${q.toArray()}`,
        );
      }
  }
});
test("floor triangulation preserves concave area and UV metre coordinates", () => {
  const { r } = fixture();
  r.polygon = G.shapePolygon("l", 6, 5);
  const geometry = M.floorGeometry(r),
    p = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv"),
    idx = geometry.index;
  let area = 0;
  for (let n = 0; n < idx.count; n += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, idx.getX(n)),
      b = new THREE.Vector3().fromBufferAttribute(p, idx.getX(n + 1)),
      c = new THREE.Vector3().fromBufferAttribute(p, idx.getX(n + 2));
    area += new THREE.Triangle(a, b, c).getArea();
  }
  assert.ok(Math.abs(area - Math.abs(G.area(r.polygon))) < 1e-5);
  for (let i = 0; i < p.count; i++) {
    assert.ok(Math.abs(uv.getX(i) - p.getX(i)) < 1e-5);
    assert.ok(Math.abs(uv.getY(i) + p.getZ(i)) < 1e-5);
  }
  geometry.dispose();
});
test("baseboard sweeps meet at90° and oblique mitres with wall-face offset", () => {
  const { r } = fixture();
  r.polygon = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 5, z: 3 },
    { x: 0, z: 3 },
  ];
  const trim = { profile: "ogee", height: 0.16, projection: 0.024 },
    offset = 0.06;
  for (let k = 0; k < r.polygon.length; k++) {
    const a = r.polygon[k],
      b = r.polygon[(k + 1) % r.polygon.length],
      c = r.polygon[(k + 2) % r.polygon.length],
      la = G.distance(a, b),
      lb = G.distance(b, c),
      factor = M.cornerMiter(r, b),
      ga = M.trimGeometry(trim, la, 0, factor, offset),
      gb = M.trimGeometry(trim, lb, factor, 0, offset),
      pa = ga.getAttribute("position"),
      pb = gb.getAttribute("position"),
      n = pa.count / 2;
    const transform = (start, end) =>
      new THREE.Matrix4()
        .makeTranslation(start.x, 0, start.z)
        .multiply(
          new THREE.Matrix4().makeRotationY(
            -Math.atan2(end.z - start.z, end.x - start.x),
          ),
        )
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, offset));
    const ma = transform(a, b),
      mb = transform(b, c);
    for (let i = 0; i < n; i++) {
      const end = new THREE.Vector3()
          .fromBufferAttribute(pa, n + i)
          .applyMatrix4(ma),
        start = new THREE.Vector3().fromBufferAttribute(pb, i).applyMatrix4(mb);
      assert.ok(
        end.distanceTo(start) < 1e-5,
        `mitred join gap${end.distanceTo(start)}`,
      );
    }
    ga.dispose();
    gb.dispose();
  }
});
test("baseboard door cutouts stop at casing while windows above floor retain trim", () => {
  const { f } = fixture(),
    w = f.walls[0];
  f.openings = [
    {
      id: "door",
      wallId: w.id,
      type: "open",
      offset: 1,
      width: 0.9,
      height: 2.1,
      sill: 0,
      hinge: "left",
      flip: false,
    },
  ];
  const intervals = M.trimIntervals(w, f);
  assert.equal(intervals.length, 2);
  assert.ok(intervals[0][1] < 1 && intervals[1][0] > 1.9);
  f.openings[0].type = "window";
  f.openings[0].sill = 0.8;
  assert.deepEqual(M.trimIntervals(w, f), [[0, G.distance(w.a, w.b)]]);
});
test("pocket geometry carves a real central cavity without deleting wall skins", () => {
  const { f } = fixture(),
    w = f.walls[0];
  w.thickness = 0.15;
  const o = {
    id: "pocket",
    wallId: w.id,
    type: "pocket",
    offset: 1.2,
    width: 0.8,
    height: 2.1,
    sill: 0,
    hinge: "left",
    flip: false,
  };
  const pieces = M.wallPieces(w, [o], 2.7);
  assert.ok(pieces.some((p) => p.cavity === 0.05 && p.top === 2.1));
  assert.ok(pieces.every((p) => w.thickness - (p.cavity ?? 0) > 0));
  assert.ok(
    !pieces.some((p) => p.start >= 1.2 && p.end <= 2 && p.bottom < 2.1),
  );
});
test("Walk door leaves fully clear the portal for both hinges and flips", () => {
  for (const type of ["single", "double"])
    for (const hinge of ["left", "right"])
      for (const flip of [false, true]) {
        const o = {
          id: "door",
          wallId: "w",
          type,
          offset: 1,
          width: 1.4,
          height: 2.1,
          sill: 0,
          hinge,
          flip,
        };
        const poses = O.openingLeaves(o, 0.12, true);
        assert.equal(poses.length, type === "double" ? 2 : 1);
        for (const pose of poses) {
          const endX = pose.pivotX + Math.cos(pose.yaw) * pose.width;
          assert.ok(Math.abs(endX - pose.pivotX) < 1e-9);
          const endZ = pose.z - Math.sin(pose.yaw) * pose.width;
          assert.equal(Math.sign(endZ), flip ? -1 : 1);
        }
      }
});
test("Walk spawn avoids the table at room centre and respects unknown revisions", () => {
  const { f, r } = fixture();
  const a =
    assets.find((a) => a.geometryFamily === "coffee-table") ?? assets[0];
  f.items = [
    {
      id: "table",
      roomId: r.id,
      assetId: a.id,
      assetVersion: a.version,
      assetHash: a.sha256,
      x: 2,
      z: 2,
      yaw: 0,
      locked: true,
      materialOverrides: {},
    },
  ];
  const spawn = W.walkSpawn(f, r, assets);
  assert.ok(spawn);
  assert.equal(G.inside(spawn, G.footprint(f.items[0], a, 0.2)), false);
  f.items[0].assetHash = "unavailable";
  assert.equal(W.walkSpawn(f, r, assets), null);
});
test("explicit recovery archives protected bytes and a backup-write failure preserves primary", async () => {
  const { p } = fixture(),
    library = {
      version: 1,
      projects: [{ past: [], present: p, future: [] }],
      activeId: p.id,
      favourites: [],
      recent: [],
      settings: {
        unit: "m",
        grid: true,
        quickMove: true,
        appearance: "system",
      },
      lastDoor: {
        type: "single",
        width: 0.9,
        height: 2.1,
        hinge: "left",
        flip: false,
        repeat: true,
      },
    },
    future = JSON.stringify({ schema: 99, payload: "future-data" }),
    map = new Map([[P.PRIMARY, future]]),
    storage = {
      getItem: async (k) => map.get(k) ?? null,
      setItem: async (k, v) => {
        map.set(k, v);
      },
    };
  await assert.rejects(P.saveLibrary(storage, library), /newer/);
  await P.recoverLibrary(storage, library);
  assert.deepEqual(P.decode(map.get(P.PRIMARY)), library);
  assert.ok(
    [...map.entries()].some(
      ([key, value]) => key.includes("before-recovery") && value === future,
    ),
  );
  map.set(P.PRIMARY, future);
  await assert.rejects(
    P.recoverLibrary(
      {
        ...storage,
        setItem: async (k, v) => {
          if (k === P.BACKUP) throw Error("disk failure");
          map.set(k, v);
        },
      },
      library,
    ),
    /disk failure/,
  );
  assert.equal(map.get(P.PRIMARY), future);
});
test("trim surfaces face outward and finish before the casing extent", () => {
  const trim = { profile: "flat", height: 0.1, projection: 0.016 },
    geometry = M.trimGeometry(trim, 2),
    material = [
      new THREE.MeshBasicMaterial({ side: THREE.FrontSide }),
      new THREE.MeshBasicMaterial({ side: THREE.FrontSide }),
    ],
    mesh = new THREE.Mesh(geometry, material);
  mesh.updateMatrixWorld();
  const hits = new THREE.Raycaster(
    new THREE.Vector3(1, 0.05, 0.2),
    new THREE.Vector3(0, 0, -1),
  ).intersectObject(mesh);
  assert.ok(hits.length);
  assert.ok(Math.abs(hits[0].point.z - trim.projection) < 1e-6);
  assert.ok(hits[0].face.normal.z > 0.9);
  const { f } = fixture(),
    wall = f.walls[0];
  f.openings = [
    {
      id: "door",
      wallId: wall.id,
      type: "single",
      offset: 1,
      width: 0.8,
      height: 2.1,
      sill: 0,
      hinge: "left",
      flip: false,
    },
  ];
  const intervals = M.trimIntervals(wall, f);
  assert.ok(intervals[0][1] <= 1 - 0.0475);
  assert.ok(intervals[1][0] >= 1.8 + 0.0475);
  geometry.dispose();
  material.forEach((m) => m.dispose());
});
test("unsupported wall attachments cannot be silently placed on the floor", () => {
  const { f, r } = fixture(),
    a = assets.find((a) => a.placement?.anchor === "wall");
  assert.ok(a);
  const item = {
    id: "wall-item",
    roomId: r.id,
    assetId: a.id,
    assetVersion: a.version,
    assetHash: a.sha256,
    x: 2,
    z: 2,
    yaw: 0,
    locked: false,
    materialOverrides: {},
  };
  assert.match(G.canPlace(f, r, item, a, assets), /wall attachment/);
});
