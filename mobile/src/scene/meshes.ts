import * as THREE from "three";
import { CASING_EXTENT, TRIM_JAMB_GAP } from "../domain/construction";
import { distance, area } from "../domain/geometry";
import { Floor, Opening, Room, Trim, Wall } from "../domain/types";
export function floorGeometry(room: Pick<Room, "polygon">) {
  const shape = new THREE.Shape();
  room.polygon.forEach((p, i) =>
    i ? shape.lineTo(p.x, -p.z) : shape.moveTo(p.x, -p.z),
  );
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
export type WallPiece = {
  start: number;
  end: number;
  bottom: number;
  top: number;
  cavity?: number;
};
/** Hole cutting is geometric: no door-coloured overlays on solid walls. */
export function wallPieces(
  wall: Wall,
  openings: Opening[],
  height: number,
): WallPiece[] {
  const len = distance(wall.a, wall.b),
    holes = openings
      .filter((o) => o.wallId === wall.id)
      .sort((a, b) => a.offset - b.offset),
    pieces: WallPiece[] = [];
  if (holes.some((o) => o.type === "pocket")) {
    const xs = [
      0,
      len,
      ...holes.flatMap((o) => [
        o.offset,
        o.offset + o.width,
        ...(o.type === "pocket"
          ? [
              o.hinge === "left" ? o.offset - o.width : o.offset + o.width,
              o.hinge === "left" ? o.offset : o.offset + o.width * 2,
            ]
          : []),
      ]),
    ]
      .filter((x) => x >= 0 && x <= len)
      .sort((a, b) => a - b)
      .filter((x, i, a) => !i || x - a[i - 1] > 1e-6);
    const ys = [0, height, ...holes.flatMap((o) => [o.sill, o.sill + o.height])]
      .filter((y) => y >= 0 && y <= height)
      .sort((a, b) => a - b)
      .filter((y, i, a) => !i || y - a[i - 1] > 1e-6);
    for (let i = 0; i < xs.length - 1; i++)
      for (let j = 0; j < ys.length - 1; j++) {
        const x = (xs[i] + xs[i + 1]) / 2,
          y = (ys[j] + ys[j + 1]) / 2;
        if (
          holes.some(
            (o) =>
              x > o.offset &&
              x < o.offset + o.width &&
              y > o.sill &&
              y < o.sill + o.height,
          )
        )
          continue;
        const pocket = holes.find(
          (o) =>
            o.type === "pocket" &&
            y < o.height &&
            x >
              (o.hinge === "left" ? o.offset - o.width : o.offset + o.width) &&
            x < (o.hinge === "left" ? o.offset : o.offset + o.width * 2),
        );
        pieces.push({
          start: xs[i],
          end: xs[i + 1],
          bottom: ys[j],
          top: ys[j + 1],
          cavity: pocket ? 0.05 : 0,
        });
      }
    return pieces;
  }
  let cursor = 0;
  for (const o of holes) {
    if (o.offset > cursor)
      pieces.push({ start: cursor, end: o.offset, bottom: 0, top: height });
    if (o.sill > 0)
      pieces.push({
        start: o.offset,
        end: o.offset + o.width,
        bottom: 0,
        top: o.sill,
      });
    if (o.sill + o.height < height)
      pieces.push({
        start: o.offset,
        end: o.offset + o.width,
        bottom: o.sill + o.height,
        top: height,
      });
    cursor = o.offset + o.width;
  }
  if (cursor < len)
    pieces.push({ start: cursor, end: len, bottom: 0, top: height });
  return pieces;
}
export function trimIntervals(w: Wall, floor: Floor): [number, number][] {
  let start = 0;
  const out: [number, number][] = [];
  for (const o of floor.openings
    .filter((o) => o.wallId === w.id && o.sill < 0.03)
    .sort((a, b) => a.offset - b.offset)) {
    if (o.offset - CASING_EXTENT - TRIM_JAMB_GAP > start)
      out.push([start, o.offset - CASING_EXTENT - TRIM_JAMB_GAP]);
    start = o.offset + o.width + CASING_EXTENT + TRIM_JAMB_GAP;
  }
  if (start < distance(w.a, w.b)) out.push([start, distance(w.a, w.b)]);
  return out;
}
export type TrimShape = Pick<Trim, "profile" | "height" | "projection">;
export type MiterPlane = { slope: number; offset: number };
export function trimProfile(trim: TrimShape): THREE.Vector2[] {
  const h = trim.height,
    p = trim.projection;
  const points =
    trim.profile === "bevel"
      ? [
          [0, 0],
          [p, 0],
          [p, h * 0.75],
          [p * 0.55, h],
          [0, h],
        ]
      : trim.profile === "ogee"
        ? [
            [0, 0],
            [p, 0],
            [p, h * 0.6],
            [p * 0.85, h * 0.68],
            [p * 0.4, h * 0.76],
            [p * 0.75, h * 0.88],
            [p * 0.55, h],
            [0, h],
          ]
        : trim.profile === "stepped"
          ? [
              [0, 0],
              [p, 0],
              [p, h * 0.65],
              [p * 0.72, h * 0.65],
              [p * 0.72, h * 0.85],
              [p * 0.4, h * 0.85],
              [p * 0.4, h],
              [0, h],
            ]
          : [
              [0, 0],
              [p, 0],
              [p, h],
              [0, h],
            ];
  return points.map(([x, y]) => new THREE.Vector2(x, y));
}
/** Profile sweep with mitred end planes. Openings get square jamb terminations. */
export function trimGeometry(
  trim: TrimShape,
  len: number,
  startMiter: number | boolean | MiterPlane = false,
  endMiter: number | boolean | MiterPlane = false,
  baseInset = 0,
) {
  const profile = trimProfile(trim),
    positions: number[] = [],
    indices: number[] = [],
    uv: number[] = [];
  const arc = [0];
  const cut = (m: number | boolean | MiterPlane, depth: number) =>
    typeof m === "object"
      ? m.offset + m.slope * depth
      : Number(m) * (depth + baseInset);
  for (let i = 1; i < profile.length; i++)
    arc.push(arc[i - 1] + profile[i].distanceTo(profile[i - 1]));
  for (let end = 0; end < 2; end++)
    for (const [index, p] of profile.entries()) {
      positions.push(
        (end ? len : 0) + (end ? -cut(endMiter, p.x) : cut(startMiter, p.x)),
        p.y,
        p.x,
      );
      uv.push(positions[positions.length - 3], arc[index]);
    }
  const n = profile.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    indices.push(i, j, n + i, j, n + j, n + i);
  }
  const faces = THREE.ShapeUtils.triangulateShape(profile, []);
  for (const [a, b, c] of faces) indices.push(c, b, a, n + a, n + b, n + c);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  for (let i = 0; i < indices.length; i += 3)
    [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  g.setIndex(indices);
  g.addGroup(0, n * 6, 0);
  g.addGroup(n * 6, indices.length - n * 6, 1);
  g.computeVertexNormals();
  return g;
}
/** Offset-line intersection at convex/concave corners; split straight wall ends stay square. */
export function cornerMiter(room: Room, point: { x: number; z: number }) {
  const polygon =
    area(room.polygon) < 0 ? [...room.polygon].reverse() : room.polygon;
  const index = polygon.findIndex((p) => distance(p, point) < 1e-5);
  if (index < 0) return 0;
  const prev = polygon[(index + polygon.length - 1) % polygon.length],
    next = polygon[(index + 1) % polygon.length],
    a = { x: point.x - prev.x, z: point.z - prev.z },
    b = { x: next.x - point.x, z: next.z - point.z };
  const angle = Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z);
  if (Math.abs(angle) < 1e-5) return 0;
  return Math.max(-20, Math.min(20, Math.tan(angle / 2)));
}
/** Intersect both actual wall-face offset lines at every profile depth. Unequal
 * thicknesses require an affine cut: the constant cannot use this wall alone. */
export function trimCornerMiter(
  floor: Floor,
  room: Room,
  wall: Wall,
  atStart: boolean,
): MiterPlane {
  const reversed =
      wall.faces.find((f) => f.roomId === room.id)?.reversed ?? false,
    a = reversed ? wall.b : wall.a,
    b = reversed ? wall.a : wall.b,
    point = atStart ? a : b,
    len = distance(a, b),
    u = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
  const neighbor = floor.walls.find((w) => {
    if (w.id === wall.id) return false;
    const face = w.faces.find((f) => f.roomId === room.id);
    if (!face) return false;
    const start = face.reversed ? w.b : w.a,
      end = face.reversed ? w.a : w.b;
    return distance(atStart ? end : start, point) < 1e-5;
  });
  if (!neighbor) return { slope: 0, offset: 0 };
  const face = neighbor.faces.find((f) => f.roomId === room.id)!,
    c = face.reversed ? neighbor.b : neighbor.a,
    d = face.reversed ? neighbor.a : neighbor.b,
    l = distance(c, d),
    v = { x: (d.x - c.x) / l, z: (d.z - c.z) / l },
    n = { x: -u.z, z: u.x },
    m = { x: -v.z, z: v.x },
    cross = (a: { x: number; z: number }, b: { x: number; z: number }) =>
      a.x * b.z - a.z * b.x,
    denominator = cross(u, v),
    direction = atStart ? 1 : -1,
    ownTrim = room.trimOverrides[wall.id] ?? room.trim,
    neighborTrim = room.trimOverrides[neighbor.id] ?? room.trim,
    projectionRatio =
      ownTrim.projection > 1e-8
        ? (neighborTrim.profile === "none" ? 0 : neighborTrim.projection) /
          ownTrim.projection
        : 1;
  if (Math.abs(denominator) < 1e-5) return { slope: 0, offset: 0 };
  return {
    slope:
      (direction *
        cross(
          { x: m.x * projectionRatio - n.x, z: m.z * projectionRatio - n.z },
          v,
        )) /
      denominator,
    offset:
      (direction *
        cross(
          {
            x: (m.x * neighbor.thickness) / 2 - (n.x * wall.thickness) / 2,
            z: (m.z * neighbor.thickness) / 2 - (n.z * wall.thickness) / 2,
          },
          v,
        )) /
      denominator,
  };
}
