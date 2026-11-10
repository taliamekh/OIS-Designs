"""Freeze current representative model/previews for independent visual follow-up."""
from pathlib import Path
import json, hashlib, shutil
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'furniture'
OUT=Path(__file__).resolve().parent/'asset-spotcheck'
OUT.mkdir(exist_ok=True)
manifest_bytes=(SOURCE/'manifest.json').read_bytes()
assets={a['id']:a for a in json.loads(manifest_bytes)['assets']}
slugs=['curved-seven-sofa','barrel-enclosure','draped-canopy-bed','wine-diagonal-cabinet','triangle-hairpin-coffee','cane-head-bed']
sheet=Image.new('RGB',(1500,920),'#f1f1eb')
draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',13)
records=[]
for index,slug in enumerate(slugs):
    asset=assets['ois.design.'+slug]
    model=SOURCE/asset['file']
    if hashlib.sha256(model.read_bytes()).hexdigest()!=asset['sha256']:
        raise ValueError('Model changed during snapshot: '+slug)
    row={key:asset.get(key) for key in ['id','version','sha256','qualityStatus','file','thumbnail','backThumbnail','dimensionsMetres','distinction','supportChecks','placement']}
    row['imageHashes']={}
    x,y=(index%3)*500,(index//3)*460
    for key,width,height,ox,oy in [('thumbnail',350,310,0,0),('backThumbnail',200,180,290,140)]:
        source=SOURCE/asset[key]
        raw=source.read_bytes()
        digest=hashlib.sha256(raw).hexdigest()
        frozen=f'{slug}@{asset["version"]}-{digest[:12]}-{key}.png'
        shutil.copyfile(source,OUT/frozen)
        row['imageHashes'][key]={'source':asset[key],'sha256':digest,'frozen':frozen}
        image=Image.open(OUT/frozen).convert('RGB')
        image.thumbnail((width,height))
        sheet.paste(image,(x+ox,y+oy))
    draw.text((x+8,y+327),slug,font=font,fill='#171b1c')
    draw.text((x+8,y+350),asset['version']+' / '+asset['qualityStatus'],font=small,fill='#535b5e')
    draw.text((x+8,y+371),'GLB '+asset['sha256'][:20],font=small,fill='#535b5e')
    import textwrap
    for n,line in enumerate(textwrap.wrap(asset['distinction'],width=62)[:3]):
        draw.text((x+8,y+395+n*16),line,font=small,fill='#343a3d')
    records.append(row)
sheet.save(OUT/'current-repairs.jpg',quality=94)
report={'sourceManifestSha256':hashlib.sha256(manifest_bytes).hexdigest(),'models':records,'limits':'Frozen front/back preview spot-check of six current revisions, not full-catalogue acceptance or native compatibility'}
(OUT/'records.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'models':len(records),'manifestSha256':report['sourceManifestSha256'],'output':str(OUT)}))
