"""Withdraw matching review passes after deeper source-part contact screening.
Conservative rework flag; later explicit review may document intentional loose parts.
Never transfers a source finding to another asset hash.
"""
import json,hashlib,time
from catalogue_manifest import ROOT,atomic,publish_catalogue
affected=[]
for ledger_path in (ROOT/'catalogue-v2/visual-decisions.json',ROOT/'catalogue-v2/visual-decisions-v0.5.0.json'):
 if not ledger_path.exists():continue
 ledger=json.loads(ledger_path.read_text());changed=[]
 for report_path in (ROOT/'catalogue-v2/connection-audit-v0.5.0').glob('*.json'):
  report=json.loads(report_path.read_text());decision=ledger['decisions'].get(report['id'])
  if report['componentCount']<=1 or not decision or decision.get('status')!='pass' or decision.get('sha256')!=report['sha256']:continue
  record=json.loads((ROOT/'catalogue-v2/staged/v0.5.0'/(report['id']+'.json')).read_text())
  assert hashlib.sha256((ROOT/record['file']).read_bytes()).hexdigest()==report['sha256']
  assert hashlib.sha256((ROOT/report['sourceModel']).read_bytes()).hexdigest()==report['sourceSha256']
  ledger.setdefault('historicalDecisions',{})[report['id']+'@'+report['sha256']+'@before-contact-audit']=dict(decision)
  decision.update({'status':'rework','notes':'Deeper source-part audit found '+str(report['componentCount'])+' contact groups at4mm tolerance. Repair or explicitly inspect/document intentional loose parts before acceptance. Evidence: '+report_path.relative_to(ROOT).as_posix(),'contactAudit':{'file':report_path.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(report_path.read_bytes()).hexdigest(),'sourceModelSha256':report['sourceSha256']}})
  changed.append({'id':report['id'],'version':record['version'],'sha256':report['sha256'],'componentCount':report['componentCount'],'evidence':report_path.relative_to(ROOT).as_posix()})
 atomic(ledger_path,ledger)
 if ledger_path.name=='visual-decisions.json':affected=changed
counts=publish_catalogue();atomic(ROOT/'catalogue-v2/contact-review-withdrawals.json',{'timeUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'affectedCurrentReviews':affected,'counts':counts,'scope':'matching GLB and original source-model hashes only; no unrelated later revision is invalidated'});print('Withdrawn',len(affected),'current review passes',counts)
