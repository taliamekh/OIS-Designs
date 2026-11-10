export type Point = { x: number; z: number };
export type ViewMode = "2d" | "3d" | "walk";
export type Unit = "m" | "ft";
export type RoomKind =
  | "living"
  | "bedroom"
  | "kitchen"
  | "dining"
  | "bathroom"
  | "office"
  | "children"
  | "entry"
  | "utility";
export type Sheen = "matte" | "eggshell" | "satin" | "semi-gloss" | "gloss";
export type WallTexture =
  | "paint"
  | "plaster"
  | "limewash"
  | "microcement"
  | "brick"
  | "slats"
  | "panelling"
  | "wallpaper"
  | "tile"
  | "stone";
export type Finish = { colour: string; texture: WallTexture; sheen: Sheen };
export type Trim = {
  profile: "none" | "flat" | "bevel" | "ogee" | "stepped";
  height: number;
  projection: number;
  colour: string;
  sheen: Sheen;
  material?: "paint" | "white-oak" | "walnut" | "aluminium";
  reference?: { id: string; rulerMetres: number; note?: string };
};
export type FloorFinish = { id: string; repeat: number; angle: number };
export type Room = {
  id: string;
  name: string;
  kind: RoomKind;
  polygon: Point[];
  ceiling: number | null;
  floorFinish: FloorFinish;
  wallFaces: Record<string, Finish>;
  trim: Trim;
  trimOverrides: Record<string, Trim>;
};
export type Wall = {
  id: string;
  a: Point;
  b: Point;
  thickness: number;
  faces: { roomId: string; reversed: boolean }[];
};
export type DoorType =
  "single" | "double" | "sliding" | "pocket" | "open" | "window";
export type Opening = {
  id: string;
  wallId: string;
  type: DoorType;
  offset: number;
  width: number;
  height: number;
  sill: number;
  hinge: "left" | "right";
  flip: boolean;
};
export type Item = {
  id: string;
  roomId: string;
  assetId: string;
  assetVersion: string;
  assetHash: string;
  x: number;
  z: number;
  yaw: number;
  locked: boolean;
  materialOverrides: Record<string, string>;
};
export type Floor = {
  id: string;
  name: string;
  elevation: number;
  ceiling: number;
  alignment: Point;
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  items: Item[];
};
export type Project = {
  id: string;
  name: string;
  schemaVersion: 1;
  updatedAt: number;
  floors: Floor[];
};
export type AssetRecord = {
  placement?: {
    anchor: string;
    defaultElevation?: number;
    allowArbitraryScale?: boolean;
  };
  id: string;
  version: string;
  name: string;
  sha256: string;
  roomTags: string[];
  category: string;
  subtype: string;
  theme: string;
  stage: string;
  geometryFamily: string;
  designId?: string;
  bedSize: string | null;
  dimensionsMetres: { width: number; depth: number; height: number };
  bounds: { min: number[]; max: number[] };
  materials: string[];
  variantSlots: string[];
  colourTags: string[];
  searchAliases: string[];
  triangles: number;
  drawPrimitives: number;
  bytes: number;
  licence: string;
  file: string;
  thumbnail?: string;
};
export type History = { past: Project[]; present: Project; future: Project[] };
export const defaultWall: Finish = {
  colour: "#dedbd2",
  texture: "paint",
  sheen: "eggshell",
};
export const defaultTrim: Trim = {
  profile: "flat",
  height: 0.1,
  projection: 0.016,
  colour: "#eeeae2",
  sheen: "satin",
};
export const roomNames: Record<RoomKind, string> = {
  living: "Living room",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  dining: "Dining room",
  bathroom: "Bathroom",
  office: "Office",
  children: "Children’s room",
  entry: "Entry / hall",
  utility: "Utility / laundry",
};
export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
