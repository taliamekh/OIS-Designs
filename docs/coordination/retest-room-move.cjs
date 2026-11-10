/* Original lock reproduction plus real-model/history/persistence room-move checks. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), mobile = path.join(root, 'mobile');
const { createLoader } = require('./geometry-acceptance-0517/source-loader.cjs'), { load } = createLoader(mobile);
const P = load('src/domain/project.ts'), G = load('src/domain/geometry.ts'), S = load('src/domain/persistence.ts'), A = load('src/catalogue/assets.json');
const sources = ['src/domain/project.ts', 'src/domain/geometry.ts', 'src/domain/roomMove.ts', 'src/domain/persistence.ts'];
const snapshot = () => Object.fromEntries(sources.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile, f))).digest('hex')]));
const before = snapshot(), checks = [], same = (a, b) => assert.deepEqual(a, b);
function check(name, fn) { try { fn(); checks.push({ name, pass: true }); } catch (e) { checks.push({ name, pass: false, error: String(e) }); } }
const asset = A.find(a => a.id === 'ois.design.arc-shade-floor');
const project = P.makeProject('living', 6, 5), f = project.floors[0], r = f.rooms[0];
const other = P.makeRoom('bedroom', 'Unrelated locked room', [{ x: 10, z: 0 }, { x: 14, z: 0 }, { x: 14, z: 3 }, { x: 10, z: 3 }]);
f.rooms.push(other); f.walls = G.rebuildWalls(f.rooms, f.walls);
const wall = f.walls.find(w => w.a.z === 0 && w.b.z === 0 && w.faces.some(face => face.roomId === r.id));
wall.thickness = .15;
r.wallFaces[wall.id] = { colour: '#aa8866', texture: 'paint', sheen: 'matte' };
r.trimOverrides[wall.id] = { ...r.trim, profile: 'ogee', projection: .025 };
f.openings.push({ id: 'root-opening', wallId: wall.id, type: 'single', offset: 1, width: .9, height: 2.1, sill: 0, hinge: 'left', flip: false });
const object = (id, roomId, x, z) => ({ id, roomId, assetId: asset.id, assetVersion: asset.version, assetHash: asset.sha256, x, z, yaw: 0, locked: true, materialOverrides: {} });
f.items.push(object('root-moved', r.id, 3, 2.5), object('root-other', other.id, 12, 1.5));
const history = { past: [], present: project, future: [] }, command = { type: 'move-room', floorId: f.id, roomId: r.id, x: -6.5, z: .5 };
const failed = P.execute(history, command, '2d', A);
check('Original locked-item regression rejects and preserves the entire original history', () => { assert.match(failed.error || '', /unlock/i); same(failed.history, history); assert.equal(failed.history, history); });
const unlocked = P.execute(history, { type: 'lock', floorId: f.id, itemId: 'root-moved', locked: false }, '2d', A);
assert.equal(unlocked.error, null);
const moved = P.execute(unlocked.history, command, '2d', A);
check('Unlock/retry moves the intended room and item despite a locked unrelated room', () => {
  assert.equal(moved.error, null); const next = moved.history.present.floors[0];
  const a = next.items.find(i => i.id === 'root-moved'); assert.equal(a.x, -3.5); assert.equal(a.z, 3);
  same(next.items.find(i => i.id === 'root-other'), f.items.find(i => i.id === 'root-other'));
  same(next.rooms.find(room => room.id === other.id), other);
});
check('Re-keyed translated wall retains thickness, finish, trim and opening width', () => {
  const next = moved.history.present.floors[0], opening = next.openings[0], target = next.walls.find(w => w.id === opening.wallId), room = next.rooms.find(room => room.id === r.id);
  assert.equal(target.thickness, .15); same(room.wallFaces[target.id], r.wallFaces[wall.id]); same(room.trimOverrides[target.id], r.trimOverrides[wall.id]); assert.equal(opening.width, .9);
});
check('A world door hinge stays translated correctly when canonical endpoint order reverses', () => {
  function hinge(floor) {
    const o = floor.openings[0], w = floor.walls.find(w => w.id === o.wallId), pose = G.doorLeafPoses(o, w.thickness, true)[0], length = G.distance(w.a, w.b), ux = (w.b.x - w.a.x) / length, uz = (w.b.z - w.a.z) / length;
    return { x: w.a.x + (o.offset + pose.pivotX) * ux - pose.z * uz, z: w.a.z + (o.offset + pose.pivotX) * uz + pose.z * ux };
  }
  const old = hinge(f), next = hinge(moved.history.present.floors[0]);
  assert.ok(Math.abs(next.x - old.x - command.x) < 1e-8 && Math.abs(next.z - old.z - command.z) < 1e-8);
});
check('One Undo/Redo restores exact committed project snapshots', () => {
  const undo = P.travelHistory(moved.history, 'undo', '2d'), redo = P.travelHistory(undo.history, 'redo', '2d');
  same(undo.history.present, unlocked.history.present); same(redo.history.present, moved.history.present);
});
check('Real save codec preserves moved topology, history, identities and unrelated locks', () => {
  const library = { version: 1, projects: [moved.history], activeId: project.id, favourites: [], recent: [], settings: { unit: 'm', grid: true, quickMove: true, appearance: 'system' }, lastDoor: { type: 'single', width: .9, height: 2.1, hinge: 'left', flip: false, repeat: true } };
  same(S.decode(S.encode(library)), library);
});
check('Walk rejects the same structural room move without history mutation', () => { const result = P.execute(unlocked.history, command, 'walk', A); assert.ok(result.error); same(result.history, unlocked.history); });
const after = snapshot(), result = { at: new Date().toISOString(), before, after, stable: JSON.stringify(before) === JSON.stringify(after),
  asset: { id: asset.id, version: asset.version, sha256: asset.sha256 }, passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks,
  limits: 'Actual production command/history/save codec with a real exact catalogue model and analytic two-room fixture. No UI gesture or native filesystem/GL claim.' };
fs.writeFileSync(path.join(__dirname, 'room-move-lock-retest.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2)); process.exitCode = !result.stable || result.failed ? 1 : 0;
