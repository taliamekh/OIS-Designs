import { Floor, Point } from "./types";

/** Shared walls form one movable structure, including both sides of every door. */
export function connectedRoomIds(floor: Floor, roomId: string): Set<string> {
  const ids = new Set<string>();
  if (!floor.rooms.some((room) => room.id === roomId)) return ids;
  ids.add(roomId);
  let changed = true;
  while (changed) {
    changed = false;
    for (const wall of floor.walls) {
      if (!wall.faces.some((face) => ids.has(face.roomId))) continue;
      for (const face of wall.faces)
        if (!ids.has(face.roomId)) {
          ids.add(face.roomId);
          changed = true;
        }
    }
  }
  return ids;
}

/** Presentation preview only. The command separately validates/reconciles new joins. */
export function translatedRoomGroup(
  floor: Floor,
  roomId: string,
  offset: Point,
): Floor {
  const ids = connectedRoomIds(floor, roomId);
  const move = (point: Point): Point => ({
    x: point.x + offset.x,
    z: point.z + offset.z,
  });
  return {
    ...floor,
    rooms: floor.rooms.map((room) =>
      ids.has(room.id) ? { ...room, polygon: room.polygon.map(move) } : room,
    ),
    walls: floor.walls.map((wall) =>
      wall.faces.some((face) => ids.has(face.roomId))
        ? { ...wall, a: move(wall.a), b: move(wall.b) }
        : wall,
    ),
    items: floor.items.map((item) =>
      ids.has(item.roomId) ? { ...item, ...move(item) } : item,
    ),
  };
}
