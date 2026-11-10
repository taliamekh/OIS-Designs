"""Freeze model/image identities into independent review sheets without producer edits."""
from pathlib import Path
from collections import defaultdict
import json, hashlib, textwrap
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'furniture'
raw=(SOURCE/'manifest.json').read_bytes()
digest=hashlib.sha256(raw).hexdigest()
OUT=Path(__file__).resolve().parent/'independent-review'/digest[:16]
OUT.mkdir(parents=True,exist_ok=True)
groups=defaultdict(list)
for asset in json.loads(raw)['assets']:
    if asset['id'].startswith('ois.design.'):
        groups[asset['roomTags'][0]].append(asset)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',12)
pages=[]
for room,assets in sorted(groups.items()):
    assets.sort(key=lambda a:a['id'])
    for start in range(0,len(assets),12):
        batch=assets[start:start+12]
        page=f'{room}-{start//12+1:02}.jpg'
        sheet=Image.new('RGB',(1600,1250),'#f1f1eb')
        draw=ImageDraw.Draw(sheet)
        draw.text((12,8),f'{room} / independent current-revision review / source {digest[:16]}',font=font,fill='#161c1d')
        members=[]
        for index,a in enumerate(batch):
            model=SOURCE/a['file']
            if hashlib.sha256(model.read_bytes()).hexdigest()!=a['sha256']:
                raise ValueError('Model changed during freeze: '+a['id'])
            member={'id':a['id'],'version':a['version'],'assetSha256':a['sha256'],'file':a['file'],'distinction':a['distinction'],'countEligible':a['countEligible'],'familyId':a['familyId'],'qualityStatus':a['qualityStatus'],'images':{}}
            x,y=(index%4)*400,(index//4)*400+42
            for key,side,w,h,ox,oy in [('thumbnail','front',320,280,0,0),('backThumbnail','back',150,132,248,148)]:
                raw_image=(SOURCE/a[key]).read_bytes()
                image=Image.open(SOURCE/a[key]).convert('RGB')
                image.thumbnail((w,h))
                sheet.paste(image,(x+ox,y+oy))
                member['images'][side]={'file':a[key],'sha256':hashlib.sha256(raw_image).hexdigest()}
            draw.text((x+7,y+282),a['id'].removeprefix('ois.design.'),font=small,fill='#15191a')
            draw.text((x+7,y+301),f'{a["version"]} / {a["theme"]} / eligible {a["countEligible"]}',font=small,fill='#555b5d')
            d=a['dimensionsMetres']
            draw.text((x+7,y+320),f'{d["width"]:.2f}x{d["depth"]:.2f}x{d["height"]:.2f}m / {a["triangles"]}tri / {a["sha256"][:8]}',font=small,fill='#555b5d')
            for n,line in enumerate(textwrap.wrap(a['distinction'],width=57)[:3]):
                draw.text((x+7,y+340+n*15),line,font=small,fill='#34393b')
            members.append(member)
        sheet.save(OUT/page,quality=93)
        pages.append({'sheet':page,'sheetSha256':hashlib.sha256((OUT/page).read_bytes()).hexdigest(),'room':room,'members':members})
result={'manifestSha256':digest,'sourceVersion':json.loads(raw).get('catalogueVersion'),'newCandidateCount':sum(len(g) for g in groups.values()),'sheets':pages,'limits':'Frozen image/GLB identities and contact sheets only; review decisions must follow actual visual inspection. Does not promote or count any design.'}
(OUT/'index.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'models':result['newCandidateCount'],'sheets':len(pages),'manifestSha256':digest,'output':str(OUT)}))
