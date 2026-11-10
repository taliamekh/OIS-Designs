/* Independent fixed-value oracle for the production display-only formatter. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..'), mobile = path.join(root, 'mobile');
const { createLoader } = require('./geometry-acceptance-0517/source-loader.cjs');
const input = path.join(mobile, 'src/domain/geometry.ts');
const digest = () => crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
const before = digest(), { load } = createLoader(mobile), geometry = load('src/domain/geometry.ts');
const fixed = [
  [-.05, '-0′ 2″'], [-1, '-3′ 3″'], [-.9398, '-3′ 1″'],
  [-.001, '0′ 0″'], [.001, '0′ 0″'], [-0, '0′ 0″'],
  [-.3048, '-1′ 0″'], [.3048, '1′ 0″'],
  [-.0127, '-0′ 1″'], [.0127, '0′ 1″'],
  [-.2921, '-1′ 0″'], [.2921, '1′ 0″'],
].map(([metres, expected]) => ({ metres, expected, actual: geometry.measure(metres, 'ft') }));
const symmetry = [];
for (const metres of [.013, .0254, .05, .1, .2, .305, .5, .94, 1, 2.5, 4, 10]) {
  const positive = geometry.measure(metres, 'ft'), negative = geometry.measure(-metres, 'ft');
  symmetry.push({ metres, positive, negative, pass: negative === '-' + positive });
}
const metric = [-1, -.05, 0, .05, 1].map(metres => ({ metres, pass: geometry.measure(metres, 'm') === metres.toFixed(2) + ' m' }));
const after = digest();
const pass = before === after && fixed.every(r => r.actual === r.expected) && symmetry.every(r => r.pass) && metric.every(r => r.pass);
const report = { at: new Date().toISOString(), source: 'mobile/src/domain/geometry.ts', before, after, fixed, symmetry, metric, pass, limits: 'Executes actual production formatter with literal expected values and sign symmetry. Does not parse/save geometry or establish UI/native output.' };
fs.writeFileSync(path.join(__dirname, 'signed-imperial-retest.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ pass, fixed: fixed.length, symmetry: symmetry.length, unchangedMetric: metric.length, sourceStable: before === after }));
if (!pass) process.exitCode = 1;
