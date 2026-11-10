const EPS = 1e-6;
const finite = (p) => [p.x, p.y, p.z].every(Number.isFinite);
const blocked = (reason) => ({ status: "blocked", reason });
const cross = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
function onSegment(p, a, b) {
    return Math.abs(cross(a, b, p)) <= EPS && p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS && p.z >= Math.min(a.z, b.z) - EPS && p.z <= Math.max(a.z, b.z) + EPS;
}
export function containsPoint(p, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[j], b = polygon[i];
        if (onSegment(p, a, b))
            return true;
        if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x)
            inside = !inside;
    }
    return inside;
}
function edges(polygon) {
    return polygon.map((p, i) => [p, polygon[(i + 1) % polygon.length]]);
}
function properIntersection(a, b, c, d) {
    return cross(a, b, c) * cross(a, b, d) < -EPS && cross(c, d, a) * cross(c, d, b) < -EPS;
}
function validPolygon(polygon) {
    if (polygon.length < 3 || polygon.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.z)))
        return false;
    const area = edges(polygon).reduce((sum, [a, b]) => sum + a.x * b.z - b.x * a.z, 0) / 2;
    if (Math.abs(area) < EPS)
        return false;
    const segments = edges(polygon);
    if (segments.some(([a, b]) => Math.hypot(a.x - b.x, a.z - b.z) < EPS))
        return false;
    return !segments.some(([a, b], i) => segments.some(([c, d], j) => j > i + 1 && !(i === 0 && j === segments.length - 1) &&
        (properIntersection(a, b, c, d) || onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b))));
}
function validSurface(surface) {
    if (!validPolygon(surface.boundary))
        return false;
    const holes = surface.holes ?? [];
    return holes.every((hole, i) => validPolygon(hole) && hole.every(p => containsPoint(p, surface.boundary)) &&
        !edges(hole).some(([a, b]) => edges(surface.boundary).some(([c, d]) => properIntersection(a, b, c, d))) &&
        holes.slice(i + 1).every(other => !hole.some(p => containsPoint(p, other)) && !other.some(p => containsPoint(p, hole)) && !edges(hole).some(([a, b]) => edges(other).some(([c, d]) => properIntersection(a, b, c, d)))));
}
/** Corners alone are insufficient for concave supports or a hole enclosed by the footprint. */
export function coversFootprint(footprint, surface) {
    if (!validSurface(surface) || !validPolygon(footprint))
        return false;
    if (!footprint.every(p => containsPoint(p, surface.boundary)))
        return false;
    if (edges(footprint).some(([a, b]) => edges(surface.boundary).some(([c, d]) => properIntersection(a, b, c, d))))
        return false;
    for (const hole of surface.holes ?? []) {
        if (footprint.some(p => containsPoint(p, hole)) || hole.some(p => containsPoint(p, footprint)))
            return false;
        if (edges(footprint).some(([a, b]) => edges(hole).some(([c, d]) => properIntersection(a, b, c, d))))
            return false;
    }
    return true;
}
function footprint(item, asset) {
    const lo = asset.bounds.min, hi = asset.bounds.max, c = Math.cos(item.yaw), s = Math.sin(item.yaw);
    return [[lo[0], lo[2]], [hi[0], lo[2]], [hi[0], hi[2]], [lo[0], hi[2]]].map(([x, z]) => ({ x: item.x + c * x + s * z, z: item.z - s * x + c * z }));
}
function footprintsOverlap(a, b) {
    for (const polygon of [a, b])
        for (const [p, q] of edges(polygon)) {
            const nx = p.z - q.z, nz = q.x - p.x, pa = a.map(v => v.x * nx + v.z * nz), pb = b.map(v => v.x * nx + v.z * nz);
            if (Math.max(...pa) <= Math.min(...pb) + EPS || Math.max(...pb) <= Math.min(...pa) + EPS)
                return false;
        }
    return true;
}
function identity(item, asset) {
    return item.assetId === asset.id && item.assetVersion === asset.version && item.assetHash === asset.sha256;
}
const validPose = (item) => [item.x, item.z, item.yaw, item.elevation ?? 0].every(Number.isFinite);
const validBounds = (asset) => asset.bounds.min.length === 3 && asset.bounds.max.length === 3 && [...asset.bounds.min, ...asset.bounds.max].every(Number.isFinite) && asset.bounds.min.every((v, i) => v < asset.bounds.max[i]);
const samePose = (a, b) => a.roomId === b.roomId && a.x === b.x && a.z === b.z && a.yaw === b.yaw && (a.elevation ?? 0) === (b.elevation ?? 0);
/** An authored polygon must come from reviewed horizontal mesh geometry, not its AABB top.
 * The enclosing-box checks below are necessary guards, not proof that a table fills that region. */
export function authoredItemSurface(owner, asset, floorId, region) {
    if (!identity(owner, asset))
        throw new Error("Support owner revision does not match");
    if (!validPose(owner) || !validBounds(asset))
        throw new Error("Support owner pose/bounds are invalid");
    if (!Number.isFinite(region.height) || region.height < asset.bounds.min[1] - EPS || region.height > asset.bounds.max[1] + EPS)
        throw new Error("Authored surface is outside owner height bounds");
    if (!validSurface(region) || [...region.boundary, ...(region.holes ?? []).flat()].some(p => p.x < asset.bounds.min[0] - EPS || p.x > asset.bounds.max[0] + EPS || p.z < asset.bounds.min[2] - EPS || p.z > asset.bounds.max[2] + EPS))
        throw new Error("Authored support polygon is invalid or outside owner bounds");
    const c = Math.cos(owner.yaw), s = Math.sin(owner.yaw), transform = (p) => ({ x: owner.x + c * p.x + s * p.z, z: owner.z - s * p.x + c * p.z });
    return { id: region.id, floorId, roomId: owner.roomId, height: (owner.elevation ?? 0) + region.height, boundary: region.boundary.map(transform), holes: region.holes?.map(p => p.map(transform)),
        source: { kind: "authored-horizontal-mesh-region", ownerItemId: owner.id, assetId: asset.id, assetVersion: asset.version, assetHash: asset.sha256, ownerPose: { x: owner.x, z: owner.z, yaw: owner.yaw, elevation: owner.elevation ?? 0 } } };
}
export function proposeSupportPlacement(r) {
    if (!r.canEdit || r.mode === "walk")
        return blocked("read-only-view");
    if (r.item.locked)
        return blocked("item-locked");
    if (!identity(r.item, r.asset))
        return blocked("saved-asset-revision-unresolved");
    if (!validBounds(r.asset) || !validPose(r.item))
        return blocked("invalid-asset-bounds-or-pose");
    if (r.surface.floorId !== r.activeFloorId || r.surface.roomId !== r.activeRoomId || r.item.roomId !== r.activeRoomId)
        return blocked("support-outside-active-room-or-floor");
    if (!finite(r.ray.origin) || !finite(r.ray.direction) || !finite(r.canonicalFloorOffset) || !Number.isFinite(r.grabOffset.x) || !Number.isFinite(r.grabOffset.z) || !Number.isFinite(r.roomCeiling) || r.roomCeiling <= 0)
        return blocked("invalid-input");
    if (r.ray.direction.y >= -EPS)
        return blocked("ray-does-not-face-support-top");
    if (!validSurface(r.surface) || !Number.isFinite(r.surface.height) || r.surface.height < 0)
        return blocked("invalid-support-polygon");
    if (r.surface.source.kind === "floor" && Math.abs(r.surface.height) > EPS)
        return blocked("floor-height-is-not-canonical-zero");
    if (new Set(r.items.map(i => i.id)).size !== r.items.length)
        return blocked("duplicate-scene-item-id");
    let owner;
    if (r.surface.source.kind !== "floor") {
        const source = r.surface.source;
        owner = r.items.find(i => i.id === source.ownerItemId);
        if (!owner || owner.assetId !== source.assetId || owner.assetVersion !== source.assetVersion || owner.assetHash !== source.assetHash)
            return blocked("support-owner-revision-unresolved");
        if (owner.id === r.item.id)
            return blocked("self-support");
        if (owner.roomId !== r.item.roomId || owner.x !== source.ownerPose.x || owner.z !== source.ownerPose.z || owner.yaw !== source.ownerPose.yaw || (owner.elevation ?? 0) !== source.ownerPose.elevation)
            return blocked("stale-support-owner-pose");
        if (!r.obstacles.some(o => o.item.id === owner.id && identity(owner, o.asset)))
            return blocked("support-owner-collision-evidence-missing");
        const visited = new Set();
        let ancestor = owner.id;
        while (ancestor) {
            if (ancestor === r.item.id || visited.has(ancestor))
                return blocked("attachment-cycle");
            if (!r.items.some(i => i.id === ancestor))
                return blocked("support-ancestor-unresolved");
            visited.add(ancestor);
            ancestor = r.attachments?.[ancestor]?.parentItemId;
        }
    }
    const worldY = r.canonicalFloorOffset.y + r.surface.height, t = (worldY - r.ray.origin.y) / r.ray.direction.y;
    if (!Number.isFinite(t) || t < 0)
        return blocked("support-behind-ray");
    const hit = { x: r.ray.origin.x + t * r.ray.direction.x - r.canonicalFloorOffset.x, z: r.ray.origin.z + t * r.ray.direction.z - r.canonicalFloorOffset.z };
    if (!containsPoint(hit, r.surface.boundary) || r.surface.holes?.some(h => containsPoint(hit, h)))
        return blocked("ray-misses-support-region");
    let x = hit.x + r.grabOffset.x, z = hit.z + r.grabOffset.z;
    if (r.gridMetres !== undefined) {
        if (!Number.isFinite(r.gridMetres) || r.gridMetres < .001 || r.gridMetres > 1)
            return blocked("invalid-grid");
        x = Math.round(x / r.gridMetres) * r.gridMetres;
        z = Math.round(z / r.gridMetres) * r.gridMetres;
    }
    const rawElevation = r.surface.height - r.asset.bounds.min[1], elevation = Math.abs(rawElevation) < EPS ? 0 : rawElevation;
    const pose = { x, z, yaw: r.item.yaw, elevation };
    if (![...r.asset.bounds.min, ...r.asset.bounds.max, x, z, pose.yaw, elevation].every(Number.isFinite) || r.asset.bounds.min.length !== 3 || r.asset.bounds.max.length !== 3 || r.asset.bounds.min.some((v, i) => v >= r.asset.bounds.max[i]))
        return blocked("invalid-asset-bounds");
    const foot = footprint(pose, r.asset);
    if (!coversFootprint(foot, r.surface))
        return blocked("footprint-overhangs-support");
    const bottom = elevation + r.asset.bounds.min[1], top = elevation + r.asset.bounds.max[1];
    if (top > r.roomCeiling + EPS)
        return blocked("ceiling-clearance");
    const collisionIds = new Set();
    for (const obstacle of r.obstacles) {
        if (collisionIds.has(obstacle.item.id))
            return blocked("duplicate-obstacle-id");
        collisionIds.add(obstacle.item.id);
        if (obstacle.item.id === r.item.id)
            continue;
        const current = r.items.find(i => i.id === obstacle.item.id);
        if (!current || !samePose(current, obstacle.item) || current.assetId !== obstacle.item.assetId || current.assetVersion !== obstacle.item.assetVersion || current.assetHash !== obstacle.item.assetHash)
            return blocked("stale-obstacle-state");
        if (!validPose(obstacle.item) || !validBounds(obstacle.asset))
            return blocked("invalid-obstacle-bounds-or-pose");
    }
    if (r.items.some(i => i.id !== r.item.id && i.roomId === r.activeRoomId && !collisionIds.has(i.id)))
        return blocked("scene-collision-evidence-missing");
    for (const obstacle of r.obstacles) {
        if (obstacle.item.id === r.item.id)
            continue;
        if (!identity(obstacle.item, obstacle.asset))
            return blocked("obstacle-revision-unresolved");
        const lo = (obstacle.item.elevation ?? 0) + obstacle.asset.bounds.min[1], hi = (obstacle.item.elevation ?? 0) + obstacle.asset.bounds.max[1];
        // Only topmost surfaces can ignore the owner's enclosing cage. A hutch/sink/tall part
        // above this region needs a more precise geometry collision provider before enabling it.
        if (obstacle.item.id === owner?.id) {
            if (bottom < hi - .002)
                return blocked("support-owner-geometry-needs-precise-collision");
            if (bottom > hi + .002 || !coversFootprint(r.surface.boundary, { boundary: footprint(obstacle.item, obstacle.asset) }))
                return blocked("support-region-outside-owner-bounds");
            continue;
        }
        if (top <= lo + EPS || bottom >= hi - EPS)
            continue;
        if (footprintsOverlap(foot, footprint(obstacle.item, obstacle.asset)))
            return blocked("obstacle-collision");
    }
    const attachment = owner ? {
        parentItemId: owner.id, surfaceId: r.surface.id, parentAssetId: owner.assetId, parentAssetVersion: owner.assetVersion, parentAssetHash: owner.assetHash,
        localX: Math.cos(owner.yaw) * (x - owner.x) - Math.sin(owner.yaw) * (z - owner.z),
        localZ: Math.sin(owner.yaw) * (x - owner.x) + Math.cos(owner.yaw) * (z - owner.z),
        localElevation: elevation - (owner.elevation ?? 0), relativeYaw: pose.yaw - owner.yaw,
    } : null;
    return { status: "valid-proposal", pose, attachment, localHit: hit, surfaceId: r.surface.id };
}
/** Reconstruct a persisted proposal relative to its exact parent; command integration must
 * validate the whole resulting family and record one atomic Undo before committing. */
export function attachedPose(attachment, owner) {
    if (owner.id !== attachment.parentItemId || owner.assetId !== attachment.parentAssetId || owner.assetVersion !== attachment.parentAssetVersion || owner.assetHash !== attachment.parentAssetHash)
        throw new Error("Attachment parent identity unresolved");
    if (![owner.x, owner.z, owner.yaw, owner.elevation ?? 0, attachment.localX, attachment.localZ, attachment.localElevation, attachment.relativeYaw].every(Number.isFinite))
        throw new Error("Invalid attachment pose");
    const c = Math.cos(owner.yaw), s = Math.sin(owner.yaw);
    return { x: owner.x + c * attachment.localX + s * attachment.localZ, z: owner.z - s * attachment.localX + c * attachment.localZ, yaw: owner.yaw + attachment.relativeYaw, elevation: (owner.elevation ?? 0) + attachment.localElevation };
}
