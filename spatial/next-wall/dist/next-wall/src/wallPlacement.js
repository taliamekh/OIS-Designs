import { coversFootprint } from '../../src/supportPlacement.js';
const EPS = 1e-6;
const validPoint = (p) => Number.isFinite(p.x) && Number.isFinite(p.z);
const validBounds = (a) => a.bounds.min.length === 3 && a.bounds.max.length === 3 && [...a.bounds.min, ...a.bounds.max].every(Number.isFinite) && a.bounds.min.every((v, i) => v < a.bounds.max[i]);
const validItem = (i) => [i.x, i.z, i.yaw, i.elevation ?? 0].every(Number.isFinite);
const exact = (i, a) => i.assetId === a.id && i.assetVersion === a.version && i.assetHash === a.sha256;
const foot = (i, a) => {
    const c = Math.cos(i.yaw), s = Math.sin(i.yaw), lo = a.bounds.min, hi = a.bounds.max;
    return [[lo[0], lo[2]], [hi[0], lo[2]], [hi[0], hi[2]], [lo[0], hi[2]]].map(([x, z]) => ({ x: i.x + c * x + s * z, z: i.z - s * x + c * z }));
};
function overlap(a, b) {
    for (const p of [a, b])
        for (let i = 0; i < p.length; i++) {
            const u = p[i], v = p[(i + 1) % p.length], nx = u.z - v.z, nz = v.x - u.x, pa = a.map(q => q.x * nx + q.z * nz), pb = b.map(q => q.x * nx + q.z * nz);
            if (Math.max(...pa) <= Math.min(...pb) + EPS || Math.max(...pb) <= Math.min(...pa) + EPS)
                return false;
        }
    return true;
}
function convexPolygon(p) {
    if (!coversFootprint(p, { boundary: p }))
        return false;
    let sign = 0;
    for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length], cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
        if (Math.abs(cross) < EPS)
            continue;
        const next = Math.sign(cross);
        if (sign && sign !== next)
            return false;
        sign = next;
    }
    return !!sign;
}
function faceFrame(f) {
    if (![f.floorId, f.roomId, f.wallId, f.revision].every(v => typeof v === 'string' && v.length > 0) || (f.side !== 'left' && f.side !== 'right') || !validPoint(f.a) || !validPoint(f.b) || !validPoint(f.inward) || ![f.height, f.trim.height, f.trim.projection].every(Number.isFinite) || f.height <= 0 || f.trim.height < 0 || f.trim.projection < 0)
        return null;
    const dx = f.b.x - f.a.x, dz = f.b.z - f.a.z, length = Math.hypot(dx, dz);
    if (length < EPS)
        return null;
    const tx = dx / length, tz = dz / length, sign = f.side === 'left' ? 1 : -1;
    if (Math.abs(f.inward.x + tz * sign) > EPS || Math.abs(f.inward.z - tx * sign) > EPS)
        return null;
    if (f.openings.some(o => ![o.minAlong, o.maxAlong, o.bottom, o.top, o.clearance].every(Number.isFinite) || o.minAlong < -EPS || o.maxAlong > length + EPS || o.maxAlong <= o.minAlong || o.bottom < 0 || o.top > f.height + EPS || o.top <= o.bottom || o.clearance < 0))
        return null;
    return { tx, tz, length };
}
export function proposeWallPlacement(r) {
    const blocked = (reason) => ({ status: 'blocked', reason });
    if (!r.canEdit || r.mode === 'walk')
        return blocked('read-only-view');
    if (r.item.locked)
        return blocked('item-locked');
    if (r.anchor !== 'wall' || r.frame !== '-Z-front/+Z-rear')
        return blocked('wall-anchor-or-authored-frame-required');
    if (!exact(r.item, r.asset))
        return blocked('saved-asset-revision-unresolved');
    if (!validBounds(r.asset) || !validItem(r.item))
        return blocked('invalid-item-bounds-or-pose');
    if (!Array.isArray(r.movingOpeningIds) || !Array.isArray(r.openingEnvelopes) || r.movingOpeningIds.some(id => !r.openingEnvelopes.some(e => e.openingId === id)))
        return blocked('opening-motion-evidence-missing');
    if (r.openingEnvelopes.some(e => !r.movingOpeningIds.includes(e.openingId) || !Number.isFinite(e.bottom) || !Number.isFinite(e.top) || e.bottom < 0 || e.top <= e.bottom || !convexPolygon(e.footprint)))
        return blocked('invalid-opening-motion-envelope');
    const f = r.face, frame = faceFrame(f);
    if (!frame)
        return blocked('invalid-inside-face');
    if (f.revision !== r.currentWallRevision)
        return blocked('stale-wall-face');
    if (f.floorId !== r.activeFloorId || f.roomId !== r.activeRoomId || r.item.roomId !== r.activeRoomId)
        return blocked('wrong-active-room-or-floor');
    if (![r.floorOffset.x, r.floorOffset.y, r.floorOffset.z, r.ray.origin.x, r.ray.origin.y, r.ray.origin.z, r.ray.direction.x, r.ray.direction.y, r.ray.direction.z, r.grab.along, r.grab.height].every(Number.isFinite))
        return blocked('invalid-ray-or-frame');
    const n = f.inward, den = r.ray.direction.x * n.x + r.ray.direction.z * n.z;
    if (den >= -EPS)
        return blocked('ray-does-not-face-inside-wall');
    const ox = r.ray.origin.x - r.floorOffset.x, oz = r.ray.origin.z - r.floorOffset.z, signed = (ox - f.a.x) * n.x + (oz - f.a.z) * n.z;
    if (signed < -EPS)
        return blocked('ray-origin-behind-inside-face');
    const t = -signed / den;
    if (t < 0 || !Number.isFinite(t))
        return blocked('wall-behind-ray');
    const hit = { x: ox + t * r.ray.direction.x, z: oz + t * r.ray.direction.z }, hitY = r.ray.origin.y + t * r.ray.direction.y - r.floorOffset.y;
    let along = (hit.x - f.a.x) * frame.tx + (hit.z - f.a.z) * frame.tz + r.grab.along, elevation = hitY + r.grab.height;
    if (r.gridMetres !== undefined) {
        if (!Number.isFinite(r.gridMetres) || r.gridMetres < .001 || r.gridMetres > 1)
            return blocked('invalid-grid');
        along = Math.round(along / r.gridMetres) * r.gridMetres;
        elevation = Math.round(elevation / r.gridMetres) * r.gridMetres;
    }
    const yaw = Math.atan2(-n.x, -n.z), rear = r.asset.bounds.max[2], pose = { x: f.a.x + frame.tx * along + n.x * rear, z: f.a.z + frame.tz * along + n.z * rear, yaw, elevation }, footprint = foot(pose, r.asset);
    const alongValues = footprint.map(p => (p.x - f.a.x) * frame.tx + (p.z - f.a.z) * frame.tz), minAlong = Math.min(...alongValues), maxAlong = Math.max(...alongValues), bottom = elevation + r.asset.bounds.min[1], top = elevation + r.asset.bounds.max[1];
    if (minAlong < -EPS || maxAlong > frame.length + EPS)
        return blocked('wall-end-overhang');
    if (bottom < -EPS)
        return blocked('below-floor');
    if (!coversFootprint(footprint, { boundary: r.roomInterior }))
        return blocked('footprint-outside-clear-room');
    let ceiling = f.height;
    try {
        if (r.ceiling.kind !== 'flat' && r.ceiling.kind !== 'profile')
            return blocked('ceiling-profile-unresolved');
        const h = r.ceiling.kind === 'profile' ? r.ceiling.minimum(footprint) : r.ceiling.height;
        if (h === null || !Number.isFinite(h) || h <= 0)
            return blocked('ceiling-profile-unresolved');
        ceiling = Math.min(ceiling, h);
    }
    catch {
        return blocked('ceiling-profile-unresolved');
    }
    if (top > ceiling + EPS)
        return blocked('ceiling-clearance');
    if (bottom < f.trim.height - EPS && f.trim.projection > EPS)
        return blocked('baseboard-intersection');
    for (const gap of f.openings)
        if (maxAlong > gap.minAlong - gap.clearance + EPS && minAlong < gap.maxAlong + gap.clearance - EPS && top > gap.bottom - gap.clearance + EPS && bottom < gap.top + gap.clearance - EPS)
            return blocked('opening-or-casing-intersection');
    for (const e of r.openingEnvelopes)
        if (top > e.bottom + EPS && bottom < e.top - EPS && overlap(footprint, e.footprint))
            return blocked('opening-motion-intersection');
    const ids = new Set();
    for (const item of r.items) {
        if (ids.has(item.id))
            return blocked('duplicate-scene-item-id');
        ids.add(item.id);
        if (item.id === r.item.id || item.roomId !== r.activeRoomId)
            continue;
        const asset = r.resolve(item);
        if (!asset || !exact(item, asset))
            return blocked('obstacle-revision-unresolved');
        if (!validBounds(asset) || !validItem(item))
            return blocked('invalid-obstacle-bounds-or-pose');
        const lo = (item.elevation ?? 0) + asset.bounds.min[1], hi = (item.elevation ?? 0) + asset.bounds.max[1];
        if (top <= lo + EPS || bottom >= hi - EPS)
            continue;
        if (overlap(footprint, foot(item, asset)))
            return blocked('obstacle-collision');
    }
    return { status: 'wall-proposal', pose, attachment: { floorId: f.floorId, roomId: f.roomId, wallId: f.wallId, side: f.side, wallRevision: f.revision, along, elevation, assetId: r.asset.id, assetVersion: r.asset.version, assetHash: r.asset.sha256, localRearZ: rear }, wallRange: { minAlong, maxAlong, bottom, top }, footprint, forceVisibleWallKey: `${f.floorId}:${f.wallId}` };
}
/** Coordinate-derived production wall IDs change when a room moves. The command
 * must supply an explicit old/new endpoint correspondence, never a nearest-wall
 * guess. Split/resized walls remain unresolved until a separate reviewed policy. */
export function remapWallAttachment(r, attachment, oldFace, correspondence) {
    const blocked = (reason) => ({ status: 'blocked', reason });
    if (!r.canEdit || r.mode === 'walk')
        return blocked('read-only-view');
    if (r.item.locked)
        return blocked('item-locked');
    const old = faceFrame(oldFace), next = faceFrame(r.face);
    if (!old || !next)
        return blocked('invalid-inside-face');
    if (!['a-to-a', 'a-to-b'].includes(correspondence))
        return blocked('wall-correspondence-required');
    if (attachment.wallId !== oldFace.wallId || attachment.side !== oldFace.side || attachment.wallRevision !== oldFace.revision || attachment.floorId !== oldFace.floorId || attachment.roomId !== oldFace.roomId)
        return blocked('old-wall-attachment-unresolved');
    if (attachment.assetId !== r.asset.id || attachment.assetVersion !== r.asset.version || attachment.assetHash !== r.asset.sha256 || !Number.isFinite(attachment.localRearZ) || Math.abs(attachment.localRearZ - r.asset.bounds.max[2]) > EPS)
        return blocked('attachment-asset-unresolved');
    if (r.face.floorId !== oldFace.floorId || r.face.roomId !== oldFace.roomId)
        return blocked('wall-remap-crosses-room-or-floor');
    if (Math.abs(old.length - next.length) > EPS)
        return blocked('wall-remap-length-changed');
    if ((oldFace.side === r.face.side) !== (correspondence === 'a-to-a'))
        return blocked('wall-remap-interior-side-ambiguous');
    if (!Number.isFinite(attachment.along) || !Number.isFinite(attachment.elevation))
        return blocked('invalid-attachment-pose');
    const along = correspondence === 'a-to-a' ? attachment.along : next.length - attachment.along, n = r.face.inward;
    return proposeWallPlacement({ ...r, gridMetres: undefined, grab: { along: 0, height: 0 }, ray: { origin: { x: r.floorOffset.x + r.face.a.x + next.tx * along + n.x * .5, y: r.floorOffset.y + attachment.elevation, z: r.floorOffset.z + r.face.a.z + next.tz * along + n.z * .5 }, direction: { x: -n.x, y: 0, z: -n.z } } });
}
