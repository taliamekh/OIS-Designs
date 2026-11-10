/* Independent HTTP client check of advertised native launch routes; no server mutation. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const mobile = path.resolve(__dirname, '../../mobile'), sha = b => crypto.createHash('sha256').update(b).digest('hex');
const connection = JSON.parse(fs.readFileSync(path.join(mobile, '.expo/ois-preview-connection.json')));
const assets = JSON.parse(fs.readFileSync(path.join(mobile, 'src/catalogue/assets.json')));
const asset = assets.find(a => a.sha256.startsWith('d46cc8be7673'));
const binding = fs.readFileSync(path.join(mobile, 'src/catalogue/bundled.ts'), 'utf8').split('\n').find(line => line.includes(asset.sha256));
const relative = /require\(["']([^"']+)["']\)/.exec(binding)[1];
const modelPath = path.relative(mobile, path.resolve(mobile, 'src/catalogue', relative)).replaceAll('\\', '/');
function snapshot() {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file); else files.push(file);
    }
  }
  walk(path.join(mobile, 'src'));
  files.push(...['app.json', 'metro.config.js', 'package.json', 'package-lock.json'].map(f => path.join(mobile, f)));
  return Object.fromEntries(files.sort().map(f => [path.relative(mobile, f).replaceAll('\\', '/'), sha(fs.readFileSync(f))]));
}
async function checked(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw Error(`HTTP ${response.status} at ${new URL(url).pathname}`);
  return response;
}
(async () => {
  const before = snapshot(), startedAt = new Date().toISOString();
  const routes = await Promise.all([['local', 'http://127.0.0.1:8081'], ['public', connection.publicBase]].map(async ([kind, base]) => {
    const manifestResponse = await checked(base + '/', { 'expo-platform': 'ios', 'expo-protocol-version': '1', accept: 'application/expo+json', 'ngrok-skip-browser-warning': 'true' });
    const manifest = await manifestResponse.json();
    if (!manifest.launchAsset?.url) throw Error('No advertised native launch asset');
    const [bundleResponse, modelResponse] = await Promise.all([
      checked(manifest.launchAsset.url, { 'ngrok-skip-browser-warning': 'true' }),
      checked(base + '/assets/' + modelPath + '?platform=ios', { 'ngrok-skip-browser-warning': 'true' }),
    ]);
    const [bundle, model] = await Promise.all([bundleResponse.arrayBuffer().then(b => Buffer.from(b)), modelResponse.arrayBuffer().then(b => Buffer.from(b))]);
    const markers = Object.fromEntries(['Apply room move', 'View options', asset.sha256].map(text => [text.length > 40 ? 'finalLibraryHash' : text, bundle.includes(Buffer.from(text))]));
    if (!/javascript/.test(bundleResponse.headers.get('content-type') || '') || bundle.length < 1000000 || Object.values(markers).some(v => !v)) throw Error('Advertised bundle lacks current app markers');
    if (sha(model) !== asset.sha256 || model.length !== asset.bytes || model.toString('ascii', 0, 4) !== 'glTF' || model.readUInt32LE(8) !== model.length) throw Error('Served model bytes differ from exact current binding');
    return { kind, manifestStatus: manifestResponse.status, runtimeVersion: manifest.runtimeVersion, advertisedBundlePath: new URL(manifest.launchAsset.url).pathname,
      bundleStatus: bundleResponse.status, bundleBytes: bundle.length, bundleSha256: sha(bundle), currentFeatureMarkers: markers,
      modelStatus: modelResponse.status, modelBytes: model.length, modelSha256: sha(model) };
  }));
  const after = snapshot(), stable = JSON.stringify(before) === JSON.stringify(after);
  const result = { startedAt, completedAt: new Date().toISOString(), stable, before, after, routes,
    limits: 'Independent real HTTP requests to local/public manifest, advertised native JS and prior failing GLB, with current feature markers. No device launch, native linking, GL upload or physical touch claim. Transient connection URLs are read only from ignored local state and omitted here.' };
  fs.writeFileSync(path.join(__dirname, 'preview-route-independent.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, before: undefined, after: undefined }, null, 2));
  if (!stable) process.exitCode = 1;
})().catch(error => { console.error(String(error)); process.exitCode = 1; });
