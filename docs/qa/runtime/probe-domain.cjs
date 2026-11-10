/* Independent QA: loads TypeScript in memory; never writes into mobile/. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const mobile = path.join(root, 'mobile');
const local = createRequire(path.join(mobile, 'package.json'));
const ts = local('typescript');
const modules = new Map();
const sources = {};
function load(file) {
  const absolute = path.resolve(mobile, file);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  if (absolute.endsWith('.json')) return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  const text = fs.readFileSync(absolute, 'utf8');
  sources[path.relative(root, absolute).replaceAll('\\', '/')] = crypto.createHash('sha256').update(text).digest('hex');
  const compiled = ts.transpileModule(text, { fileName: absolute, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  modules.set(absolute, module);
  const requireSource = id => {
    if (!id.startsWith('.')) return local(id);
    const candidate = path.resolve(path.dirname(absolute), id);
    for (const suffix of ['', '.ts', '.tsx', '.json']) if (fs.existsSync(candidate + suffix) && fs.statSync(candidate + suffix).isFile()) return load(candidate + suffix);
    throw Error(`Cannot resolve ${id} from ${absolute}`);
  };
  new Function('require', 'module', 'exports', '__filename', '__dirname', compiled)(requireSource, module, module.exports, absolute, path.dirname(absolute));
  return module.exports;
}
const p = load('src/domain/project.ts');
const g = load('src/domain/geometry.ts');
const storage = load('src/domain/persistence.ts');
const t = load('src/domain/types.ts');
const meshes = load('src/scene/meshes.ts');
const rawAssets = load('src/catalogue/assets.json');
const testAsset = { ...rawAssets[0], id: 'qa-box', name: 'QA collision fixture (not furniture)', dimensionsMetres: { width: .2, depth: .2, height: .5 }, bounds: { min: [-.1, 0, -.1], max: [.1, .5, .1] } };
const assets = [testAsset];
const history = project => ({ past: [], present: project, future: [] });
const item = (roomId, x, z) => ({ id: 'qa-item', roomId, assetId: testAsset.id, assetVersion: testAsset.version, assetHash: testAsset.sha256, x, z, yaw: 0, locked: false, materialOverrides: {} });
const checks = [];
function check(id, title, expected, run) {
  try {
    const result = run();
    checks.push({ id, title, expected, pass: result.pass, observed: result.observed });
  } catch (e) { checks.push({ id, title, expected, pass: false, harnessError: String(e), stack: e.stack }); }
}
function adjacent() {
  const project = p.makeProject('living', 4, 4);
  const f = project.floors[0];
  f.rooms.push(p.makeRoom('kitchen', 'Kitchen', g.shapePolygon('rectangle', 4, 4, { x: 4, z: 0 })));
  f.walls = g.rebuildWalls(f.rooms);
  return { project, f, a: f.rooms[0], b: f.rooms[1], shared: f.walls.find(w => w.faces.length === 2) };
}
check('WALL-ISOLATION', 'Paint changes one room-facing side only', 'Adjacent room finish remains unchanged.', () => {
  const { project, f, a, b, shared } = adjacent();
  const finish = { colour: '#ef1234', sheen: 'satin', texture: 'paint' };
  const r = p.execute(history(project), { type: 'wall-finish', floorId: f.id, roomId: a.id, wallId: shared.id, finish }, '3d', assets);
  const next = r.history.present.floors[0];
  return { pass: !r.error && next.rooms[0].wallFaces[shared.id]?.colour === finish.colour && !next.rooms[1].wallFaces[shared.id], observed: { error: r.error, painted: next.rooms[0].wallFaces[shared.id], otherFace: next.rooms[1].wallFaces[shared.id] ?? 'default' } };
});
check('WALK-GUARD', 'Command layer rejects edits and history travel in Walk', 'All command families and undo/redo preserve the exact history.', () => {
  const project = p.makeProject('living'), f = project.floors[0], room = f.rooms[0], h = history(project), i = item(room.id, 1, 1);
  f.items.push(i);
  const commands = [
    { type: 'rename', name: 'Changed' }, { type: 'add-item', floorId: f.id, item: i }, { type: 'transform', floorId: f.id, itemId: i.id, x: 2, z: 2, yaw: 1 }, { type: 'lock', floorId: f.id, itemId: i.id, locked: true }, { type: 'delete-item', floorId: f.id, itemId: i.id, intentional: true }, { type: 'item-material', floorId: f.id, itemId: i.id, slot: 'wood', colour: '#ffffff' }, { type: 'floor-finish', floorId: f.id, roomId: room.id, finish: { id: 'slate', repeat: 2, angle: 0 } }, { type: 'wall-finish', floorId: f.id, roomId: room.id, wallId: 'all', finish: { ...t.defaultWall, colour: '#123456' } }, { type: 'trim', floorId: f.id, roomId: room.id, trim: t.defaultTrim }, { type: 'room-dimensions', floorId: f.id, roomId: room.id, width: 5, depth: 4, ceiling: 3 }, { type: 'room-polygon', floorId: f.id, roomId: room.id, polygon: g.shapePolygon('rectangle', 5, 5) }, { type: 'add-room', floorId: f.id, room }, { type: 'add-floor', floor: p.makeFloor() }, { type: 'floor-settings', floorId: f.id, name: 'Changed', elevation: 3, ceiling: 3, alignment: { x: 0, z: 0 } }, { type: 'delete-opening', floorId: f.id, openingId: 'missing' }, { type: 'opening', floorId: f.id, opening: { id: 'qa-door', wallId: f.walls[0].id, offset: 1, width: .8, height: 2, sill: 0, type: 'single', hinge: 'left', flip: false } }, { type: 'wall-thickness', floorId: f.id, wallId: f.walls[0].id, thickness: .15 }
  ];
  const failed = commands.filter(c => { const r = p.execute(h, c, 'walk', assets); return r.history !== h || !r.error; }).map(c => c.type);
  for (const dir of ['undo', 'redo']) { const r = p.travelHistory(h, dir, 'walk'); if (r.history !== h || !r.error) failed.push(dir); }
  return { pass: !failed.length, observed: { commandFamilies: commands.length, historyDirections: 2, failed } };
});
check('LOCK-GUARD', 'Locked items reject move/rotation; lock is undoable', 'Transform fails and undo restores unlocked state.', () => {
  const project = p.makeProject('living'), f = project.floors[0], i = item(f.rooms[0].id, 1, 1); f.items.push(i);
  const locked = p.execute(history(project), { type: 'lock', floorId: f.id, itemId: i.id, locked: true }, '2d', assets);
  const moved = p.execute(locked.history, { type: 'transform', floorId: f.id, itemId: i.id, x: 2, z: 2, yaw: 1 }, '3d', assets);
  const undone = p.travelHistory(locked.history, 'undo', '2d');
  return { pass: !locked.error && !!moved.error && moved.history === locked.history && !undone.history.present.floors[0].items[0].locked, observed: { lockError: locked.error, moveError: moved.error, undoneLocked: undone.history.present.floors[0].items[0].locked } };
});
check('UNITS-ROUNDTRIP', 'Display conversion preserves metre values', 'Metre→feet→metre has less than 1e-10 error.', () => {
  let maxError = 0; for (let n = 1; n <= 2000; n++) { const v = n / 31; maxError = Math.max(maxError, Math.abs(v - g.toMetres(g.toDisplay(v, 'ft'), 'ft'))); }
  return { pass: maxError < 1e-10, observed: { values: 2000, maxError } };
});
check('ROOM-OVERLAP-EDIT', 'Editing a room outline cannot overlap another room', 'Command rejects an expanded polygon crossing the neighbour.', () => {
  const { project, f, a } = adjacent();
  const r = p.execute(history(project), { type: 'room-polygon', floorId: f.id, roomId: a.id, polygon: g.shapePolygon('rectangle', 6, 4) }, '2d', assets);
  return { pass: !!r.error, observed: { error: r.error, neighbourOverlapAccepted: !r.error } };
});
check('CONCAVE-NOTCH', 'A room can occupy an L-shaped room’s empty notch', 'Disjoint polygons are not treated as overlapping.', () => {
  const l = g.shapePolygon('l', 6, 6), notch = g.shapePolygon('rectangle', 2, 2, { x: 3.6, z: 3.5 });
  const overlap = g.overlaps(l, notch);
  return { pass: !overlap, observed: { overlap, notchCornersInsideL: notch.map(v => g.inside(v, l)) } };
});
check('WALL-SPLIT-OPENING', 'Adding an adjacent room retains physically unaffected openings', 'Splitting a wall remaps its existing opening to the surviving segment.', () => {
  const project = p.makeProject('living', 4, 4), f = project.floors[0];
  const wall = f.walls.find(w => w.a.x === 4 && w.b.x === 4);
  f.openings.push({ id: 'qa-door', wallId: wall.id, type: 'open', offset: 2.5, width: .8, height: 2.1, sill: 0, hinge: 'left', flip: false });
  const room = p.makeRoom('kitchen', 'Kitchen', g.shapePolygon('rectangle', 3, 1.5, { x: 4, z: 0 }));
  const r = p.execute(history(project), { type: 'add-room', floorId: f.id, room }, '2d', assets);
  return { pass: !r.error && r.history.present.floors[0].openings.length === 1, observed: { error: r.error, roomAdditionAccepted: !r.error } };
});
check('RESIZE-WALL-FINISH', 'Resizing preserves the finish on the corresponding wall face', 'Paint survives a width change.', () => {
  const project = p.makeProject('living', 4, 4), f = project.floors[0], room = f.rooms[0], wall = f.walls.find(w => w.a.x === 4 && w.b.x === 4);
  room.wallFaces[wall.id] = { colour: '#123456', texture: 'paint', sheen: 'satin' };
  const r = p.execute(history(project), { type: 'room-dimensions', floorId: f.id, roomId: room.id, width: 5, depth: 4, ceiling: null }, '2d', assets);
  const next = r.history.present.floors[0], movedWall = next.walls.find(w => w.a.x === 5 && w.b.x === 5), finish = next.rooms[0].wallFaces[movedWall?.id];
  return { pass: !r.error && finish?.colour === '#123456', observed: { error: r.error, correspondingFinish: finish ?? 'default', orphanedFinishIds: Object.keys(next.rooms[0].wallFaces).filter(id => !next.walls.some(w => w.id === id)) } };
});
check('DOOR-SWING-SIDE', 'Door swing collision respects the selected swing side', 'A door opening into room A leaves the corresponding area in room B available.', () => {
  const { f, a, b, shared } = adjacent();
  const o = { id: 'qa-door', wallId: shared.id, type: 'single', offset: 1, width: 1, height: 2.1, sill: 0, hinge: 'left', flip: false }; f.openings.push(o);
  const inA = g.canPlace(f, a, item(a.id, 3.5, 1.5), testAsset, assets), inB = g.canPlace(f, b, item(b.id, 4.5, 1.5), testAsset, assets);
  o.flip = true;
  const flippedA = g.canPlace(f, a, item(a.id, 3.5, 1.5), testAsset, assets), flippedB = g.canPlace(f, b, item(b.id, 4.5, 1.5), testAsset, assets);
  return { pass: inA !== flippedA && inB !== flippedB, observed: { inA, inB, flippedA, flippedB } };
});
check('WALK-THROUGH-OPENING', 'Walk can cross a valid shared open doorway', 'Path crosses from room A to room B through its opening.', () => {
  const { f, a, shared } = adjacent();
  f.openings.push({ id: 'qa-door', wallId: shared.id, type: 'open', offset: 1, width: 1.4, height: 2.1, sill: 0, hinge: 'left', flip: false });
  const result = p.walkMove(f, a.id, { x: 3.5, z: 1.5 }, { x: 4.5, z: 1.5 }, assets);
  return { pass: result.x > 4, observed: result };
});
check('ADD-FLOOR-VALIDATION', 'New-floor input cannot create an unsaveable project', 'Reject non-finite geometry before mutating history.', () => {
  const project = p.makeProject('living'), floor = p.makeFloor('Invalid floor', NaN); floor.rooms.push(p.makeRoom('bedroom', 'Bedroom', g.shapePolygon('rectangle', 4, 4))); floor.walls = g.rebuildWalls(floor.rooms);
  const r = p.execute(history(project), { type: 'add-floor', floor }, '2d', assets);
  return { pass: !!r.error, observed: { error: r.error, accepted: !r.error, validProject: storage.validProject(r.history.present) } };
});
check('TRIM-OVERRIDE-CLEARANCE', 'Per-wall trim projection participates in furniture clearance', 'An item crossing the selected wall’s thick baseboard is rejected.', () => {
  const project = p.makeProject('living', 4, 4), f = project.floors[0], r = f.rooms[0]; r.trim = { ...r.trim, profile: 'none' }; const wall = f.walls.find(w => w.a.x === 0 && w.b.x === 0); r.trimOverrides[wall.id] = { ...t.defaultTrim, projection: .08 };
  const error = g.canPlace(f, r, item(r.id, .12, 2), testAsset, assets);
  return { pass: !!error, observed: { error, fixtureMinimumX: .02, trimProjection: .08 } };
});
check('CREATE-INVALID-POLYGON', 'Creation rejects a self-crossing nonzero-area outline', 'Invalid drawn room cannot enter a project.', () => {
  const polygon = [{ x: 0, z: 0 }, { x: 4, z: 3 }, { x: 0, z: 4 }, { x: 3, z: 0 }];
  try { const project = p.makeProject('living', 4, 4, 2.7, 'draw', polygon); return { pass: g.validPolygon(project.floors[0].rooms[0].polygon), observed: { invalidAccepted: !g.validPolygon(project.floors[0].rooms[0].polygon), algebraicArea: g.area(polygon), projectSaveable: storage.validProject(project) } }; }
  catch (e) { return { pass: true, observed: { rejected: String(e) } }; }
});
check('POCKET-TRAVEL-HOLE', 'A pocket cannot occupy another opening', 'Reject a pocket whose required wall cavity intersects a window.', () => {
  const project = p.makeProject('living', 8, 4), f = project.floors[0], wall = f.walls.find(w => w.a.z === 0 && w.b.z === 0); wall.thickness = .2;
  f.openings.push({ id: 'qa-window', wallId: wall.id, type: 'window', offset: 2.8, width: .8, height: 1.2, sill: .5, hinge: 'left', flip: false });
  const opening = { id: 'qa-pocket', wallId: wall.id, type: 'pocket', offset: 4, width: 1, height: 2.1, sill: 0, hinge: 'left', flip: false };
  const error = g.openingError(f, opening);
  return { pass: !!error, observed: { error, pocketTravel: [3, 4], existingWindow: [2.8, 3.6] } };
});
check('FOOTPRINT-VERTEX-CROSSING', 'A footprint cannot bridge a concave notch through boundary vertices', 'Reject a rectangle covering the empty middle of a U-shaped room.', () => {
  const polygon = [{x:0,z:0},{x:6,z:0},{x:6,z:6},{x:4,z:6},{x:4,z:2},{x:2,z:2},{x:2,z:6},{x:0,z:6}];
  const project = p.makeProject('living', 6, 6, 2.7, 'draw', polygon), f=project.floors[0], r=f.rooms[0]; r.trim.profile='none';
  const wide = {...testAsset, dimensionsMetres:{width:4,depth:4,height:.5}, bounds:{min:[-2,0,-2],max:[2,.5,2]}};
  const i={...item(r.id,3,4)};const error=g.canPlace(f,r,i,wide,[wide]);
  return {pass:!!error,observed:{error,footprintCorners:g.footprint(i,wide)}};
});
check('TRIM-PROFILES', 'Baseboards have distinct profile geometry', 'All four profile families create nonempty different meshes.', () => {
  const variants = ['flat', 'bevel', 'ogee', 'stepped'].map(profile => { const mesh = meshes.trimGeometry({ ...t.defaultTrim, profile }, 2); const buffer = Buffer.from(mesh.attributes.position.array.buffer); const r = { profile, vertices: mesh.attributes.position.count, digest: crypto.createHash('sha256').update(buffer).digest('hex') }; mesh.dispose(); return r; });
  return { pass: new Set(variants.map(v => v.digest)).size === 4 && variants.every(v => v.vertices > 0), observed: variants };
});
check('OPENING-GEOMETRY', 'Wall geometry leaves a real door opening', 'No piece covers the opening interior.', () => {
  const { f, shared } = adjacent(), o = { id: 'qa-door', wallId: shared.id, type: 'open', offset: 1, width: 1, height: 2, sill: 0, hinge: 'left', flip: false };
  const pieces = meshes.wallPieces(shared, [o], 2.7);
  const covered = pieces.some(p => p.start < 1.5 && p.end > 1.5 && p.bottom < 1 && p.top > 1);
  return { pass: !covered && pieces.length > 0, observed: { covered, pieces } };
});
async function asyncChecks() {
  const library = { version: 1, projects: [history(p.makeProject('living'))], activeId: null, favourites: [], recent: [], settings: { unit: 'm', grid: true, quickMove: true, appearance: 'system' }, lastDoor: { type: 'single', width: .9, height: 2.1, hinge: 'left', flip: false, repeat: true } };
  const encoded = storage.encode(library); const decoded = storage.decode(encoded);
  checks.push({ id: 'SAVE-ROUNDTRIP', pass: JSON.stringify(decoded) === JSON.stringify(library), observed: { bytes: encoded.length } });
  const mem = new Map([[storage.PRIMARY, '{corrupt'], [storage.BACKUP, encoded]]);
  const adapter = { getItem: async k => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } };
  const recovered = await storage.loadLibrary(adapter);
  checks.push({ id: 'SAVE-BACKUP', pass: !!recovered.library && !recovered.protected && mem.get(storage.PRIMARY) === '{corrupt', observed: { notice: recovered.notice, protected: recovered.protected } });
  mem.set(storage.PRIMARY, JSON.stringify({ schema: 2, payload: 'future' }));
  const future = await storage.loadLibrary(adapter);
  checks.push({ id: 'SAVE-FUTURE-PROTECTION', pass: future.protected && !future.library, observed: { notice: future.notice, protected: future.protected } });
  mem.set(storage.PRIMARY, storage.encode({ ...library, projects: [] }));
  let emptyAccepted = false;
  try { emptyAccepted = storage.decode(mem.get(storage.PRIMARY)).projects.length === 0; } catch {}
  checks.push({ id: 'SAVE-EMPTY-LIBRARY', expected: 'Reject an empty library because Studio dereferences the first project.', pass: !emptyAccepted, observed: { emptyAccepted } });
  const incomplete = JSON.parse(JSON.stringify(library));
  const badItem = item(incomplete.projects[0].present.floors[0].rooms[0].id, 1, 1); delete badItem.materialOverrides;
  incomplete.projects[0].present.floors[0].items.push(badItem);
  let incompleteAccepted = false; try { storage.decode(storage.encode(incomplete)); incompleteAccepted = true; } catch {}
  checks.push({ id: 'SAVE-INCOMPLETE-ITEM', expected: 'Validate fields required for rendering before importing a backup.', pass: !incompleteAccepted, observed: { incompleteAccepted, missingField: 'item.materialOverrides' } });
  const result = { timestamp: new Date().toISOString(), evidence: 'Independent in-memory execution of production domain/geometry/persistence/mesh modules, not native/device validation', sources, passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks };
  const target = process.argv[2] ? path.resolve(__dirname, process.argv[2]) : path.join(__dirname, 'domain-results.json');
  if (!target.startsWith(__dirname + path.sep)) throw Error('Report must remain in QA ownership');
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ report: path.relative(root, target), passed: result.passed, failed: result.failed, failures: checks.filter(c => !c.pass).map(c => ({ id: c.id, observed: c.observed, harnessError: c.harnessError })) }, null, 2) + '\n');
}
module.exports = { load, root, mobile, sources };
if (require.main === module) asyncChecks().catch(e => { process.stderr.write(e.stack + '\n'); process.exitCode = 1; });
