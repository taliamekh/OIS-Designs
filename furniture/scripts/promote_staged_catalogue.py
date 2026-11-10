"""Promote only explicitly reviewed, current-image-bound staged revisions.
Old current geometry/decisions are preserved; failed/new unreviewed stages do not replace it.
"""
import argparse,json,time,hashlib
from pathlib import Path
from catalogue_manifest import ROOT,atomic,publish_catalogue,review_matches
from catalogue_inventory import DESIGNS
p=argparse.ArgumentParser();p.add_argument('--stage',required=True);p.add_argument('--include-variants',action='store_true');args=p.parse_args()
folder=ROOT/f'catalogue-v2/staged/v{args.stage}';ledger_path=ROOT/f'catalogue-v2/visual-decisions-v{args.stage}.json';ledger=json.loads(ledger_path.read_text());current_path=ROOT/'catalogue-v2/visual-decisions.json';current=json.loads(current_path.read_text()) if current_path.exists() else {'schemaVersion':2,'decisions':{}}
format_report=json.loads((ROOT/f'catalogue-v2/format-validation-v{args.stage}/summary.json').read_text());format_rows={a['id']:a for a in format_report['rows']}
promoted=[];skipped=[];cache={}
briefs={a['id']:a for a in DESIGNS}
for record in sorted(folder.glob('*.json')):
 a=json.loads(record.read_text());decision=ledger['decisions'].get(a['id'],{});valid,reason=review_matches(ROOT,a,decision,cache)
 for key in ('countEligible','variantOf','familyId','constructionKey','countExclusion'):
  if key in briefs[a['id']]:a[key]=briefs[a['id']][key]
 formal=format_rows.get(a['id'],{})
 contact_path=ROOT/f'catalogue-v2/connection-audit-v{args.stage}'/(a['id']+'.json')
 contact=json.loads(contact_path.read_text()) if contact_path.exists() else {}
 exceptions_path=ROOT/'catalogue-v2/contact-review-exceptions.json';exceptions=json.loads(exceptions_path.read_text()).get('assets',{}) if exceptions_path.exists() else {}
 exception=exceptions.get(a['sha256'],{})
 source_sha=hashlib.sha256((ROOT/a['sourceModel']).read_bytes()).hexdigest()
 exception_valid=bool(exception.get('acceptedReason')) and all(exception.get(k)==v for k,v in {'id':a['id'],'sha256':a['sha256'],'version':a['version'],'sourceModelSha256':source_sha,'componentCount':contact.get('componentCount'),'reviewSheetSha256':decision.get('sheetSha256')}.items())
 if contact.get('sha256')!=a['sha256'] or contact.get('sourceSha256')!=source_sha or (a.get('provenance',{}).get('sourceModelSha256') and a['provenance']['sourceModelSha256']!=source_sha) or contact.get('componentCount',0)<1 or (contact.get('componentCount',999)>1 and not exception_valid):
  skipped.append({'id':a['id'],'reason':'deeper exact-asset contact graph/explicit loose-part review required'});continue
 if not a.get('geometryHash') or formal.get('sha256')!=a['sha256'] or formal.get('errors')!=0 or formal.get('warnings')!=0 or formal.get('truncated'):
  skipped.append({'id':a['id'],'reason':'current geometry fingerprint and clean formal validation required'});continue
 if not valid or decision.get('status')!='pass':skipped.append({'id':a['id'],'reason':reason if not valid else 'not visually passed'});continue
 if not a['countEligible'] and not args.include_variants:skipped.append({'id':a['id'],'reason':'variant excluded by requested promotion mode'});continue
 target=ROOT/'catalogue-v2/records'/record.name
 if target.exists():
  old=json.loads(target.read_text())
  if old['sha256']==a['sha256']:continue
  old_version=tuple(int(x) for x in old['version'].split('-')[0].split('.'));new_version=tuple(int(x) for x in a['version'].split('-')[0].split('.'))
  if old_version>=new_version:
   skipped.append({'id':a['id'],'reason':'current revision is newer or same immutable version; no downgrade/replacement'});continue
  atomic(ROOT/'catalogue-v2/history'/(old['id']+'@'+old['version']+'@'+old['sha256'][:12]+'.json'),old)
 previous=current['decisions'].get(a['id'])
 if previous:current.setdefault('historicalDecisions',{})[a['id']+'@'+previous['sha256']]=previous
 current['decisions'][a['id']]=decision;atomic(target,a);promoted.append(a['id'])
current['schemaVersion']=2;atomic(current_path,current);counts=publish_catalogue(ROOT,args.stage)
atomic(ROOT/'catalogue-v2'/f'promotion-v{args.stage}.json',{'promoted':promoted,'skipped':skipped,'counts':counts,'timeUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())});print('promoted',len(promoted),counts)
