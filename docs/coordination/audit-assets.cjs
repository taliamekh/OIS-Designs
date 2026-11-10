/* Independent, read-only audit of the producer/consumer asset contract.
 * Does not invoke production scripts or modify manifests/assets.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'mobile/node_modules/typescript'));
const producer = path.join(root, 'furniture');
const consumer = path.join(root, 'mobile');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const findings = [];
const note = (severity, id, message) => findings.push({ severity, id, message });
function safeFile(base, relative) {
  if (typeof relative !== 'string') throw new Error('Missing relative file path');
  const result = path.resolve(base, relative);
  const rel = path.relative(base, result);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path escapes owned asset directory');
  return result;
}
function snapshot(file) {
  const bytes = fs.readFileSync(file);
  return { hash: hash(bytes), data: JSON.parse(bytes.toString('utf8')) };
}
function checkRecord(a, base, location) {
  const id = `${location}:${a.id}`;
  for (const key of ['id', 'version', 'name', 'category', 'subtype', 'theme', 'stage', 'sha256', 'licence']) {
    if (typeof a[key] !== 'string' || !a[key].length) note('error', id, `Missing string ${key}`);
  }
  for (const key of ['roomTags', 'materials', 'variantSlots', 'colourTags', 'searchAliases']) {
    if (!Array.isArray(a[key]) || a[key].some(v => typeof v !== 'string')) note('error', id, `Invalid string array ${key}`);
  }
  const d = a.dimensionsMetres;
  if (!d || ['width', 'depth', 'height'].some(k => !Number.isFinite(d[k]) || d[k] <= 0)) note('error', id, 'Invalid physical dimensions');
  const b = a.bounds;
  if (!b || !Array.isArray(b.min) || !Array.isArray(b.max) || b.min.length !== 3 || b.max.length !== 3 || [...b.min, ...b.max].some(v => !Number.isFinite(v))) note('error', id, 'Invalid bounds');
  else {
    const measured = { width: b.max[0] - b.min[0], depth: b.max[2] - b.min[2], height: b.max[1] - b.min[1] };
    if (d && Object.keys(measured).some(k => Math.abs(measured[k] - d[k]) > 0.0001)) note('error', id, 'Dimensions disagree with bounds');
    if (Math.abs(b.min[1]) > 0.001) note('warning', id, `Floor pivot minY=${b.min[1]}`);
  }
  for (const key of ['bytes', 'triangles', 'drawPrimitives']) {
    if (!Number.isSafeInteger(a[key]) || a[key] <= 0) note('error', id, `Invalid ${key}`);
  }
  if (a.bytes > 2000000) note('warning', id, 'GLB exceeds initial 2 MB planning budget');
  try {
    const bytes = fs.readFileSync(safeFile(base, a.file));
    if (hash(bytes) !== a.sha256 || bytes.length !== a.bytes) note('error', id, 'GLB bytes/hash disagree with manifest');
    if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) note('error', id, 'Invalid glTF 2 binary header');
    else {
      const jsonLength = bytes.readUInt32LE(12);
      if (bytes.readUInt32LE(16) !== 0x4e4f534a || 20 + jsonLength > bytes.length) note('error', id, 'Invalid GLB JSON chunk');
      else {
        const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
        if (gltf.asset?.version !== '2.0' || !gltf.meshes?.length || !gltf.scenes?.length) note('error', id, 'Missing glTF mesh/scene');
        if ((gltf.buffers || []).some(b => b.uri && !b.uri.startsWith('data:'))) note('error', id, 'External geometry dependency is not bundled');
      }
    }
  } catch (e) { note('error', id, e.message); }
  if (a.thumbnail) {
    try { if (!fs.statSync(safeFile(base, a.thumbnail)).size) note('error', id, 'Empty thumbnail'); }
    catch (e) { note('error', id, `Thumbnail unavailable: ${e.message}`); }
  }
}
const source = snapshot(path.join(producer, 'manifest.json'));
const imported = snapshot(path.join(consumer, 'src/catalogue/assets.json'));
const bundled = fs.readFileSync(path.join(consumer, 'src/catalogue/bundled.ts'), 'utf8');
const syntax = ts.createSourceFile('bundled.ts', bundled, ts.ScriptTarget.Latest, true);
const staticTables = {};
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
    const entries = new Map();
    for (const property of node.initializer.properties) {
      if (!ts.isPropertyAssignment(property) || !(ts.isStringLiteral(property.name) || ts.isIdentifier(property.name) || ts.isNumericLiteral(property.name))) continue;
      const call = property.initializer;
      if (ts.isCallExpression(call) && ts.isIdentifier(call.expression) && call.expression.text === 'require' && call.arguments.length === 1 && ts.isStringLiteral(call.arguments[0])) entries.set(property.name.text, call.arguments[0].text);
    }
    staticTables[node.name.text] = entries;
  }
  ts.forEachChild(node, visit);
}
visit(syntax);
const sourceRows = source.data.assets;
const appRows = imported.data;
const sourceMap = new Map();
for (const a of sourceRows) {
  if (sourceMap.has(a.id)) note('error', a.id, 'Duplicate producer ID');
  sourceMap.set(a.id, a);
  checkRecord(a, producer, 'producer');
}
const ids = new Set();
for (const a of appRows) {
  if (ids.has(a.id)) note('error', a.id, 'Duplicate consumer ID');
  ids.add(a.id);
  const original = sourceMap.get(a.id);
  if (!original) note('warning', a.id, 'Imported saved asset is absent from current producer manifest');
  else if (a.sha256 !== original.sha256 || a.version !== original.version) note('warning', a.id, 'Producer version/hash has changed; old saves require explicit version resolution');
  const requirePath = staticTables.models?.get(a.id);
  if (!requirePath) { note('error', a.id, 'No static Metro GLB require'); continue; }
  const appFile = path.resolve(path.join(consumer, 'src/catalogue'), requirePath);
  const relative = path.relative(path.join(consumer, 'assets/furniture'), appFile);
  if (relative.startsWith('..') || path.isAbsolute(relative)) { note('error', a.id, 'Consumer require escapes furniture bundle'); continue; }
  try {
    const bytes = fs.readFileSync(appFile);
    if (bytes.length !== a.bytes || hash(bytes) !== a.sha256) note('error', a.id, 'Bundled consumer bytes/hash disagree with imported metadata');
  } catch (e) { note('error', a.id, e.message); }
}
const revisionFile = path.join(consumer, 'src/catalogue/revisions.json');
const revisionRows = fs.existsSync(revisionFile) ? JSON.parse(fs.readFileSync(revisionFile)) : [];
for (const a of revisionRows) {
  const relative = staticTables.revisionModels?.get(a.sha256);
  if (!relative) { note('error', a.id, 'Saved revision has no static hash require'); continue; }
  try {
    const file = path.resolve(path.join(consumer, 'src/catalogue'), relative);
    const safe = path.relative(path.join(consumer, 'assets/furniture'), file);
    if (safe.startsWith('..') || path.isAbsolute(safe)) throw Error('Revision require escapes bundled furniture');
    const bytes = fs.readFileSync(file);
    if (bytes.length !== a.bytes || hash(bytes) !== a.sha256) throw Error('Preserved revision bytes/hash mismatch');
  } catch (e) { note('error', a.id, e.message); }
}
const aliasCoverage = {};
for (const [producerTag, appTag] of [['entry-hall', 'entry'], ['laundry-utility', 'utility']]) {
  const relevant = appRows.filter(a => a.roomTags.includes(producerTag));
  aliasCoverage[appTag] = { producerTaggedImported: relevant.length, normalizedImported: relevant.filter(a => a.roomTags.includes(appTag)).length };
  if (relevant.some(a => !a.roomTags.includes(appTag))) note('error', appTag, 'Producer room aliases are missing from imported roomTags');
}
const countBy = (rows, key) => rows.reduce((out, a) => { const v = a[key] ?? '(unset)'; out[v] = (out[v] || 0) + 1; return out; }, {});
const result = {
  checkedAtUtc: new Date().toISOString(),
  sourceManifestSha256: source.hash,
  consumerCatalogueSha256: imported.hash,
  producerRecords: sourceRows.length,
  consumerRecords: appRows.length,
  preservedRevisions: revisionRows.length,
  consumerRoomAliasCoverage: aliasCoverage,
  unimportedProducerRecords: sourceRows.filter(a => !ids.has(a.id)).length,
  sourceQualityStatus: countBy(sourceRows, 'qualityStatus'),
  sourceStage: countBy(sourceRows, 'stage'),
  sourceRooms: [...new Set(sourceRows.flatMap(a => a.roomTags || []))].sort(),
  sourceBytes: sourceRows.reduce((n, a) => n + a.bytes, 0),
  consumerBytes: appRows.reduce((n, a) => n + a.bytes, 0),
  consumerTriangles: appRows.reduce((n, a) => n + a.triangles, 0),
  errors: findings.filter(f => f.severity === 'error').length,
  warnings: findings.filter(f => f.severity === 'warning').length,
  findings,
  limitations: 'Read-only metadata/hash/header/consumer-contract checks; no construction uniqueness, visual quality, full glTF conformance, native loading or device performance claim.'
};
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, findings: findings.slice(0, 10), findingsTruncated: Math.max(0, findings.length - 10) }, null, 2));
process.exitCode = result.errors ? 1 : 0;
