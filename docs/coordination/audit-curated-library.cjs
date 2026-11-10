/* Independent frozen-release/default-browse/exact-revision integration audit. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..'), mobile = path.join(root, 'mobile');
const ts = require(path.join(mobile, 'node_modules/typescript'));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const files = ['src/catalogue/search.ts', 'src/catalogue/resolve.ts', 'src/catalogue/assets.json', 'src/catalogue/revisions.json'];
const before = Object.fromEntries(files.map(f => [f, hash(fs.readFileSync(path.join(mobile, f)))]));
const loadJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
function actual(relative) {
  const file = path.join(mobile, relative), module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: p => {
    const target = path.resolve(path.dirname(file), p);
    if (!target.startsWith(path.join(mobile, 'src/catalogue') + path.sep) || !target.endsWith('.json')) throw Error('Unexpected runtime import: ' + p);
    return loadJSON(target);
  } }, { filename: file });
  return module.exports;
}
const S = actual('src/catalogue/search.ts'), R = actual('src/catalogue/resolve.ts');
const releasePath = path.join(root, 'furniture/releases/library-2026-11-10-r1/manifest.json');
const releaseBytes = fs.readFileSync(releasePath), release = JSON.parse(releaseBytes);
const assets = loadJSON(path.join(mobile, 'src/catalogue/assets.json'));
const expected = release.assets.filter(a => ['internally-accepted', 'reviewed-variant'].includes(a.qualityStatus));
const tuple = a => `${a.id}|${a.version}|${a.sha256}`;
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const checks = [], check = (name, ok, details) => checks.push({ name, pass: !!ok, ...(details ? { details } : {}) });
const filtered = S.searchAssets(assets, { ...S.initialFilters }, [], []);
check('Default browsing exactly matches the frozen reviewed release', sameSet(filtered.map(tuple), expected.map(tuple)), { actual: filtered.length, expected: expected.length });
for (const stage of ['internally-accepted', 'reviewed-variant']) {
  const ids = expected.filter(a => a.qualityStatus === stage).map(tuple);
  check(`Frozen ${stage} identities and counts`, sameSet(filtered.filter(a => a.stage === stage).map(tuple), ids), { expected: ids.length });
}
const fake = ['candidate', 'needs-rework', 'prototype'].map(stage => ({ ...assets[0], id: 'qa.hidden.' + stage, stage }));
check('Experimental/rework/prototype fixtures stay out of default browsing', !S.searchAssets([...assets, ...fake], { ...S.initialFilters }, [], []).some(a => a.id.startsWith('qa.hidden.')));
check('Every retained revision resolves only its saved identity', R.revisions.every(a => tuple(R.resolveItemAsset({ assetId: a.id, assetVersion: a.version, assetHash: a.sha256 })) === tuple(a)), { retained: R.revisions.length });
const negative = R.revisions.slice(0, 30).flatMap(a => [
  { assetId: a.id, assetVersion: 'qa-unavailable-version', assetHash: a.sha256 },
  { assetId: a.id, assetVersion: a.version, assetHash: 'f'.repeat(64) },
]);
check('Missing version/hash never falls back to the current ID', negative.every(i => R.resolveItemAsset(i) === undefined), { cases: negative.length });
for (const [producerRoom, appRoom] of [['entry-hall', 'entry'], ['laundry-utility', 'utility']]) {
  const ids = expected.filter(a => a.roomTags.includes(producerRoom)).map(tuple);
  const results = S.searchAssets(assets, { ...S.initialFilters, room: appRoom }, [], []);
  check(`${appRoom} alias exposes the complete reviewed producer room`, sameSet(results.map(tuple), ids), { expected: ids.length, actual: results.length });
}
const selected = filtered.slice(-4).map(a => a.id), recent = [...selected].reverse();
check('Favourites constrain the reviewed list', sameSet(S.searchAssets(assets, { ...S.initialFilters, favourites: true }, selected, []).map(a => a.id), selected));
check('Recents retain requested order', JSON.stringify(S.searchAssets(assets, { ...S.initialFilters, recent: true }, [], recent).map(a => a.id)) === JSON.stringify(recent));
const after = Object.fromEntries(files.map(f => [f, hash(fs.readFileSync(path.join(mobile, f)))]));
const stable = JSON.stringify(before) === JSON.stringify(after);
const anchors = {};
for (const a of filtered) {
  const key = a.placement?.anchor || 'floor';
  anchors[key] ||= { allReviewed: 0, distinct: 0, currentlyFloorPlaceable: 0 };
  anchors[key].allReviewed++;
  if (a.stage === 'internally-accepted') anchors[key].distinct++;
  if (R.supportsPlacement(a)) anchors[key].currentlyFloorPlaceable++;
}
const result = { checkedAtUtc: new Date().toISOString(), releaseManifestSha256: hash(releaseBytes), before, after, stable,
  reviewedRows: filtered.length, retainedRevisions: R.revisions.length, anchorCapabilities: anchors,
  passed: checks.filter(x => x.pass).length, failed: checks.filter(x => !x.pass).length, checks,
  limits: 'Actual production search/resolver on CPU against frozen release tuples. Does not execute catalogue gestures, rendered models, surface/wall placement, Expo or native GL.' };
fs.writeFileSync(path.join(__dirname, 'curated-library-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
process.exitCode = !stable || result.failed ? 1 : 0;
