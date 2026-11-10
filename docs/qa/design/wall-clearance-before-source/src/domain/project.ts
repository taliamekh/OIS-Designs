import {
  AssetRecord,
  defaultTrim,
  Floor,
  History,
  newId,
  Opening,
  Project,
  Room,
  RoomKind,
  Finish,
  Trim,
  FloorFinish,
  Item,
  Point,
  Wall,
} from "./types";
import {
  assetForItem,
  bounds,
  canPlace,
  distance,
  EPS,
  inside,
  lerp,
  openingError,
  overlaps,
  projectToSegment,
  rebuildWalls,
  shapePolygon,
  validPolygon,
} from "./geometry";
import {
  validFinish,
  validFloor,
  validProject,
  validTrim,
} from "./persistence";

export function makeRoom(kind: RoomKind, name: string, polygon: Point[]): Room {
  return {
    id: newId("room"),
    name,
    kind,
    polygon,
    ceiling: null,
    floorFinish: { id: "white-oak", repeat: 2, angle: 0 },
    wallFaces: {},
    trim: { ...defaultTrim },
    trimOverrides: {},
  };
}
export function makeFloor(name = "Ground floor", elevation = 0): Floor {
  return {
    id: newId("floor"),
    name,
    elevation,
    ceiling: 2.7,
    alignment: { x: 0, z: 0 },
    rooms: [],
    walls: [],
    openings: [],
    items: [],
  };
}
export function makeProject(
  kind: RoomKind,
  width = 4.8,
  depth = 3.8,
  height = 2.7,
  shape = "rectangle",
  polygon?: Point[],
): Project {
  if (
    ![width, depth, height].every(Number.isFinite) ||
    width < 0.5 ||
    width > 50 ||
    depth < 0.5 ||
    depth > 50 ||
    height < 1.8 ||
    height > 8 ||
    (polygon && !validPolygon(polygon))
  )
    throw new Error(
      "Use valid room dimensions and a closed outline without crossing walls.",
    );
  const floor = makeFloor();
  floor.ceiling = height;
  floor.rooms = [
    makeRoom(
      kind,
      kind === "living"
        ? "Living room"
        : kind.charAt(0).toUpperCase() + kind.slice(1),
      polygon ?? shapePolygon(shape, width, depth),
    ),
  ];
  floor.walls = rebuildWalls(floor.rooms);
  const project: Project = {
    id: newId("project"),
    schemaVersion: 1,
    name: "Untitled project",
    updatedAt: Date.now(),
    floors: [floor],
  };
  if (!validProject(project))
    throw new Error("The room outline, dimensions or room type is invalid.");
  return project;
}
export function sampleProject(assets: AssetRecord[]): Project {
  const p = makeProject("living");
  p.name = "Maple House";
  const f = p.floors[0],
    living = f.rooms[0];
  const kitchen = makeRoom(
    "kitchen",
    "Kitchen",
    shapePolygon("rectangle", 3.2, 3.8, { x: 4.8, z: 0 }),
  );
  kitchen.floorFinish.id = "slate";
  f.rooms.push(kitchen);
  f.walls = rebuildWalls(f.rooms);
  const shared = f.walls.find((w) => w.faces.length === 2)!;
  f.openings.push({
    id: newId("opening"),
    wallId: shared.id,
    type: "open",
    offset: 1.5,
    width: 1.1,
    height: 2.1,
    sill: 0,
    hinge: "left",
    flip: false,
  });
  const placements = [
    ["sofa", 2, 2.95, Math.PI],
    ["armchair", 3.7, 1.5, Math.PI / 2],
    ["coffee", 1.9, 1.65, 0],
  ] as const;
  for (const [tag, x, z, yaw] of placements) {
    const a = assets.find(
      (a) =>
        a.roomTags.includes("living") &&
        a.theme === "calm-oak" &&
        (a.subtype.includes(tag) || a.geometryFamily.includes(tag)),
    );
    if (a)
      f.items.push({
        id: newId("item"),
        roomId: living.id,
        assetId: a.id,
        assetVersion: a.version,
        assetHash: a.sha256,
        x,
        z,
        yaw,
        locked: false,
        materialOverrides: {},
      });
  }
  const upper = makeFloor("First floor", 3);
  upper.rooms = [
    makeRoom("bedroom", "Bedroom", shapePolygon("rectangle", 4.8, 3.8)),
    makeRoom(
      "bathroom",
      "Bathroom",
      shapePolygon("rectangle", 3.2, 3.8, { x: 4.8, z: 0 }),
    ),
  ];
  upper.rooms[1].floorFinish.id = "marble";
  upper.walls = rebuildWalls(upper.rooms);
  p.floors.push(upper);
  return p;
}
export type Command =
  | { type: "add-item"; floorId: string; item: Item }
  | {
      type: "transform";
      floorId: string;
      itemId: string;
      x: number;
      z: number;
      yaw: number;
    }
  | { type: "lock"; floorId: string; itemId: string; locked: boolean }
  | {
      type: "delete-item";
      floorId: string;
      itemId: string;
      intentional: boolean;
    }
  | {
      type: "item-material";
      floorId: string;
      itemId: string;
      slot: string;
      colour: string;
    }
  | {
      type: "room-dimensions";
      floorId: string;
      roomId: string;
      width: number;
      depth: number;
      ceiling: number | null;
    }
  | {
      type: "floor-finish";
      floorId: string;
      roomId: string;
      finish: FloorFinish;
    }
  | {
      type: "wall-finish";
      floorId: string;
      roomId: string;
      wallId: string | "all";
      finish: Finish;
    }
  | {
      type: "trim";
      floorId: string;
      roomId: string;
      wallId?: string;
      trim: Trim;
    }
  | { type: "opening"; floorId: string; opening: Opening }
  | { type: "delete-opening"; floorId: string; openingId: string }
  | {
      type: "wall-thickness";
      floorId: string;
      wallId: string;
      thickness: number;
    }
  | { type: "add-room"; floorId: string; room: Room }
  | { type: "room-polygon"; floorId: string; roomId: string; polygon: Point[] }
  | { type: "add-floor"; floor: Floor }
  | {
      type: "floor-settings";
      floorId: string;
      name: string;
      elevation: number;
      ceiling: number;
      alignment: Point;
    }
  | { type: "rename"; name: string };
export type CommandResult = { history: History; error: string | null };
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** Reconcile physical wall segments after a topology change, retaining face-specific work. */
function reconcileWalls(floor: Floor, previous: Floor): string | null {
  floor.walls = rebuildWalls(floor.rooms, previous.walls);
  const relations = new Map<string, { wall: Wall; a: Point; b: Point }[]>();
  const thickness = new Map<string, number>();
  for (const room of floor.rooms) {
    const oldRoom = previous.rooms.find((r) => r.id === room.id);
    if (!oldRoom) continue;
    const finishes: Record<string, Finish> = {},
      trims: Record<string, Trim> = {};
    for (const oldWall of previous.walls.filter((w) =>
      w.faces.some((face) => face.roomId === room.id),
    )) {
      let a = oldWall.a,
        b = oldWall.b;
      if (JSON.stringify(oldRoom.polygon) !== JSON.stringify(room.polygon)) {
        const edge = oldRoom.polygon.findIndex(
          (p, i) =>
            projectToSegment(
              a,
              p,
              oldRoom.polygon[(i + 1) % oldRoom.polygon.length],
            ).distance < EPS &&
            projectToSegment(
              b,
              p,
              oldRoom.polygon[(i + 1) % oldRoom.polygon.length],
            ).distance < EPS,
        );
        if (edge < 0 || oldRoom.polygon.length !== room.polygon.length) {
          if (
            oldRoom.wallFaces[oldWall.id] ||
            oldRoom.trimOverrides[oldWall.id] ||
            previous.openings.some((o) => o.wallId === oldWall.id)
          )
            return "This outline changes wall topology with existing openings or finishes. Preserve its ordered corners or move the affected opening first.";
          continue;
        }
        const oldA = oldRoom.polygon[edge],
          oldB = oldRoom.polygon[(edge + 1) % oldRoom.polygon.length],
          newA = room.polygon[edge],
          newB = room.polygon[(edge + 1) % room.polygon.length];
        a = lerp(newA, newB, projectToSegment(oldWall.a, oldA, oldB).t);
        b = lerp(newA, newB, projectToSegment(oldWall.b, oldA, oldB).t);
      }
      const length = distance(a, b),
        ux = (b.x - a.x) / length,
        uz = (b.z - a.z) / length;
      const candidates = floor.walls.filter(
        (w) =>
          w.faces.some((face) => face.roomId === room.id) &&
          Math.abs((w.a.x - a.x) * uz - (w.a.z - a.z) * ux) < EPS &&
          Math.abs((w.b.x - a.x) * uz - (w.b.z - a.z) * ux) < EPS &&
          Math.min(
            length,
            Math.max(
              (w.a.x - a.x) * ux + (w.a.z - a.z) * uz,
              (w.b.x - a.x) * ux + (w.b.z - a.z) * uz,
            ),
          ) -
            Math.max(
              0,
              Math.min(
                (w.a.x - a.x) * ux + (w.a.z - a.z) * uz,
                (w.b.x - a.x) * ux + (w.b.z - a.z) * uz,
              ),
            ) >
            EPS,
      );
      if (
        !candidates.length &&
        (oldRoom.wallFaces[oldWall.id] || oldRoom.trimOverrides[oldWall.id])
      )
        return "This edit would remove a finished wall face. Preserve its boundary before editing.";
      relations.set(
        oldWall.id + "|" + room.id,
        candidates.map((wall) => ({ wall, a, b })),
      );
      for (const wall of candidates) {
        const prior = thickness.get(wall.id);
        if (prior !== undefined && Math.abs(prior - oldWall.thickness) > EPS)
          return "This edit merges wall segments with different thicknesses.";
        thickness.set(wall.id, oldWall.thickness);
        wall.thickness = oldWall.thickness;
        const finish = oldRoom.wallFaces[oldWall.id],
          trim = oldRoom.trimOverrides[oldWall.id];
        if (finish) {
          if (
            finishes[wall.id] &&
            JSON.stringify(finishes[wall.id]) !== JSON.stringify(finish)
          )
            return "This edit merges faces with different finishes.";
          finishes[wall.id] = clone(finish);
        }
        if (trim) {
          if (
            trims[wall.id] &&
            JSON.stringify(trims[wall.id]) !== JSON.stringify(trim)
          )
            return "This edit merges faces with different baseboards.";
          trims[wall.id] = clone(trim);
        }
      }
    }
    room.wallFaces = finishes;
    room.trimOverrides = trims;
  }
  const openings: Opening[] = [];
  for (const opening of previous.openings) {
    const oldWall = previous.walls.find((w) => w.id === opening.wallId);
    if (!oldWall) return "An existing opening has no wall reference.";
    let placed: Opening | undefined;
    for (const face of oldWall.faces) {
      const options = relations.get(oldWall.id + "|" + face.roomId) ?? [];
      const matches = options
        .map(({ wall, a, b }) => {
          const length = distance(a, b),
            ux = (b.x - a.x) / length,
            uz = (b.z - a.z) / length;
          const start = {
              x: a.x + ux * opening.offset,
              z: a.z + uz * opening.offset,
            },
            end = {
              x: start.x + ux * opening.width,
              z: start.z + uz * opening.width,
            };
          const first = projectToSegment(start, wall.a, wall.b),
            last = projectToSegment(end, wall.a, wall.b);
          if (
            first.distance > EPS ||
            last.distance > EPS ||
            Math.abs(distance(first.point, last.point) - opening.width) > EPS
          )
            return null;
          const reversed = first.offset > last.offset;
          return {
            ...opening,
            wallId: wall.id,
            offset: Math.min(first.offset, last.offset),
            hinge: reversed
              ? opening.hinge === "left"
                ? ("right" as const)
                : ("left" as const)
              : opening.hinge,
            flip: reversed ? !opening.flip : opening.flip,
          };
        })
        .filter((o): o is Opening => o !== null);
      if (matches.length !== 1)
        return "An existing opening crosses a new wall junction or no longer fits its wall. Move the opening or junction first.";
      if (
        placed &&
        (placed.wallId !== matches[0].wallId ||
          Math.abs(placed.offset - matches[0].offset) > EPS)
      )
        return "This edit separates the two room-facing sides of an existing opening.";
      placed = matches[0];
    }
    if (placed) openings.push(placed);
  }
  floor.openings = openings;
  return null;
}
export function execute(
  history: History,
  command: Command,
  mode: "2d" | "3d" | "walk",
  assets: AssetRecord[],
): CommandResult {
  if (mode === "walk")
    return { history, error: "Walk is read-only. Exit Walk to edit." };
  try {
    return applyCommand(history, command, mode, assets);
  } catch (e) {
    return {
      history,
      error: `Edit rejected because its data is incomplete: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
function applyCommand(
  history: History,
  command: Command,
  mode: "2d" | "3d" | "walk",
  assets: AssetRecord[],
): CommandResult {
  const fail = (error: string): CommandResult => ({ history, error });
  if (mode === "walk") return fail("Walk is read-only. Exit Walk to edit.");
  if (
    !["2d", "3d"].includes(mode) ||
    !command ||
    ![
      "add-item",
      "transform",
      "lock",
      "delete-item",
      "item-material",
      "room-dimensions",
      "floor-finish",
      "wall-finish",
      "trim",
      "opening",
      "delete-opening",
      "wall-thickness",
      "add-room",
      "room-polygon",
      "add-floor",
      "floor-settings",
      "rename",
    ].includes(command.type)
  )
    return fail("Choose a valid edit command and view.");
  command = clone(command);
  const p = clone(history.present);
  const f =
    "floorId" in command
      ? p.floors.find((f) => f.id === command.floorId)
      : undefined;
  if ("floorId" in command && !f) return fail("Floor no longer exists.");
  const room =
    f && "roomId" in command
      ? f.rooms.find((r) => r.id === command.roomId)
      : undefined;
  if ("roomId" in command && !room) return fail("Room no longer exists.");
  const item =
    f && "itemId" in command
      ? f.items.find((i) => i.id === command.itemId)
      : undefined;
  if ("itemId" in command && !item) return fail("Item no longer exists.");
  let error: string | null = null;
  if (command.type === "rename")
    p.name = command.name.trim().slice(0, 80) || "Untitled project";
  if (command.type === "add-floor") {
    const next = command.floor;
    if (!next || !Array.isArray(next.rooms) || !Array.isArray(next.walls))
      return fail(
        "A new floor needs valid room and wall arrays and dimensions.",
      );
    next.walls = rebuildWalls(next.rooms, next.walls);
    if (!validFloor(next))
      return fail(
        "Use a valid new floor with finite elevation/alignment, ceiling 1.8–8 m and valid rooms.",
      );
    p.floors.push(next);
  }
  if (command.type === "floor-settings" && f) {
    if (
      ![
        command.elevation,
        command.ceiling,
        command.alignment.x,
        command.alignment.z,
      ].every(Number.isFinite) ||
      command.ceiling < 1.8 ||
      command.ceiling > 8
    )
      return fail(
        "Use a ceiling height from 1.8 to 8 metres and finite alignment.",
      );
    Object.assign(f, {
      name: command.name.trim() || f.name,
      elevation: command.elevation,
      ceiling: command.ceiling,
      alignment: command.alignment,
    });
  }
  if (command.type === "add-room" && f) {
    if (!validPolygon(command.room.polygon))
      return fail(
        "Draw a closed outline without crossing walls. Minimum area 0.25 m².",
      );
    if (f.rooms.some((r) => overlaps(r.polygon, command.room.polygon)))
      return fail(
        "New room overlaps an existing room. Place it beside the current plan.",
      );
    const previous = clone(f);
    f.rooms.push(command.room);
    error = reconcileWalls(f, previous);
    if (error) return fail(error);
  }
  if (command.type === "room-polygon" && f && room) {
    if (!validPolygon(command.polygon))
      return fail("Outline is invalid or crosses itself.");
    if (
      f.rooms.some(
        (r) => r.id !== room.id && overlaps(r.polygon, command.polygon),
      )
    )
      return fail("Edited outline overlaps another room.");
    const previous = clone(f);
    room.polygon = command.polygon;
    error = reconcileWalls(f, previous);
    if (error) return fail(error);
  }
  if (command.type === "room-dimensions" && f && room) {
    if (
      ![command.width, command.depth].every(Number.isFinite) ||
      command.width < 0.5 ||
      command.depth < 0.5 ||
      command.width > 50 ||
      command.depth > 50 ||
      (command.ceiling !== null &&
        (!Number.isFinite(command.ceiling) ||
          command.ceiling < 1.8 ||
          command.ceiling > 8))
    )
      return fail("Use room dimensions 0.5–50 m and ceiling 1.8–8 m.");
    const previous = clone(f),
      b = bounds(room.polygon);
    room.polygon = room.polygon.map((v) => ({
      x: b.minX + ((v.x - b.minX) * command.width) / (b.maxX - b.minX),
      z: b.minZ + ((v.z - b.minZ) * command.depth) / (b.maxZ - b.minZ),
    }));
    room.ceiling = command.ceiling;
    if (
      f.rooms.some((r) => r.id !== room.id && overlaps(r.polygon, room.polygon))
    )
      return fail(
        "Resizing would overlap another room. Edit the outline or neighbouring room first.",
      );
    error = reconcileWalls(f, previous);
    if (error) return fail(error);
  }
  if (command.type === "add-item" && f) {
    const a = assetForItem(command.item, assets),
      r = f.rooms.find((r) => r.id === command.item.roomId);
    if (!a || !r) return fail("Asset revision or room is unavailable.");
    if (a.stage === "needs-rework")
      return fail(
        "This model is being updated. Existing placements are preserved.",
      );
    if (f.items.some((i) => i.id === command.item.id))
      return fail("Item ID already exists.");
    error = canPlace(f, r, command.item, a, assets);
    if (!error) f.items.push(command.item);
  }
  if (command.type === "transform" && f && item) {
    if (item.locked)
      return fail("Unlock the selected item to move or rotate it.");
    if (![command.x, command.z, command.yaw].every(Number.isFinite))
      return fail("Position must contain finite numbers.");
    Object.assign(item, { x: command.x, z: command.z, yaw: command.yaw });
  }
  if (command.type === "lock" && item) item.locked = command.locked;
  if (command.type === "delete-item" && f && item) {
    if (!command.intentional)
      return fail("Select the item and use Delete intentionally.");
    f.items = f.items.filter((i) => i.id !== item.id);
  }
  if (command.type === "item-material" && item) {
    if (!/^#[\da-f]{6}$/i.test(command.colour))
      return fail("Use a six-digit HEX colour.");
    const a = assetForItem(item, assets);
    if (!a?.variantSlots.includes(command.slot))
      return fail(
        "This saved model revision does not expose that material slot.",
      );
    item.materialOverrides[command.slot] = command.colour;
  }
  if (command.type === "floor-finish" && room) {
    if (
      !Number.isFinite(command.finish.repeat) ||
      command.finish.repeat < 0.2 ||
      command.finish.repeat > 10 ||
      !Number.isFinite(command.finish.angle)
    )
      return fail("Repeat size must be 0.2–10 m.");
    room.floorFinish = command.finish;
  }
  if (command.type === "wall-finish" && room && f) {
    if (!validFinish(command.finish))
      return fail("Use a valid wall finish and six-digit HEX colour.");
    const walls = f.walls.filter((w) =>
      w.faces.some((face) => face.roomId === room.id),
    );
    if (command.wallId !== "all" && !walls.some((w) => w.id === command.wallId))
      return fail("Choose a wall face in the current room.");
    for (const w of walls)
      if (command.wallId === "all" || command.wallId === w.id)
        room.wallFaces[w.id] = command.finish;
  }
  if (command.type === "trim" && room && f) {
    if (!validTrim(command.trim))
      return fail(
        "Use a valid trim profile/HEX, height 2–50 cm and projection 3–80 mm.",
      );
    if (
      command.wallId &&
      !f.walls.some(
        (w) =>
          w.id === command.wallId &&
          w.faces.some((face) => face.roomId === room.id),
      )
    )
      return fail("Choose a wall face in the current room.");
    if (command.wallId) room.trimOverrides[command.wallId] = command.trim;
    else room.trim = command.trim;
  }
  if (command.type === "opening" && f) {
    error = openingError(f, command.opening);
    if (!error) {
      f.openings = f.openings.filter((o) => o.id !== command.opening.id);
      f.openings.push(command.opening);
    }
  }
  if (command.type === "delete-opening" && f)
    f.openings = f.openings.filter((o) => o.id !== command.openingId);
  if (command.type === "wall-thickness" && f) {
    const w = f.walls.find((w) => w.id === command.wallId);
    if (
      !w ||
      !Number.isFinite(command.thickness) ||
      command.thickness < 0.08 ||
      command.thickness > 0.6
    )
      return fail("Wall thickness must be 8–60 cm.");
    w.thickness = command.thickness;
  }
  if (error) return fail(error);
  // Revalidate all affected geometry, including existing objects and openings after resizing.
  if (f) {
    for (const o of f.openings) {
      error = openingError(f, o);
      if (error) return fail(`Existing opening: ${error}`);
    }
    if (
      [
        "room-dimensions",
        "room-polygon",
        "floor-settings",
        "trim",
        "transform",
        "opening",
        "add-room",
        "wall-thickness",
      ].includes(command.type)
    ) {
      // A one-item transform cannot change relationships between all the other items.
      // Validate that item against its neighbours instead of an O(n²) whole-floor pass.
      const affected =
        command.type === "transform"
          ? f.items.filter((i) => i.id === command.itemId)
          : ["room-dimensions", "room-polygon", "trim"].includes(
                command.type,
              ) && room
            ? f.items.filter((i) => i.roomId === room.id)
            : f.items;
      for (const i of affected) {
        const a = assetForItem(i, assets),
          r = f.rooms.find((r) => r.id === i.roomId);
        if (!a || !r)
          return fail(
            `Furniture revision unavailable: ${i.assetId} (${i.assetVersion}). Restore its saved model before changing geometry.`,
          );
        error = canPlace(f, r, i, a, assets);
        if (error) return fail(`${a.name}: ${error}`);
      }
    }
  }
  if (!validProject(p))
    return fail(
      "The edit would create invalid project data, duplicate IDs or inconsistent wall references.",
    );
  p.updatedAt = Date.now();
  return {
    history: {
      past: [...history.past, history.present].slice(-50),
      present: p,
      future: [],
    },
    error: null,
  };
}
export function travelHistory(
  history: History,
  direction: "undo" | "redo",
  mode: "2d" | "3d" | "walk",
): CommandResult {
  if (mode === "walk")
    return { history, error: "Walk is read-only. Exit Walk to edit." };
  if (direction === "undo") {
    if (!history.past.length) return { history, error: null };
    return {
      history: {
        past: history.past.slice(0, -1),
        present: history.past[history.past.length - 1],
        future: [history.present, ...history.future].slice(0, 50),
      },
      error: null,
    };
  }
  if (!history.future.length) return { history, error: null };
  return {
    history: {
      past: [...history.past, history.present].slice(-50),
      present: history.future[0],
      future: history.future.slice(1),
    },
    error: null,
  };
}
export function freePosition(
  f: Floor,
  r: Room,
  a: AssetRecord,
  assets: AssetRecord[],
): Item | null {
  const b = bounds(r.polygon);
  for (let z = b.minZ + 0.15; z < b.maxZ; z += 0.2)
    for (let x = b.minX + 0.15; x < b.maxX; x += 0.2) {
      const i: Item = {
        id: newId("item"),
        roomId: r.id,
        assetId: a.id,
        assetVersion: a.version,
        assetHash: a.sha256,
        x: Math.round(x * 100) / 100,
        z: Math.round(z * 100) / 100,
        yaw: 0,
        locked: false,
        materialOverrides: {},
      };
      if (!canPlace(f, r, i, a, assets)) return i;
    }
  return null;
}
/** Collision-aware first-person movement: sample the path to avoid tunnelling. */
export function walkMove(
  f: Floor,
  roomId: string,
  from: Point,
  to: Point,
  assets: AssetRecord[],
): Point {
  if (
    !f.rooms.some((r) => r.id === roomId) ||
    ![from.x, from.z, to.x, to.z].every(Number.isFinite)
  )
    return from;
  // Unknown saved revisions cannot be treated as empty space.
  const models = f.items.map((i) => ({
    item: i,
    asset: assetForItem(i, assets),
  }));
  if (models.some((m) => !m.asset)) return from;
  let pos = from;
  const radius = 0.18,
    steps = Math.max(1, Math.ceil(distance(from, to) / 0.05));
  for (let n = 1; n <= steps; n++) {
    const p = {
      x: from.x + ((to.x - from.x) * n) / steps,
      z: from.z + ((to.z - from.z) * n) / steps,
    };
    const room = f.rooms.find((r) => inside(p, r.polygon));
    if (!room) break;
    let blocked = false;
    for (const wall of f.walls.filter((w) =>
      w.faces.some((face) => face.roomId === room.id),
    )) {
      const projected = projectToSegment(p, wall.a, wall.b);
      if (projected.distance >= radius - EPS) continue;
      const portal = f.openings.some(
        (o) =>
          o.wallId === wall.id &&
          o.type !== "window" &&
          o.sill < 0.03 &&
          o.height >= 1.8 &&
          projected.offset >= o.offset + radius - EPS &&
          projected.offset <= o.offset + o.width - radius + EPS,
      );
      if (!portal) {
        blocked = true;
        break;
      }
    }
    if (
      blocked ||
      models.some(
        ({ item, asset }) =>
          asset && inside(p, importFootprint(item, asset, radius)),
      )
    )
      break;
    pos = p;
  }
  return pos;
}
function importFootprint(i: Item, a: AssetRecord, padding: number) {
  const c = Math.cos(i.yaw),
    s = Math.sin(i.yaw);
  return [
    [a.bounds.min[0] - padding, a.bounds.min[2] - padding],
    [a.bounds.max[0] + padding, a.bounds.min[2] - padding],
    [a.bounds.max[0] + padding, a.bounds.max[2] + padding],
    [a.bounds.min[0] - padding, a.bounds.max[2] + padding],
  ].map(([x, z]) => ({ x: i.x + x * c + z * s, z: i.z - x * s + z * c }));
}
