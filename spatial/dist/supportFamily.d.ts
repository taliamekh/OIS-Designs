/** Transport proposals for an attached family. No production schema or history writes. */
import type { AssetBounds, SpatialItem } from './viewPlan.js';
import type { SurfaceAttachment } from './supportPlacement.js';
export type ItemPose = Readonly<{
    x: number;
    z: number;
    yaw: number;
    elevation: number;
}>;
export type FamilyPatch = Readonly<{
    itemId: string;
    pose: ItemPose;
}>;
export type FamilyProposal = Readonly<{
    status: 'validated-family-proposal';
    rootItemId: string;
    contextToken: string;
    sourceSignature: string;
    patches: readonly FamilyPatch[];
    detachRoot: boolean;
}>;
export type FamilyResult = FamilyProposal | Readonly<{
    status: 'blocked';
    reason: string;
    itemId?: string;
}>;
export type FamilyRequest = Readonly<{
    items: readonly SpatialItem[];
    attachments: Readonly<Record<string, SurfaceAttachment>>;
    rootItemId: string;
    pose: ItemPose;
    detachRoot?: boolean;
    contextToken: string;
    canEdit: boolean;
    mode: '3d' | 'walk';
    resolve: (item: SpatialItem) => AssetBounds | undefined;
    /** Must validate the entire proposed family against the same room/wall/support/
     * ceiling/obstacle snapshot. Transport alone is never clearance acceptance. */
    validateAll: (items: readonly SpatialItem[], movingIds: ReadonlySet<string>) => Readonly<{
        valid: boolean;
        reason?: string;
    }>;
}>;
export declare function supportSceneSignature(items: readonly SpatialItem[], attachments: Readonly<Record<string, SurfaceAttachment>>): string;
export declare function proposeSupportFamilyMove(r: FamilyRequest): FamilyResult;
/** Immutable proposal materialization only. Production must commit its result as one
 * domain command/Undo step after the same guards and full scene context check. */
export declare function materializeSupportFamily<T extends SpatialItem>(items: readonly T[], attachments: Readonly<Record<string, SurfaceAttachment>>, proposal: FamilyProposal, contextToken: string, canEdit: boolean, mode: '3d' | 'walk'): Readonly<{
    status: 'materialized-proposal';
    items: readonly T[];
    attachments: Readonly<Record<string, SurfaceAttachment>>;
}> | Readonly<{
    status: 'blocked';
    reason: string;
}>;
