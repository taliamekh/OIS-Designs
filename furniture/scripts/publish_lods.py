"""Attach only reviewed/format-clean/silhouette-screened LODs to exact parent hashes."""
import sys,json,time
from catalogue_manifest import ROOT,review_matches,atomic,publish_catalogue
version=sys.argv[1];folder=ROOT/f'catalogue-v2/staged/v{version}';ledger=json.loads((ROOT/f'catalogue-v2/visual-decisions-v{version}.json').read_text())['decisions'];formal={a['id']:a for a in json.loads((ROOT/f'catalogue-v2/format-validation-v{version}/summary.json').read_text())['rows']};compared={a['id']:a for a in json.loads((ROOT/f'catalogue-v2/lod-comparison-v{version}.json').read_text())['rows']}
target=ROOT/'catalogue-v2/lod-delivery.json';data=json.loads(target.read_text()) if target.exists() else {'schemaVersion':1,'levels':{}};accepted=[];skipped=[]
for file in sorted(folder.glob('*.json')):
 a=json.loads(file.read_text());decision=ledger.get(a['id'],{});valid,reason=review_matches(ROOT,a,decision);f=formal.get(a['id'],{});comparison=compared.get(a['id'],{})
 if not valid or decision.get('status')!='pass' or not comparison.get('screeningPass') or comparison.get('sha256')!=a['sha256'] or f.get('sha256')!=a['sha256'] or f.get('errors')!=0 or f.get('warnings')!=0 or f.get('truncated'):
  skipped.append({'id':a['id'],'reason':reason if not valid else 'requires visual pass, clean format and quantitative silhouette/bounds pass'});continue
 parent=a['lodParent'];current=json.loads((ROOT/'catalogue-v2/records'/(parent['id']+'.json')).read_text())
 if current['sha256']!=parent['sha256']:skipped.append({'id':a['id'],'reason':'parent has another current revision'});continue
 key=parent['id']+'@'+parent['sha256']+f"@LOD{a['lodLevel']}";data['levels'][key]={'asset':a,'decision':decision,'comparison':comparison,'format':f};accepted.append(a['id'])
data['updatedAtUtc']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());atomic(target,data);counts=publish_catalogue();atomic(ROOT/f'catalogue-v2/lod-publication-v{version}.json',{'attached':accepted,'skipped':skipped,'counts':counts});print('LOD attached',len(accepted),'skipped',len(skipped))
