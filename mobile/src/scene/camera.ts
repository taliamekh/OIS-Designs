import { Point } from "../domain/types";
export function clippingRange(radius: number, extent: number, walk = false) {
  return {
    near: walk ? 0.04 : Math.max(0.02, Math.min(1, radius / 1000)),
    far: Math.max(100, radius + extent * 2 + 20),
  };
}
/** Fits a room's actual corners to the portrait camera, leaving room for floating tools. */
export function fitCamera(
  points: Point[],
  ceiling: number,
  aspect: number,
  theta = 0.75,
  phi = 0.88,
  fov = 43,
) {
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x)),
    minZ = Math.min(...points.map((p) => p.z)),
    maxZ = Math.max(...points.map((p) => p.z));
  const target = {
    x: (minX + maxX) / 2,
    y: ceiling * 0.38,
    z: (minZ + maxZ) / 2,
  };
  const dir = {
    x: Math.sin(phi) * Math.sin(theta),
    y: Math.cos(phi),
    z: Math.sin(phi) * Math.cos(theta),
  };
  const right = { x: Math.cos(theta), y: 0, z: -Math.sin(theta) },
    up = {
      x: -Math.cos(phi) * Math.sin(theta),
      y: Math.sin(phi),
      z: -Math.cos(phi) * Math.cos(theta),
    };
  const tanY = Math.tan((fov * Math.PI) / 360),
    tanX = tanY * aspect;
  let radius = 3;
  for (const p of points)
    for (const y of [0, ceiling]) {
      const d = { x: p.x - target.x, y: y - target.y, z: p.z - target.z };
      const depth = d.x * dir.x + d.y * dir.y + d.z * dir.z;
      radius = Math.max(
        radius,
        depth + Math.abs(d.x * right.x + d.z * right.z) / (tanX * 0.9),
        depth + Math.abs(d.x * up.x + d.y * up.y + d.z * up.z) / (tanY * 0.72),
      );
    }
  return {
    target,
    radius: radius + 0.35,
    extent: Math.hypot(maxX - minX, maxZ - minZ, ceiling) / 2,
  };
}
