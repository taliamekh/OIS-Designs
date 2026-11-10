const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
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
const {
    DraftStore,
    decodeDraft,
    DRAFT_KEY,
  } = require("../src/domain/draft.ts"),
  { makeRoom } = require("../src/domain/project.ts"),
  { shapePolygon, toDisplay } = require("../src/domain/geometry.ts"),
  { enteredMetres } = require("../src/ui/measurements.ts");
const draft = () => ({
  version: 1,
  rooms: [makeRoom("living", "Living room", shapePolygon("rectangle", 4, 3))],
  points: [
    { x: 4, z: 0 },
    { x: 8, z: 0 },
  ],
  kind: "kitchen",
  height: "2.7",
  unit: "m",
});
test("draft survives interrupted multi-room creation including unclosed next room", async () => {
  const data = new Map(),
    storage = {
      getItem: async (k) => data.get(k) ?? null,
      setItem: async (k, v) => {
        await new Promise((r) => setTimeout(r, 2));
        data.set(k, v);
      },
    };
  const store = new DraftStore(storage),
    first = draft(),
    last = { ...first, points: [...first.points, { x: 8, z: 3 }] };
  await Promise.all([store.save(first), store.save(last)]);
  assert.deepEqual(await new DraftStore(storage).load(), last);
  const raw = data.get(DRAFT_KEY);
  await store.startFresh();
  assert.equal(await store.load(), null);
  assert.ok(
    [...data].some(
      ([k, v]) => k.startsWith(DRAFT_KEY + ".before-reset.") && v === raw,
    ),
  );
});
test("invalid/future drafts remain untouched and failed archive never replaces original", async () => {
  const raw = '{"version":9,"future":"preserve"}',
    data = new Map([[DRAFT_KEY, raw]]),
    storage = {
      getItem: async (k) => data.get(k) ?? null,
      setItem: async (k, v) => {
        if (k !== DRAFT_KEY) throw Error("archive write failed");
        data.set(k, v);
      },
    };
  const store = new DraftStore(storage);
  await assert.rejects(store.load(), /newer/);
  await assert.rejects(store.startFresh(), /archive/);
  assert.equal(data.get(DRAFT_KEY), raw);
  for (const mutation of [
    (d) => {
      d.kind = "constructor";
    },
    (d) => {
      d.points = [{ x: Infinity, z: 0 }];
    },
    (d) => {
      d.guide = [];
    },
    (d) => {
      d.rooms.push({ ...d.rooms[0] });
    },
    (d) => {
      d.rooms[0].polygon = [{ x: 0, z: 0 }];
    },
  ]) {
    const d = draft();
    mutation(d);
    assert.throws(() => decodeDraft(JSON.stringify(d)));
  }
});
test("untouched rounded dimension fields preserve exact metres across units and repeated applies", () => {
  for (const unit of ["m", "ft"])
    for (const original of [
      0.000123, 0.903215, 1.23456789, 3.14159265359, 19.8888888, -2.1234567,
    ])
      for (const digits of [2, 3]) {
        let value = original;
        for (let i = 0; i < 30; i++)
          value = enteredMetres(
            toDisplay(value, unit).toFixed(digits),
            value,
            unit,
            digits,
          );
        assert.equal(value, original);
      }
  assert.equal(enteredMetres("12", 2, "ft"), 3.6576000000000004);
});
