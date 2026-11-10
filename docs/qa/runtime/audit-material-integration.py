"""Audit the actual app PNGs against the calibrated candidate handoff. Never writes production assets."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import json, hashlib, datetime

qa=Path(__file__).resolve().parent
root=qa.parents[2]
app=root/'mobile/assets/materials'
candidate=root/'docs/coordination/material-candidates/maps'
old=qa/'runs/2026-11-10T01-12-22-865Z-frozen-web/project/assets/materials'
manifest=json.loads((candidate/'manifest.json').read_text())
stamp=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
run=qa/'runs'/(stamp.replace(':','-').replace('.','-')+'-material-integration')
run.mkdir(parents=True,exist_ok=True)
digest=lambda b:hashlib.sha256(b).hexdigest()
checks=[];materials=[];brightness=[];images=[]
for m in manifest['materials']:
    maps={}
    for kind,meta in m['maps'].items():
        file=app/meta['file']; b=file.read_bytes(); im=Image.open(file).convert('RGB'); a=np.array(im,dtype=np.float64)
        same=digest(b)==meta['sha256'] and len(b)==meta['bytes']
        maps[kind]={'file':meta['file'],'sha256':digest(b),'bytes':len(b),'size':im.size,'candidateMatch':same}
        checks.append({'id':m['id']+'-'+kind+'-integrated-bytes','pass':same and im.size==(512,512)})
        if kind=='normal':
            v=a/127.5-1; lengths=np.linalg.norm(v,axis=2)
            maps[kind]['maxUnitLengthError']=float(np.max(np.abs(lengths-1)))
            checks.append({'id':m['id']+'-normal-unit-length','pass':maps[kind]['maxUnitLengthError']<.02})
        if kind=='colour':
            images.append((m['id'],im.copy()));brightness.append((m['id'],a.mean(axis=2).reshape(-1)))
    materials.append({'id':m['id'],'repeatMetres':m['repeatMetres'],'maps':maps})
correlations=[]
for i,(name,a) in enumerate(brightness):
    for name2,b in brightness[i+1:]:
        corr=float(np.corrcoef(a,b)[0,1]);correlations.append({'a':name,'b':name2,'brightnessCorrelation':corr})
        checks.append({'id':'structural-brightness-'+name+'-'+name2,'pass':bool(np.isfinite(corr)) and corr<.995})
wall=[]
floor_ids={m['id'] for m in materials}
for file in sorted(app.glob('*-normal.png')):
    ident=file.name.removesuffix('-normal.png')
    if ident in floor_ids or not (old/file.name).exists():continue
    a=np.array(Image.open(old/file.name).convert('RGB'),dtype=np.int16);b=np.array(Image.open(file).convert('RGB'),dtype=np.int16)
    rb=int(np.max(np.abs(a[:,:,[0,2]]-b[:,:,[0,2]])));green=float(np.mean(np.abs(a[:,:,1]+b[:,:,1]-255)))
    wall.append({'id':ident,'oldHash':digest((old/file.name).read_bytes()),'newHash':digest(file.read_bytes()),'redBlueMaxDifference':rb,'greenInverseMeanError':green,'greenSignFlipOnly':rb==0 and green<=1.01})
sheet=Image.new('RGB',(5*240,2*270),'#eeeae2');draw=ImageDraw.Draw(sheet)
try:font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
except OSError:font=ImageFont.load_default()
for i,(name,im) in enumerate(images):
    x=(i%5)*240;y=(i//5)*270;sheet.paste(im.resize((224,224),Image.Resampling.LANCZOS),(x+8,y+8));draw.text((x+8,y+240),name,fill='#222222',font=font)
sheet.save(run/'actual-floor-contact-sheet.png')
result={'at':stamp,'scope':'Actual integrated app bytes and image patterns. Candidate normal sign is calibrated on desktop by coordinator; no physical material matching or native shader claim.','passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'materials':materials,'maxBrightnessCorrelation':max(c['brightnessCorrelation'] for c in correlations),'correlations':correlations,'wallNormalComparison':wall,'checks':checks}
(run/'result.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'at':stamp,'passed':result['passed'],'failed':result['failed'],'materialCount':len(materials),'maxBrightnessCorrelation':result['maxBrightnessCorrelation'],'wallNormalComparison':wall,'artifact':str(run/'result.json'),'contactSheet':str(run/'actual-floor-contact-sheet.png')}))
raise SystemExit(1 if result['failed'] else 0)
