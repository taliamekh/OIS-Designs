/** Separate draft: explicit inside-wall-face geometry, not a production wall mount. */
import type { AssetBounds, Point2, SpatialItem, Vec3 } from '../../src/viewPlan.js';
export type WallGap = Readonly<{
    id: string;
    minAlong: number;
    maxAlong: number;
    bottom: number;
    top: number;
    clearance: number;
}>;
export type InsideWallFace = Readonly<{
    floorId: string;
    roomId: string;
    wallId: string;
    side: 'left' | 'right';
    revision: string;
    /** Actual inside-face endpoints and inward normal, supplied by reviewed geometry.
     * Opening intervals must be converted into this same face's along-axis frame. */
    a: Point2;
    b: Point2;
    inward: Point2;
    height: number;
    trim: Readonly<{
        height: number;
        projection: number;
    }>;
    openings: readonly WallGap[];
}>;
export type WallAttachment = Readonly<{
    floorId: string;
    roomId: string;
    wallId: string;
    side: 'left' | 'right';
    wallRevision: string;
    along: number;
    elevation: number;
    assetId: string;
    assetVersion: string;
    assetHash: string;
    localRearZ: number;
}>;
export type WallPlacementRequest = Readonly<{
    item: SpatialItem;
    asset: AssetBounds;
    anchor: 'wall';
    frame: '-Z-front/+Z-rear';
    face: InsideWallFace;
    currentWallRevision: string;
    floorOffset: Vec3;
    activeFloorId: string;
    activeRoomId: string;
    roomInterior: readonly Point2[];
    ray: Readonly<{
        origin: Vec3;
        direction: Vec3;
    }>;
    /** Origin-relative along/height offset captured when a direct drag begins. */
    grab: Readonly<{
        along: number;
        height: number;
    }>;
    gridMetres?: number;
    canEdit: boolean;
    mode: '3d' | 'walk';
    items: readonly SpatialItem[];
    /** Every moving opening on this floor, including neighbouring wall panels. */
    movingOpeningIds: readonly string[];
    openingEnvelopes: readonly Readonly<{
        openingId: string;
        footprint: readonly Point2[];
        bottom: number;
        top: number;
    }>[];
    resolve: (item: SpatialItem) => AssetBounds | undefined;
    /** Explicitly choose flat height or the profile's whole-footprint query. */
    ceiling: Readonly<{
        kind: 'flat';
        height: number;
    }> | Readonly<{
        kind: 'profile';
        minimum: (footprint: readonly Point2[]) => number | null;
    }>;
}>;
export type WallPlacementResult = Readonly<{
    status: 'blocked';
    reason: string;
}> | Readonly<{
    status: 'wall-proposal';
    pose: Readonly<{
        x: number;
        z: number;
        yaw: number;
        elevation: number;
    }>;
    attachment: WallAttachment;
    wallRange: Readonly<{
        minAlong: number;
        maxAlong: number;
        bottom: number;
        top: number;
    }>;
    footprint: readonly Point2[];
    forceVisibleWallKey: string;
}>;
export declare function proposeWallPlacement(r: WallPlacementRequest): WallPlacementResult;
/** Coordinate-derived production wall IDs change when a room moves. The command
 * must supply an explicit old/new endpoint correspondence, never a nearest-wall
 * guess. Split/resized walls remain unresolved until a separate reviewed policy. */
export declare function remapWallAttachment(r: WallPlacementRequest, attachment: WallAttachment, oldFace: InsideWallFace, correspondence: 'a-to-a' | 'a-to-b'): WallPlacementResult;
