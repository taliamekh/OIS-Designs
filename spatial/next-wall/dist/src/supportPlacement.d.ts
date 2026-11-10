/** Experimental geometry proposals only. Production elevation/attachment commands are not enabled. */
import type { AssetBounds, Point2, SpatialItem, Vec3 } from "./viewPlan.js";
export type SurfaceAttachment = Readonly<{
    parentItemId: string;
    surfaceId: string;
    parentAssetId: string;
    parentAssetVersion: string;
    parentAssetHash: string;
    localX: number;
    localZ: number;
    localElevation: number;
    relativeYaw: number;
}>;
export type HorizontalSurface = Readonly<{
    id: string;
    floorId: string;
    roomId: string;
    height: number;
    boundary: readonly Point2[];
    holes?: readonly (readonly Point2[])[];
    source: Readonly<{
        kind: "floor";
    }> | Readonly<{
        kind: "authored-horizontal-mesh-region";
        ownerItemId: string;
        assetId: string;
        assetVersion: string;
        assetHash: string;
        ownerPose: Readonly<{
            x: number;
            z: number;
            yaw: number;
            elevation: number;
        }>;
    }>;
}>;
export type SupportRequest = Readonly<{
    item: SpatialItem;
    asset: AssetBounds;
    surface: HorizontalSurface;
    canonicalFloorOffset: Vec3;
    activeFloorId: string;
    activeRoomId: string;
    ray: Readonly<{
        origin: Vec3;
        direction: Vec3;
    }>;
    grabOffset: Point2;
    roomCeiling: number;
    canEdit: boolean;
    mode: "3d" | "walk";
    gridMetres?: number;
    items: readonly SpatialItem[];
    obstacles: readonly Readonly<{
        item: SpatialItem;
        asset: AssetBounds;
    }>[];
    attachments?: Readonly<Record<string, SurfaceAttachment>>;
}>;
export type SupportResult = Readonly<{
    status: "blocked";
    reason: string;
} | {
    status: "valid-proposal";
    pose: Readonly<{
        x: number;
        z: number;
        yaw: number;
        elevation: number;
    }>;
    attachment: SurfaceAttachment | null;
    localHit: Point2;
    surfaceId: string;
}>;
export declare function containsPoint(p: Point2, polygon: readonly Point2[]): boolean;
/** Corners alone are insufficient for concave supports or a hole enclosed by the footprint. */
export declare function coversFootprint(footprint: readonly Point2[], surface: Pick<HorizontalSurface, "boundary" | "holes">): boolean;
/** An authored polygon must come from reviewed horizontal mesh geometry, not its AABB top.
 * The enclosing-box checks below are necessary guards, not proof that a table fills that region. */
export declare function authoredItemSurface(owner: SpatialItem, asset: AssetBounds, floorId: string, region: Readonly<{
    id: string;
    height: number;
    boundary: readonly Point2[];
    holes?: readonly (readonly Point2[])[];
}>): HorizontalSurface;
export declare function proposeSupportPlacement(r: SupportRequest): SupportResult;
/** Reconstruct a persisted proposal relative to its exact parent; command integration must
 * validate the whole resulting family and record one atomic Undo before committing. */
export declare function attachedPose(attachment: SurfaceAttachment, owner: SpatialItem): Readonly<{
    x: number;
    z: number;
    yaw: number;
    elevation: number;
}>;
