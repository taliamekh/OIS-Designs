"""Independent byte-level image-index audit for the app's shared texture bank."""
import base64
import hashlib
import io
import json
import re
import struct
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
MOBILE = ROOT/'mobile'
INPUTS = ['src/catalogue/revisions.json', 'src/catalogue/texture-images.json']
raw = {name: (MOBILE/name).read_bytes() for name in INPUTS}
records, index = (json.loads(raw[name]) for name in INPUTS)
sha = lambda b: hashlib.sha256(b).hexdigest()
problems, rows, images = [], [], {}
seen = set()

for asset in records:
    digest = asset['sha256']
    if digest in seen:
        continue
    seen.add(digest)
    slug = re.sub(r'[^\w.-]', '_', asset['id'], flags=re.ASCII)
    file = MOBILE/'assets/furniture'/f'{slug}-{digest[:12]}.glb'
    try:
        blob = file.read_bytes()
        if sha(blob) != digest:
            raise ValueError('Copied GLB does not match immutable revision hash')
        magic, version, total = struct.unpack_from('<4sII', blob)
        if (magic, version, total) != (b'glTF', 2, len(blob)):
            raise ValueError('Invalid GLB header/length')
        offset, gltf, binary = 12, None, None
        while offset < len(blob):
            size, kind = struct.unpack_from('<I4s', blob, offset)
            chunk = blob[offset+8:offset+8+size]
            if len(chunk) != size:
                raise ValueError('Truncated GLB chunk')
            if kind == b'JSON':
                gltf = json.loads(chunk)
            elif kind == b'BIN\0':
                binary = chunk
            offset += 8 + size
        if gltf is None:
            raise ValueError('Missing JSON chunk')
        expected, checked = index.get(digest), []
        if expected is None:
            raise ValueError('Revision has no image-index entry')
        for number, image in enumerate(gltf.get('images', [])):
            mime = image.get('mimeType')
            if 'bufferView' in image:
                view = gltf['bufferViews'][image['bufferView']]
                if view['buffer'] != 0 or binary is None:
                    raise ValueError('Nonembedded image buffer')
                start, size = view.get('byteOffset', 0), view['byteLength']
                payload = binary[start:start+size]
                if start < 0 or len(payload) != size:
                    raise ValueError('Image bufferView outside BIN')
            elif image.get('uri', '').startswith('data:'):
                header, encoded = image['uri'].split(',', 1)
                if not header.endswith(';base64'):
                    raise ValueError('Unrecognized embedded image URI')
                mime, payload = header[5:-7], base64.b64decode(encoded, validate=True)
            else:
                raise ValueError('Unexpected external image; no complete sharing identity')
            actual = {'sha256': sha(payload), 'mimeType': mime or 'application/octet-stream'}
            if expected.get(str(number)) != actual:
                problems.append({'id': asset['id'], 'revision': digest, 'image': number,
                                 'problem': 'Image identity differs from actual GLB bytes',
                                 'expectedIndex': expected.get(str(number)), 'actual': actual})
            with Image.open(io.BytesIO(payload)) as picture:
                dimensions = [picture.width, picture.height]
                detected = Image.MIME.get(picture.format)
                picture.verify()
            if detected != mime:
                raise ValueError(f'Image MIME mismatch: {mime} vs {detected}')
            images.setdefault(actual['sha256'], {'bytes': len(payload), 'dimensions': dimensions,
                                                'mimeType': mime, 'references': 0})['references'] += 1
            checked.append({'index': number, **actual, 'dimensions': dimensions})
        if set(expected) != {str(i) for i in range(len(checked))}:
            raise ValueError('Image index contains missing/extra image numbers')
        rows.append({'id': asset['id'], 'sha256': digest, 'imageCount': len(checked), 'images': checked})
    except Exception as error:
        problems.append({'id': asset['id'], 'revision': digest, 'problem': str(error)})

extra = set(index)-seen
if extra:
    problems.append({'problem': 'Image index has revisions absent from retained registry', 'sha256': sorted(extra)})
result = {'checkedAtUtc': datetime.now(timezone.utc).isoformat(),
          'inputSha256': {n: sha(b) for n,b in raw.items()},
          'stableInputs': all((MOBILE/n).read_bytes() == b for n,b in raw.items()),
          'retainedRows': len(records), 'uniqueModelHashes': len(seen),
          'checkedModels': len(rows), 'embeddedImageReferences': sum(a['imageCount'] for a in rows),
          'uniqueImageHashes': len(images), 'problems': problems, 'images': images, 'rows': rows,
          'limits': 'Actual retained app GLB bytes, embedded image hashes/MIME/decodability and image-index correspondence. Not renderer semantic-key, physical native decode/upload, GPU residency or performance validation.'}
out = Path(__file__).with_name('app-texture-index-audit.json')
out.write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('rows','images')}, indent=2))
raise SystemExit(0 if result['stableInputs'] and not problems else 1)
