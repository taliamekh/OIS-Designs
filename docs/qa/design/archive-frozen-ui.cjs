// Preserve completed UI evidence before later fix retests overwrite convenience filenames.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const run = '2026-11-10T03-08-42-752Z-frozen-web';
const snapshot = path.join(root, 'docs/qa/runtime/runs', run);
const manifest = JSON.parse(fs.readFileSync(path.join(snapshot, 'freeze-manifest.json')));
const provenance = JSON.parse(fs.readFileSync(path.join(snapshot, 'bundle-provenance.json')));
const server = JSON.parse(fs.readFileSync(path.join(snapshot, 'server.json')));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
if (!manifest.stableDuringCopy || !provenance.pass || manifest.sourceHash !== provenance.sourceHash) throw Error('Snapshot is not source-verified');
const sources = ['src/scene/Plan.tsx', 'src/scene/RoomScene.tsx', 'src/scene/meshes.ts', 'src/screens/Build.tsx', 'src/screens/FloorPlanDraft.tsx', 'src/storage/indexedStore.ts'];
const sourceBindings = sources.map(file => {
  const expected = manifest.sources[file]?.sha256, actual = sha(fs.readFileSync(path.join(snapshot, 'project', file)));
  if (expected !== actual) throw Error('Frozen source bytes changed: ' + file);
  return { file, sha256: actual, matchesCurrentLiveSource: actual === sha(fs.readFileSync(path.join(root, 'mobile', file))) };
});
const evidence = [
  { report: 'door-ui-web.json', images: ['door-shared-placement-dimensions.png'] },
  { report: 'door-partial-shared-web.json', images: ['door-partial-shared-dimensions.png'] },
  { report: 'furniture-material-web.json', images: ['furniture-material-two-identical-before.png', 'furniture-material-one-instance-changed.png', 'furniture-material-undo.png', 'furniture-material-redo-and-locked.png', 'furniture-material-cold-reloaded.png'] },
  { report: 'draft-text-web.json', knownCommandURL: server.url, timestamp: '2026-11-10T03:16:29.900Z', images: ['draft-text-320-back.png', 'draft-text-320-remove-last-drafted-room.png', 'draft-text-320-create-floor-plan.png', 'draft-text-390-create-floor-plan.png'] },
  { report: 'trim-visual-web.json', images: ['trim-trapezoid-flat-unequal-walls.png', 'trim-trapezoid-ogee-unequal-walls.png'] },
  { report: 'ceiling-ui-web.json', images: ['ceiling-after-explicit-entry.png'] },
];
const destination = path.join(__dirname, 'frozen-evidence', 'a875374c-ui'); fs.mkdirSync(destination, { recursive: true });
const archived = [];
for (const e of evidence) {
  const reportBytes = fs.readFileSync(path.join(__dirname, e.report)), report = JSON.parse(reportBytes);
  if (report.baseURL !== server.url && !(e.knownCommandURL === server.url && report.timestamp === e.timestamp)) throw Error('Unexpected UI origin/version: ' + e.report);
  if (report.storageOracle && report.storageOracle.sha256 !== manifest.sources['src/storage/indexedStore.ts'].sha256) throw Error('Storage read adapter differs: ' + e.report);
  const files = [e.report, ...e.images].map(name => {
    const bytes = fs.readFileSync(path.join(__dirname, name)), target = path.join(destination, name);
    if (fs.existsSync(target) && sha(fs.readFileSync(target)) !== sha(bytes)) throw Error('Refusing to overwrite different archived evidence: ' + name);
    if (!fs.existsSync(target)) fs.writeFileSync(target, bytes);
    return { name, sha256: sha(bytes), bytes: bytes.length };
  });
  archived.push({ report: e.report, timestamp: report.timestamp, url: server.url, urlEvidence: report.baseURL ? 'Recorded in report' : 'Exact known tool invocation timestamp/origin; original harness omitted URL field', completed: report.completed ?? report.runs?.every(r => r.completed), files });
}
const index = { createdAt: new Date().toISOString(), scope: 'Immutable copies of bounded browser UI evidence, not a new test run or native proof', snapshotRun: run, sourceHash: manifest.sourceHash, compiledSourceMatchCount: provenance.uniqueAppSources, sourceMapPass: provenance.pass, sourceBindings, archived };
const indexFile = path.join(destination, 'index.json');
if (!fs.existsSync(indexFile)) fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
process.stdout.write(JSON.stringify({ sourceHash: index.sourceHash, sourceMapPass: index.sourceMapPass, sourceBindings, reportCount: archived.length, files: archived.reduce((n, e) => n + e.files.length, 0), destination }, null, 2) + '\n');
