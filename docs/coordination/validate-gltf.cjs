/* Formal Khronos glTF validation, isolated from app dependencies and source assets. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const validator = require('./validator-tools/node_modules/gltf-validator');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'furniture');
const output = path.join(__dirname, 'gltf-validation');
const reports = path.join(output, 'reports');
fs.mkdirSync(reports, { recursive: true });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bytes = fs.readFileSync(path.join(source, 'manifest.json'));
const manifest = JSON.parse(bytes);
async function main() {
  const rows = [], codeCounts = {};
  for (const a of manifest.assets) {
    try {
      const file = path.resolve(source, a.file);
      const relative = path.relative(source, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Source path escapes furniture directory');
      const data = fs.readFileSync(file);
      if (hash(data) !== a.sha256 || data.length !== a.bytes) throw Error('Source changed or manifest bytes/hash mismatch');
      const reportPath = path.join(reports, `${a.sha256}.json`);
      let report;
      if (fs.existsSync(reportPath)) {
        const saved = JSON.parse(fs.readFileSync(reportPath));
        if (saved.validatorVersion === validator.version()) report = saved.report;
      }
      if (!report) {
        report = await validator.validateBytes(new Uint8Array(data), {
          uri: `${a.id}@${a.version}.glb`, format: 'glb', maxIssues: 200,
          externalResourceFunction: async uri => { throw Error(`Unexpected external dependency: ${uri}`); }
        });
        fs.writeFileSync(reportPath, JSON.stringify({ sha256: a.sha256, validatorVersion: validator.version(), report }, null, 2) + '\n');
      }
      for (const message of report.issues.messages) codeCounts[message.code] = (codeCounts[message.code] || 0) + 1;
      rows.push({ id: a.id, version: a.version, sha256: a.sha256, qualityStatus: a.qualityStatus || a.stage, errors: report.issues.numErrors, warnings: report.issues.numWarnings, infos: report.issues.numInfos, hints: report.issues.numHints, truncated: report.issues.truncated, report: `reports/${a.sha256}.json` });
    } catch (error) {
      rows.push({ id: a.id, version: a.version, sha256: a.sha256, executionError: String(error) });
    }
  }
  const result = {
    checkedAtUtc: new Date().toISOString(), manifestSha256: hash(bytes),
    validator: 'KhronosGroup glTF-Validator', validatorVersion: validator.version(),
    documentation: 'https://github.com/KhronosGroup/glTF-Validator/blob/main/node/README.md',
    records: rows.length, assetsWithErrors: rows.filter(r => r.errors > 0).length,
    assetsWithWarnings: rows.filter(r => r.warnings > 0).length,
    executionFailures: rows.filter(r => r.executionError).length,
    truncatedReports: rows.filter(r => r.truncated).length,
    issueCodeCounts: codeCounts,
    limitations: 'Formal glTF validation with embedded resources; max200 detailed messages per asset. Does not establish visual/construction quality, design uniqueness, product safety, Expo/native loading or device performance.',
    rows
  };
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, rows: rows.filter(r => r.errors > 0 || r.executionError).slice(0, 12) }, null, 2));
  process.exitCode = result.assetsWithErrors || result.executionFailures ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
