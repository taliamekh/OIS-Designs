import { AssetRecord, Floor, Point, Room } from "../domain/types";
import { bounds, footprint, inside } from "../domain/geometry";
/** Find an obstacle-free eye position; do not start the camera inside a table. */
export function walkSpawn(
  floor: Floor,
  room: Room,
  registry: AssetRecord[],
): Point | null {
  const b = bounds(room.polygon),
    centre = { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
  const obstacles = floor.items
    .filter((i) => i.roomId === room.id)
    .map((i) => {
      const a = registry.find(
        (a) =>
          a.id === i.assetId &&
          a.version === i.assetVersion &&
          a.sha256 === i.assetHash,
      );
      return a ? footprint(i, a, 0.2) : null;
    });
  if (obstacles.some((p) => !p)) return null;
  const valid = (p: Point) =>
    inside(p, room.polygon, 0.2) &&
    obstacles.every((poly) => !inside(p, poly!));
  if (valid(centre)) return centre;
  for (
    let radius = 0.25;
    radius < Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ);
    radius += 0.25
  )
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12,
        p = {
          x: centre.x + Math.cos(angle) * radius,
          z: centre.z + Math.sin(angle) * radius,
        };
      if (valid(p)) return p;
    }
  return null;
}
