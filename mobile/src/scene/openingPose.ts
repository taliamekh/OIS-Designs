import { Opening } from "../domain/types";
export type LeafPose = {
  pivotX: number;
  z: number;
  yaw: number;
  width: number;
};
/** Open presentation is explicit: Walk has no closed-door collision state. */
export function openingLeaves(
  o: Opening,
  wallThickness: number,
  walk = false,
): LeafPose[] {
  const side = o.flip ? -1 : 1,
    angle = walk ? Math.PI / 2 : Math.PI * 0.38;
  if (o.type === "single")
    return [
      {
        pivotX: o.hinge === "left" ? 0 : o.width,
        z: side * 0.02,
        yaw: o.hinge === "left" ? -side * angle : Math.PI + side * angle,
        width: o.width,
      },
    ];
  if (o.type === "double")
    return [
      { pivotX: 0, z: side * 0.02, yaw: -side * angle, width: o.width / 2 },
      {
        pivotX: o.width,
        z: side * 0.02,
        yaw: Math.PI + side * angle,
        width: o.width / 2,
      },
    ];
  if (o.type === "sliding" || o.type === "pocket") {
    const travel = (o.hinge === "left" ? -1 : 1) * o.width * (walk ? 1 : 0.8);
    return [
      {
        pivotX: travel,
        z: o.type === "pocket" ? 0 : side * (wallThickness / 2 + 0.035),
        yaw: 0,
        width: o.width,
      },
    ];
  }
  return [];
}
