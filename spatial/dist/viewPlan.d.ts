/** Pure original Phase 3 scene planning. No project writes, renderer or native APIs. */
export type Point2 = Readonly<{
    x: number;
    z: number;
}>;
export type Vec3 = Readonly<{
    x: number;
    y: number;
    z: number;
}>;
export type Bounds3 = Readonly<{
    min: Vec3;
    max: Vec3;
}>;
export type SpatialRoom = Readonly<{
    id: string;
    polygon: readonly Point2[];
    ceiling: number | null;
}>;
export type SpatialWall = Readonly<{
    id: string;
    a: Point2;
    b: Point2;
    thickness: number;
    faces: readonly Readonly<{
        roomId: string;
        reversed: boolean;
    }>[];
}>;
export type SpatialItem = Readonly<{
    id: string;
    roomId: string;
    assetId: string;
    assetVersion: string;
    assetHash: string;
    x: number;
    z: number;
    yaw: number;
    /** Proposed optional canonical height above floor. Existing Item has no such field. */
    elevation?: number;
    locked: boolean;
}>;
export type SpatialFloor = Readonly<{
    id: string;
    elevation: number;
    alignment: Point2;
    ceiling: number;
    rooms: readonly SpatialRoom[];
    walls: readonly SpatialWall[];
    items: readonly SpatialItem[];
}>;
export type SpatialProject = Readonly<{
    floors: readonly SpatialFloor[];
}>;
export type AssetBounds = Readonly<{
    id: string;
    version: string;
    sha256: string;
    bounds: Readonly<{
        min: readonly number[];
        max: readonly number[];
    }>;
}>;
export type ViewScope = Readonly<{
    kind: "room";
    roomId: string;
}> | Readonly<{
    kind: "floor";
}> | Readonly<{
    kind: "house";
}>;
export type ViewRequest = Readonly<{
    activeFloorId: string;
    scope: ViewScope;
    mode: "3d" | "walk";
    shell: "solid" | "cutaway";
    camera: Vec3;
    hiddenFloorIds?: readonly string[];
    /** Presentation-only separation, never floor elevation or project alignment. */
    separatedFloorGap?: number;
    showCeilings?: boolean;
    selectedItemId?: string;
    /** Scoped keys are floorId:wallId, so repeated wall IDs cannot leak across floors. */
    forceVisibleWallKeys?: readonly string[];
    previousWallVisibility?: Readonly<Record<string, boolean>>;
    wallHysteresisMetres?: number;
}>;
export type WallPlan = Readonly<{
    id: string;
    key: string;
    visible: boolean;
    reason: "solid" | "interior-partition" | "forced" | "near-boundary" | "far-boundary" | "hysteresis";
    visibleRoomIds: readonly string[];
}>;
export type FloorPlan = Readonly<{
    id: string;
    canonicalOffset: Vec3;
    displayOffset: Vec3;
    presentationOffsetY: number;
    roomIds: readonly string[];
    walls: readonly WallPlan[];
    ceilingsVisible: boolean;
    itemIds: readonly string[];
}>;
export type ScenePlan = Readonly<{
    floors: readonly FloorPlan[];
    canonicalBounds: Bounds3 | null;
    displayBounds: Bounds3 | null;
    selectedItemBounds: Bounds3 | null;
    canEdit: boolean;
    readOnlyReason: "walk" | "house-overview" | "active-floor-hidden" | null;
    warnings: readonly string[];
}>;
export declare function unionBounds(boxes: readonly Bounds3[]): Bounds3 | null;
export declare function boundsFromPoints(points: readonly Vec3[]): Bounds3 | null;
export declare function boundsCorners(b: Bounds3): Vec3[];
export declare function canonicalFloorOffset(floor: SpatialFloor): Vec3;
export declare function floorToWorld(local: Vec3, offset: Vec3): Vec3;
export declare function worldToFloor(world: Vec3, offset: Vec3): Vec3;
/** Rotate the model's local AABB corners: conservative world bounds for framing.
 * This encloses the transformed mesh but is not its exact vertex-tight world AABB. */
export declare function itemWorldBounds(item: SpatialItem, asset: AssetBounds, offset: Vec3): Bounds3;
/** Cheap camera-dependent policy, reusable separately from the static scene/bounds plan. */
export declare function physicalWallPlan(floor: SpatialFloor, wall: SpatialWall, rooms: ReadonlySet<string>, offset: Vec3, request: ViewRequest): WallPlan | null;
export declare function createScenePlan(project: SpatialProject, resolve: (item: SpatialItem) => AssetBounds | undefined, request: ViewRequest): ScenePlan;
