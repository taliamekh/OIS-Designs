/* Independent geometry oracles for the Phase 3 policy before Expo adoption. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..'), mobile = path.join(root, 'mobile');
const ts = require(path.join(mobile, 'node_modules/typescript')), THREE = require(path.join(mobile, 'node_modules/three'));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const sources = ['spatial/src/viewPlan.ts', 'mobile/src/domain/geometry.ts'];
const before = Object.fromEntries(sources.map(f => [f, hash(fs.readFileSync(path.join(root, f)))]));
function load(relative) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8'), module = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: p => { throw Error('Unexpected dependency: ' + p); } }, { filename: relative });
  return module.exports;
}
const S = load(sources[0]), G = load(sources[1]);
const cases = [], record = (name, pass, details) => cases.push({ name, pass: !!pass, ...(details ? { details } : {}) });
const near = (a, b) => Math.abs(a - b) < 1e-8;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const request = patch => ({ activeFloorId: 'ground', scope: { kind: 'house' }, mode: '3d', shell: 'cutaway', camera: { x: 12, y: 10, z: 9 }, ...patch });
let wallCases = 0, wallFailures = [];
for (const yaw of [0, Math.PI / 7, Math.PI / 2, -Math.PI / 3]) {
  const polygon = [[-2, -1], [3, -1], [3, 2], [-2, 2]].map(([x, z]) => ({ x: Math.cos(yaw) * x + Math.sin(yaw) * z, z: -Math.sin(yaw) * x + Math.cos(yaw) * z }));
  const center = { x: polygon.reduce((n, p) => n + p.x, 0) / 4, z: polygon.reduce((n, p) => n + p.z, 0) / 4 };
  for (const winding of [polygon, [...polygon].reverse()]) {
    const room = { id: 'r', polygon: winding, ceiling: 3 };
    const floor = { id: 'ground', elevation: -1.7, alignment: { x: -8.25, z: 3.75 }, ceiling: 2.7, rooms: [room], items: [], walls: G.rebuildWalls([room]) };
    for (const wall of floor.walls) {
      const mid = { x: (wall.a.x + wall.b.x) / 2, z: (wall.a.z + wall.b.z) / 2 };
      // Interior reference is the known rectangle centre; do not reuse wall-face flags.
      const ux = center.x - mid.x, uz = center.z - mid.z, length = Math.hypot(ux, uz);
      for (const side of [-1, 1]) {
        const camera = { x: floor.alignment.x + mid.x + side * ux / length * 10, y: 8, z: floor.alignment.z + mid.z + side * uz / length * 10 };
        const p = S.physicalWallPlan(floor, wall, new Set(['r']), { x: floor.alignment.x, y: floor.elevation, z: floor.alignment.z }, request({ camera }));
        wallCases++;
        if (p.visible !== (side === 1)) wallFailures.push({ yaw, winding: G.area(winding), wall: wall.id, side, actual: p });
      }
    }
  }
}
record('Production wall builder cutaway agrees with independently known interior sides across both windings/rotations/negative offsets', !wallFailures.length, { cases: wallCases, failures: wallFailures });

const fixture = JSON.parse(fs.readFileSync(path.join(root, 'spatial/fixtures/six-room-house.json')));
const projectBefore = JSON.stringify(fixture.project);
const records = new Map(fixture.assets.map(a => [`${a.id}|${a.version}|${a.sha256}`, a]));
const resolve = item => records.get(`${item.assetId}|${item.assetVersion}|${item.assetHash}`);
const normal = S.createScenePlan(fixture.project, resolve, request());
const separated = S.createScenePlan(fixture.project, resolve, request({ separatedFloorGap: 2.4 }));
record('Presentation separation preserves canonical house bounds', same(normal.canonicalBounds, separated.canonicalBounds));
for (const floor of separated.floors) {
  const f = fixture.project.floors.find(x => x.id === floor.id);
  record('Canonical offset retains floor alignment/elevation: ' + f.id, near(floor.canonicalOffset.x, f.alignment.x) && near(floor.canonicalOffset.z, f.alignment.z) && near(floor.canonicalOffset.y, f.elevation));
}
const walk = S.createScenePlan(fixture.project, resolve, request({ mode: 'walk', activeFloorId: 'upper', hiddenFloorIds: ['upper'], showCeilings: false, separatedFloorGap: 8 }));
record('Walk overrides presentation hiding/separation and remains read-only', walk.floors.length === 1 && walk.floors[0].id === 'upper' && walk.floors[0].ceilingsVisible && !walk.canEdit && walk.floors[0].presentationOffsetY === 0 && walk.floors[0].walls.every(w => w.visible));
const missing = S.createScenePlan(fixture.project, () => undefined, request());
record('Missing exact models are reported individually', missing.warnings.length === fixture.project.floors.reduce((n, f) => n + f.items.length, 0));

let transformCases = 0, transformFailures = [];
const box = { min: [-1.3, -.2, -.6], max: [2.1, 1.9, .8] };
for (const yaw of [0, .27, Math.PI / 2, Math.PI, -2.4]) for (const elevation of [0, .8]) {
  const item = { id: 'asymmetric', roomId: 'r', assetId: 'a', assetVersion: 'v', assetHash: 'h', x: -2.4, z: 3.6, yaw, locked: true, elevation };
  const asset = { id: 'a', version: 'v', sha256: 'h', bounds: box }, offset = { x: 4.3, y: -1.7, z: -8.1 };
  const actual = S.itemWorldBounds(item, asset, offset);
  // Three's independent matrix implementation is the coordinate oracle.
  const matrix = new THREE.Matrix4().compose(new THREE.Vector3(item.x + offset.x, elevation + offset.y, item.z + offset.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
  const expected = new THREE.Box3(new THREE.Vector3(...box.min), new THREE.Vector3(...box.max)).applyMatrix4(matrix);
  transformCases++;
  if (!['x', 'y', 'z'].every(k => near(actual.min[k], expected.min[k]) && near(actual.max[k], expected.max[k]))) transformFailures.push({ yaw, elevation, actual, expected });
}
record('Conservative asymmetric bounds agree with Three world matrices, including nonzero vertical origins', !transformFailures.length, { cases: transformCases, failures: transformFailures });
record('All view policies preserve canonical fixture bytes, item revisions and locks', JSON.stringify(fixture.project) === projectBefore);
const after = Object.fromEntries(sources.map(f => [f, hash(fs.readFileSync(path.join(root, f)))]));
const result = { at: new Date().toISOString(), before, after, stable: same(before, after), passed: cases.filter(c => c.pass).length, failed: cases.filter(c => !c.pass).length, cases,
  limits: 'CPU geometric policy against actual production wall builder and independent Three matrices. Conservative AABBs, not exact rendered mesh bounds. Does not establish mobile adoption, UI, opacity/picking, performance or physical native execution.' };
fs.writeFileSync(path.join(__dirname, 'spatial-plan-probe.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exitCode = !result.stable || result.failed ? 1 : 0;
