import { doorLeafPoses, DoorLeafPose } from "../domain/geometry";
import { Opening } from "../domain/types";
export type LeafPose = DoorLeafPose;
/** The renderer and placement clearance share the exact physical panel poses. */
export function openingLeaves(
  opening: Opening,
  wallThickness: number,
  walk = false,
): LeafPose[] {
  return doorLeafPoses(opening, wallThickness, walk);
}
