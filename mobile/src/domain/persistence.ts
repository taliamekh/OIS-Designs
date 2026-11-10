import { Finish, Floor, History, Project, Trim, roomNames } from "./types";
import {
  distance,
  openingError,
  overlaps,
  rebuildWalls,
  validPolygon,
} from "./geometry";
export type Library = {
  version: 1;
  projects: History[];
  activeId: string | null;
  favourites: string[];
  recent: string[];
  recentColours?: string[];
  recentDoorTypes?: Library["lastDoor"]["type"][];
  settings: {
    unit: "m" | "ft";
    grid: boolean;
    quickMove: boolean;
    appearance: "system" | "light" | "dark";
  };
  lastDoor: {
    type: "single" | "double" | "sliding" | "pocket" | "open";
    width: number;
    height: number;
    hinge: "left" | "right";
    flip: boolean;
    repeat: boolean;
  };
};
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  archiveItem?(key: string, archiveKey: string): Promise<void>;
}
export const PRIMARY = "ois.library.v1",
  BACKUP = "ois.library.v1.backup";
export const checksum = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};
const plain = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (s: unknown): s is string => typeof s === "string" && s.length > 0;
const colour = (v: unknown) =>
  typeof v === "string" && /^#[\da-f]{6}$/i.test(v);
const between = (n: number, min: number, max: number) =>
  Number.isFinite(n) && n >= min && n <= max;
const sheens = ["matte", "eggshell", "satin", "semi-gloss", "gloss"];
const textures = [
  "paint",
  "plaster",
  "limewash",
  "microcement",
  "brick",
  "slats",
  "panelling",
  "wallpaper",
  "tile",
  "stone",
];
const floors = [
  "white-oak",
  "walnut",
  "maple",
  "herringbone",
  "bamboo",
  "slate",
  "marble",
  "terrazzo",
  "concrete",
  "carpet",
];
export function validFinish(f: Finish): boolean {
  return (
    plain(f) &&
    colour(f.colour) &&
    textures.includes(f.texture) &&
    sheens.includes(f.sheen)
  );
}
export function validTrim(t: Trim): boolean {
  return (
    plain(t) &&
    ["none", "flat", "bevel", "ogee", "stepped"].includes(t.profile) &&
    between(t.height, 0.02, 0.5) &&
    between(t.projection, 0.003, 0.08) &&
    colour(t.colour) &&
    sheens.includes(t.sheen) &&
    (t.material === undefined ||
      ["paint", "white-oak", "walnut", "aluminium"].includes(t.material)) &&
    (t.reference === undefined ||
      (plain(t.reference) &&
        typeof t.reference.id === "string" &&
        /^reference-[\w-]+$/.test(t.reference.id) &&
        between(t.reference.rulerMetres, 0.001, 10) &&
        (t.reference.note === undefined ||
          (typeof t.reference.note === "string" &&
            t.reference.note.length <= 500))))
  );
}
/** Validate render-required data, topology and references before admitting a save. */
export function validFloor(f: Floor): boolean {
  try {
    if (
      !plain(f) ||
      !text(f.id) ||
      !text(f.name) ||
      !Number.isFinite(f.elevation) ||
      !between(f.ceiling, 1.8, 8) ||
      !plain(f.alignment) ||
      ![f.alignment.x, f.alignment.z].every(Number.isFinite) ||
      !Array.isArray(f.rooms) ||
      !f.rooms.length ||
      !Array.isArray(f.items) ||
      !Array.isArray(f.walls) ||
      !Array.isArray(f.openings)
    )
      return false;
    const ids = new Set<string>([f.id]);
    const unique = (id: string) => {
      if (!text(id) || ids.has(id)) return false;
      ids.add(id);
      return true;
    };
    for (const r of f.rooms)
      if (
        !plain(r) ||
        !unique(r.id) ||
        !text(r.name) ||
        !Object.hasOwn(roomNames, r.kind) ||
        !Array.isArray(r.polygon) ||
        !validPolygon(r.polygon) ||
        (r.ceiling !== null && !between(r.ceiling, 1.8, 8)) ||
        !plain(r.floorFinish) ||
        !floors.includes(r.floorFinish.id) ||
        !between(r.floorFinish.repeat, 0.2, 10) ||
        !Number.isFinite(r.floorFinish.angle) ||
        !validTrim(r.trim) ||
        !plain(r.wallFaces) ||
        !plain(r.trimOverrides)
      )
        return false;
    for (let i = 0; i < f.rooms.length; i++)
      for (let j = i + 1; j < f.rooms.length; j++)
        if (overlaps(f.rooms[i].polygon, f.rooms[j].polygon)) return false;
    const wallIds = new Set<string>();
    for (const w of f.walls) {
      if (
        !plain(w) ||
        !text(w.id) ||
        wallIds.has(w.id) ||
        !plain(w.a) ||
        !plain(w.b) ||
        ![w.a.x, w.a.z, w.b.x, w.b.z].every(Number.isFinite) ||
        distance(w.a, w.b) < 1e-5 ||
        !between(w.thickness, 0.08, 0.6) ||
        !Array.isArray(w.faces) ||
        w.faces.length < 1 ||
        w.faces.length > 2 ||
        new Set(w.faces.map((face) => face.roomId)).size !== w.faces.length ||
        !w.faces.every(
          (face) =>
            plain(face) &&
            typeof face.reversed === "boolean" &&
            f.rooms.some((r) => r.id === face.roomId),
        )
      )
        return false;
      wallIds.add(w.id);
    }
    const expected = rebuildWalls(f.rooms);
    if (
      expected.length !== f.walls.length ||
      !expected.every((e) =>
        f.walls.some(
          (w) =>
            distance(w.a, e.a) < 1e-5 &&
            distance(w.b, e.b) < 1e-5 &&
            w.faces.length === e.faces.length &&
            e.faces.every((face) =>
              w.faces.some(
                (v) => v.roomId === face.roomId && v.reversed === face.reversed,
              ),
            ),
        ),
      )
    )
      return false;
    for (const r of f.rooms) {
      const owns = (id: string) =>
        f.walls.some(
          (w) => w.id === id && w.faces.some((face) => face.roomId === r.id),
        );
      if (
        !Object.entries(r.wallFaces).every(
          ([id, finish]) => owns(id) && validFinish(finish),
        ) ||
        !Object.entries(r.trimOverrides).every(
          ([id, trim]) => owns(id) && validTrim(trim),
        )
      )
        return false;
    }
    for (const i of f.items)
      if (
        !plain(i) ||
        !unique(i.id) ||
        !f.rooms.some((r) => r.id === i.roomId) ||
        ![i.x, i.z, i.yaw].every(Number.isFinite) ||
        typeof i.locked !== "boolean" ||
        !text(i.assetId) ||
        !text(i.assetVersion) ||
        typeof i.assetHash !== "string" ||
        !/^[\da-f]{64}$/i.test(i.assetHash) ||
        !plain(i.materialOverrides) ||
        !Object.values(i.materialOverrides).every(colour)
      )
        return false;
    for (const o of f.openings)
      if (
        !plain(o) ||
        !unique(o.id) ||
        !["single", "double", "sliding", "pocket", "open", "window"].includes(
          o.type,
        ) ||
        !["left", "right"].includes(o.hinge) ||
        typeof o.flip !== "boolean" ||
        openingError(f, o)
      )
        return false;
    return true;
  } catch {
    return false;
  }
}
export function validProject(p: Project): boolean {
  if (
    !plain(p) ||
    p.schemaVersion !== 1 ||
    !text(p.id) ||
    !text(p.name) ||
    !Number.isFinite(p.updatedAt) ||
    !Array.isArray(p.floors) ||
    !p.floors.length
  )
    return false;
  const ids = new Set<string>([p.id]);
  return p.floors.every((f) => {
    if (!validFloor(f)) return false;
    for (const id of [
      f.id,
      ...f.rooms.map((r) => r.id),
      ...f.items.map((i) => i.id),
      ...f.openings.map((o) => o.id),
    ]) {
      if (ids.has(id)) return false;
      ids.add(id);
    }
    return true;
  });
}
export function encode(library: Library): string {
  const payload = JSON.stringify(library);
  return JSON.stringify({ schema: 1, checksum: checksum(payload), payload });
}
export function decode(raw: string): Library {
  const wrapper = JSON.parse(raw);
  if (!plain(wrapper) || wrapper.schema !== 1)
    throw new Error(
      "Unsupported save format. Your saved bytes have been preserved.",
    );
  if (
    typeof wrapper.payload !== "string" ||
    checksum(wrapper.payload) !== wrapper.checksum
  )
    throw new Error("Save integrity check failed.");
  const l = JSON.parse(wrapper.payload) as Library;
  if (
    !plain(l) ||
    l.version !== 1 ||
    !Array.isArray(l.projects) ||
    !l.projects.length ||
    !l.projects.every(
      (h) =>
        plain(h) &&
        validProject(h.present) &&
        Array.isArray(h.past) &&
        Array.isArray(h.future) &&
        h.past.every((p) => validProject(p) && p.id === h.present.id) &&
        h.future.every((p) => validProject(p) && p.id === h.present.id),
    ) ||
    new Set(l.projects.map((h) => h.present.id)).size !== l.projects.length
  )
    throw new Error(
      "Save projects are incomplete or contain invalid geometry.",
    );
  if (
    (l.activeId !== null &&
      (!text(l.activeId) ||
        !l.projects.some((h) => h.present.id === l.activeId))) ||
    !Array.isArray(l.favourites) ||
    !l.favourites.every(text) ||
    !Array.isArray(l.recent) ||
    !l.recent.every(text)
  )
    throw new Error("Save project references are incomplete.");
  if (
    l.recentColours !== undefined &&
    (!Array.isArray(l.recentColours) ||
      l.recentColours.length > 12 ||
      !l.recentColours.every(colour))
  )
    throw new Error("Saved recent colours are invalid.");
  if (
    l.recentDoorTypes !== undefined &&
    (!Array.isArray(l.recentDoorTypes) ||
      l.recentDoorTypes.length > 5 ||
      !l.recentDoorTypes.every((v) =>
        ["single", "double", "sliding", "pocket", "open"].includes(v),
      ))
  )
    throw Error("Saved recent door types are invalid.");
  if (
    !plain(l.settings) ||
    !["m", "ft"].includes(l.settings.unit) ||
    typeof l.settings.grid !== "boolean" ||
    typeof l.settings.quickMove !== "boolean" ||
    !["system", "light", "dark"].includes(l.settings.appearance)
  )
    throw new Error("Save settings are incomplete.");
  const d = l.lastDoor;
  // Accept the legacy window default from early development saves; new pickers
  // keep window choices separate and never overwrite remembered door settings.
  if (
    !plain(d) ||
    !["single", "double", "sliding", "pocket", "open", "window"].includes(
      d.type,
    ) ||
    !between(d.width, 0.3, 50) ||
    !between(d.height, 0.3, 8) ||
    !["left", "right"].includes(d.hinge) ||
    typeof d.flip !== "boolean" ||
    typeof d.repeat !== "boolean"
  )
    throw new Error("Saved opening defaults are incomplete.");
  return l;
}
export async function loadLibrary(storage: StorageAdapter): Promise<{
  library: Library | null;
  notice: string | null;
  protected: boolean;
}> {
  let primary: string | null;
  try {
    primary = await storage.getItem(PRIMARY);
  } catch (e) {
    try {
      const backup = await storage.getItem(BACKUP);
      if (backup !== null)
        return {
          library: decode(backup),
          notice: `The primary save could not be read. A verified backup is open for export; existing saves are protected. ${String(e)}`,
          protected: true,
        };
    } catch {}
    return {
      library: null,
      notice: `Local saved data could not be read and has been preserved. ${String(e)}`,
      protected: true,
    };
  }
  if (primary === null) {
    const backup = await storage.getItem(BACKUP);
    if (backup !== null)
      try {
        return {
          library: decode(backup),
          notice:
            "Recovered the verified backup because the primary save is missing.",
          protected: false,
        };
      } catch {
        return {
          library: null,
          notice:
            "The remaining backup could not be read. It has been preserved.",
          protected: true,
        };
      }
    return { library: null, notice: null, protected: false };
  }
  try {
    return { library: decode(primary), notice: null, protected: false };
  } catch (e) {
    try {
      const wrapper = JSON.parse(primary);
      if (
        plain(wrapper) &&
        typeof wrapper.schema === "number" &&
        wrapper.schema > 1
      )
        return { library: null, notice: String(e), protected: true };
    } catch {}
    const backup = await storage.getItem(BACKUP);
    if (backup !== null)
      try {
        return {
          library: decode(backup),
          notice:
            "Recovered the last verified local save. The unreadable save is preserved until your next edit.",
          protected: false,
        };
      } catch {}
    return {
      library: null,
      notice:
        "Local save could not be read. It has been preserved. Export it in Settings before starting a fresh library.",
      protected: true,
    };
  }
}
export async function saveLibrary(
  storage: StorageAdapter,
  l: Library,
): Promise<void> {
  const raw = encode(l);
  decode(raw);
  const previous = await storage.getItem(PRIMARY);
  if (previous !== null) {
    try {
      const wrapper = JSON.parse(previous);
      if (
        plain(wrapper) &&
        typeof wrapper.schema === "number" &&
        wrapper.schema > 1
      )
        throw new Error("NEWER_SAVE");
    } catch (e) {
      if (e instanceof Error && e.message === "NEWER_SAVE")
        throw new Error(
          "A newer local save is protected. Export and explicitly recover it before saving.",
        );
    }
    let verified = false;
    try {
      decode(previous);
      verified = true;
    } catch {}
    // Storage errors must propagate; a failed backup write does not make valid bytes corrupt.
    if (verified) await storage.setItem(BACKUP, previous);
    else await storage.setItem(PRIMARY + ".unreadable", previous);
  }
  await storage.setItem(PRIMARY, raw);
}
/** Explicit user-initiated import. Archive original bytes before replacing a protected save. */
export async function recoverLibrary(
  storage: StorageAdapter,
  l: Library,
): Promise<void> {
  const raw = encode(l);
  decode(raw);
  const stamp =
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  if (storage.archiveItem) {
    await storage.archiveItem(PRIMARY, `${PRIMARY}.before-recovery.${stamp}`);
    await storage.archiveItem(BACKUP, `${BACKUP}.before-recovery.${stamp}`);
  } else {
    const primary = await storage.getItem(PRIMARY),
      backup = await storage.getItem(BACKUP);
    if (primary !== null)
      await storage.setItem(`${PRIMARY}.before-recovery.${stamp}`, primary);
    if (backup !== null)
      await storage.setItem(`${BACKUP}.before-recovery.${stamp}`, backup);
  }
  await storage.setItem(BACKUP, raw);
  await storage.setItem(PRIMARY, raw);
}
