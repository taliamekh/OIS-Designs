"""Read-only embedded-image reuse and uncompressed-size estimates for the frozen fixture."""
from pathlib import Path
from collections import defaultdict
from PIL import Image
import json, struct, hashlib, io

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent/'textured-fixture-0.3.2'
fixture=json.loads((OUT/'fixture-snapshot.json').read_text())
groups=defaultdict(list)
rows=[]
total=0
for asset in fixture['assets']:
    data=(ROOT/'furniture'/asset['file']).read_bytes()
    if hashlib.sha256(data).hexdigest()!=asset['sha256']:
        raise ValueError('Frozen fixture model hash mismatch')
    length=struct.unpack_from('<I',data,12)[0]
    gltf=json.loads(data[20:20+length])
    if data[24+length:28+length]!=b'BIN\x00':
        raise ValueError('Expected embedded BIN chunk')
    start=28+length
    images=[]
    for index,image in enumerate(gltf.get('images',[])):
        view=gltf['bufferViews'][image['bufferView']]
        offset=start+view.get('byteOffset',0)
        raw=data[offset:offset+view['byteLength']]
        digest=hashlib.sha256(raw).hexdigest()
        picture=Image.open(io.BytesIO(raw))
        cost=picture.width*picture.height*4
        total+=cost
        groups[digest].append({'asset':asset['id'],'image':index,'baseRGBABytes':cost})
        images.append({'sha256':digest,'width':picture.width,'height':picture.height,'bytes':len(raw)})
    rows.append({'id':asset['id'],'images':images})
result={
    'models':len(rows),'embeddedImageReferences':sum(len(row['images']) for row in rows),
    'uniqueImageHashes':len(groups),'baseRGBABytesWithoutCrossModelSharing':total,
    'baseRGBABytesIfIdenticalImagesShared':sum(v[0]['baseRGBABytes'] for v in groups.values()),
    'duplicateGroups':{key:value for key,value in groups.items() if len(value)>1},'rows':rows,
    'limits':'Source image dimensions/content hashes and RGBA8 estimates only, not measured GPU residency. Sharing must preserve colour-space, sampler and transform semantics.'
}
(OUT/'image-bank.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({key:value for key,value in result.items() if key not in ['rows','duplicateGroups']},indent=2))
