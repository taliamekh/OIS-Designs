/* Independent QA: production sources and dependencies are read-only. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const qa = __dirname;
const root = path.resolve(qa, '../../..');
const mobile = path.join(root, 'mobile');
const node = 'C:\\Users\\talia\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const npmBin = 'C:\\Users\\talia\\Documents\\Codex\\calhacks13-p0\\tools\\node-v24.22.1-win-x64';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function snapshot() {
  const files = {};
  const visit = relative => {
    const full = path.join(mobile, relative);
    if (!fs.existsSync(full)) return;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(full).sort()) visit(path.join(relative, name));
    } else {
      try { const bytes = fs.readFileSync(full); files[relative.replaceAll('\\', '/')] = { bytes: bytes.length, sha256: sha(bytes) }; }
      catch (error) { files[relative] = { error: String(error) }; }
    }
  };
  for (const relative of ['package.json', 'package-lock.json', 'app.json', 'metro.config.js', 'babel.config.js', 'eslint.config.js', 'tsconfig.json', 'src', 'scripts', 'assets']) visit(relative);
  const installed = {};
  for (const name of ['expo', 'react', 'react-native', 'expo-router', 'typescript', 'eslint', 'expo-gl', '@react-three/fiber', 'three', 'expo-file-system', 'expo-sharing', 'expo-document-picker', '@react-native-async-storage/async-storage']) {
    try { installed[name] = JSON.parse(fs.readFileSync(path.join(mobile, 'node_modules', name, 'package.json'))).version; }
    catch (error) { installed[name] = { error: error.code }; }
  }
  return { at: new Date().toISOString(), sha256: sha(JSON.stringify({ files, installed })), installed, files };
}

const kind = process.argv[2];
if (kind === 'snapshot') { process.stdout.write(JSON.stringify(snapshot(), null, 2) + '\n'); process.exit(0); }
const id = new Date().toISOString().replaceAll(/[:.]/g, '-') + '-' + kind;
const runDir = path.join(qa, 'runs', id);
fs.mkdirSync(runDir, { recursive: true });
const outDir = path.join(runDir, 'export');
const commands = {
  lint: ['node_modules/expo/bin/cli', 'lint', '--no-cache'],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false'],
  'sdk-check': ['node_modules/expo/bin/cli', 'install', '--check'],
  config: ['node_modules/expo/bin/cli', 'config', '--type', 'public', '--json'],
  'npm-tree': [path.join(npmBin, 'node_modules/npm/bin/npm-cli.js'), 'ls', '--all', '--json'],
  'ios-export': ['node_modules/expo/bin/cli', 'export', '--platform', 'ios', '--output-dir', outDir, '--no-bytecode', '--max-workers', '2', '--dump-assetmap'],
  'android-export': ['node_modules/expo/bin/cli', 'export', '--platform', 'android', '--output-dir', outDir, '--no-bytecode', '--max-workers', '2', '--dump-assetmap'],
  'web-export': ['node_modules/expo/bin/cli', 'export', '--platform', 'web', '--output-dir', outDir, '--max-workers', '2', '--dump-assetmap'],
};
if (!commands[kind]) throw Error('Unknown read-only check: ' + kind);
const before = snapshot();
fs.writeFileSync(path.join(runDir, 'before.json'), JSON.stringify(before, null, 2));
const args = commands[kind];
const log = fs.createWriteStream(path.join(runDir, 'output.log'));
const started = Date.now();
let bytes = 0, truncated = false;
const child = spawn(node, args, {
  cwd: mobile, windowsHide: true,
  env: { ...process.env, PATH: path.dirname(node) + path.delimiter + npmBin + path.delimiter + (process.env.PATH || ''), CI: '1', EXPO_NO_TELEMETRY: '1', npm_config_cache: path.join(runDir, 'npm-cache'), npm_config_audit: 'false', npm_config_fund: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {
  if (bytes < 2 * 1024 * 1024) { log.write(data); bytes += data.length; }
  else if (!truncated) { truncated = true; log.write('\n[QA output capped at 2 MiB]\n'); }
});
child.on('error', error => { log.write(String(error)); });
child.on('close', (code, signal) => {
  const after = snapshot();
  const changedFiles = [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].filter(file => JSON.stringify(before.files[file]) !== JSON.stringify(after.files[file]));
  const result = { id, kind, startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString(), durationMs: Date.now() - started, executable: node, args, cwd: mobile, exitCode: code, signal, beforeHash: before.sha256, afterHash: after.sha256, stableSnapshot: before.sha256 === after.sha256, changedFiles, outputTruncated: truncated, installed: after.installed };
  fs.writeFileSync(path.join(runDir, 'after.json'), JSON.stringify(after, null, 2));
  fs.writeFileSync(path.join(runDir, 'result.json'), JSON.stringify(result, null, 2));
  log.end();
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = code ?? 1;
});
