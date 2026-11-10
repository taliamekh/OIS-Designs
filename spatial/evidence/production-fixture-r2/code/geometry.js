"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMetres = exports.toDisplay = exports.SLIDING_FACE_OFFSET = exports.DOOR_HINGE_OFFSET = exports.DOOR_LEAF_THICKNESS = exports.area = exports.bounds = exports.lerp = exports.distance = exports.EPS = void 0;
exports.projectToSegment = projectToSegment;
exports.inside = inside;
exports.validPolygon = validPolygon;
exports.rebuildWalls = rebuildWalls;
exports.footprint = footprint;
exports.overlaps = overlaps;
exports.segmentDistance = segmentDistance;
exports.assetForItem = assetForItem;
exports.doorLeafPoses = doorLeafPoses;
exports.swingEnvelopes = swingEnvelopes;
exports.openingMotionEnvelopes = openingMotionEnvelopes;
exports.physicalWallPieces = physicalWallPieces;
exports.physicalTrimIntervals = physicalTrimIntervals;
exports.canPlace = canPlace;
exports.openingError = openingError;
exports.wallFaceSpan = wallFaceSpan;
exports.roomInsideOutline = roomInsideOutline;
exports.roomInsideDimensions = roomInsideDimensions;
exports.newRoomReferenceDimensions = newRoomReferenceDimensions;
exports.referenceDimensionsForInside = referenceDimensionsForInside;
exports.wallFaceInsideSpan = wallFaceInsideSpan;
exports.openingInsideDimensions = openingInsideDimensions;
exports.openingDimensions = openingDimensions;
exports.shapePolygon = shapePolygon;
exports.measure = measure;
const construction_1 = require("./construction");
exports.EPS = 1e-5;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
exports.distance = distance;
const lerp = (a, b, t) => ({
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
});
exports.lerp = lerp;
const bounds = (points) => ({
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minZ: Math.min(...points.map((p) => p.z)),
    maxZ: Math.max(...points.map((p) => p.z)),
});
exports.bounds = bounds;
const area = (p) => p.reduce((sum, a, i) => {
    const b = p[(i + 1) % p.length];
    return sum + a.x * b.z - b.x * a.z;
}, 0) / 2;
exports.area = area;
function projectToSegment(p, a, b) {
    const len = (0, exports.distance)(a, b);
    const t = len < exports.EPS
        ? 0
        : Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) /
            (len * len)));
    const point = (0, exports.lerp)(a, b, t);
    return { point, t, distance: (0, exports.distance)(p, point), offset: t * len };
}
function inside(p, polygon, margin = 0) {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j];
        const edge = projectToSegment(p, a, b);
        if (edge.distance < margin - exports.EPS)
            return false;
        if (edge.distance < exports.EPS)
            return margin <= exports.EPS;
        if (a.z > p.z !== b.z > p.z &&
            p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x)
            result = !result;
    }
    return result;
}
function orient(a, b, c) {
    return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}
function validPolygon(p) {
    if (p.length < 3 ||
        p.length > 64 ||
        p.some((v) => !Number.isFinite(v.x) || !Number.isFinite(v.z)) ||
        Math.abs((0, exports.area)(p)) < 0.25)
        return false;
    for (let i = 0; i < p.length; i++) {
        if ((0, exports.distance)(p[i], p[(i + 1) % p.length]) < 0.15)
            return false;
        for (let j = i + 1; j < p.length; j++) {
            if (j === i + 1 || (i === 0 && j === p.length - 1))
                continue;
            const a = p[i], b = p[(i + 1) % p.length], c = p[j], d = p[(j + 1) % p.length];
            if (orient(a, b, c) * orient(a, b, d) <= 0 &&
                orient(c, d, a) * orient(c, d, b) <= 0 &&
                Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <=
                    Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) + exports.EPS &&
                Math.max(Math.min(a.z, b.z), Math.min(c.z, d.z)) <=
                    Math.min(Math.max(a.z, b.z), Math.max(c.z, d.z)) + exports.EPS)
                return false;
        }
    }
    return true;
}
const coordKey = (p) => `${Math.round(p.x * 10000)},${Math.round(p.z * 10000)}`;
/** Split collinear edges at every vertex so partial shared walls have one identity. */
function rebuildWalls(rooms, previous = []) {
    const result = new Map();
    const vertices = rooms.flatMap((r) => r.polygon);
    for (const room of rooms)
        for (let i = 0; i < room.polygon.length; i++) {
            const a = room.polygon[i], b = room.polygon[(i + 1) % room.polygon.length];
            const points = [
                a,
                b,
                ...vertices.filter((p) => projectToSegment(p, a, b).distance < exports.EPS),
            ]
                .sort((p, q) => projectToSegment(p, a, b).t - projectToSegment(q, a, b).t)
                .filter((p, j, all) => j === 0 || (0, exports.distance)(p, all[j - 1]) > exports.EPS);
            for (let j = 0; j < points.length - 1; j++) {
                const reversed = coordKey(points[j]) > coordKey(points[j + 1]);
                const start = reversed ? points[j + 1] : points[j], end = reversed ? points[j] : points[j + 1];
                const id = `wall:${coordKey(start)}:${coordKey(end)}`;
                let wall = result.get(id);
                if (!wall) {
                    wall = {
                        id,
                        a: start,
                        b: end,
                        thickness: previous.find((w) => w.id === id)?.thickness ?? 0.12,
                        faces: [],
                    };
                    result.set(id, wall);
                }
                // Face orientation denotes the interior side, independently of input winding.
                wall.faces.push({
                    roomId: room.id,
                    reversed: reversed !== (0, exports.area)(room.polygon) < 0,
                });
            }
        }
    return [...result.values()];
}
function footprint(item, asset, padding = 0) {
    const [x0, , z0] = asset.bounds.min, [x1, , z1] = asset.bounds.max;
    const c = Math.cos(item.yaw), s = Math.sin(item.yaw);
    return [
        [x0 - padding, z0 - padding],
        [x1 + padding, z0 - padding],
        [x1 + padding, z1 + padding],
        [x0 - padding, z1 + padding],
    ].map(([x, z]) => ({ x: item.x + x * c + z * s, z: item.z - x * s + z * c }));
}
function convex(p) {
    let sign = 0;
    for (let i = 0; i < p.length; i++) {
        const turn = orient(p[i], p[(i + 1) % p.length], p[(i + 2) % p.length]);
        if (Math.abs(turn) < exports.EPS)
            continue;
        const next = Math.sign(turn);
        if (sign && sign !== next)
            return false;
        sign = next;
    }
    return !!sign;
}
function convexOverlap(a, b, gap = 0) {
    for (const p of [a, b])
        for (let i = 0; i < p.length; i++) {
            const q = p[(i + 1) % p.length], dx = q.x - p[i].x, dz = q.z - p[i].z, len = Math.hypot(dx, dz);
            const axis = { x: -dz / len, z: dx / len };
            const pa = a.map((v) => v.x * axis.x + v.z * axis.z), pb = b.map((v) => v.x * axis.x + v.z * axis.z);
            if (Math.max(...pa) <= Math.min(...pb) - gap + exports.EPS ||
                Math.max(...pb) <= Math.min(...pa) - gap + exports.EPS)
                return false;
        }
    return true;
}
/** Ear clipping keeps room-overlap checks correct for L-shapes and drawn concave rooms. */
function triangles(polygon) {
    const p = (0, exports.area)(polygon) < 0 ? [...polygon].reverse() : [...polygon];
    for (let i = p.length - 1; i >= 0 && p.length > 3; i--)
        if (Math.abs(orient(p[(i + p.length - 1) % p.length], p[i], p[(i + 1) % p.length])) < exports.EPS)
            p.splice(i, 1);
    const out = [];
    while (p.length > 3) {
        let found = false;
        for (let i = 0; i < p.length; i++) {
            const a = p[(i + p.length - 1) % p.length], b = p[i], c = p[(i + 1) % p.length];
            if (orient(a, b, c) <= exports.EPS)
                continue;
            if (p.some((v) => v !== a &&
                v !== b &&
                v !== c &&
                orient(a, b, v) >= -exports.EPS &&
                orient(b, c, v) >= -exports.EPS &&
                orient(c, a, v) >= -exports.EPS))
                continue;
            out.push([a, b, c]);
            p.splice(i, 1);
            found = true;
            break;
        }
        if (!found)
            return [];
    }
    if (p.length === 3)
        out.push(p);
    return out;
}
function overlaps(a, b, gap = 0) {
    if (a.length < 3 || b.length < 3)
        return false;
    if (convex(a) && convex(b))
        return convexOverlap(a, b, gap);
    return triangles(a).some((ta) => triangles(b).some((tb) => convexOverlap(ta, tb, gap)));
}
function segmentDistance(a, b, c, d) {
    if (orient(a, b, c) * orient(a, b, d) < 0 &&
        orient(c, d, a) * orient(c, d, b) < 0)
        return 0;
    return Math.min(projectToSegment(a, c, d).distance, projectToSegment(b, c, d).distance, projectToSegment(c, a, b).distance, projectToSegment(d, a, b).distance);
}
/** A placed revision is immutable: never silently collide against a newer asset's bounds. */
function assetForItem(item, assets) {
    return assets.find((a) => a.id === item.assetId &&
        a.version === item.assetVersion &&
        a.sha256 === item.assetHash);
}
exports.DOOR_LEAF_THICKNESS = 0.035;
exports.DOOR_HINGE_OFFSET = 0.02;
exports.SLIDING_FACE_OFFSET = 0.035;
/** Shared physical presentation contract; Walk opens the full supported travel. */
function doorLeafPoses(opening, wallThickness, walk = false) {
    const side = opening.flip ? -1 : 1;
    const angle = walk ? Math.PI / 2 : Math.PI * 0.38;
    if (opening.type === "single")
        return [{
                pivotX: opening.hinge === "left" ? 0 : opening.width,
                z: side * exports.DOOR_HINGE_OFFSET,
                yaw: opening.hinge === "left" ? -side * angle : Math.PI + side * angle,
                width: opening.width,
            }];
    if (opening.type === "double")
        return [
            { pivotX: 0, z: side * exports.DOOR_HINGE_OFFSET, yaw: -side * angle, width: opening.width / 2 },
            { pivotX: opening.width, z: side * exports.DOOR_HINGE_OFFSET, yaw: Math.PI + side * angle, width: opening.width / 2 },
        ];
    if (opening.type === "sliding" || opening.type === "pocket")
        return [{
                pivotX: (opening.hinge === "left" ? -1 : 1) * opening.width * (walk ? 1 : 0.8),
                z: opening.type === "pocket" ? 0 : side * (wallThickness / 2 + exports.SLIDING_FACE_OFFSET),
                yaw: 0,
                width: opening.width,
            }];
    return [];
}
function convexHull(points) {
    const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
    const half = (list) => {
        const out = [];
        for (const p of list) {
            while (out.length >= 2 && orient(out[out.length - 2], out[out.length - 1], p) <= 0)
                out.pop();
            out.push(p);
        }
        out.pop();
        return out;
    };
    return [...half(sorted), ...half([...sorted].reverse())];
}
function wallPoint(wall, along, normal) {
    const length = (0, exports.distance)(wall.a, wall.b);
    const ux = (wall.b.x - wall.a.x) / length, uz = (wall.b.z - wall.a.z) / length;
    return { x: wall.a.x + along * ux - normal * uz, z: wall.a.z + along * uz + normal * ux };
}
function wallRectangle(wall, start, end, near, far) {
    return [wallPoint(wall, start, near), wallPoint(wall, end, near), wallPoint(wall, end, far), wallPoint(wall, start, far)];
}
/** Conservative physical hinge sweep, including hinge offset and leaf thickness.
 * Circumscribed arc chords cannot leave gaps between sampled door angles. */
function swingEnvelopes(wall, opening) {
    if (opening.type !== "single" && opening.type !== "double")
        return [];
    const side = opening.flip ? -1 : 1;
    const leaf = (left, width) => {
        const hinge = opening.offset + (left ? 0 : opening.width), normal = side * exports.DOOR_HINGE_OFFSET;
        const half = exports.DOOR_LEAF_THICKNESS / 2, delta = Math.atan2(half, width);
        const step = (Math.PI / 2 + 2 * delta) / 20;
        const radius = Math.hypot(width, half) / Math.cos(step / 2);
        const arc = Array.from({ length: 21 }, (_, i) => {
            const angle = -delta + i * step;
            return wallPoint(wall, hinge + (left ? 1 : -1) * radius * Math.cos(angle), normal + side * radius * Math.sin(angle));
        });
        return convexHull([...arc, ...wallRectangle(wall, hinge - half, hinge + half, normal - half, normal + half)]);
    };
    return opening.type === "double"
        ? [leaf(true, opening.width / 2), leaf(false, opening.width / 2)]
        : [leaf(opening.hinge === "left", opening.width)];
}
/** All supported moving panels, not only hinged doors. Coordinates remain canonical. */
function openingMotionEnvelopes(wall, opening) {
    if (opening.type === "single" || opening.type === "double")
        return swingEnvelopes(wall, opening);
    if (opening.type !== "sliding" && opening.type !== "pocket")
        return [];
    const side = opening.flip ? -1 : 1;
    const normal = opening.type === "pocket" ? 0 : side * (wall.thickness / 2 + exports.SLIDING_FACE_OFFSET);
    const start = opening.offset - (opening.hinge === "left" ? opening.width : 0);
    return [wallRectangle(wall, start, start + opening.width * 2, normal - exports.DOOR_LEAF_THICKNESS / 2, normal + exports.DOOR_LEAF_THICKNESS / 2)];
}
/** Pure hole/pocket contract for both collision and the app-owned mesh adapter. */
function physicalWallPieces(wall, openings, height) {
    const length = (0, exports.distance)(wall.a, wall.b);
    const holes = openings.filter(o => o.wallId === wall.id).sort((a, b) => a.offset - b.offset);
    const pieces = [];
    if (holes.some(o => o.type === "pocket")) {
        const xs = [0, length, ...holes.flatMap(o => [o.offset, o.offset + o.width, ...(o.type === "pocket" ? [o.hinge === "left" ? o.offset - o.width : o.offset + o.width, o.hinge === "left" ? o.offset : o.offset + o.width * 2] : [])])]
            .filter(x => x >= 0 && x <= length).sort((a, b) => a - b).filter((x, i, all) => !i || x - all[i - 1] > 1e-6);
        const ys = [0, height, ...holes.flatMap(o => [o.sill, o.sill + o.height])]
            .filter(y => y >= 0 && y <= height).sort((a, b) => a - b).filter((y, i, all) => !i || y - all[i - 1] > 1e-6);
        for (let i = 0; i < xs.length - 1; i++)
            for (let j = 0; j < ys.length - 1; j++) {
                const x = (xs[i] + xs[i + 1]) / 2, y = (ys[j] + ys[j + 1]) / 2;
                if (holes.some(o => x > o.offset && x < o.offset + o.width && y > o.sill && y < o.sill + o.height))
                    continue;
                const pocket = holes.some(o => o.type === "pocket" && y < o.height && x > (o.hinge === "left" ? o.offset - o.width : o.offset + o.width) && x < (o.hinge === "left" ? o.offset : o.offset + o.width * 2));
                pieces.push({ start: xs[i], end: xs[i + 1], bottom: ys[j], top: ys[j + 1], cavity: pocket ? 0.05 : 0 });
            }
        return pieces;
    }
    let cursor = 0;
    for (const o of holes) {
        if (o.offset > cursor)
            pieces.push({ start: cursor, end: o.offset, bottom: 0, top: height });
        if (o.sill > 0)
            pieces.push({ start: o.offset, end: o.offset + o.width, bottom: 0, top: o.sill });
        if (o.sill + o.height < height)
            pieces.push({ start: o.offset, end: o.offset + o.width, bottom: o.sill + o.height, top: height });
        cursor = o.offset + o.width;
    }
    if (cursor < length)
        pieces.push({ start: cursor, end: length, bottom: 0, top: height });
    return pieces;
}
function physicalTrimIntervals(wall, floor) {
    const intervals = [];
    let start = 0;
    for (const o of floor.openings.filter(o => o.wallId === wall.id && o.sill < 0.03).sort((a, b) => a.offset - b.offset)) {
        if (o.offset - construction_1.CASING_EXTENT - construction_1.TRIM_JAMB_GAP > start)
            intervals.push([start, o.offset - construction_1.CASING_EXTENT - construction_1.TRIM_JAMB_GAP]);
        start = o.offset + o.width + construction_1.CASING_EXTENT + construction_1.TRIM_JAMB_GAP;
    }
    if (start < (0, exports.distance)(wall.a, wall.b))
        intervals.push([start, (0, exports.distance)(wall.a, wall.b)]);
    return intervals;
}
function segmentInside(a, b, polygon) {
    const dx = b.x - a.x, dz = b.z - a.z, cuts = [0, 1];
    for (let j = 0; j < polygon.length; j++) {
        const c = polygon[j], d = polygon[(j + 1) % polygon.length], ex = d.x - c.x, ez = d.z - c.z, denominator = dx * ez - dz * ex;
        if (Math.abs(denominator) < exports.EPS) {
            for (const p of [c, d]) {
                const projected = projectToSegment(p, a, b);
                if (projected.distance < exports.EPS)
                    cuts.push(projected.t);
            }
            continue;
        }
        const cx = c.x - a.x, cz = c.z - a.z, t = (cx * ez - cz * ex) / denominator, u = (cx * dz - cz * dx) / denominator;
        if (t >= -exports.EPS && t <= 1 + exports.EPS && u >= -exports.EPS && u <= 1 + exports.EPS)
            cuts.push(Math.max(0, Math.min(1, t)));
    }
    cuts.sort((x, y) => x - y);
    for (let j = 1; j < cuts.length; j++)
        if (cuts[j] - cuts[j - 1] > exports.EPS &&
            !inside((0, exports.lerp)(a, b, (cuts[j] + cuts[j - 1]) / 2), polygon))
            return false;
    return true;
}
function canPlace(floor, room, item, asset, assets) {
    const revision = assetForItem(item, assets);
    if (!revision || revision.id !== asset.id)
        return `Furniture revision unavailable: ${item.assetId} (${item.assetVersion}). Restore its saved model before changing its geometry.`;
    asset = revision;
    if (asset.placement?.anchor && asset.placement.anchor !== "floor")
        return "This model requires wall attachment. Floor placement is unavailable.";
    const fp = footprint(item, asset);
    if (!fp.every((p) => inside(p, room.polygon)))
        return "Keep the full furniture footprint inside the room and clear of trim.";
    // Split at exact boundary crossings, including polygon vertices. A fixed sample
    // grid or strict-crossing test can miss a U-shaped notch whose corners lie on it.
    if (fp.some((a, i) => !segmentInside(a, fp[(i + 1) % fp.length], room.polygon)))
        return "The footprint crosses a wall.";
    const bottom = asset.bounds.min[1], top = asset.bounds.max[1];
    const heightOverlap = (low, high) => top > low + exports.EPS && bottom < high - exports.EPS;
    for (const wall of floor.walls.filter((w) => w.faces.some((f) => f.roomId === room.id))) {
        const face = wall.faces.find(f => f.roomId === room.id);
        const sign = face.reversed ? -1 : 1, half = wall.thickness / 2;
        for (const piece of physicalWallPieces(wall, floor.openings, room.ceiling ?? floor.ceiling)) {
            const cavity = (piece.cavity ?? 0) / 2;
            if (heightOverlap(piece.bottom, piece.top) && overlaps(fp, wallRectangle(wall, piece.start, piece.end, sign === 1 ? cavity : -half, sign === 1 ? half : -cavity)))
                return "Keep the furniture clear of the physical wall.";
        }
        const trim = room.trimOverrides[wall.id] ?? room.trim;
        if (trim.profile !== "none" && trim.projection > 0 && heightOverlap(0, trim.height))
            for (const [start, end] of physicalTrimIntervals(wall, floor))
                if (overlaps(fp, wallRectangle(wall, start, end, sign === 1 ? half : -half - trim.projection, sign === 1 ? half + trim.projection : -half)))
                    return "Keep the furniture clear of this wall’s baseboard projection.";
        for (const opening of floor.openings.filter(o => o.wallId === wall.id)) {
            // Actual jambs/header project 2cm beyond both finished wall faces.
            const casings = [
                { start: opening.offset - construction_1.CASING_OFFSET - construction_1.CASING_WIDTH / 2, end: opening.offset - construction_1.CASING_OFFSET + construction_1.CASING_WIDTH / 2, bottom: opening.sill, top: opening.sill + opening.height + construction_1.CASING_TOP },
                { start: opening.offset + opening.width + construction_1.CASING_OFFSET - construction_1.CASING_WIDTH / 2, end: opening.offset + opening.width + construction_1.CASING_OFFSET + construction_1.CASING_WIDTH / 2, bottom: opening.sill, top: opening.sill + opening.height + construction_1.CASING_TOP },
                { start: opening.offset - 0.05, end: opening.offset + opening.width + 0.05, bottom: opening.sill + opening.height, top: opening.sill + opening.height + 0.05 },
            ];
            if (casings.some(p => heightOverlap(p.bottom, p.top) && overlaps(fp, wallRectangle(wall, p.start, p.end, -half - 0.02, half + 0.02))))
                return "Keep the furniture clear of the opening frame.";
            if (opening.type === "window" && heightOverlap(opening.sill + 0.03, opening.sill + opening.height - 0.03) && overlaps(fp, wallRectangle(wall, opening.offset + 0.03, opening.offset + opening.width - 0.03, -0.0125, 0.0125)))
                return "Keep the furniture clear of the window glazing.";
            if (heightOverlap(opening.sill, opening.sill + opening.height) && openingMotionEnvelopes(wall, opening).some(envelope => overlaps(fp, envelope)))
                return "Keep the moving door panel area clear.";
        }
    }
    if (top > (room.ceiling ?? floor.ceiling) - 0.02)
        return "This item exceeds the room ceiling height.";
    for (const other of floor.items) {
        if (other.id === item.id || other.roomId !== room.id)
            continue;
        const model = assetForItem(other, assets);
        if (!model)
            return `Furniture revision unavailable: ${other.assetId} (${other.assetVersion}). Restore its saved model before changing room geometry.`;
        if (overlaps(fp, footprint(other, model), 0.005))
            return "Furniture footprints overlap. Choose a clear position.";
    }
    return null;
}
function openingError(floor, opening) {
    const wall = floor.walls.find((w) => w.id === opening.wallId);
    if (!wall)
        return "Choose an existing wall.";
    const len = (0, exports.distance)(wall.a, wall.b);
    const ceiling = Math.min(...wall.faces.map((f) => floor.rooms.find((r) => r.id === f.roomId)?.ceiling ?? floor.ceiling));
    if (![opening.width, opening.height, opening.offset, opening.sill].every(Number.isFinite) ||
        opening.width < 0.3 ||
        opening.height < 0.3 ||
        opening.sill < 0 ||
        opening.offset < 0.08 ||
        opening.offset + opening.width > len - 0.08 + exports.EPS)
        return "Opening needs at least 8 cm of wall at both corners.";
    if (opening.sill + opening.height > ceiling - 0.05)
        return "Opening exceeds the lowest ceiling on this wall.";
    if (floor.openings.some((o) => o.id !== opening.id &&
        o.wallId === opening.wallId &&
        Math.max(o.offset, opening.offset) <
            Math.min(o.offset + o.width, opening.offset + opening.width) + 0.08))
        return "This opening overlaps another opening or its frame.";
    if (opening.type === "pocket" &&
        (wall.thickness < 0.15 ||
            (opening.hinge === "left"
                ? opening.offset
                : len - opening.offset - opening.width) <
                opening.width + 0.08))
        return "Pocket doors need a ≥15 cm wall and an unobstructed full-width pocket beside the opening.";
    if (opening.type === "sliding" &&
        (opening.hinge === "left"
            ? opening.offset
            : len - opening.offset - opening.width) < opening.width)
        return "A sliding door needs a full-width clear travel section beside it.";
    if (opening.type === "pocket" || opening.type === "sliding") {
        const start = opening.hinge === "left"
            ? opening.offset - opening.width
            : opening.offset + opening.width, end = start + opening.width;
        if (floor.openings.some((o) => o.id !== opening.id &&
            o.wallId === wall.id &&
            Math.max(o.offset, start) <
                Math.min(o.offset + o.width, end) + 0.08 &&
            Math.max(o.sill, opening.sill) <
                Math.min(o.sill + o.height, opening.sill + opening.height)))
            return opening.type === "pocket"
                ? "The required pocket cavity intersects another opening."
                : "The sliding panel travel section intersects another opening.";
    }
    return null;
}
/** Distances along a canonical wall to the actual corners of one room face.
 * A shared topology segment may cover only part of that room boundary. */
function wallFaceSpan(floor, wall, roomId) {
    const len = (0, exports.distance)(wall.a, wall.b);
    const room = floor.rooms.find((r) => r.id === roomId);
    if (room && len > exports.EPS)
        for (let i = 0; i < room.polygon.length; i++) {
            const a = room.polygon[i], b = room.polygon[(i + 1) % room.polygon.length];
            if (projectToSegment(wall.a, a, b).distance < exports.EPS &&
                projectToSegment(wall.b, a, b).distance < exports.EPS) {
                const ux = (wall.b.x - wall.a.x) / len, uz = (wall.b.z - wall.a.z) / len;
                const first = (a.x - wall.a.x) * ux + (a.z - wall.a.z) * uz;
                const second = (b.x - wall.a.x) * ux + (b.z - wall.a.z) * uz;
                return { low: Math.min(first, second), high: Math.max(first, second) };
            }
        }
    return { low: 0, high: len };
}
function lineIntersection(a, b, c, d) {
    const ux = b.x - a.x, uz = b.z - a.z, vx = d.x - c.x, vz = d.z - c.z;
    const cross = ux * vz - uz * vx;
    if (Math.abs(cross) < 1e-10)
        return null;
    const t = ((c.x - a.x) * vz - (c.z - a.z) * vx) / cross;
    return { x: a.x + t * ux, z: a.z + t * uz };
}
function insideSegments(floor, room) {
    const winding = (0, exports.area)(room.polygon) < 0 ? -1 : 1;
    return room.polygon.flatMap((a, i) => {
        const b = room.polygon[(i + 1) % room.polygon.length], length = (0, exports.distance)(a, b);
        const ux = (b.x - a.x) / length, uz = (b.z - a.z) / length;
        const walls = floor.walls.filter(w => w.faces.some(f => f.roomId === room.id) && projectToSegment(w.a, a, b).distance < exports.EPS && projectToSegment(w.b, a, b).distance < exports.EPS)
            .map(w => {
            const first = (w.a.x - a.x) * ux + (w.a.z - a.z) * uz;
            const second = (w.b.x - a.x) * ux + (w.b.z - a.z) * uz;
            const point = (t) => ({ x: a.x + t * ux - uz * winding * w.thickness / 2, z: a.z + t * uz + ux * winding * w.thickness / 2 });
            return { low: Math.min(first, second), a: point(Math.min(first, second)), b: point(Math.max(first, second)) };
        }).sort((p, q) => p.low - q.low);
        if (!walls.length)
            throw new Error("Room wall references are unavailable.");
        return walls.map(({ a, b }) => ({ a, b }));
    });
}
/** Joined inside wall-face outline; trim is measured separately.
 * V1 stored polygons remain wall reference lines. No load-time coordinate migration. */
function roomInsideOutline(floor, room) {
    const segments = insideSegments(floor, room);
    const joins = segments.map((current, i) => {
        const previous = segments[(i + segments.length - 1) % segments.length];
        const intersection = lineIntersection(previous.a, previous.b, current.a, current.b);
        return intersection ? [intersection] : (0, exports.distance)(previous.b, current.a) < exports.EPS ? [current.a] : [previous.b, current.a];
    });
    for (let i = 0; i < segments.length; i++) {
        const start = joins[i][joins[i].length - 1], end = joins[(i + 1) % joins.length][0], segment = segments[i];
        if ((end.x - start.x) * (segment.b.x - segment.a.x) + (end.z - start.z) * (segment.b.z - segment.a.z) < -exports.EPS)
            throw new Error("Wall thickness leaves no valid inside room span.");
    }
    return joins.flat();
}
function roomInsideDimensions(floor, room) {
    const box = (0, exports.bounds)(roomInsideOutline(floor, room));
    return { width: box.maxX - box.minX, depth: box.maxZ - box.minZ, bounds: box };
}
/** Explicit new orthogonal-room input conversion. Origins remain wall references. */
function newRoomReferenceDimensions(width, depth, wallThickness = 0.12) {
    return { width: width + wallThickness, depth: depth + wallThickness };
}
/** Solve an affine reference-outline resize for requested inside-face spans.
 * Existing untouched reference sizes return exactly, avoiding unit-roundtrip drift. */
function referenceDimensionsForInside(floor, room, width, depth) {
    if (![width, depth].every(Number.isFinite) || width <= 0 || depth <= 0)
        throw new Error("Use positive finite inside dimensions.");
    const original = (0, exports.bounds)(room.polygon), oldWidth = original.maxX - original.minX, oldDepth = original.maxZ - original.minZ;
    const initial = roomInsideDimensions(floor, room);
    if (Math.abs(initial.width - width) < 1e-8 && Math.abs(initial.depth - depth) < 1e-8)
        return { width: oldWidth, depth: oldDepth };
    const evaluate = (w, d) => {
        const map = (p) => ({ x: original.minX + (p.x - original.minX) * w / oldWidth, z: original.minZ + (p.z - original.minZ) * d / oldDepth });
        const nextRoom = { ...room, polygon: room.polygon.map(map) };
        const nextFloor = { ...floor, walls: floor.walls.map(wall => wall.faces.some(face => face.roomId === room.id) ? { ...wall, a: map(wall.a), b: map(wall.b) } : wall) };
        return roomInsideDimensions(nextFloor, nextRoom);
    };
    let w = oldWidth + width - initial.width, d = oldDepth + depth - initial.depth;
    for (let i = 0; i < 16; i++) {
        if (!(w > 0 && d > 0 && Number.isFinite(w) && Number.isFinite(d)))
            break;
        const actual = evaluate(w, d), errorX = width - actual.width, errorZ = depth - actual.depth;
        if (Math.abs(errorX) < 1e-7 && Math.abs(errorZ) < 1e-7)
            return { width: w, depth: d };
        const delta = 1e-4, x = evaluate(w + delta, d), z = evaluate(w, d + delta);
        const ax = (x.width - actual.width) / delta, az = (x.depth - actual.depth) / delta;
        const bx = (z.width - actual.width) / delta, bz = (z.depth - actual.depth) / delta;
        const determinant = ax * bz - bx * az;
        if (Math.abs(determinant) < 1e-10)
            break;
        w += (errorX * bz - bx * errorZ) / determinant;
        d += (ax * errorZ - errorX * az) / determinant;
    }
    throw new Error("These inside dimensions cannot be applied to this outline.");
}
/** Actual inside-face corner chain, distinct from the retained reference span. */
function wallFaceInsideSpan(floor, wall, roomId) {
    const room = floor.rooms.find(r => r.id === roomId);
    if (!room)
        throw new Error("Room face is unavailable.");
    const winding = (0, exports.area)(room.polygon) < 0 ? -1 : 1;
    const index = room.polygon.findIndex((a, i) => projectToSegment(wall.a, a, room.polygon[(i + 1) % room.polygon.length]).distance < exports.EPS && projectToSegment(wall.b, a, room.polygon[(i + 1) % room.polygon.length]).distance < exports.EPS);
    if (index < 0)
        throw new Error("Wall face does not belong to the room boundary.");
    const edge = (i, atEnd, thickness) => {
        const a = room.polygon[(i + room.polygon.length) % room.polygon.length], b = room.polygon[(i + 1 + room.polygon.length) % room.polygon.length];
        const touching = floor.walls.find(w => w.faces.some(f => f.roomId === roomId) && ((0, exports.distance)(w.a, atEnd ? b : a) < exports.EPS || (0, exports.distance)(w.b, atEnd ? b : a) < exports.EPS) && projectToSegment(w.a, a, b).distance < exports.EPS && projectToSegment(w.b, a, b).distance < exports.EPS);
        const inset = (thickness ?? touching?.thickness ?? wall.thickness) / 2, length = (0, exports.distance)(a, b);
        const offset = { x: -(b.z - a.z) / length * winding * inset, z: (b.x - a.x) / length * winding * inset };
        return { a: { x: a.x + offset.x, z: a.z + offset.z }, b: { x: b.x + offset.x, z: b.z + offset.z } };
    };
    const current = edge(index, false, wall.thickness), previous = edge(index - 1, true), next = edge(index + 1, false);
    const first = lineIntersection(previous.a, previous.b, current.a, current.b) ?? current.a;
    const last = lineIntersection(current.a, current.b, next.a, next.b) ?? current.b;
    const length = (0, exports.distance)(wall.a, wall.b), ux = (wall.b.x - wall.a.x) / length, uz = (wall.b.z - wall.a.z) / length;
    const a = (first.x - wall.a.x) * ux + (first.z - wall.a.z) * uz, b = (last.x - wall.a.x) * ux + (last.z - wall.a.z) * uz;
    return { low: Math.min(a, b), high: Math.max(a, b), normalOffset: (wall.faces.find(f => f.roomId === roomId).reversed ? -1 : 1) * wall.thickness / 2 };
}
function openingInsideDimensions(floor, opening) {
    const wall = floor.walls.find(w => w.id === opening.wallId);
    if (!wall)
        return [];
    return wall.faces.map(face => {
        const span = wallFaceInsideSpan(floor, wall, face.roomId);
        const before = opening.offset - span.low, after = span.high - opening.offset - opening.width;
        return { roomId: face.roomId, name: floor.rooms.find(r => r.id === face.roomId)?.name ?? "Room", before: face.reversed ? after : before, after: face.reversed ? before : after };
    });
}
function openingDimensions(floor, opening) {
    const wall = floor.walls.find((w) => w.id === opening.wallId);
    if (!wall)
        return [];
    return wall.faces.map((face) => {
        const room = floor.rooms.find((r) => r.id === face.roomId);
        const { low, high } = wallFaceSpan(floor, wall, face.roomId);
        const before = opening.offset - low, after = high - opening.offset - opening.width;
        return {
            roomId: face.roomId,
            name: room?.name ?? "Room",
            before: face.reversed ? after : before,
            after: face.reversed ? before : after,
        };
    });
}
function shapePolygon(shape, width, depth, origin = { x: 0, z: 0 }) {
    const p = shape === "l"
        ? [
            { x: 0, z: 0 },
            { x: width, z: 0 },
            { x: width, z: depth * 0.5 },
            { x: width * 0.55, z: depth * 0.5 },
            { x: width * 0.55, z: depth },
            { x: 0, z: depth },
        ]
        : [
            { x: 0, z: 0 },
            { x: width, z: 0 },
            { x: width, z: depth },
            { x: 0, z: depth },
        ];
    return p.map((v) => ({ x: v.x + origin.x, z: v.z + origin.z }));
}
const toDisplay = (metres, unit) => unit === "ft" ? metres / 0.3048 : metres;
exports.toDisplay = toDisplay;
const toMetres = (value, unit) => unit === "ft" ? value * 0.3048 : value;
exports.toMetres = toMetres;
function measure(value, unit) {
    if (unit === "m")
        return `${value.toFixed(2)} m`;
    const inches = Math.round(value / 0.0254);
    return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}
