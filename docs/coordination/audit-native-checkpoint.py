"""Read-only verification of the app owner's current iOS/Android export checkpoint."""
import hashlib
import json
import re
import struct
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MOBILE = ROOT / 'mobile'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def snapshot():
    paths = list((MOBILE / 'src').rglob('*')) + list((MOBILE / 'assets/brand').rglob('*'))
    paths += [MOBILE / name for name in ['package.json', 'package-lock.json', 'app.json', 'metro.config.js', 'tsconfig.json']]
    # Node sorts case-sensitively; Windows Path ordering otherwise folds case.
    paths = sorted((p for p in paths if p.is_file()), key=str)
    rows = [[p.relative_to(MOBILE).as_posix(), sha(p.read_bytes())] for p in paths]
    return {'files': len(rows), 'sha256': sha(json.dumps(rows, separators=(',', ':')).encode())}


before = snapshot()
revisions = load(MOBILE / 'src/catalogue/revisions.json')
expected = {a['sha256']: a for a in revisions}
compiler = MOBILE / 'node_modules/hermes-compiler/hermesc/win64-bin/hermesc.exe'
version_text = subprocess.check_output([str(compiler), '-version'], text=True)
bytecode_version = int(re.search(r'HBC bytecode version:\s*(\d+)', version_text)[1])
issues = []
reports = []
for platform in ['ios', 'android']:
    owner = load(ROOT / f'docs/build/export-{platform}-verified.json')
    output = MOBILE / owner['output']
    meta_raw = (output / 'metadata.json').read_bytes()
    entry = json.loads(meta_raw)['fileMetadata'][platform]

    def exported(relative):
        p = (output / relative.replace('\\', '/')).resolve()
        if not p.is_relative_to(output.resolve()):
            raise ValueError('Export path escapes checkpoint')
        return p.read_bytes()

    binary = exported(entry['bundle'])
    if binary[:8].hex() != 'c61fbc03c103191f' or struct.unpack_from('<I', binary, 8)[0] != bytecode_version:
        issues.append(f'{platform}: wrong Hermes header/version')
    if owner['exit'] != 0 or not owner['stable'] or owner['before'] != before or owner['after'] != before:
        issues.append(f'{platform}: source fingerprint does not match current stable checkpoint')
    compiled = owner['provenance']['compiled']
    for row in compiled:
        if not row['matches'] or sha((MOBILE / row['file']).read_bytes()) != row['compiledSha256']:
            issues.append(f'{platform}: compiled source changed: {row["file"]}')
    models = []
    for asset in entry['assets']:
        if asset['ext'] != 'glb':
            continue
        raw = exported(asset['path'])
        digest = sha(raw)
        record = expected.get(digest)
        if not record or len(raw) != record['bytes']:
            issues.append(f'{platform}: unexpected/mismatched GLB {asset["path"]}')
        models.append((digest, len(raw)))
    if {h for h, _ in models} != set(expected):
        issues.append(f'{platform}: missing exact retained GLBs')
    reports.append({'platform': platform, 'sourceFingerprint': owner['before'], 'compiledSourceMatches': len(compiled),
                    'bundle': entry['bundle'], 'bundleBytes': len(binary), 'bundleSha256': sha(binary),
                    'hbcVersion': bytecode_version, 'metadataSha256': sha(meta_raw),
                    'exportedGlbs': len(models), 'exportedGlbBytes': sum(n for _, n in models),
                    'exportedHashSetSha256': sha('\n'.join(sorted(h for h, _ in models)).encode())})
after = snapshot()
if before != after:
    issues.append('Production source changed during audit')
result = {'at': datetime.now(timezone.utc).isoformat(), 'before': before, 'after': after,
          'compilerSha256': sha(compiler.read_bytes()), 'expectedRetainedRevisions': len(revisions),
          'expectedUniqueModelHashes': len(expected), 'platforms': reports, 'issues': issues,
          'limits': 'Actual Hermes header/version, export model bytes and current source fingerprint/provenance. Compiler output is not native linking, VM launch, EXGL decoding or physical-device execution.'}
(ROOT / 'docs/coordination/native-checkpoint-audit.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, indent=2))
raise SystemExit(bool(issues))
