/* Analytic inside-face oracle independent of domain face-orientation flags. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..'), mobile = path.join(root, 'mobile');
const { createLoader } = require('./geometry-acceptance-0517/source-loader.cjs');
const { load } = createLoader(mobile), G = load('src/domain/geometry.ts');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const inputs = ['src/domain/geometry.ts', 'src/domain/construction.ts'];
const snapshot = () => Object.fromEntries(inputs.map(f => [f, sha(fs.readFileSync(path.join(mobile, f)))]));
const before = snapshot(), rows = [], near = (a, b) => Math.abs(a - b) < 2e-6;
function oracle(polygon, thicknesses) {
  const center = polygon.reduce((a, p) => ({ x: a.x + p.x / polygon.length, z: a.z + p.z / polygon.length }), { x: 0, z: 0 });
  const planes = polygon.map((p, i) => {
    const q = polygon[(i + 1) % polygon.length], length = Math.hypot(q.x - p.x, q.z - p.z);
    let nx = (q.z - p.z) / length, nz = -(q.x - p.x) / length;
    if ((center.x - p.x) * nx + (center.z - p.z) * nz < 0) { nx = -nx; nz = -nz; }
    return { nx, nz, c: p.x * nx + p.z * nz + thicknesses[i] / 2 };
  });
  const corners = planes.map((b, i) => {
    const a = planes[(i + planes.length - 1) % planes.length], d = a.nx * b.nz - b.nx * a.nz;
    return { x: (a.c * b.nz - b.c * a.nz) / d, z: (a.nx * b.c - b.nx * a.c) / d };
  });
  const xs = corners.map(p => p.x), zs = corners.map(p => p.z);
  return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs) };
}
function assign(floor, room, original, thicknesses) {
  for (const wall of floor.walls) {
    const i = original.findIndex((p, j) => G.projectToSegment(wall.a, p, original[(j + 1) % original.length]).distance < 1e-7 && G.projectToSegment(wall.b, p, original[(j + 1) % original.length]).distance < 1e-7);
    if (i < 0) throw Error('Fixture wall not on an independently known edge');
    wall.thickness = thicknesses[i];
  }
}
for (const width of [4, 7]) for (const angle of [0, .23, .7, Math.PI / 2]) for (const reverse of [false, true]) for (const unequal of [false, true]) {
  const points = [[0, 0], [width, 0], [width, 3.5], [0, 3.5]].map(([x, z]) => ({ x: -6.1 + x * Math.cos(angle) - z * Math.sin(angle), z: 2.8 + x * Math.sin(angle) + z * Math.cos(angle) }));
  const thicknesses = unequal ? [.12, .3, .15, .22] : [.12, .12, .12, .12];
  const room = { id: 'r', polygon: reverse ? [...points].reverse() : points, ceiling: null };
  const floor = { id: 'f', rooms: [room], walls: G.rebuildWalls([room]), items: [], openings: [], ceiling: 2.7 };
  assign(floor, room, points, thicknesses);
  const bytes = JSON.stringify(floor), expected = oracle(points, thicknesses), observed = G.roomInsideDimensions(floor, room);
  const original = G.bounds(room.polygon), unchanged = G.referenceDimensionsForInside(floor, room, observed.width, observed.depth);
  let pass = near(expected.width, observed.width) && near(expected.depth, observed.depth)
    && unchanged.width === original.maxX - original.minX && unchanged.depth === original.maxZ - original.minZ;
  const target = { width: expected.width * 1.12, depth: expected.depth * .91 };
  const reference = G.referenceDimensionsForInside(floor, room, target.width, target.depth);
  const map = p => ({ x: original.minX + (p.x - original.minX) * reference.width / (original.maxX - original.minX), z: original.minZ + (p.z - original.minZ) * reference.depth / (original.maxZ - original.minZ) });
  const resizedOracle = oracle(points.map(map), thicknesses);
  pass = pass && near(resizedOracle.width, target.width) && near(resizedOracle.depth, target.depth) && JSON.stringify(floor) === bytes;
  rows.push({ width, angle, reverse, unequal, expected, observed: { width: observed.width, depth: observed.depth }, target, resizedOracle, pass });
}
const after = snapshot(), result = { at: new Date().toISOString(), before, after, stable: JSON.stringify(before) === JSON.stringify(after),
  passed: rows.filter(r => r.pass).length, failed: rows.filter(r => !r.pass).length, rows,
  limits: 'Independent analytic offset-plane intersections for convex rectangles/parallelograms with equal/unequal thickness, both windings and rotated/negative-coordinate fixtures. Does not verify arbitrary concave/split-wall outlines, UI input adoption or physical/native rendering.' };
fs.writeFileSync(path.join(__dirname, 'inside-dimensions-oracle.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, rows: rows.filter(r => !r.pass) }, null, 2));
process.exitCode = !result.stable || result.failed ? 1 : 0;
