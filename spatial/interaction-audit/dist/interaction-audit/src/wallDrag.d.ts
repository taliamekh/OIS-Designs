/** Gesture math for the unadopted wall-placement draft. No pointer listeners/app writes. */
import type { Vec3 } from '../../src/viewPlan.js';
import type { WallPlacementRequest, WallPlacementResult } from '../../next-wall/src/wallPlacement.js';
export type WallDragAnchor = Readonly<{
    itemId: string;
    assetId: string;
    assetVersion: string;
    assetHash: string;
    wallId: string;
    wallRevision: string;
    floorId: string;
    roomId: string;
    floorOffset: Vec3;
    depth: number;
    alongOffset: number;
    heightOffset: number;
    start: Readonly<{
        x: number;
        z: number;
        yaw: number;
        elevation: number;
    }>;
}>;
type Capture = Readonly<{
    status: 'drag-anchor';
    anchor: WallDragAnchor;
}> | Readonly<{
    status: 'blocked';
    reason: string;
}>;
export declare function captureWallDrag(r: WallPlacementRequest, worldHit: Vec3): Capture;
export declare function proposeWallDrag(r: WallPlacementRequest, a: WallDragAnchor): WallPlacementResult;
export {};
