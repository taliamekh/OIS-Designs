"""Run production review guards against isolated synthetic files, never real decisions."""
import ast
import copy
import hashlib
import json
import re
import tempfile
import time
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
OUT = Path(__file__).with_name('review-guard-probe')
OUT.mkdir(exist_ok=True)
SOURCES = ['catalogue_manifest.py', 'record_visual_review.py']
raw_sources = {n: (BASE/'furniture/scripts'/n).read_bytes() for n in SOURCES}
sha = lambda data: hashlib.sha256(data).hexdigest()

def function_from_source(name, filename, namespace):
    tree = ast.parse(raw_sources[filename].decode('utf-8'))
    fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
    exec(compile(ast.Module(body=[fn], type_ignores=[]), filename, 'exec'), namespace)
    return namespace[name]

publisher = function_from_source('review_matches', 'catalogue_manifest.py', {'hashlib': hashlib, 're': re})
checks = []

def fixture(root):
    files = {'model.glb': b'synthetic model, not a real asset', 'front.png': b'front pixels',
             'back.png': b'back pixels', 'sheet.jpg': b'inspected sheet', 'archive.jpg': b'inspected sheet'}
    for name, data in files.items():
        (root/name).write_bytes(data)
    a = {'id': 'ois.design.synthetic', 'version': '1.0.0', 'sha256': sha(files['model.glb']),
         'file': 'model.glb', 'thumbnail': 'front.png', 'backThumbnail': 'back.png'}
    member = {'id': a['id'], 'version': a['version'], 'assetSha256': a['sha256'],
              'front': 'front.png', 'frontSha256': sha(files['front.png']),
              'back': 'back.png', 'backSha256': sha(files['back.png'])}
    d = {'sha256': a['sha256'], 'version': a['version'], 'status': 'pass', 'memberBinding': member,
         'sheetArchive': 'archive.jpg', 'sheetSha256': sha(files['sheet.jpg']),
         'imageSha256': {'front.png': sha(files['front.png']), 'back.png': sha(files['back.png'])}}
    return a, d, files

def publisher_case(name, mutate, expected=False):
    with tempfile.TemporaryDirectory(prefix='synthetic-', dir=OUT) as temp:
        root = Path(temp)
        a, d, files = fixture(root)
        mutate(root, a, d)
        actual, reason = publisher(root, a, d)
        checks.append({'guard': 'publisher', 'case': name, 'expected': expected, 'actual': actual,
                       'pass': actual == expected, 'reason': reason})

publisher_case('valid bound fixture', lambda *args: None, True)
publisher_case('old geometry metadata', lambda r,a,d: a.update(sha256='f'*64))
publisher_case('old version', lambda r,a,d: a.update(version='2.0.0'))
publisher_case('missing member binding', lambda r,a,d: d.pop('memberBinding'))
publisher_case('wrong member ID', lambda r,a,d: d['memberBinding'].update(id='other'))
publisher_case('wrong member geometry hash', lambda r,a,d: d['memberBinding'].update(assetSha256='e'*64))
publisher_case('wrong front path', lambda r,a,d: d['memberBinding'].update(front='other.png'))
publisher_case('changed front pixels', lambda r,a,d: (r/'front.png').write_bytes(b'new front'))
publisher_case('changed back pixels', lambda r,a,d: (r/'back.png').write_bytes(b'new back'))
publisher_case('missing front file with normal binding', lambda r,a,d: (r/'front.png').unlink())
publisher_case('changed archived sheet', lambda r,a,d: (r/'archive.jpg').write_bytes(b'changed'))
publisher_case('missing archived sheet with normal binding', lambda r,a,d: (r/'archive.jpg').unlink())
publisher_case('missing archive binding', lambda r,a,d: d.pop('sheetArchive'))
publisher_case('GLB bytes altered but old record/decision retained', lambda r,a,d: (r/'model.glb').write_bytes(b'corrupt replacement'))

def omit_missing_images(root,a,d):
    (root/'front.png').unlink()
    d['memberBinding'].pop('frontSha256')
    d['imageSha256'].pop('front.png')
publisher_case('missing image and omitted digest fields', omit_missing_images)

def omit_missing_archive(root,a,d):
    (root/'archive.jpg').unlink()
    d.pop('sheetSha256')
publisher_case('missing archive and omitted digest field', omit_missing_archive)

def recorder_case(name, mutate, expected=False):
    with tempfile.TemporaryDirectory(prefix='synthetic-', dir=OUT) as temp:
        root = Path(temp)
        a,d,files = fixture(root)
        records = root/'catalogue-v2/records'; records.mkdir(parents=True)
        review = root/'catalogue-v2/review'; review.mkdir()
        (review/'sheet.jpg').write_bytes(files['sheet.jpg'])
        (records/(a['id']+'.json')).write_text(json.dumps(a))
        index = {'schemaVersion': 2, 'sheets': [{'sheet': 'sheet.jpg', 'sheetSha256': d['sheetSha256'],
                  'archive': 'archive.jpg', 'ids': [a['id']], 'members': [copy.deepcopy(d['memberBinding'])]}]}
        mutate(root, a, index)
        (review/'index.json').write_text(json.dumps(index))
        namespace = {'ROOT': root, 'json': json, 'hashlib': hashlib, 'time': time}
        record = function_from_source('record', 'record_visual_review.py', namespace)
        try:
            record(['sheet.jpg'], note='Synthetic isolated test; no actual asset inspection/acceptance')
            actual, reason = True, 'returned'
        except Exception as error:
            actual, reason = False, str(error)
        checks.append({'guard': 'recorder', 'case': name, 'expected': expected,
                       'actual': actual, 'pass': actual == expected, 'reason': reason})

recorder_case('valid bound synthetic fixture', lambda *args: None, True)
recorder_case('legacy index without bindings', lambda r,a,i: i.update(schemaVersion=1))
recorder_case('stale sheet geometry', lambda r,a,i: i['sheets'][0]['members'][0].update(assetSha256='f'*64))
recorder_case('stale sheet version', lambda r,a,i: i['sheets'][0]['members'][0].update(version='0.9.0'))
recorder_case('changed front source', lambda r,a,i: (r/'front.png').write_bytes(b'changed'))
recorder_case('changed sheet pixels', lambda r,a,i: (r/'catalogue-v2/review/sheet.jpg').write_bytes(b'changed'))
recorder_case('missing sheet member', lambda r,a,i: i['sheets'][0].update(members=[]))
recorder_case('changed GLB bytes with stale metadata', lambda r,a,i: (r/'model.glb').write_bytes(b'changed'))
recorder_case('missing GLB bytes', lambda r,a,i: (r/'model.glb').unlink())

result = {'checkedAtUtc': time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
          'sourceSha256': {n: sha(b) for n,b in raw_sources.items()},
          'stableSource': all((BASE/'furniture/scripts'/n).read_bytes()==b for n,b in raw_sources.items()),
          'checks': checks, 'passed': sum(c['pass'] for c in checks), 'failed': sum(not c['pass'] for c in checks),
          'limits': 'Production function ASTs executed against isolated synthetic bytes only. No real assets or producer decisions modified; not visual/native validation.'}
(OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
raise SystemExit(0 if result['failed']==0 and result['stableSource'] else 1)
