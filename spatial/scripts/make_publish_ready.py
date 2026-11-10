"""Create a byte-bound explicit publication list; never stages or commits anything."""
from pathlib import Path
import hashlib
import json
from datetime import datetime, timezone

WORKSPACE = Path(__file__).resolve().parents[2]
TARGET = WORKSPACE / 'docs/spatial/PUBLISH_READY.json'
if TARGET.exists():
    raise SystemExit('Publication list already exists; coordinate a new revision before replacing it')

paths = {WORKSPACE / 'spatial' / n for n in ('README.md', 'package.json', 'tsconfig.json')}
for folder in ('src', 'dist', 'fixtures', 'adoption', 'review', 'scripts'):
    paths.update(p for p in (WORKSPACE / 'spatial' / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
paths.update((WORKSPACE / 'spatial/tests').glob('*.test.mjs'))
paths.add(WORKSPACE / 'spatial/tests/all-spatial-result.log')
paths.update((WORKSPACE / 'docs/spatial').glob('*.md'))
for folder in ('browser-r6', 'production-fixture-r2', 'production-policy-r2', 'support-browser-r2', 'support-family-browser-r1', 'level-browser-r3', 'ceiling-browser-r4', 'batch-browser-r6', 'batch-contract-r1'):
    paths.update(p for p in (WORKSPACE / 'spatial/evidence' / folder).rglob('*') if p.is_file())

files = []
for p in sorted(paths):
    relative = p.relative_to(WORKSPACE).as_posix()
    assert relative.startswith(('spatial/', 'docs/spatial/'))
    data = p.read_bytes()
    files.append({'path': relative, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
                  'readiness': 'frozen-experimental-browser-draft' if 'batch' in relative.lower() else 'ready-review-source-or-evidence'})

report = {
    'schemaVersion': 1,
    'createdAtUtc': datetime.now(timezone.utc).isoformat(),
    'ownerThreadId': '01a1bd3f-562d-73d2-8ea3-8a5344049c49',
    'status': 'ready-for-coordinator-publication-not-overall-completion',
    'freeze': 'Listed bytes will remain unchanged through coordinator publication. Root is sole Git writer. This list excludes mobile sources, user saves, live session URLs and incomplete evidence revisions.',
    'adopted': ['mobile/src/scene/spatialView.ts', 'mobile/src/screens/HouseViews.tsx'],
    'adoptedOwnership': 'App owner; listed here only as context, not assigned/staged by this package.',
    'unadopted': ['supported height/attachment schema and commands', 'attached-family production Undo/save', 'stair/void persisted editing and Walk traversal', 'sloped/vaulted/soffit production profiles', 'double-height connectivity', 'static batching'],
    'checks': {'strictTypeScript': 'pass', 'ownedNodeRegressions': {'pass': 77, 'fail': 0},
               'originalViewBrowserChecks': 17, 'adoptedPolicyRegressions': 19,
               'supportTopMeshSamples': 15, 'realFamilyMembers': 3, 'ceilingHeightRays': 20,
               'batchNearestSurfaceProbes': 344, 'batchMaterialOwnershipCases': 17},
    'batchingDisposition': 'Frozen experimental draft; 143 to 75 browser calls with 7.25MiB extra geometry and small pixel differences. Withheld from production/native adoption.',
    'reproduction': 'spatial/README.md; requires matching repository furniture release and installed mobile dependencies. No copied dependency tree or standalone app claim.',
    'scope': 'Source/prototype review evidence only. Physical phone/native acceptance and full original Phase 3 completion are not established. Work remains active through at least 06:53 UTC.',
    'files': files,
    'publicationListPath': 'docs/spatial/PUBLISH_READY.json',
    'publicationListSelfHash': 'Excluded to avoid self-reference; publish this JSON alongside its listed paths.',
}
TARGET.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8', newline='')
for entry in files:
    assert hashlib.sha256((WORKSPACE / entry['path']).read_bytes()).hexdigest() == entry['sha256']
print(json.dumps({'ready': True, 'files': len(files), 'bytes': sum(f['bytes'] for f in files), 'manifest': str(TARGET), 'sha256': hashlib.sha256(TARGET.read_bytes()).hexdigest()}))
