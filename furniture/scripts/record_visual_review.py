"""Record explicit rendered-sheet decisions, bound to exact GLB and image hashes.
Never run against a sheet that has not actually been visually inspected.
"""
import json,argparse,hashlib,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def record(sheet_names,rework=None,reject=None,note='Front/back contact sheet inspected: recognizable construction, sensible visible proportions, no obvious missing support or intersection at this review scale.',stage=None):
 rework=rework or {};reject=reject or {}
 review_dir=ROOT/('catalogue-v2/review-v'+stage if stage else 'catalogue-v2/review');record_dir=ROOT/('catalogue-v2/staged/v'+stage if stage else 'catalogue-v2/records')
 path=ROOT/('catalogue-v2/visual-decisions-v'+stage+'.json' if stage else 'catalogue-v2/visual-decisions.json');data=json.loads(path.read_text()) if path.exists() else {'schemaVersion':2,'decisions':{}}
 index=json.loads((review_dir/'index.json').read_text());assert index.get('schemaVersion')==2,'Regenerate sheet index with asset/image hash bindings before review acceptance'
 sheets=index['sheets'];total=0
 for name in sheet_names:
  page=next(s for s in sheets if s['sheet']==name);sheet=review_dir/name
  assert hashlib.sha256(sheet.read_bytes()).hexdigest()==page['sheetSha256'],'Changed sheet bytes: '+name
  for item in page['ids']:
   a=json.loads((record_dir/(item+'.json')).read_text());slug=item.removeprefix('ois.design.');member=next(m for m in page['members'] if m['id']==item)
   assert hashlib.sha256((ROOT/a['file']).read_bytes()).hexdigest()==a['sha256'],'Current GLB bytes changed: '+item
   assert member['assetSha256']==a['sha256'] and member['version']==a['version'],'Stale sheet geometry: '+item
   for role,key in (('front','thumbnail'),('back','backThumbnail')):
    assert member[role]==a[key] and member[role+'Sha256']==hashlib.sha256((ROOT/a[key]).read_bytes()).hexdigest(),'Stale sheet image: '+item+' '+role
   status='rework' if slug in rework else 'reject' if slug in reject else 'pass';notes=rework.get(slug,reject.get(slug,note))
   previous=data['decisions'].get(item)
   if previous and previous.get('sha256')!=a['sha256']:data.setdefault('historicalDecisions',{})[item+'@'+previous['sha256']]=previous
   data['decisions'][item]={'sha256':a['sha256'],'version':a['version'],'status':status,'notes':notes,'sheet':sheet.relative_to(ROOT).as_posix(),'sheetArchive':page['archive'],'sheetSha256':page['sheetSha256'],'memberBinding':member,'imageSha256':{a[k]:hashlib.sha256((ROOT/a[k]).read_bytes()).hexdigest() for k in ('thumbnail','backThumbnail')},'reviewedAtUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())};total+=1
 temp=path.with_suffix('.review.tmp');temp.write_text(json.dumps(data,indent=2));temp.replace(path);print('Recorded',total,'explicit decisions')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('sheets',nargs='+');p.add_argument('--rework',default='{}');p.add_argument('--reject',default='{}');p.add_argument('--stage');a=p.parse_args();record(a.sheets,json.loads(a.rework),json.loads(a.reject),stage=a.stage)
