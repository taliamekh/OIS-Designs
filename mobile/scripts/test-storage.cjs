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
    FileBackedStorage,
    FILE_INDEX_PREFIX,
  } = require("../src/storage/fileStore.ts"),
  P = require("../src/domain/persistence.ts"),
  { makeProject } = require("../src/domain/project.ts");
function fixture() {
  const index = new Map(),
    files = new Map();
  let failure = null;
  const store = new FileBackedStorage(
    {
      getItem: async (k) => index.get(k) ?? null,
      setItem: async (k, v) => {
        if (failure === "pointer") throw Error("pointer failure");
        assert.ok(
          Buffer.byteLength(v) < 100,
          "native SQLite gets tiny pointers only",
        );
        index.set(k, v);
      },
    },
    {
      write: async (k, v) => {
        if (failure === "write") throw Error("disk full");
        files.set(k, failure === "truncate" ? v.slice(0, -1) : v);
      },
      read: async (k) => {
        if (!files.has(k)) throw Error("missing file");
        return files.get(k);
      },
      remove: async (k) => {
        files.delete(k);
      },
    },
  );
  return {
    store,
    index,
    files,
    fail: (v) => {
      failure = v;
    },
  };
}
test("native storage keeps 8MiB payload outside tiny-key database and recovers existing legacy bytes", async () => {
  const f = fixture(),
    large = "x".repeat(8 * 1024 * 1024);
  f.index.set("legacy", "original");
  assert.equal(await f.store.getItem("legacy"), "original");
  await f.store.setItem("legacy", "replacement");
  assert.equal(f.index.get("legacy"), "original");
  assert.equal(await f.store.getItem("legacy"), "replacement");
  await f.store.setItem(P.PRIMARY, large);
  await f.store.setItem(P.BACKUP, large);
  assert.equal(await f.store.getItem(P.PRIMARY), large);
  assert.equal(await f.store.getItem(P.BACKUP), large);
  assert.equal(
    [...f.index].filter(([k]) => k.startsWith(FILE_INDEX_PREFIX)).length,
    3,
  );
});
test("file truncation/disk/pointer failures preserve committed primary and verified backup", async () => {
  const f = fixture();
  await f.store.setItem(P.PRIMARY, "first");
  await f.store.setItem(P.BACKUP, "backup");
  const primary = f.index.get(FILE_INDEX_PREFIX + P.PRIMARY);
  for (const mode of ["truncate", "write", "pointer"]) {
    f.fail(mode);
    await assert.rejects(f.store.setItem(P.PRIMARY, "second"));
    assert.equal(f.index.get(FILE_INDEX_PREFIX + P.PRIMARY), primary);
    f.fail(null);
    assert.equal(await f.store.getItem(P.PRIMARY), "first");
    assert.equal(await f.store.getItem(P.BACKUP), "backup");
    assert.equal(f.files.size, 2);
  }
  await Promise.all([
    f.store.setItem(P.PRIMARY, "second"),
    f.store.setItem(P.PRIMARY, "third"),
  ]);
  assert.equal(await f.store.getItem(P.PRIMARY), "third");
  assert.equal(f.files.size, 2);
});
test("a primary read failure still opens the verified backup with editing protected", async () => {
  const p = makeProject("living", 4, 3),
    l = {
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
    };
  const result = await P.loadLibrary({
    getItem: async (k) => {
      if (k === P.PRIMARY) throw Error("unreadable primary");
      return k === P.BACKUP ? P.encode(l) : null;
    },
    setItem: async () => assert.fail("load must never write"),
  });
  assert.deepEqual(result.library, l);
  assert.equal(result.protected, true);
  assert.match(result.notice, /verified backup/);
});
test("ambiguous pointer failures never delete a possibly committed generation", async () => {
  for (const unreadable of [false, true]) {
    const index = new Map(),
      files = new Map();
    let reject = false;
    const store = new FileBackedStorage(
      {
        getItem: async (k) => {
          if (reject && unreadable) throw Error("index unreadable");
          return index.get(k) ?? null;
        },
        setItem: async (k, v) => {
          index.set(k, v);
          if (reject) throw Error("committed then rejected");
        },
      },
      {
        write: async (k, v) => {
          files.set(k, v);
        },
        read: async (k) => {
          if (!files.has(k)) throw Error("missing payload");
          return files.get(k);
        },
        remove: async (k) => {
          files.delete(k);
        },
      },
    );
    await store.setItem(P.PRIMARY, "first");
    reject = true;
    // Let the initial old-pointer lookup work, then fail readback after publication.
    if (unreadable) {
      let reads = 0;
      store.index.getItem = async (k) => {
        if (reads++ > 0) throw Error("index unreadable");
        return index.get(k) ?? null;
      };
      await assert.rejects(store.setItem(P.PRIMARY, "second"));
      assert.equal(files.size, 2);
    } else {
      await store.setItem(P.PRIMARY, "second");
      assert.equal(files.size, 1);
    }
    const pointer = index.get(FILE_INDEX_PREFIX + P.PRIMARY);
    assert.equal(files.get(pointer), "second");
  }
});
test("explicit recovery pins unreadable generations and remains usable after adapter restart", async () => {
  const p = makeProject("living", 4, 3),
    l = {
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
    };
  for (const missing of [false, true]) {
    const index = new Map(),
      files = new Map();
    let blockedName = null;
    const adapter = {
        getItem: async (k) => index.get(k) ?? null,
        setItem: async (k, v) => {
          index.set(k, v);
        },
      },
      payloads = {
        write: async (k, v) => {
          files.set(k, v);
        },
        read: async (k) => {
          if (k === blockedName) throw Error("unreadable primary");
          if (!files.has(k)) throw Error("missing file");
          return files.get(k);
        },
        remove: async (k) => {
          files.delete(k);
        },
      };
    const store = new FileBackedStorage(adapter, payloads);
    await P.saveLibrary(store, l);
    await P.saveLibrary(store, l);
    const original = index.get(FILE_INDEX_PREFIX + P.PRIMARY);
    if (missing) files.delete(original);
    else blockedName = original;
    const loaded = await P.loadLibrary(store);
    assert.equal(loaded.protected, true);
    assert.deepEqual(loaded.library, l);
    await P.recoverLibrary(store, l);
    assert.equal((await P.loadLibrary(store)).protected, false);
    blockedName = null;
    const restarted = new FileBackedStorage(adapter, payloads);
    await P.saveLibrary(restarted, l);
    assert.deepEqual((await P.loadLibrary(restarted)).library, l);
    const archive = [...index].find(
      ([key, value]) =>
        key.startsWith(FILE_INDEX_PREFIX + P.PRIMARY + ".before-recovery.") &&
        value === original,
    );
    assert.ok(archive, "original generation reference is archived");
    if (!missing)
      assert.equal(
        files.get(original),
        P.encode(l),
        "unreadable original payload survives recovery and later saves",
      );
  }
});
