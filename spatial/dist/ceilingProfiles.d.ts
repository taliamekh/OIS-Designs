/** Explicit planar ceiling facets for original Phase 3 geometry experiments.
 * Stored flat room heights and production project schemas are never changed here. */
import type { Point2 } from "./viewPlan.js";
export type CeilingFacet = Readonly<{
    id: string;
    boundary: readonly Point2[];
    plane: Readonly<{
        xSlope: number;
        zSlope: number;
        intercept: number;
    }>;
}>;
export type CeilingProfile = Readonly<{
    version: 1;
    facets: readonly CeilingFacet[];
}>;
export type ProfileIssue = Readonly<{
    code: string;
    facetId?: string;
    message: string;
}>;
export type ProfileBreak = Readonly<{
    a: Point2;
    b: Point2;
    firstFacet: string;
    secondFacet: string;
    heightFirst: readonly [number, number];
    heightSecond: readonly [number, number];
    kind: "crease" | "drop";
}>;
export declare const polygonArea: (p: readonly Point2[]) => number;
/** Convex clipping oracle: affine height extrema occur at intersection vertices. */
export declare function convexIntersection(subject: readonly Point2[], clip: readonly Point2[]): Point2[];
export declare function profileBreaks(profile: CeilingProfile): ProfileBreak[];
export declare function validateCeilingProfile(room: readonly Point2[], profile: CeilingProfile): ProfileIssue[];
export declare function ceilingHeightAt(profile: CeilingProfile, point: Point2): number | null;
export declare function minimumCeilingOverFootprint(room: readonly Point2[], profile: CeilingProfile, footprint: readonly Point2[]): Readonly<{
    status: "measured";
    minimumHeight: number;
    facetIds: readonly string[];
} | {
    status: "invalid";
    reason: string;
}>;
/** Downward-facing interior triangles plus actual vertical soffit/drop faces. */
export declare function ceilingProfileTriangles(room: readonly Point2[], profile: CeilingProfile): Readonly<{
    positions: Float32Array;
    surfaceTriangles: number;
    riserTriangles: number;
    breaks: readonly ProfileBreak[];
}>;
/** Split wall-face top at facet boundaries; a drop stays a step, never an invented ramp. */
export declare function wallProfileSegments(profile: CeilingProfile, a: Point2, b: Point2): Readonly<{
    a: Point2;
    b: Point2;
    heightA: number;
    heightB: number;
    facetId: string;
}>[];
export declare function openingCeilingClearance(room: readonly Point2[], profile: CeilingProfile, a: Point2, b: Point2, sill: number, clearHeight: number): Readonly<{
    fits: boolean;
    minimumCeiling: number;
    openingTop: number;
    clearance: number;
}>;
