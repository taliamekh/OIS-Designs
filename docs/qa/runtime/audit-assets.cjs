/* Checks only the bytes already integrated by the app owner; never syncs or edits assets. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const mobile = path.join(root, 'mobile');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const run = path.join(__dirname, 'runs', new Date().toISOString().replaceAll(/[:.]/g, '-') + '-asset-audit');
fs.mkdirSync(run, { recursive: true });
const startedAt = new Date().toISOString();
const catalogueFile = path.join(mobile, 'src/catalogue/assets.json');
const bundledFile = path.join(mobile, 'src/catalogue/bundled.ts');
const catalogueBytes = fs.readFileSync(catalogueFile), bundledBytes = fs.readFileSync(bundledFile);
const catalogue = JSON.parse(catalogueBytes), bundled = bundledBytes.toString();
const errors = [], models = [], materials = [];
const requires = require('./bundle-references.cjs')(bundledFile, bundledBytes);
const ids = new Set();
for (const asset of catalogue) {
  if (ids.has(asset.id)) errors.push({ id: asset.id, error: 'Duplicate catalogue ID' });
  ids.add(asset.id);
  const relative = requires.get(asset.id);
  if (!relative) { errors.push({ id: asset.id, error: 'No statically bundled GLB require' }); continue; }
  const file = path.resolve(path.dirname(bundledFile), relative);
  if (!file.startsWith(path.join(mobile, 'assets') + path.sep)) { errors.push({ id: asset.id, error: 'GLB require leaves asset directory' }); continue; }
  try {
    const bytes = fs.readFileSync(file);
    const sha256 = hash(bytes);
    if (sha256 !== asset.sha256 || bytes.length !== asset.bytes) errors.push({ id: asset.id, error: 'App metadata hash or byte count differs from bundled bytes' });
    if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw Error('Invalid GLB header/version/length');
    let offset = 12, json, binaryBytes = 0;
    while (offset < bytes.length) {
      const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
      if (length % 4 || offset + 8 + length > bytes.length) throw Error('Invalid GLB chunk range or alignment');
      if (type === 0x4e4f534a) json = JSON.parse(bytes.toString('utf8', offset + 8, offset + 8 + length).trim());
      if (type === 0x004e4942) binaryBytes += length;
      offset += 8 + length;
    }
    if (!json || !Array.isArray(json.meshes) || !json.meshes.length) throw Error('Missing GLTF JSON/meshes');
    const required = json.extensionsRequired || [];
    const decoderRequired = required.filter(x => /draco|meshopt|basisu/i.test(x));
    if (decoderRequired.length) errors.push({ id: asset.id, error: 'Runtime decoder required', extensions: decoderRequired });
    const external = [...(json.buffers || []), ...(json.images || [])].filter(x => x.uri && !x.uri.startsWith('data:')).map(x => x.uri);
    if (external.length) errors.push({ id: asset.id, error: 'External resource URI in bundled GLB', uris: external });
    models.push({ id: asset.id, file: path.relative(root, file), bytes: bytes.length, sha256, binaryBytes, meshes: json.meshes.length, nodes: json.nodes?.length || 0, accessors: json.accessors?.length || 0, materials: json.materials?.length || 0, geometryFamily: asset.geometryFamily });
  } catch (error) { errors.push({ id: asset.id, error: String(error) }); }
}
for (const name of fs.readdirSync(path.join(mobile, 'assets/materials')).filter(n => n.endsWith('.png')).sort()) {
  const bytes = fs.readFileSync(path.join(mobile, 'assets/materials', name));
  if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a') errors.push({ file: name, error: 'Invalid PNG signature' });
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  materials.push({ file: name, bytes: bytes.length, sha256: hash(bytes), width, height, rgbaDecodeBytes: width * height * 4, powerOfTwo: width > 0 && (width & (width - 1)) === 0 && height > 0 && (height & (height - 1)) === 0 });
}
const source = JSON.parse(fs.readFileSync(path.join(root, 'furniture/manifest.json')));
const sourceById = new Map(source.assets.map(a => [a.id, a]));
const sourceDifferences = catalogue.filter(a => sourceById.get(a.id)?.sha256 !== a.sha256).map(a => a.id);
const stableInputs = hash(fs.readFileSync(catalogueFile)) === hash(catalogueBytes) && hash(fs.readFileSync(bundledFile)) === hash(bundledBytes);
const result = { startedAt, finishedAt: new Date().toISOString(), stableInputs, catalogueHash: hash(catalogueBytes), bundledHash: hash(bundledBytes), records: catalogue.length, geometryFamilies: new Set(models.map(m => m.geometryFamily)).size, totalGLBBytes: models.reduce((n,m) => n + m.bytes, 0), textureFiles: materials.length, textureCompressedBytes: materials.reduce((n,m) => n + m.bytes, 0), textureBaseRGBADecodeBytes: materials.reduce((n,m) => n + m.rgbaDecodeBytes, 0), sourceRecords: source.assets.length, sourceDifferences, errors, models, materials, scope: 'Static app-integrated asset bytes only; does not claim GPU residency, physical memory, native decoding, design count, or render quality.' };
fs.writeFileSync(path.join(run, 'result.json'), JSON.stringify(result, null, 2));
process.stdout.write(JSON.stringify({ ...result, errors: result.errors.slice(0,10), errorCount: result.errors.length, models: undefined, materials: undefined, artifact: path.join(run, 'result.json') }) + '\n');
process.exitCode = errors.length || !stableInputs ? 1 : 0;
