"""Record only explicitly supplied, visually inspected construction-pair findings.
No automatic distinction rule: unsupported pairs remain unresolved.
"""
import argparse,json,hashlib,time
from catalogue_manifest import ROOT,atomic,review_matches
p=argparse.ArgumentParser();p.add_argument('--stage',required=True);p.add_argument('--notes-file',required=True);args=p.parse_args();notes=json.loads((ROOT/args.notes_file).read_text());audit_path=ROOT/f'catalogue-v2/geometry-audit-v{args.stage}-reviewed.json';audit=json.loads(audit_path.read_text());ledger=json.loads((ROOT/f'catalogue-v2/visual-decisions-v{args.stage}.json').read_text())['decisions'];output=ROOT/f'catalogue-v2/near-pair-reviews-v{args.stage}.json';data=json.loads(output.read_text()) if output.exists() else {'schemaVersion':1,'reviews':{}};unresolved=[]
for pair in audit['nearSilhouettePairs']:
 ids=[pair['a'],pair['b']];assets=[json.loads((ROOT/f'catalogue-v2/staged/v{args.stage}'/(identifier+'.json')).read_text()) for identifier in ids]
 if not all(identifier in notes for identifier in ids):unresolved.append(ids);continue
 decisions=[ledger.get(identifier,{}) for identifier in ids]
 if not all(review_matches(ROOT,a,d)[0] for a,d in zip(assets,decisions)):unresolved.append(ids);continue
 key='|'.join(sorted(a['sha256'] for a in assets));data['reviews'][key]={'ids':ids,'assetSha256':[a['sha256'] for a in assets],'notes':[notes[i] for i in ids],'sheetArchives':[d['sheetArchive'] for d in decisions],'sheetSha256':[d['sheetSha256'] for d in decisions],'countEligible':[a['countEligible'] for a in assets],'resolution':'same family/variant; not two design counts' if assets[0]['familyId']==assets[1]['familyId'] else 'different reviewed construction/function; silhouette alone is not construction identity','reviewedAtUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
data.update({'auditSha256':hashlib.sha256(audit_path.read_bytes()).hexdigest(),'auditCount':audit['count'],'unresolvedPairs':unresolved});atomic(output,data);print('pair findings',len(data['reviews']),'unresolved',len(unresolved))
