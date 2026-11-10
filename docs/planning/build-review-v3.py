"""Assemble a review-only fragment with real local GLBs and original procedural texture studies."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import base64,gzip,hashlib,io,json,random

folder=Path(__file__).resolve().parent
repo=folder.parents[1]
lib=repo/'furniture'
manifest=json.loads((lib/'manifest.json').read_text(encoding='utf-8'))
target=Path('C:/Users/talia/.codex/visualizations/2026/11/08/01a1bcd1-1d0e-73d2-9d70-4b706a2121c7/ois-phone-mockups.html')

def uri(im,fmt='JPEG'):
    b=io.BytesIO();im.save(b,fmt,quality=79);return 'data:image/'+('jpeg' if fmt=='JPEG' else 'png')+';base64,'+base64.b64encode(b.getvalue()).decode()

def floor_texture(kind):
    rng=random.Random(811+kind);size=256
    colours=[(192,162,115),(101,70,48),(211,189,139),(165,131,84),(180,159,104),(100,108,112),(222,222,217),(204,192,174),(165,162,153),(183,171,150)]
    base=colours[kind];im=Image.new('RGB',(size,size),base);d=ImageDraw.Draw(im)
    def shade(c,delta):return tuple(max(0,min(255,v+delta)) for v in c)
    if kind in [0,1,2,4]:
        for x in range(0,size,43):
            c=shade(base,rng.randint(-14,14));d.rectangle((x,0,x+41,size),fill=c)
            for n in range(28):
                xx=x+rng.randrange(42);pts=[(xx+int(2.5*__import__('math').sin(y*.035+n)),y) for y in range(0,size,6)]
                d.line(pts,fill=shade(c,rng.choice([-20,-12,9])),width=1)
            yy=(x//43%2)*110;d.line((x,yy,x+42,yy),fill=shade(base,-30),width=1)
        if kind==4:
            for y in [45,133,220]:d.line((0,y,256,y),fill=shade(base,-22),width=2)
    elif kind==3:
        tile=Image.new('RGB',(360,360),base);t=ImageDraw.Draw(tile)
        for y in range(-96,360,48):
            for x in range(-96,360,96):
                for bx,by,bw,bh in [(x,y,72,23),(x+73,y,23,72)]:
                    c=shade(base,rng.randint(-24,24));t.rectangle((bx,by,bx+bw,by+bh),fill=c,outline=shade(base,-45))
                    for yy in range(3,max(4,bh),5):t.line((bx+2,by+yy,bx+bw-2,by+yy),fill=shade(c,-12),width=1)
        im=tile.rotate(45,resample=Image.Resampling.BICUBIC).crop((52,52,308,308));d=ImageDraw.Draw(im)
    elif kind in [5,6]:
        for x in range(0,256,85):
            for y in range(0,256,85):d.rectangle((x+1,y+1,x+83,y+83),fill=shade(base,rng.randint(-8,8)),outline=shade(base,-22))
        if kind==6:
            for n in range(13):
                pts=[(int((n*37+y*.35+18*__import__('math').sin(y/34+n))%256),y) for y in range(0,256,3)];d.line(pts,fill=(143,150,149),width=1)
        else:
            for n in range(8000):
                x=rng.randrange(256);y=rng.randrange(256);im.putpixel((x,y),shade(im.getpixel((x,y)),rng.randint(-17,17)))
    elif kind==7:
        for n in range(1000):
            x,y=rng.randrange(256),rng.randrange(256);r=rng.randrange(1,4);c=rng.choice([(83,85,81),(230,225,208),(157,121,97),(181,173,150)])
            d.polygon([(x,y),(x+r*2,y+1),(x+r,y+r*2)],fill=c)
    else:
        for n in range(32000):
            x,y=rng.randrange(256),rng.randrange(256);d.point((x,y),fill=shade(base,rng.randint(-18,18)))
        if kind==9:
            for y in range(0,256,3):d.line((0,y,256,y),fill=shade(base,-8))
        else:im=im.filter(ImageFilter.GaussianBlur(.65))
    return im

models={};thumbs={};catalog=[];proof=[]
room_map={'living':'living','bedroom':'bedroom','dining':'dining','kitchen':'kitchen','bathroom':'bathroom','office':'office','entry':'entry','entry-hall':'entry','laundry':'utility','laundry-utility':'utility','utility':'utility','children':'kids','kids':'kids'}
for a in manifest['assets']:
    family=a['geometryFamily'];dimensions=a['dimensionsMetres'];tag=(a.get('roomTags') or ['living'])[0]
    catalog.append({'id':a['id'],'name':a['name'],'family':family,'category':a['category'],'bedSize':a.get('bedSize') or '', 'room':room_map.get(tag,tag),'rooms':[room_map.get(t,t) for t in a['roomTags']],'theme':a['theme'],'stage':a['stage'],'width':dimensions['width'],'depth':dimensions['depth'],'height':dimensions['height'],'colour':{'calm-oak':'light','walnut-form':'brown','soft-japandi':'light','city-loft':'dark','coastal-linen':'blue-grey'}.get(a['theme'],'light')})
    if a['theme']!='calm-oak':continue
    raw=(lib/a['file']).read_bytes();digest=hashlib.sha256(raw).hexdigest()
    assert digest==a['sha256'],f'Source changed during review assembly: {a["id"]}'
    models[family]=base64.b64encode(gzip.compress(raw,compresslevel=9)).decode()
    image=Image.open(lib/a['thumbnail']).convert('RGB');image.thumbnail((142,114));thumbs[family]=uri(image)
    proof.append({'id':a['id'],'sha256':digest,'stage':a['stage'],'bytes':len(raw)})
floors=[uri(floor_texture(i)) for i in range(10)]
payload={'models':models,'thumbs':thumbs,'catalog':catalog,'floors':floors}
html=(folder/'phone-mockups-v3.html').read_text(encoding='utf-8')
for marker,file in [('/*REVIEW_CSS*/','phone-review-v3.css'),('/*REVIEW_JS*/','phone-review-v3.js'),('/*REVIEW_3D*/','phone-review-3d.js')]:html=html.replace(marker,(folder/file).read_text(encoding='utf-8'))
html=html.replace('/*REVIEW_DATA*/',json.dumps(payload,separators=(',',':')))
assert len(html.encode())<1_000_000,f'Fragment exceeds limit: {len(html.encode())}'
archive=folder/'archive';archive.mkdir(exist_ok=True)
old=folder/'phone-mockups.html'
if old.exists() and not (archive/'round-2.html').exists():(archive/'round-2.html').write_bytes(old.read_bytes())
old.write_text(html,encoding='utf-8');target.parent.mkdir(parents=True,exist_ok=True);target.write_text(html,encoding='utf-8')
(folder/'review-asset-proof.json').write_text(json.dumps({'date':'2026-11-08','source':'furniture/manifest.json','modelCount':len(models),'catalogueRecords':len(catalog),'sources':proof,'floorStudies':'Original procedural review textures; full PBR production material library remains required'},indent=2),encoding='utf-8')
print(f'Built review: {len(html.encode())} bytes; {len(models)} real model families; {len(catalog)} catalogue records; 10 floor studies.')
