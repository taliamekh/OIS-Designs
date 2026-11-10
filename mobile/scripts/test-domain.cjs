/* Test pure TS domain without React Native. Uses the installed TypeScript compiler. */
const fs = require("node:fs"),
  ts = require("typescript"),
  assert = require("node:assert/strict"),
  { test } = require("node:test");
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
const G = require("../src/domain/geometry.ts"),
  D = require("../src/domain/project.ts"),
  P = require("../src/domain/persistence.ts"),
  S = require("../src/catalogue/search.ts");
const assets = require("../src/catalogue/assets.json");
const clone = (v) => JSON.parse(JSON.stringify(v));
test("catalogue prioritises reviewed models and Recent follows actual selection order", () => {
  const prototype = {
      ...assets[0],
      id: "preview",
      stage: "validated-candidate",
    },
    reviewed = { ...assets[0], id: "reviewed", stage: "internally-accepted" },
    input = [prototype, reviewed];
  assert.deepEqual(
    S.searchAssets(input, S.initialFilters, [], []).map((a) => a.id),
    ["reviewed", "preview"],
  );
  assert.deepEqual(
    input.map((a) => a.id),
    ["preview", "reviewed"],
  );
  assert.deepEqual(
    S.searchAssets(
      input,
      { ...S.initialFilters, recent: true },
      [],
      ["preview", "reviewed"],
    ).map((a) => a.id),
    ["preview", "reviewed"],
  );
});
test("bed structure filters include real bunk/loft designs whose mattress size is twin", () => {
  const beds = assets.filter(
    (a) => /bunk|loft/.test(a.subtype) && a.bedSize === "twin",
  );
  assert.ok(beds.length >= 3);
  for (const a of beds) {
    const structure = a.subtype.includes("bunk") ? "bunk" : "loft";
    assert.ok(
      S.searchAssets(
        assets,
        { ...S.initialFilters, bed: structure },
        [],
        [],
      ).some((x) => x.id === a.id),
    );
  }
  assert.ok(
    !S.searchAssets(assets, { ...S.initialFilters, bed: "bunk" }, [], []).some(
      (a) => a.subtype === "sofa",
    ),
  );
});
const fixture = () => {
  const p = D.makeProject("living", 6, 5);
  const f = p.floors[0],
    r = f.rooms[0];
  return { h: { past: [], present: p, future: [] }, p, f, r };
};
const asset =
  assets.find((a) => a.geometryFamily === "coffee-table") ?? assets[0];
const makeItem = (r, a = asset) => ({
  id: "test-item",
  roomId: r.id,
  assetId: a.id,
  assetVersion: a.version,
  assetHash: a.sha256,
  x: 2,
  z: 2,
  yaw: 0,
  locked: false,
  materialOverrides: {},
});
const library = (h) => ({
  version: 1,
  projects: [h],
  activeId: h.present.id,
  favourites: [],
  recent: [],
  settings: { unit: "m", grid: true, quickMove: true, appearance: "system" },
  lastDoor: {
    type: "single",
    width: 0.9,
    height: 2.1,
    hinge: "left",
    flip: false,
    repeat: true,
  },
});
test("metres/feet conversion preserves geometry over repeated display changes", () => {
  let value = 3.141592653589793;
  for (let i = 0; i < 10000; i++)
    value = G.toMetres(G.toDisplay(value, "ft"), "ft");
  assert.ok(Math.abs(value - Math.PI) < 1e-12);
  assert.equal(G.toMetres(1, "ft"), 0.3048);
  assert.equal(G.measure(0.3048, "ft"), "1′ 0″");
});
test("partial shared wall is split and owns both faces exactly once", () => {
  const { r } = fixture();
  r.polygon = G.shapePolygon("rectangle", 4, 4);
  const other = D.makeRoom(
    "kitchen",
    "Kitchen",
    G.shapePolygon("rectangle", 3, 2, { x: 4, z: 1 }),
  );
  const walls = G.rebuildWalls([r, other]);
  const shared = walls.filter((w) => w.faces.length === 2);
  assert.equal(shared.length, 1);
  assert.equal(G.distance(shared[0].a, shared[0].b), 2);
  assert.equal(shared[0].faces[0].reversed, !shared[0].faces[1].reversed);
  assert.deepEqual(G.rebuildWalls([r, other]), walls);
});
test("self-crossing/degenerate polygons reject; L-shape validates", () => {
  assert.equal(
    G.validPolygon([
      { x: 0, z: 0 },
      { x: 3, z: 3 },
      { x: 0, z: 3 },
      { x: 3, z: 0 },
    ]),
    false,
  );
  assert.equal(G.validPolygon(G.shapePolygon("l", 4, 4)), true);
  assert.equal(G.validPolygon(G.shapePolygon("rectangle", 0, 4)), false);
});
test("painting one shared wall face never paints the opposite face; whole room stays scoped", () => {
  let { h, f, r } = fixture();
  const other = D.makeRoom(
    "kitchen",
    "Kitchen",
    G.shapePolygon("rectangle", 3, 5, { x: 6, z: 0 }),
  );
  f.rooms.push(other);
  f.walls = G.rebuildWalls(f.rooms);
  const shared = f.walls.find((w) => w.faces.length === 2),
    finish = { colour: "#123456", texture: "paint", sheen: "matte" };
  let result = D.execute(
    h,
    {
      type: "wall-finish",
      floorId: f.id,
      roomId: r.id,
      wallId: shared.id,
      finish,
    },
    "3d",
    assets,
  );
  assert.equal(result.error, null);
  assert.deepEqual(
    result.history.present.floors[0].rooms[0].wallFaces[shared.id],
    finish,
  );
  assert.deepEqual(result.history.present.floors[0].rooms[1].wallFaces, {});
  result = D.execute(
    result.history,
    { type: "wall-finish", floorId: f.id, roomId: r.id, wallId: "all", finish },
    "2d",
    assets,
  );
  assert.equal(
    Object.keys(result.history.present.floors[0].rooms[0].wallFaces).length,
    4,
  );
  assert.deepEqual(result.history.present.floors[0].rooms[1].wallFaces, {});
});
test("Walk blocks every command including undo/redo without changing bytes or lock states", () => {
  const { h, f, r } = fixture();
  f.items.push(makeItem(r));
  f.items[0].locked = true;
  const before = JSON.stringify(h);
  const commands = [
    {
      type: "transform",
      floorId: f.id,
      itemId: "test-item",
      x: 3,
      z: 3,
      yaw: 1,
    },
    { type: "lock", floorId: f.id, itemId: "test-item", locked: false },
    {
      type: "delete-item",
      floorId: f.id,
      itemId: "test-item",
      intentional: true,
    },
    { type: "rename", name: "Changed" },
    { type: "add-floor", floor: D.makeFloor() },
    {
      type: "floor-finish",
      floorId: f.id,
      roomId: r.id,
      finish: { id: "slate", repeat: 2, angle: 0 },
    },
    {
      type: "room-dimensions",
      floorId: f.id,
      roomId: r.id,
      width: 8,
      depth: 8,
      ceiling: 3,
    },
  ];
  for (const command of commands) {
    const result = D.execute(h, command, "walk", assets);
    assert.ok(result.error);
    assert.equal(result.history, h);
  }
  assert.ok(D.travelHistory(h, "undo", "walk").error);
  assert.ok(D.travelHistory(h, "redo", "walk").error);
  assert.equal(JSON.stringify(h), before);
});
test("locks are persistent, undoable and prevent translation/rotation", () => {
  let { h, f, r } = fixture();
  f.items.push(makeItem(r));
  let result = D.execute(
    h,
    { type: "lock", floorId: f.id, itemId: "test-item", locked: true },
    "2d",
    assets,
  );
  assert.equal(result.error, null);
  h = result.history;
  const move = D.execute(
    h,
    {
      type: "transform",
      floorId: f.id,
      itemId: "test-item",
      x: 3,
      z: 2,
      yaw: 1,
    },
    "3d",
    assets,
  );
  assert.match(move.error, /Unlock/);
  assert.equal(move.history, h);
  const saved = P.decode(P.encode(library(h)));
  assert.equal(saved.projects[0].present.floors[0].items[0].locked, true);
  const undo = D.travelHistory(h, "undo", "2d");
  assert.equal(undo.history.present.floors[0].items[0].locked, false);
  const redo = D.travelHistory(undo.history, "redo", "3d");
  assert.equal(redo.history.present.floors[0].items[0].locked, true);
});
test("failed commands preserve history and geometry, successful commands clear redo", () => {
  let { h, f, r } = fixture();
  f.items.push(makeItem(r));
  const before = JSON.stringify(h);
  const bad = D.execute(
    h,
    {
      type: "transform",
      floorId: f.id,
      itemId: "test-item",
      x: 99,
      z: 2,
      yaw: 0,
    },
    "2d",
    assets,
  );
  assert.ok(bad.error);
  assert.equal(JSON.stringify(h), before);
  let good = D.execute(
    h,
    {
      type: "transform",
      floorId: f.id,
      itemId: "test-item",
      x: 3,
      z: 2,
      yaw: 0.2,
    },
    "3d",
    assets,
  );
  assert.equal(good.error, null);
  assert.equal(good.history.past.length, 1);
  const undo = D.travelHistory(good.history, "undo", "2d");
  const branch = D.execute(
    undo.history,
    { type: "rename", name: "Branched" },
    "2d",
    assets,
  );
  assert.equal(branch.history.future.length, 0);
});
test("rotated asymmetric bounds preserve model pivot and detect footprint overlap", () => {
  const a = clone(asset);
  a.bounds = { min: [-1, 0, -0.2], max: [2, 1, 0.6] };
  const fp = G.footprint({ x: 3, z: 4, yaw: Math.PI / 2 }, a);
  assert.ok(Math.abs(fp[0].x - 2.8) < 1e-9);
  assert.ok(Math.abs(fp[0].z - 5) < 1e-9);
  assert.equal(G.overlaps(fp, fp), true);
  assert.equal(
    G.overlaps(
      fp,
      fp.map((p) => ({ x: p.x + 20, z: p.z })),
    ),
    false,
  );
});
test("concave room notch and low ceiling reject placements", () => {
  const { f, r } = fixture();
  r.polygon = G.shapePolygon("l", 6, 5);
  const i = makeItem(r);
  i.x = 5;
  i.z = 4;
  assert.ok(G.canPlace(f, r, i, asset, assets));
  r.polygon = G.shapePolygon("rectangle", 6, 5);
  r.ceiling = 0.2;
  i.x = 2;
  i.z = 2;
  assert.match(G.canPlace(f, r, i, asset, assets), /ceiling/);
});
test("opening limits check corners, overlap, lowest ceiling and pocket feasibility", () => {
  const { f } = fixture();
  const wall = f.walls[0],
    base = {
      id: "door1",
      wallId: wall.id,
      type: "single",
      offset: 1,
      width: 0.9,
      height: 2.1,
      sill: 0,
      hinge: "left",
      flip: false,
    };
  assert.equal(G.openingError(f, base), null);
  assert.ok(G.openingError(f, { ...base, offset: 0 }));
  assert.match(G.openingError(f, { ...base, height: 3 }), /ceiling/);
  f.openings.push(base);
  assert.match(
    G.openingError(f, { ...base, id: "door2", offset: 1.5 }),
    /overlap/,
  );
  assert.match(
    G.openingError(f, { ...base, id: "pocket", type: "pocket", offset: 3 }),
    /15 cm/,
  );
});
test("repeat doors get one undo step each and both-face dimensions reverse", () => {
  let { h, f } = fixture();
  const other = D.makeRoom(
    "kitchen",
    "Kitchen",
    G.shapePolygon("rectangle", 3, 5, { x: 6, z: 0 }),
  );
  f.rooms.push(other);
  f.walls = G.rebuildWalls(f.rooms);
  const wall = f.walls.find((w) => w.faces.length === 2);
  for (let n = 0; n < 2; n++) {
    const o = {
      id: "repeat" + n,
      wallId: wall.id,
      type: "open",
      offset: 0.5 + n * 2,
      width: 0.8,
      height: 2.1,
      sill: 0,
      hinge: "left",
      flip: false,
    };
    const result = D.execute(
      h,
      { type: "opening", floorId: f.id, opening: o },
      "2d",
      assets,
    );
    assert.equal(result.error, null);
    h = result.history;
  }
  assert.equal(h.past.length, 2);
  const current = h.present.floors[0],
    dims = G.openingDimensions(current, current.openings[0]);
  assert.equal(dims.length, 2);
  assert.ok(Math.abs(dims[0].before - dims[1].after) < 1e-9);
  assert.equal(
    D.travelHistory(h, "undo", "2d").history.present.floors[0].openings.length,
    1,
  );
});
test("checksum catches corrupted saves and backup recovery preserves latest bytes", async () => {
  const { h } = fixture(),
    map = new Map(),
    storage = {
      getItem: async (k) => map.get(k) ?? null,
      setItem: async (k, v) => {
        map.set(k, v);
      },
    };
  const l = library(h);
  await P.saveLibrary(storage, l);
  await P.saveLibrary(storage, l);
  const raw = map.get(P.PRIMARY);
  assert.throws(
    () => P.decode(raw.replace("Untitled", "Changed")),
    /integrity/,
  );
  map.set(P.PRIMARY, "corrupt");
  const load = await P.loadLibrary(storage);
  assert.ok(load.library);
  assert.match(load.notice, /Recovered/);
  assert.equal(map.get(P.PRIMARY), "corrupt");
});
test("future schema and unusable saves stay protected; save history survives roundtrip", async () => {
  const { h } = fixture(),
    raw = JSON.stringify({ schema: 99, payload: "new format" });
  let r = await P.loadLibrary({
    getItem: async () => raw,
    setItem: async () => {
      throw Error("must not write");
    },
  });
  assert.equal(r.protected, true);
  r = await P.loadLibrary({
    getItem: async () => null,
    setItem: async () => {},
  });
  assert.equal(r.library, null);
  const l = library(h);
  assert.deepEqual(P.decode(P.encode(l)), l);
});
test("catalogue synonyms, compound search, filters, fit and favourites compose", () => {
  const filter = { ...S.initialFilters, query: "couch", room: "living" };
  assert.ok(
    S.searchAssets(assets, filter, [], []).every((a) =>
      (a.name + " " + a.subtype).toLowerCase().includes("sofa"),
    ),
  );
  const a = assets[0];
  assert.equal(
    S.searchAssets(
      assets,
      { ...S.initialFilters, favourites: true },
      [a.id],
      [],
    ).length,
    1,
  );
  assert.equal(
    S.searchAssets(assets, { ...S.initialFilters, width: ".001" }, [], [])
      .length,
    0,
  );
  assert.equal(
    S.searchAssets(
      assets,
      { ...S.initialFilters, query: "impossible_result_223" },
      [],
      [],
    ).length,
    0,
  );
});
test("Walk movement samples paths and cannot tunnel outside room walls or through furniture", () => {
  const { f, r } = fixture();
  const from = { x: 0.4, z: 0.4 };
  const result = D.walkMove(f, r.id, from, { x: 99, z: 0.4 }, assets);
  assert.ok(result.x < 6 && result.x >= from.x);
  f.items = [makeItem(r)];
  const stopped = D.walkMove(f, r.id, { x: 0.3, z: 2 }, { x: 5, z: 2 }, assets);
  assert.ok(stopped.x < 2);
});

test("partially shared door dimensions reach each room's actual corners", () => {
  const p = D.makeProject("living", 6, 6),
    f = p.floors[0],
    living = f.rooms[0];
  const kitchen = D.makeRoom(
    "kitchen",
    "Kitchen",
    G.shapePolygon("rectangle", 4, 3, { x: 6, z: 1 }),
  );
  f.rooms.push(kitchen);
  f.walls = G.rebuildWalls(f.rooms);
  const wall = f.walls.find((w) => w.faces.length === 2);
  const opening = {
    id: "partial",
    wallId: wall.id,
    type: "open",
    offset: 0.65,
    width: 0.9,
    height: 2.1,
    sill: 0,
    hinge: "left",
    flip: false,
  };
  const before = JSON.stringify(f),
    dimensions = G.openingDimensions(f, opening);
  for (const [room, expected] of [
    [living, [1.65, 0.9, 3.45]],
    [kitchen, [0.65, 0.9, 1.45]],
  ]) {
    const span = G.wallFaceSpan(f, wall, room.id),
      dim = dimensions.find((d) => d.roomId === room.id);
    const values = [
      opening.offset - span.low,
      opening.width,
      span.high - opening.offset - opening.width,
    ];
    values.forEach((value, index) =>
      assert.ok(Math.abs(value - expected[index]) < 1e-9),
    );
    assert.ok(
      Math.abs(
        dim.before + opening.width + dim.after - (span.high - span.low),
      ) < 1e-9,
    );
  }
  assert.equal(JSON.stringify(f), before);
});
test("withdrawn designs cannot be newly placed, while saved instances remain editable", () => {
  const { h, f, r } = fixture(),
    a = { ...asset, stage: "needs-rework" },
    item = makeItem(r, a);
  const result = D.execute(h, { type: "add-item", floorId: f.id, item }, "3d", [
    a,
  ]);
  assert.ok(result.error);
  assert.deepEqual(result.history, h);
  f.items.push(item);
  const move = D.execute(
    h,
    {
      type: "transform",
      floorId: f.id,
      itemId: item.id,
      x: 2.3,
      z: 2,
      yaw: 0,
    },
    "3d",
    [a],
  );
  assert.equal(move.error, null);
});
