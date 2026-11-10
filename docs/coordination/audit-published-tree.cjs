/* Verify committed asset closure, including LFS pointers, without using untracked files. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const commit = git(['rev-parse', 'HEAD']).toString().trim(), tree = new Map();
const localOnly = process.argv.includes('--local-only');
const sourceCheckpoint = process.argv.find(a => a.startsWith('--source-checkpoint='))?.slice('--source-checkpoint='.length);
const outputName = process.argv.find(a => a.startsWith('--output='))?.slice('--output='.length) || 'published-tree-audit.json';
if (!/^[\w.-]+\.json$/.test(outputName)) throw Error('Output must be a JSON basename in coordinator ownership');
for (const line of git(['ls-tree', '-r', '-z', commit]).toString().split('\0').filter(Boolean)) {
  const [meta, name] = line.split('\t'); tree.set(name, meta.split(' ')[2]);
}
const read = name => git(['show', `${commit}:${name}`]);
const revisions = JSON.parse(read('mobile/src/catalogue/revisions.json'));
const release = JSON.parse(read('furniture/releases/library-2026-11-10-r1/completion-audit.json'));
const milestone = sourceCheckpoint ? JSON.parse(read(sourceCheckpoint)) : null;
const sourceHashes = milestone?.sourceHashes || (Array.isArray(milestone?.sourceFiles)
  ? Object.fromEntries(milestone.sourceFiles.map(row => [row.file.startsWith('mobile/') ? row.file : 'mobile/' + row.file, row.sha256])) : null);
if (milestone && (!sourceHashes || !Object.keys(sourceHashes).length || Object.values(sourceHashes).some(h => !/^[a-f0-9]{64}$/.test(h)))) throw Error('Source checkpoint must explicitly enumerate valid source digests');
const releaseMilestone = JSON.parse(read('furniture/releases/library-2026-11-10-r1/milestone.json'));
const ts = require(path.join(root, 'mobile/node_modules/typescript'));
const bundledSource = ts.createSourceFile('bundled.ts', read('mobile/src/catalogue/bundled.ts').toString(), ts.ScriptTarget.Latest, true);
const revisionBindings = new Map();
function bindingVisitor(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(bundledSource) === 'revisionModels' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
    for (const property of node.initializer.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const call = property.initializer;
      if (ts.isCallExpression(call) && call.arguments.length === 1 && ts.isStringLiteral(call.arguments[0])) revisionBindings.set(property.name.text, call.arguments[0].text);
    }
  }
  ts.forEachChild(node, bindingVisitor);
}
bindingVisitor(bundledSource);
const needs = new Map(), issues = [];
function need(name, expected, bytes, why) {
  if (!tree.has(name)) { issues.push({ name, why, error: 'Path absent from committed tree' }); return; }
  const previous = needs.get(name);
  if (previous?.expected && expected && previous.expected !== expected) issues.push({ name, why, error: 'Conflicting expected content identity' });
  needs.set(name, { expected: expected || previous?.expected, bytes: bytes ?? previous?.bytes, why });
}
for (const a of revisions) {
  const relative = revisionBindings.get(a.sha256);
  if (!relative) issues.push({ id: a.id, sha256: a.sha256, error: 'No exact-hash static revision binding' });
  else need(path.posix.normalize(path.posix.join('mobile/src/catalogue', relative)), a.sha256, a.bytes, 'Saved model revision');
}
for (const [name, expected] of Object.entries(release.dependencySha256)) need(path.posix.join('furniture', name), expected, undefined, 'Frozen release dependency');
for (const [name, expected] of Object.entries(releaseMilestone.proofSha256)) need(path.posix.join('furniture/releases/library-2026-11-10-r1', name), expected, undefined, 'Frozen release proof');
for (const [name, expected] of Object.entries(sourceHashes || {})) need(name, expected, undefined, 'Published source checkpoint');
let staticReferences = 0;
for (const name of [...tree.keys()].filter(p => p.startsWith('mobile/src/') && /\.tsx?$/.test(p))) {
  const source = ts.createSourceFile(name, read(name).toString(), ts.ScriptTarget.Latest, true, name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'require' && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      const relative = node.arguments[0].text;
      if (relative.startsWith('.') && /\.(glb|png|jpe?g|webp|svg|json)$/.test(relative)) {
        staticReferences++; need(path.posix.normalize(path.posix.join(path.posix.dirname(name), relative)), undefined, undefined, 'Static app require');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
for (const name of ['docs/build/STATUS.md', 'docs/build/SPATIAL_HANDOFF.md', 'docs/build/milestone-camera-library.json', 'docs/planning/PHONE_APP_PLAN.md', 'docs/planning/PHASE_STATUS.md', 'docs/furniture/LIBRARY_HANDOFF.md']) need(name, undefined, undefined, 'Published plan/build handoff');
const requests = [...needs.entries()], input = requests.map(([name]) => tree.get(name)).join('\n') + '\n';
const output = execFileSync('git', ['cat-file', '--batch'], { cwd: root, input, maxBuffer: 64 * 1024 * 1024 });
let cursor = 0, lfsPointers = 0, plainBlobs = 0;
for (const [name, expected] of requests) {
  const end = output.indexOf(10, cursor), length = Number(output.subarray(cursor, end).toString().split(' ')[2]);
  const data = output.subarray(end + 1, end + 1 + length); cursor = end + length + 2;
  let actualHash, actualBytes;
  if (data.subarray(0, 42).toString().startsWith('version https://git-lfs.github.com/spec/v1')) {
    lfsPointers++; const text = data.toString(); actualHash = /oid sha256:([a-f0-9]{64})/.exec(text)?.[1]; actualBytes = Number(/size (\d+)/.exec(text)?.[1]);
    if (!actualHash || !Number.isSafeInteger(actualBytes)) issues.push({ name, error: 'Malformed LFS pointer' });
  } else { plainBlobs++; actualHash = sha(data); actualBytes = length; }
  if (expected.expected && actualHash !== expected.expected) issues.push({ name, why: expected.why, error: 'Committed content identity differs' });
  if (expected.bytes !== undefined && actualBytes !== expected.bytes) issues.push({ name, why: expected.why, error: 'Committed length differs' });
}
const remote = localOnly ? null : git(['ls-remote', 'origin', 'refs/heads/main']).toString().split(/\s+/)[0];
if (!localOnly && remote !== commit) issues.push({ error: 'Remote main does not match audited local commit', remote, commit });
const result = { at: new Date().toISOString(), commit, remoteMain: remote, committedFiles: tree.size, retainedRevisions: revisions.length,
  releaseDependencies: Object.keys(release.dependencySha256).length, sourceCheckpoint: sourceCheckpoint || null,
  sourceCheckpointInputs: Object.keys(sourceHashes || {}).length, staticReferences, checkedPaths: needs.size, lfsPointers, plainBlobs,
  issues, limits: 'Committed Git tree and LFS pointer identities/lengths. Remote main is compared only outside local/CI mode. Source digests are checked only against an explicitly selected checkpoint; historical proofs are not assumed to describe newer code. Does not download LFS payloads or execute the app.' };
fs.writeFileSync(path.join(__dirname, outputName), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, issues: issues.slice(0, 5), issueCount: issues.length }, null, 2)); process.exitCode = issues.length ? 1 : 0;
