import { AssetRecord, Floor, Item, Opening, Point, Room, Wall } from "./types";

export const EPS = 1e-5;
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  z: a.z + (b.z - a.z) * t,
});
export const bounds = (points: Point[]) => ({
  minX: Math.min(...points.map((p) => p.x)),
  maxX: Math.max(...points.map((p) => p.x)),
  minZ: Math.min(...points.map((p) => p.z)),
  maxZ: Math.max(...points.map((p) => p.z)),
});
export const area = (p: Point[]) =>
  p.reduce((sum, a, i) => {
    const b = p[(i + 1) % p.length];
    return sum + a.x * b.z - b.x * a.z;
  }, 0) / 2;
export function projectToSegment(p: Point, a: Point, b: Point) {
  const len = distance(a, b);
  const t =
    len < EPS
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) /
              (len * len),
          ),
        );
  const point = lerp(a, b, t);
  return { point, t, distance: distance(p, point), offset: t * len };
}
export function inside(p: Point, polygon: Point[], margin = 0): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    const edge = projectToSegment(p, a, b);
    if (edge.distance < margin - EPS) return false;
    if (edge.distance < EPS) return margin <= EPS;
    if (
      a.z > p.z !== b.z > p.z &&
      p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x
    )
      result = !result;
  }
  return result;
}
function orient(a: Point, b: Point, c: Point) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}
export function validPolygon(p: Point[]): boolean {
  if (
    p.length < 3 ||
    p.length > 64 ||
    p.some((v) => !Number.isFinite(v.x) || !Number.isFinite(v.z)) ||
    Math.abs(area(p)) < 0.25
  )
    return false;
  for (let i = 0; i < p.length; i++) {
    if (distance(p[i], p[(i + 1) % p.length]) < 0.15) return false;
    for (let j = i + 1; j < p.length; j++) {
      if (j === i + 1 || (i === 0 && j === p.length - 1)) continue;
      const a = p[i],
        b = p[(i + 1) % p.length],
        c = p[j],
        d = p[(j + 1) % p.length];
      if (
        orient(a, b, c) * orient(a, b, d) <= 0 &&
        orient(c, d, a) * orient(c, d, b) <= 0 &&
        Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <=
          Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) + EPS &&
        Math.max(Math.min(a.z, b.z), Math.min(c.z, d.z)) <=
          Math.min(Math.max(a.z, b.z), Math.max(c.z, d.z)) + EPS
      )
        return false;
    }
  }
  return true;
}
const coordKey = (p: Point) =>
  `${Math.round(p.x * 10000)},${Math.round(p.z * 10000)}`;
/** Split collinear edges at every vertex so partial shared walls have one identity. */
export function rebuildWalls(rooms: Room[], previous: Wall[] = []): Wall[] {
  const result = new Map<string, Wall>();
  const vertices = rooms.flatMap((r) => r.polygon);
  for (const room of rooms)
    for (let i = 0; i < room.polygon.length; i++) {
      const a = room.polygon[i],
        b = room.polygon[(i + 1) % room.polygon.length];
      const points = [
        a,
        b,
        ...vertices.filter((p) => projectToSegment(p, a, b).distance < EPS),
      ]
        .sort(
          (p, q) => projectToSegment(p, a, b).t - projectToSegment(q, a, b).t,
        )
        .filter((p, j, all) => j === 0 || distance(p, all[j - 1]) > EPS);
      for (let j = 0; j < points.length - 1; j++) {
        const reversed = coordKey(points[j]) > coordKey(points[j + 1]);
        const start = reversed ? points[j + 1] : points[j],
          end = reversed ? points[j] : points[j + 1];
        const id = `wall:${coordKey(start)}:${coordKey(end)}`;
        let wall = result.get(id);
        if (!wall) {
          wall = {
            id,
            a: start,
            b: end,
            thickness: previous.find((w) => w.id === id)?.thickness ?? 0.12,
            faces: [],
          };
          result.set(id, wall);
        }
        // Face orientation denotes the interior side, independently of input winding.
        wall.faces.push({
          roomId: room.id,
          reversed: reversed !== area(room.polygon) < 0,
        });
      }
    }
  return [...result.values()];
}
export function footprint(
  item: Pick<Item, "x" | "z" | "yaw">,
  asset: AssetRecord,
  padding = 0,
): Point[] {
  const [x0, , z0] = asset.bounds.min,
    [x1, , z1] = asset.bounds.max;
  const c = Math.cos(item.yaw),
    s = Math.sin(item.yaw);
  return [
    [x0 - padding, z0 - padding],
    [x1 + padding, z0 - padding],
    [x1 + padding, z1 + padding],
    [x0 - padding, z1 + padding],
  ].map(([x, z]) => ({ x: item.x + x * c + z * s, z: item.z - x * s + z * c }));
}
function convex(p: Point[]): boolean {
  let sign = 0;
  for (let i = 0; i < p.length; i++) {
    const turn = orient(p[i], p[(i + 1) % p.length], p[(i + 2) % p.length]);
    if (Math.abs(turn) < EPS) continue;
    const next = Math.sign(turn);
    if (sign && sign !== next) return false;
    sign = next;
  }
  return !!sign;
}
function convexOverlap(a: Point[], b: Point[], gap = 0): boolean {
  for (const p of [a, b])
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length],
        dx = q.x - p[i].x,
        dz = q.z - p[i].z,
        len = Math.hypot(dx, dz);
      const axis = { x: -dz / len, z: dx / len };
      const pa = a.map((v) => v.x * axis.x + v.z * axis.z),
        pb = b.map((v) => v.x * axis.x + v.z * axis.z);
      if (
        Math.max(...pa) <= Math.min(...pb) - gap + EPS ||
        Math.max(...pb) <= Math.min(...pa) - gap + EPS
      )
        return false;
    }
  return true;
}
/** Ear clipping keeps room-overlap checks correct for L-shapes and drawn concave rooms. */
function triangles(polygon: Point[]): Point[][] {
  const p = area(polygon) < 0 ? [...polygon].reverse() : [...polygon];
  for (let i = p.length - 1; i >= 0 && p.length > 3; i--)
    if (
      Math.abs(
        orient(p[(i + p.length - 1) % p.length], p[i], p[(i + 1) % p.length]),
      ) < EPS
    )
      p.splice(i, 1);
  const out: Point[][] = [];
  while (p.length > 3) {
    let found = false;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i + p.length - 1) % p.length],
        b = p[i],
        c = p[(i + 1) % p.length];
      if (orient(a, b, c) <= EPS) continue;
      if (
        p.some(
          (v) =>
            v !== a &&
            v !== b &&
            v !== c &&
            orient(a, b, v) >= -EPS &&
            orient(b, c, v) >= -EPS &&
            orient(c, a, v) >= -EPS,
        )
      )
        continue;
      out.push([a, b, c]);
      p.splice(i, 1);
      found = true;
      break;
    }
    if (!found) return [];
  }
  if (p.length === 3) out.push(p);
  return out;
}
export function overlaps(a: Point[], b: Point[], gap = 0): boolean {
  if (a.length < 3 || b.length < 3) return false;
  if (convex(a) && convex(b)) return convexOverlap(a, b, gap);
  return triangles(a).some((ta) =>
    triangles(b).some((tb) => convexOverlap(ta, tb, gap)),
  );
}
export function segmentDistance(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
): number {
  if (
    orient(a, b, c) * orient(a, b, d) < 0 &&
    orient(c, d, a) * orient(c, d, b) < 0
  )
    return 0;
  return Math.min(
    projectToSegment(a, c, d).distance,
    projectToSegment(b, c, d).distance,
    projectToSegment(c, a, b).distance,
    projectToSegment(d, a, b).distance,
  );
}
/** A placed revision is immutable: never silently collide against a newer asset's bounds. */
export function assetForItem(
  item: Item,
  assets: AssetRecord[],
): AssetRecord | undefined {
  return assets.find(
    (a) =>
      a.id === item.assetId &&
      a.version === item.assetVersion &&
      a.sha256 === item.assetHash,
  );
}
/** Full hinge motion envelopes in floor coordinates, matching the selected swing side. */
export function swingEnvelopes(wall: Wall, opening: Opening): Point[][] {
  if (opening.type !== "single" && opening.type !== "double") return [];
  const len = distance(wall.a, wall.b),
    ux = (wall.b.x - wall.a.x) / len,
    uz = (wall.b.z - wall.a.z) / len,
    side = opening.flip ? -1 : 1;
  const normal = { x: -uz * side, z: ux * side };
  const leaf = (left: boolean, width: number) => {
    const hinge = lerp(
        wall.a,
        wall.b,
        (opening.offset + (left ? 0 : opening.width)) / len,
      ),
      direction = left ? 1 : -1;
    return [
      hinge,
      ...Array.from({ length: 19 }, (_, i) => {
        const angle = (i * Math.PI) / 36;
        return {
          x:
            hinge.x +
            ux * direction * width * Math.cos(angle) +
            normal.x * width * Math.sin(angle),
          z:
            hinge.z +
            uz * direction * width * Math.cos(angle) +
            normal.z * width * Math.sin(angle),
        };
      }),
    ];
  };
  return opening.type === "double"
    ? [leaf(true, opening.width / 2), leaf(false, opening.width / 2)]
    : [leaf(opening.hinge === "left", opening.width)];
}
function segmentInside(a: Point, b: Point, polygon: Point[]): boolean {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    cuts = [0, 1];
  for (let j = 0; j < polygon.length; j++) {
    const c = polygon[j],
      d = polygon[(j + 1) % polygon.length],
      ex = d.x - c.x,
      ez = d.z - c.z,
      denominator = dx * ez - dz * ex;
    if (Math.abs(denominator) < EPS) {
      for (const p of [c, d]) {
        const projected = projectToSegment(p, a, b);
        if (projected.distance < EPS) cuts.push(projected.t);
      }
      continue;
    }
    const cx = c.x - a.x,
      cz = c.z - a.z,
      t = (cx * ez - cz * ex) / denominator,
      u = (cx * dz - cz * dx) / denominator;
    if (t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS)
      cuts.push(Math.max(0, Math.min(1, t)));
  }
  cuts.sort((x, y) => x - y);
  for (let j = 1; j < cuts.length; j++)
    if (
      cuts[j] - cuts[j - 1] > EPS &&
      !inside(lerp(a, b, (cuts[j] + cuts[j - 1]) / 2), polygon)
    )
      return false;
  return true;
}
export function canPlace(
  floor: Floor,
  room: Room,
  item: Item,
  asset: AssetRecord,
  assets: AssetRecord[],
): string | null {
  const revision = assetForItem(item, assets);
  if (!revision || revision.id !== asset.id)
    return `Furniture revision unavailable: ${item.assetId} (${item.assetVersion}). Restore its saved model before changing its geometry.`;
  asset = revision;
  if (asset.placement?.anchor && asset.placement.anchor !== "floor")
    return "This model requires wall attachment. Floor placement is unavailable.";
  const fp = footprint(item, asset);
  if (!fp.every((p) => inside(p, room.polygon)))
    return "Keep the full furniture footprint inside the room and clear of trim.";
  // Split at exact boundary crossings, including polygon vertices. A fixed sample
  // grid or strict-crossing test can miss a U-shaped notch whose corners lie on it.
  if (
    fp.some((a, i) => !segmentInside(a, fp[(i + 1) % fp.length], room.polygon))
  )
    return "The footprint crosses a wall.";
  for (const wall of floor.walls.filter((w) =>
    w.faces.some((f) => f.roomId === room.id),
  )) {
    const trim = room.trimOverrides[wall.id] ?? room.trim,
      margin = trim.profile === "none" ? 0 : trim.projection;
    if (
      margin > 0 &&
      fp.some(
        (a, i) =>
          segmentDistance(a, fp[(i + 1) % fp.length], wall.a, wall.b) <
          margin - EPS,
      )
    )
      return "Keep the furniture clear of this wall’s baseboard projection.";
  }
  if (asset.dimensionsMetres.height > (room.ceiling ?? floor.ceiling) - 0.02)
    return "This item exceeds the room ceiling height.";
  for (const other of floor.items) {
    if (other.id === item.id || other.roomId !== room.id) continue;
    const model = assetForItem(other, assets);
    if (!model)
      return `Furniture revision unavailable: ${other.assetId} (${other.assetVersion}). Restore its saved model before changing room geometry.`;
    if (overlaps(fp, footprint(other, model), 0.005))
      return "Furniture footprints overlap. Choose a clear position.";
  }
  for (const opening of floor.openings) {
    const wall = floor.walls.find((w) => w.id === opening.wallId);
    if (
      !wall ||
      !wall.faces.some((f) => f.roomId === room.id) ||
      !["single", "double"].includes(opening.type)
    )
      continue;
    if (
      swingEnvelopes(wall, opening).some((envelope) => overlaps(fp, envelope))
    )
      return "Keep the door swing area clear.";
  }
  return null;
}
export function openingError(floor: Floor, opening: Opening): string | null {
  const wall = floor.walls.find((w) => w.id === opening.wallId);
  if (!wall) return "Choose an existing wall.";
  const len = distance(wall.a, wall.b);
  const ceiling = Math.min(
    ...wall.faces.map(
      (f) =>
        floor.rooms.find((r) => r.id === f.roomId)?.ceiling ?? floor.ceiling,
    ),
  );
  if (
    ![opening.width, opening.height, opening.offset, opening.sill].every(
      Number.isFinite,
    ) ||
    opening.width < 0.3 ||
    opening.height < 0.3 ||
    opening.sill < 0 ||
    opening.offset < 0.08 ||
    opening.offset + opening.width > len - 0.08 + EPS
  )
    return "Opening needs at least 8 cm of wall at both corners.";
  if (opening.sill + opening.height > ceiling - 0.05)
    return "Opening exceeds the lowest ceiling on this wall.";
  if (
    floor.openings.some(
      (o) =>
        o.id !== opening.id &&
        o.wallId === opening.wallId &&
        Math.max(o.offset, opening.offset) <
          Math.min(o.offset + o.width, opening.offset + opening.width) + 0.08,
    )
  )
    return "This opening overlaps another opening or its frame.";
  if (
    opening.type === "pocket" &&
    (wall.thickness < 0.15 ||
      (opening.hinge === "left"
        ? opening.offset
        : len - opening.offset - opening.width) <
        opening.width + 0.08)
  )
    return "Pocket doors need a ≥15 cm wall and an unobstructed full-width pocket beside the opening.";
  if (
    opening.type === "sliding" &&
    (opening.hinge === "left"
      ? opening.offset
      : len - opening.offset - opening.width) < opening.width
  )
    return "A sliding door needs a full-width clear travel section beside it.";
  if (opening.type === "pocket" || opening.type === "sliding") {
    const start =
        opening.hinge === "left"
          ? opening.offset - opening.width
          : opening.offset + opening.width,
      end = start + opening.width;
    if (
      floor.openings.some(
        (o) =>
          o.id !== opening.id &&
          o.wallId === wall.id &&
          Math.max(o.offset, start) <
            Math.min(o.offset + o.width, end) + 0.08 &&
          Math.max(o.sill, opening.sill) <
            Math.min(o.sill + o.height, opening.sill + opening.height),
      )
    )
      return opening.type === "pocket"
        ? "The required pocket cavity intersects another opening."
        : "The sliding panel travel section intersects another opening.";
  }
  return null;
}
/** Distances along a canonical wall to the actual corners of one room face.
 * A shared topology segment may cover only part of that room boundary. */
export function wallFaceSpan(floor: Floor, wall: Wall, roomId: string) {
  const len = distance(wall.a, wall.b);
  const room = floor.rooms.find((r) => r.id === roomId);
  if (room && len > EPS)
    for (let i = 0; i < room.polygon.length; i++) {
      const a = room.polygon[i],
        b = room.polygon[(i + 1) % room.polygon.length];
      if (
        projectToSegment(wall.a, a, b).distance < EPS &&
        projectToSegment(wall.b, a, b).distance < EPS
      ) {
        const ux = (wall.b.x - wall.a.x) / len,
          uz = (wall.b.z - wall.a.z) / len;
        const first = (a.x - wall.a.x) * ux + (a.z - wall.a.z) * uz;
        const second = (b.x - wall.a.x) * ux + (b.z - wall.a.z) * uz;
        return { low: Math.min(first, second), high: Math.max(first, second) };
      }
    }
  return { low: 0, high: len };
}
export function openingDimensions(floor: Floor, opening: Opening) {
  const wall = floor.walls.find((w) => w.id === opening.wallId);
  if (!wall) return [];
  return wall.faces.map((face) => {
    const room = floor.rooms.find((r) => r.id === face.roomId);
    const { low, high } = wallFaceSpan(floor, wall, face.roomId);
    const before = opening.offset - low,
      after = high - opening.offset - opening.width;
    return {
      roomId: face.roomId,
      name: room?.name ?? "Room",
      before: face.reversed ? after : before,
      after: face.reversed ? before : after,
    };
  });
}
export function shapePolygon(
  shape: string,
  width: number,
  depth: number,
  origin: Point = { x: 0, z: 0 },
): Point[] {
  const p =
    shape === "l"
      ? [
          { x: 0, z: 0 },
          { x: width, z: 0 },
          { x: width, z: depth * 0.5 },
          { x: width * 0.55, z: depth * 0.5 },
          { x: width * 0.55, z: depth },
          { x: 0, z: depth },
        ]
      : [
          { x: 0, z: 0 },
          { x: width, z: 0 },
          { x: width, z: depth },
          { x: 0, z: depth },
        ];
  return p.map((v) => ({ x: v.x + origin.x, z: v.z + origin.z }));
}
export const toDisplay = (metres: number, unit: "m" | "ft") =>
  unit === "ft" ? metres / 0.3048 : metres;
export const toMetres = (value: number, unit: "m" | "ft") =>
  unit === "ft" ? value * 0.3048 : value;
export function measure(value: number, unit: "m" | "ft") {
  if (unit === "m") return `${value.toFixed(2)} m`;
  const inches = Math.round(value / 0.0254);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}
