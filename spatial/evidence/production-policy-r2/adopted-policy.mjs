const finite = (v) => Number.isFinite(v);
const validPoint = (p) => finite(p.x) && finite(p.z);
const vector = (x, y, z) => ({ x, y, z });
const requireFinite = (v, name) => {
    if (![v.x, v.y, v.z].every(finite))
        throw new Error(`${name} must be finite`);
};
export function unionBounds(boxes) {
    if (!boxes.length)
        return null;
    return {
        min: vector(Math.min(...boxes.map((b) => b.min.x)), Math.min(...boxes.map((b) => b.min.y)), Math.min(...boxes.map((b) => b.min.z))),
        max: vector(Math.max(...boxes.map((b) => b.max.x)), Math.max(...boxes.map((b) => b.max.y)), Math.max(...boxes.map((b) => b.max.z))),
    };
}
export function boundsFromPoints(points) {
    for (const p of points)
        requireFinite(p, "Bounds point");
    return unionBounds(points.map((p) => ({ min: p, max: p })));
}
export function boundsCorners(b) {
    return [b.min.x, b.max.x].flatMap((x) => [b.min.y, b.max.y].flatMap((y) => [b.min.z, b.max.z].map((z) => vector(x, y, z))));
}
export function canonicalFloorOffset(floor) {
    const offset = vector(floor.alignment.x, floor.elevation, floor.alignment.z);
    requireFinite(offset, `Floor ${floor.id} alignment/elevation`);
    return offset;
}
export function floorToWorld(local, offset) {
    return vector(local.x + offset.x, local.y + offset.y, local.z + offset.z);
}
export function worldToFloor(world, offset) {
    return vector(world.x - offset.x, world.y - offset.y, world.z - offset.z);
}
/** Rotate the model's local AABB corners: conservative world bounds for framing.
 * This encloses the transformed mesh but is not its exact vertex-tight world AABB. */
export function itemWorldBounds(item, asset, offset) {
    if (asset.id !== item.assetId ||
        asset.version !== item.assetVersion ||
        asset.sha256 !== item.assetHash)
        throw new Error(`Exact saved asset identity unresolved for ${item.id}`);
    if (asset.bounds.min.length !== 3 || asset.bounds.max.length !== 3)
        throw new Error(`Invalid asset bounds for ${item.id}`);
    const lo = asset.bounds.min, hi = asset.bounds.max;
    if ([...lo, ...hi, item.x, item.z, item.yaw, item.elevation ?? 0].some((n) => !finite(n)) ||
        lo.some((v, i) => v > hi[i]))
        throw new Error(`Invalid item pose/bounds for ${item.id}`);
    const c = Math.cos(item.yaw), s = Math.sin(item.yaw);
    const points = [lo[0], hi[0]].flatMap((x) => [lo[1], hi[1]].flatMap((y) => [lo[2], hi[2]].map((z) => floorToWorld(vector(item.x + c * x + s * z, (item.elevation ?? 0) + y, item.z - s * x + c * z), offset))));
    return boundsFromPoints(points);
}
/** Cheap camera-dependent policy, reusable separately from the static scene/bounds plan. */
export function physicalWallPlan(floor, wall, rooms, offset, request) {
    const faces = wall.faces.filter((f) => rooms.has(f.roomId));
    if (!faces.length)
        return null;
    const key = `${floor.id}:${wall.id}`, visibleRoomIds = faces.map((f) => f.roomId);
    const result = (visible, reason) => ({
        id: wall.id,
        key,
        visible,
        reason,
        visibleRoomIds,
    });
    if (request.mode === "walk" || request.shell === "solid")
        return result(true, "solid");
    if (request.forceVisibleWallKeys?.includes(key))
        return result(true, "forced");
    // Hide or show a whole physical boundary wall: its faces, trim, jambs and opening frame agree.
    // A partition between two displayed rooms remains real and cannot vanish just by orbiting.
    if (faces.length >= 2)
        return result(true, "interior-partition");
    const dx = wall.b.x - wall.a.x, dz = wall.b.z - wall.a.z, length = Math.hypot(dx, dz);
    if (length < 1e-8 || !validPoint(wall.a) || !validPoint(wall.b))
        throw new Error(`Invalid wall ${key}`);
    const sign = faces[0].reversed ? -1 : 1;
    const nx = (-dz / length) * sign, nz = (dx / length) * sign;
    const signed = (request.camera.x - offset.x - (wall.a.x + wall.b.x) / 2) * nx +
        (request.camera.z - offset.z - (wall.a.z + wall.b.z) / 2) * nz;
    const epsilon = request.wallHysteresisMetres ?? 0.03;
    if (!finite(epsilon) || epsilon < 0)
        throw new Error("Invalid wall hysteresis");
    if (Math.abs(signed) <= epsilon)
        return result(request.previousWallVisibility?.[key] ?? true, "hysteresis");
    return result(signed > 0, signed > 0 ? "far-boundary" : "near-boundary");
}
export function createScenePlan(project, resolve, request) {
    requireFinite(request.camera, "Camera");
    const requestedRoomId = request.scope.kind === "room" ? request.scope.roomId : undefined;
    const active = project.floors.find((f) => f.id === request.activeFloorId);
    if (!active)
        throw new Error("Active floor is missing");
    if (request.scope.kind === "room" &&
        !active.rooms.some((r) => r.id === requestedRoomId))
        throw new Error("Active room is missing");
    const gap = request.separatedFloorGap ?? 0;
    if (!finite(gap) || gap < 0 || gap > 20)
        throw new Error("Floor separation must be between 0 and 20 metres");
    const ordered = [...project.floors].sort((a, b) => a.elevation - b.elevation || a.id.localeCompare(b.id));
    const visible = ordered.filter((f) => request.mode === "walk"
        ? f.id === active.id
        : !request.hiddenFloorIds?.includes(f.id) &&
            (request.scope.kind === "house" || f.id === active.id));
    const floors = [], canonicalBoxes = [], displayBoxes = [], warnings = [];
    let selected = null;
    for (const floor of visible) {
        const canonical = canonicalFloorOffset(floor);
        const separated = request.scope.kind === "house" && request.mode !== "walk"
            ? ordered.indexOf(floor) * gap
            : 0;
        const display = vector(canonical.x, canonical.y + separated, canonical.z);
        const rooms = floor.rooms.filter((r) => request.mode === "walk" ||
            request.scope.kind !== "room" ||
            r.id === requestedRoomId);
        const roomIds = new Set(rooms.map((r) => r.id));
        for (const room of rooms) {
            const h = room.ceiling ?? floor.ceiling;
            if (!finite(h) ||
                h <= 0 ||
                room.polygon.length < 3 ||
                !room.polygon.every(validPoint))
                throw new Error(`Invalid room ${room.id}`);
            // Include slab below the floor, mixed ceiling heights and wall thickness in framing.
            const boundaryWalls = floor.walls.filter((w) => w.faces.some((f) => f.roomId === room.id));
            const thickness = Math.max(0, ...boundaryWalls.map((w) => w.thickness / 2));
            // A physical shared wall may reach a taller neighbouring room even when that room is hidden.
            const wallTop = Math.max(h, ...boundaryWalls.flatMap((w) => w.faces.map((face) => floor.rooms.find((r) => r.id === face.roomId)?.ceiling ??
                floor.ceiling)));
            for (const [offset, boxes] of [
                [canonical, canonicalBoxes],
                [display, displayBoxes],
            ]) {
                const b = boundsFromPoints(room.polygon.flatMap((p) => [-0.16, wallTop].map((y) => floorToWorld(vector(p.x, y, p.z), offset))));
                boxes.push({
                    min: vector(b.min.x - thickness, b.min.y, b.min.z - thickness),
                    max: vector(b.max.x + thickness, b.max.y, b.max.z + thickness),
                });
            }
        }
        const items = floor.items.filter((i) => roomIds.has(i.roomId));
        for (const item of items) {
            const asset = resolve(item);
            if (!asset) {
                warnings.push(`Exact saved asset unavailable: ${item.id} (${item.assetId}@${item.assetVersion}/${item.assetHash})`);
                continue;
            }
            const c = itemWorldBounds(item, asset, canonical), d = itemWorldBounds(item, asset, display);
            canonicalBoxes.push(c);
            displayBoxes.push(d);
            if (item.id === request.selectedItemId)
                selected = d;
        }
        floors.push({
            id: floor.id,
            canonicalOffset: canonical,
            displayOffset: display,
            presentationOffsetY: separated,
            roomIds: [...roomIds],
            walls: floor.walls
                .map((w) => physicalWallPlan(floor, w, roomIds, display, request))
                .filter((w) => w !== null),
            ceilingsVisible: request.mode === "walk" ||
                (request.showCeilings ?? request.shell === "solid"),
            itemIds: items.map((i) => i.id),
        });
    }
    const reason = request.mode === "walk"
        ? "walk"
        : request.scope.kind === "house"
            ? "house-overview"
            : !visible.some((f) => f.id === active.id)
                ? "active-floor-hidden"
                : null;
    return {
        floors,
        canonicalBounds: unionBounds(canonicalBoxes),
        displayBounds: unionBounds(displayBoxes),
        selectedItemBounds: selected,
        canEdit: reason === null,
        readOnlyReason: reason,
        warnings,
    };
}
