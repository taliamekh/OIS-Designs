import * as THREE from "three";
import {
  distance,
  area,
  physicalWallPieces,
  physicalTrimIntervals,
  physicalTrimCornerMiter,
} from "../domain/geometry";
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
  return physicalWallPieces(wall, openings, height);
}
export function trimIntervals(w: Wall, floor: Floor): [number, number][] {
  return physicalTrimIntervals(w, floor);
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
/** Shared affine miter contract used by both mesh generation and collision. */
export function trimCornerMiter(
  floor: Floor,
  room: Room,
  wall: Wall,
  atStart: boolean,
): MiterPlane {
  return physicalTrimCornerMiter(floor, room, wall, atStart);
}
