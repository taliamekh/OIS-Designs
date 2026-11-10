/* Headless interoperability check using the app's installed Three GLTFLoader.
 * Read-only producer assets. This is not an Expo/native/GPU test.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mobile = path.join(root, 'mobile');
const source = path.join(root, 'furniture');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifestBytes = fs.readFileSync(path.join(source, 'manifest.json'));
const manifest = JSON.parse(manifestBytes);
const THREE = await import(pathToFileURL(path.join(mobile, 'node_modules/three/build/three.module.js')));
const { GLTFLoader } = await import(pathToFileURL(path.join(mobile, 'node_modules/three/examples/jsm/loaders/GLTFLoader.js')));
const loader = new GLTFLoader();
const rows = [];
for (const asset of manifest.assets) {
  const start = performance.now();
  try {
    const relative = path.relative(source, path.resolve(source, asset.file));
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Asset path escapes furniture directory');
    const buffer = fs.readFileSync(path.join(source, relative));
    if (sha(buffer) !== asset.sha256) throw Error('Producer changed while snapshot was audited; rerun after atomic handoff');
    const array = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const model = await loader.parseAsync(array, '');
    model.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model.scene, true);
    const actual = [...box.min.toArray(), ...box.max.toArray()];
    const expected = [...asset.bounds.min, ...asset.bounds.max];
    const boundsError = Math.max(...actual.map((v, i) => Math.abs(v - expected[i])));
    if (!Number.isFinite(boundsError) || boundsError > 0.001) throw Error(`Three world bounds differ from manifest by ${boundsError} m`);
    const materials = new Set();
    const geometry = new Set();
    let triangles = 0, meshes = 0, primitives = 0;
    model.scene.traverse(node => {
      if (!node.isMesh) return;
      meshes++;
      geometry.add(node.geometry);
      for (const m of Array.isArray(node.material) ? node.material : [node.material]) materials.add(m);
      triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3;
      primitives += Math.max(1, node.geometry.groups.length);
    });
    if (triangles !== asset.triangles) throw Error(`Loaded triangles ${triangles} differ from manifest ${asset.triangles}`);
    const slots = [...materials].map(m => m.name);
    const missingSlots = asset.variantSlots.filter(slot => !slots.some(name => name.toLowerCase().includes(slot.toLowerCase())));
    if (missingSlots.length) throw Error(`App override matcher cannot find slots: ${missingSlots.join(', ')}`);
    rows.push({ id: asset.id, status: 'pass', meshes, triangles, primitives, materialNames: slots, boundsErrorMetres: boundsError, parseMilliseconds: performance.now() - start });
    // Test-created objects have no shared renderer resources. Dispose our clones.
    for (const g of geometry) g.dispose();
    for (const m of materials) m.dispose();
  } catch (error) {
    rows.push({ id: asset.id, status: 'fail', error: String(error), parseMilliseconds: performance.now() - start });
  }
}
const times = rows.filter(r => r.status === 'pass').map(r => r.parseMilliseconds).sort((a, b) => a - b);
const result = {
  checkedAtUtc: new Date().toISOString(),
  manifestSha256: sha(manifestBytes),
  threeRevision: THREE.REVISION,
  records: rows.length,
  passed: rows.filter(r => r.status === 'pass').length,
  failed: rows.filter(r => r.status === 'fail').length,
  headlessParseMedianMilliseconds: times[Math.floor(times.length / 2)] ?? null,
  headlessParseP95Milliseconds: times[Math.floor(times.length * 0.95)] ?? null,
  limitations: 'Actual installed Three GLTFLoader, scene/world bounds, triangle counts and material-slot matching on this Windows host. No GPU draw, native resource lifecycle, phone memory/performance or visual/semantic quality evidence.',
  rows
};
if (process.argv[2]) fs.writeFileSync(path.resolve(process.argv[2]), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, rows: rows.filter(r => r.status === 'fail') }, null, 2));
process.exitCode = result.failed ? 1 : 0;
