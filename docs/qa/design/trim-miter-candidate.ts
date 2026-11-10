export function physicalTrimMiter(
  floor: Floor,
  room: Room,
  wall: Wall,
  atStart: boolean,
): { slope: number; offset: number } {
  return physicalTrimCornerMiter(floor, room, wall, atStart);
}

export function physicalTrimCollisionIntervals(wall: Wall, floor: Floor, room: Room): [number, number][] {
 const trim = room.trimOverrides[wall.id] ?? room.trim;
 const reversed = wall.faces.find(face => face.roomId === room.id)?.reversed ?? false;
 const start = physicalTrimMiter(floor, room, wall, true), end = physicalTrimMiter(floor, room, wall, false);
 const extension = (m: { slope: number; offset: number }) => Math.min(0, m.offset, m.offset + m.slope * trim.projection);
 const low = extension(reversed ? end : start), high = extension(reversed ? start : end), length = distance(wall.a, wall.b);
 return physicalTrimIntervals(wall, floor).map(([a, b]) => [a + (a < .001 ? low : 0), b - (b > length - .001 ? high : 0)]);
}
