/** Original Phase 3 marker/void geometry proposals. No stair engineering or automatic traversal. */
import type { Point2, Vec3, SpatialProject } from "./viewPlan.js";
export type LevelVoid = Readonly<{
    id: string;
    floorId: string;
    roomId: string;
    boundary: readonly Point2[];
}>;
export type StairMarker = Readonly<{
    id: string;
    lowerFloorId: string;
    lowerRoomId: string;
    upperFloorId: string;
    upperRoomId: string;
    /** Run endpoints use the lower floor's canonical local XZ. */
    start: Point2;
    end: Point2;
    width: number;
    stepCount: number;
    upperLanding: Point2;
    upperVoidId: string;
    /** Explicit viewing envelope, not a code-compliance headroom standard. */
    viewerEnvelopeHeight?: number;
}>;
export type ConnectionIssue = Readonly<{
    id: string;
    code: string;
    message: string;
}>;
export type StepMarkerBox = Readonly<{
    center: Vec3;
    width: number;
    depth: number;
    height: number;
    yaw: number;
}>;
export type PlannedConnection = Readonly<{
    id: string;
    startWorld: Vec3;
    endWorld: Vec3;
    rise: number;
    run: number;
    inclineDegrees: number;
    upperLandingWorld: Vec3;
    landingResidualMetres: number;
    footprintWorld: readonly Point2[];
    steps: readonly StepMarkerBox[];
    upperLandingFootprintWorld: readonly Point2[];
    upperVoid: LevelVoid;
    lowerCeilingCutout: Readonly<{
        floorId: string;
        roomId: string;
        boundary: readonly Point2[];
    }>;
    markerOnly: true;
    visibleInSeparatedFloors: false;
}>;
export type LevelConnectionPlan = Readonly<{
    connections: readonly PlannedConnection[];
    issues: readonly ConnectionIssue[];
    warnings: readonly string[];
}>;
export declare function validateLevelVoids(project: SpatialProject, voids: readonly LevelVoid[]): ConnectionIssue[];
/** Renderer-independent loops for a real slab hole; winding is handled by the renderer.
 * The same reviewed opening must also cut the lower ceiling, not just draw a marker above it. */
export declare function slabOutlines(project: SpatialProject, floorId: string, roomId: string, voids: readonly LevelVoid[], thickness?: number): Readonly<{
    outer: readonly Point2[];
    holes: readonly (readonly Point2[])[];
    topY: number;
    bottomY: number;
}>;
export declare function planLevelConnections(project: SpatialProject, voids: readonly LevelVoid[], markers: readonly StairMarker[]): LevelConnectionPlan;
/** Two measured anchors can verify translation; rotation disagreement remains explicit. */
export declare function translationFromAnchors(pairs: readonly Readonly<{
    local: Point2;
    world: Point2;
}>[], tolerance?: number): Readonly<{
    status: "translation" | "needs-rotation-or-review";
    offset: Point2;
    maximumResidual: number;
}>;
