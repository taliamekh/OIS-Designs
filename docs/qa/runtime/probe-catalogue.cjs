const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { load, root, mobile } = require('./probe-domain.cjs');
const { searchAssets, initialFilters } = load('src/catalogue/search.ts');
const consumer = JSON.parse(fs.readFileSync(path.join(mobile, 'src/catalogue/assets.json'), 'utf8'));
const rawProducer = fs.readFileSync(path.join(root, 'furniture/manifest.json'), 'utf8');
const producerJSON = JSON.parse(rawProducer);
const producer = Array.isArray(producerJSON) ? producerJSON : producerJSON.assets ?? producerJSON.models ?? producerJSON.items;
if (!Array.isArray(producer)) throw Error(`Unknown producer shape: ${Object.keys(producerJSON)}`);
const checks = [];
for (const [room, tag] of [['entry', 'entry-hall'], ['utility', 'laundry-utility']]) {
  const fixture = producer.find(a => a.roomTags?.includes(tag));
  if (!fixture) { checks.push({ id: `ROOM-${room}`, pass: false, harnessError: `No real ${tag} fixture` }); continue; }
  const found = searchAssets([fixture], { ...initialFilters, room }, [], []);
  checks.push({ id: `ROOM-${room}`, expected: `Producer tag ${tag} maps to app room ${room}`, pass: found.some(a => a.id === fixture.id), fixture: { id: fixture.id, roomTags: fixture.roomTags }, observed: { results: found.length } });
}
const sofa = consumer.find(a => /sofa|couch/i.test(a.name + a.subtype + a.searchAliases.join(' ')));
if (sofa) {
  checks.push({ id: 'QUERY-SYNONYM', pass: searchAssets([sofa], { ...initialFilters, query: 'couch' }, [], []).length === 1, fixture: sofa.id });
  checks.push({ id: 'FAVOURITE', pass: searchAssets([sofa], { ...initialFilters, favourites: true }, [sofa.id], []).length === 1 && searchAssets([sofa], { ...initialFilters, favourites: true }, [], []).length === 0, fixture: sofa.id });
  checks.push({ id: 'FIT-DIMENSION', pass: searchAssets([sofa], { ...initialFilters, width: String(sofa.dimensionsMetres.width - .01) }, [], []).length === 0 && searchAssets([sofa], { ...initialFilters, width: String(sofa.dimensionsMetres.width + .01) }, [], []).length === 1, fixture: sofa.id });
}
for (const bed of ['twin', 'full', 'queen', 'king', 'bunk', 'loft']) {
  const fixtures = producer.filter(a => a.bedSize === bed);
  checks.push({ id: `BED-${bed}`, pass: fixtures.length > 0 && searchAssets(fixtures, { ...initialFilters, bed }, [], []).length === fixtures.length, observed: { producerFixtures: fixtures.length } });
}
const source = fs.readFileSync(path.join(mobile, 'src/scene/RoomScene.tsx'), 'utf8');
const silentVersion = /if\s*\(\s*item\.assetVersion\s*!==\s*asset\.version\s*\|\|\s*item\.assetHash\s*!==\s*asset\.sha256\s*\)\s*return null/.test(source);
checks.push({ id: 'VERSION-CONFLICT-RECOVERY', evidence: 'Static renderer guard, not rendered state', pass: !silentVersion, expected: 'Version/hash conflicts need visible, recoverable asset state; retain saved transform.', observed: { silentVersionReturn: silentVersion } });
const changes = consumer.filter(a => { const produced = producer.find(b => b.id === a.id); return produced && (produced.sha256 !== a.sha256 || produced.version !== a.version); }).map(a => a.id);
const result = { timestamp: new Date().toISOString(), producerSha256: crypto.createHash('sha256').update(rawProducer).digest('hex'), searchSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile, 'src/catalogue/search.ts'))).digest('hex'), rendererSha256: crypto.createHash('sha256').update(source).digest('hex'), producerRecords: producer.length, consumerRecords: consumer.length, unimportedRecords: producer.filter(a => !consumer.some(b => b.id === a.id)).length, consumerIdsWithProducerVersionConflict: changes, passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks };
fs.writeFileSync(path.join(__dirname, 'catalogue-results.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
