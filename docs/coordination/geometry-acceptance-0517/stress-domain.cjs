/* Independent broad fixtures and failure-path probes. All output stays in QA. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { performance } = require('node:perf_hooks');
const { load, mobile } = require('./probe-domain.cjs');
const g = load('src/domain/geometry.ts'), p = load('src/domain/project.ts'), s = load('src/domain/persistence.ts'), t = load('src/domain/types.ts');
const original = load('src/catalogue/assets.json')[0];
const small = { ...original, id: 'qa-small', dimensionsMetres: { width: .2, depth: .2, height: .5 }, bounds: { min: [-.1, 0, -.1], max: [.1, .5, .1] } };
const item = (roomId, id, x, z, asset = small) => ({ id, roomId, assetId: asset.id, assetVersion: asset.version, assetHash: asset.sha256, x, z, yaw: 0, locked: false, materialOverrides: {} });
const history = present => ({ past: [], present, future: [] });
const library = present => ({ version: 1, projects: [history(present)], activeId: present.id, favourites: [], recent: [], settings: { unit: 'm', grid: true, quickMove: true, appearance: 'system' }, lastDoor: { type: 'single', width: .9, height: 2.1, hinge: 'left', flip: false, repeat: true } });
const cases = [], failures = [];
const check = (id, ok, observed) => { cases.push({ id, pass: !!ok }); if (!ok) failures.push({ id, observed }); };
let seed = 0x1946a7;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const transform = (polygon, angle, x, z) => polygon.map(p => ({ x: x + p.x * Math.cos(angle) - p.z * Math.sin(angle), z: z + p.x * Math.sin(angle) + p.z * Math.cos(angle) }));
const intersection = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
for (let n = 0; n < 1500; n++) {
  const width = 3 + random() * 8, depth = 3 + random() * 8, x = -2 + random() * (width + 4), z = -2 + random() * (depth + 4), w = .2 + random() * 3, d = .2 + random() * 3;
  const a = g.shapePolygon('l', width, depth), b = g.shapePolygon('rectangle', w, d, { x, z });
  const expected = intersection(0, width, x, x + w) * intersection(0, depth * .5, z, z + d) + intersection(0, width * .55, x, x + w) * intersection(depth * .5, depth, z, z + d) > 1e-5;
  const observed = g.overlaps(a, b);
  check('concave-union-oracle-' + n, observed === expected, { width, depth, x, z, w, d, expected, observed });
  check('overlap-symmetry-' + n, observed === g.overlaps(b, a));
}
for (let n = 0; n < 300; n++) {
  const angle = random() * Math.PI * 2, dx = random() * 100 - 50, dz = random() * 100 - 50;
  const a = transform(g.shapePolygon('l', 6, 6), angle, dx, dz), outside = transform(g.shapePolygon('rectangle', 2, 2, { x: 3.6, z: 3.5 }), angle, dx, dz), contained = transform(g.shapePolygon('rectangle', .6, .6, { x: .5, z: .5 }), angle, dx, dz);
  if (n % 2) a.reverse();
  check('concave-transform-empty-notch-' + n, !g.overlaps(a, outside));
  check('concave-transform-contained-' + n, g.overlaps(a, contained));
}
for (let n = 0; n < 100; n++) {
  const width = 4 + random() * 6, depth = 4 + random() * 4, split = .5 + random(), project = p.makeProject('living', width, depth), floor = project.floors[0], room = floor.rooms[0];
  const wall = floor.walls.find(w => Math.abs(w.a.x - width) < 1e-7 && Math.abs(w.b.x - width) < 1e-7);
  wall.thickness = .2; room.wallFaces[wall.id] = { colour: '#123456', texture: 'plaster', sheen: 'satin' }; room.trimOverrides[wall.id] = { ...t.defaultTrim, profile: 'stepped', projection: .025 };
  floor.openings.push({ id: 'qa-door', wallId: wall.id, type: 'single', offset: 2, width: .8, height: 2.1, sill: 0, hinge: n % 3 ? 'left' : 'right', flip: !!(n % 2) });
  const before = JSON.stringify(project), sourceDoor = g.lerp(wall.a, wall.b, 2 / g.distance(wall.a, wall.b)), sourceEnd = g.lerp(wall.a, wall.b, 2.8 / g.distance(wall.a, wall.b)), sourceMotion = g.swingEnvelopes(wall, floor.openings[0]).flat();
  const neighbour = p.makeRoom('kitchen', 'Kitchen', g.shapePolygon('rectangle', 3, split, { x: width, z: 0 }));
  const result = p.execute(history(project), { type: 'add-room', floorId: floor.id, room: neighbour }, '2d', [small]);
  check('topology-add-' + n, !result.error, result.error);
  if (!result.error) {
    const f = result.history.present.floors[0], o = f.openings[0], w = f.walls.find(w => w.id === o.wallId), start = g.lerp(w.a, w.b, o.offset / g.distance(w.a, w.b)), end = g.lerp(w.a, w.b, (o.offset + o.width) / g.distance(w.a, w.b));
    // Canonical wall direction can reverse when a segment splits. Compare both physical
    // endpoints AND the complete motion sector, rather than mistaking a reversed anchor
    // for a displaced hole. This is a stronger invariant than start-point equality.
    check('topology-world-position-' + n, (g.distance(start, sourceDoor) < 1e-7 && g.distance(end, sourceEnd) < 1e-7) || (g.distance(start, sourceEnd) < 1e-7 && g.distance(end, sourceDoor) < 1e-7), { start, end, sourceDoor, sourceEnd });
    const motion = g.swingEnvelopes(w, o).flat();
    check('topology-world-swing-' + n, motion.length === sourceMotion.length && motion.every(point => sourceMotion.some(old => g.distance(old, point) < 1e-7)), { motion, sourceMotion });
    check('topology-face-finish-' + n, f.walls.filter(w => w.faces.some(face => face.roomId === room.id) && Math.abs(w.a.x - width) < 1e-7 && Math.abs(w.b.x - width) < 1e-7).every(w => f.rooms[0].wallFaces[w.id]?.colour === '#123456' && f.rooms[0].trimOverrides[w.id]?.profile === 'stepped' && w.thickness === .2));
    check('topology-neighbour-isolation-' + n, Object.keys(f.rooms[1].wallFaces).length === 0);
    check('topology-save-valid-' + n, s.validProject(result.history.present));
    check('topology-undo-' + n, JSON.stringify(p.travelHistory(result.history, 'undo', '2d').history.present) === before);
  }
  const badNeighbour = p.makeRoom('kitchen', 'Kitchen', g.shapePolygon('rectangle', 3, 2.4, { x: width, z: 0 }));
  const h = history(project), rejected = p.execute(h, { type: 'add-room', floorId: floor.id, room: badNeighbour }, '2d', [small]);
  check('junction-crossing-atomic-' + n, !!rejected.error && rejected.history === h && JSON.stringify(project) === before, rejected.error);
}
{
  const project = p.makeProject('living', 4, 4), f = project.floors[0], room = f.rooms[0], i = item(room.id, 'old-revision', .25, 1), newer = { ...small, version: 'next', sha256: 'a'.repeat(64), dimensionsMetres: { width: 1, depth: 1, height: 4 }, bounds: { min: [-.5, 0, -.5], max: [.5, 4, .5] } };
  f.items.push(i);
  check('revision-use-saved-bounds', g.canPlace(f, room, i, newer, [newer, small]) === null);
  const h = history(project), moved = p.execute(h, { type: 'transform', floorId: f.id, itemId: i.id, x: .25, z: 1.5, yaw: 0 }, '2d', [newer, small]);
  check('revision-transform-valid', !moved.error, moved.error);
  const missing = p.execute(h, { type: 'transform', floorId: f.id, itemId: i.id, x: .25, z: 1.5, yaw: 0 }, '2d', [newer]);
  check('revision-missing-atomic', !!missing.error && missing.history === h && /revision/i.test(missing.error), missing.error);
  const from = { x: 2, z: 2 };
  check('revision-walk-safe', g.distance(from, p.walkMove(f, room.id, from, { x: 2.5, z: 2 }, [newer])) === 0);
}
const valid = library(p.makeProject('living', 4, 4));
valid.projects[0].present.floors[0].items.push(item(valid.projects[0].present.floors[0].rooms[0].id, 'qa-item', 1, 1));
const mutate = (id, fn) => { const v = JSON.parse(JSON.stringify(valid)); fn(v, v.projects[0].present.floors[0], v.projects[0].present.floors[0].rooms[0]); let rejected = false; try { s.decode(s.encode(v)); } catch { rejected = true; } check('decode-' + id, rejected); };
mutate('empty-projects', l => { l.projects = []; });
mutate('empty-floors', l => { l.projects[0].present.floors = []; });
mutate('empty-rooms', (_, f) => { f.rooms = []; });
mutate('empty-walls', (_, f) => { f.walls = []; });
mutate('nan-elevation', (_, f) => { f.elevation = NaN; });
mutate('bad-ceiling', (_, f) => { f.ceiling = 0; });
mutate('unknown-room-kind', (_, f, r) => { r.kind = 'unknown'; });
mutate('bad-floor-repeat', (_, f, r) => { r.floorFinish.repeat = 0; });
mutate('bad-floor-id', (_, f, r) => { r.floorFinish.id = 'missing-floor'; });
mutate('bad-trim-hex', (_, f, r) => { r.trim.colour = 'orange'; });
mutate('foreign-wall-finish', (_, f, r) => { r.wallFaces.unknown = { colour: '#123456', texture: 'paint', sheen: 'satin' }; });
mutate('foreign-trim-override', (_, f, r) => { r.trimOverrides.unknown = { ...t.defaultTrim }; });
mutate('missing-material-overrides', (_, f) => { delete f.items[0].materialOverrides; });
mutate('bad-material-override', (_, f) => { f.items[0].materialOverrides = { wood: 'orange' }; });
mutate('unknown-room-reference', (_, f) => { f.items[0].roomId = 'missing'; });
mutate('duplicate-item-id', (_, f) => { f.items.push({ ...f.items[0] }); });
mutate('duplicate-room-id', (_, f, r) => { f.items[0].id = r.id; });
mutate('bad-revision-hash', (_, f) => { f.items[0].assetHash = 'abc'; });
mutate('duplicate-wall-id', (_, f) => { f.walls[1].id = f.walls[0].id; });
mutate('missing-wall-face', (_, f) => { f.walls[0].faces = []; });
mutate('wrong-face-room', (_, f) => { f.walls[0].faces[0].roomId = 'missing'; });
mutate('wrong-face-orientation', (_, f) => { f.walls[0].faces[0].reversed = !f.walls[0].faces[0].reversed; });
mutate('bad-settings-unit', l => { l.settings.unit = 'yards'; });
mutate('bad-door-width', l => { l.lastDoor.width = 0; });
mutate('bad-active-id', l => { l.activeId = 'missing'; });
mutate('foreign-project-history', l => { l.projects[0].past.push(p.makeProject('bedroom')); });
for (const [name, edit] of [
  ['null-room', f => { f.rooms = [null]; }], ['missing-polygon', f => { delete f.rooms[0].polygon; }], ['nan-coordinate', f => { f.rooms[0].polygon[0].x = NaN; }], ['missing-trim', f => { delete f.rooms[0].trim; }], ['missing-items', f => { delete f.items; }], ['missing-walls', f => { delete f.walls; }], ['duplicate-room', f => { f.rooms.push(JSON.parse(JSON.stringify(f.rooms[0]))); }], ['null-alignment', f => { f.alignment = null; }]
]) {
  const project = p.makeProject('living'), h = history(project), f = p.makeFloor('Malformed'); f.rooms = [p.makeRoom('bedroom', 'Bedroom', g.shapePolygon('rectangle', 4, 4))]; edit(f);
  let result; try { result = p.execute(h, { type: 'add-floor', floor: f }, '2d', [small]); } catch (e) { result = { error: 'THREW: ' + e, history: null }; }
  check('malformed-command-' + name, !!result.error && result.history === h, result.error);
}
const performanceSamples = [];
{
  const project = p.makeProject('living', 30, 30), f = project.floors[0], room = f.rooms[0];
  for (let n = 0; n < 300; n++) f.items.push(item(room.id, 'stress-' + n, 1 + n % 20, 1 + Math.floor(n / 20)));
  let h = history(project);
  for (let n = 0; n < 12; n++) { const start = performance.now(), result = p.execute(h, { type: 'transform', floorId: f.id, itemId: 'stress-0', x: .7 + (n % 2) * .05, z: 1, yaw: .1 }, '3d', [small]); performanceSamples.push(performance.now() - start); check('populated-transform-' + n, !result.error, result.error); h = result.history; }
}
(async () => {
  const raw = s.encode(valid), values = new Map([[s.PRIMARY, raw]]), operations = [];
  let failed = false;
  try { await s.saveLibrary({ getItem: async k => values.get(k) ?? null, setItem: async (k, v) => { operations.push(k); if (k === s.BACKUP) throw Error('disk full'); values.set(k, v); } }, { ...valid, settings: { ...valid.settings, unit: 'ft' } }); } catch { failed = true; }
  check('backup-write-failure-keeps-primary', failed && values.get(s.PRIMARY) === raw && !operations.includes(s.PRIMARY), { failed, operations });
  values.set(s.PRIMARY, JSON.stringify({ schema: 2, payload: 'future' })); const future = values.get(s.PRIMARY); operations.length = 0; failed = false;
  try { await s.saveLibrary({ getItem: async k => values.get(k) ?? null, setItem: async (k, v) => { operations.push(k); values.set(k, v); } }, valid); } catch { failed = true; }
  check('save-cannot-downgrade-future', failed && values.get(s.PRIMARY) === future && !operations.length);
  const recovered = await s.loadLibrary({ getItem: async k => k === s.BACKUP ? raw : null, setItem: async () => { throw Error('load must be read-only'); } });
  check('missing-primary-recovers-backup', !!recovered.library && !recovered.protected);
  const sourceHashes = Object.fromEntries(['geometry.ts', 'project.ts', 'persistence.ts'].map(n => [n, crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile, 'src/domain', n))).digest('hex')]));
  const sorted = [...performanceSamples].sort((a, b) => a - b);
  const report = { timestamp: new Date().toISOString(), sourceHashes, passed: cases.filter(c => c.pass).length, failed: failures.length, failures, performance: { fixture: '300 bounded collision-box fixtures, one 30m room, 12 transforms; laptop JS only', medianMs: sorted[Math.floor(sorted.length / 2)], maxMs: sorted.at(-1), samplesMs: performanceSamples }, cases };
  fs.writeFileSync(path.join(__dirname, 'stress-domain-results.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ ...report, cases: undefined }, null, 2) + '\n');
})().catch(e => { process.stderr.write(e.stack + '\n'); process.exitCode = 1; });
