"""Release audit of actual current files, approvals and independent evidence."""
import json,hashlib,time,csv,io
from pathlib import Path
from collections import Counter,defaultdict
from catalogue_manifest import ROOT,review_matches,publish_catalogue
publish_catalogue(ROOT,'0.7.14')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest_path=ROOT/'manifest.json';manifest=json.loads(manifest_path.read_text());ledger_path=ROOT/'catalogue-v2/visual-decisions.json';ledger=json.loads(ledger_path.read_text())['decisions'];rows=[a for a in manifest['assets'] if a['id'].startswith('ois.design.')];eligible=[a for a in rows if a['countEligible'] and a['qualityStatus']=='internally-accepted'];cache={};errors=[];evidence=[];dependencies={};formats={};exceptions=json.loads((ROOT/'catalogue-v2/contact-review-exceptions.json').read_text())['assets']
def require(ok,msg):
 if not ok:errors.append(msg)
def dep(relative,expected=None):
 path=(ROOT/relative).resolve();require(path.is_relative_to(ROOT),f'Escaping path {relative}')
 if not path.is_file():errors.append(f'Missing dependency {relative}');return None
 digest=sha(path);dependencies[relative]=digest
 if expected:require(digest==expected,f'Changed dependency {relative}')
 return digest
for a in rows:
 i=a['id'];d=ledger.get(i,{});valid,reason=review_matches(ROOT,a,d,cache);require(valid and d.get('status')=='pass',i+' visual '+reason);require(a['qualityStatus'] in ('internally-accepted','reviewed-variant'),i+' current status')
 dep(a['file'],a['sha256']);require((ROOT/a['file']).stat().st_size==a['bytes'],i+' byte count');require(a['bytes']<2*1024*1024 and a['triangles']<15000,i+' asset budget')
 source=dep(a['sourceModel'],a['provenance']['sourceModelSha256']);dep(a['thumbnail']);dep(a['backThumbnail']);dep(d['sheetArchive'],d['sheetSha256']);dep(a['provenance']['sourceSnapshot'],a['provenance']['sourceSha256']);dep(a['provenance']['parametersFile'])
 for s in a['provenance']['supportSources'].values():dep(s['snapshot'],s['sha256'])
 require(not a['provenance']['thirdPartyGeometry'] and not a['provenance']['thirdPartyTextures'],i+' provenance scope')
 version=a['version'];fp=ROOT/f'catalogue-v2/format-validation-v{version}/summary.json'
 if version not in formats:formats[version]={r['id']:r for r in json.loads(fp.read_text())['rows']}
 f=formats[version].get(i,{});require(f.get('sha256')==a['sha256'] and f.get('errors')==0 and f.get('warnings')==0 and not f.get('truncated'),i+' formal validation');dep(f['report'])
 cp=ROOT/f'catalogue-v2/connection-audit-v{version}'/(i+'.json');c=json.loads(cp.read_text());dep(cp.relative_to(ROOT).as_posix());require(c['sha256']==a['sha256'] and c['sourceSha256']==source,i+' contact identity')
 if c['componentCount']>1:
  x=exceptions.get(a['sha256'],{});require(bool(x.get('acceptedReason')) and all(x.get(k)==v for k,v in {'id':i,'sha256':a['sha256'],'version':version,'sourceModelSha256':source,'componentCount':c['componentCount'],'reviewSheetSha256':d['sheetSha256']}.items()),i+' loose component exception');require(all(abs(p['minimum'][2])<.0001 for p in c['components']),i+' independent component floor')
 require(c['componentCount']>=1,i+' no contact components')
 evidence.append({'id':i,'version':version,'sha256':a['sha256'],'countEligible':a['countEligible'],'familyId':a['familyId'],'qualityStatus':a['qualityStatus'],'file':a['file'],'sourceModelSha256':source,'formalReport':f['report'],'contactReport':cp.relative_to(ROOT).as_posix(),'contactComponents':c['componentCount'],'visualSheetArchive':d['sheetArchive'],'visualSheetSha256':d['sheetSha256'],'triangles':a['triangles'],'bytes':a['bytes']})
geometry_path=ROOT/'catalogue-v2/geometry-audit.json';geometry=json.loads(geometry_path.read_text());near_path=ROOT/'catalogue-v2/near-pair-reviews-vcurrent.json';near=json.loads(near_path.read_text());require(geometry['count']==len(rows) and not geometry['errors'] and not geometry['exactDuplicates'] and not geometry['normalizedOrMirroredDuplicates'],'Current duplicate/geometry gates');require(near['auditSha256']==sha(geometry_path) and not near['unresolvedPairs'],'Current near-pair review gates')
require(len(eligible)>=300,'Distinct target');core=[a for a in eligible if a['category'] not in ('appliances','bathroom-fixtures')];require(len(core)>=300,'Core target excluding appliances/fixtures')
rooms=Counter(a['roomTags'][0] for a in eligible);themes=Counter(a['theme'] for a in eligible);require(len(rooms)==10 and len(themes)==5,'All-room/theme coverage')
beds=defaultdict(dict)
for a in rows:
 if a.get('bedSize') and a['builder']=='bed':beds[a['id'].split('.size.')[0]][a['bedSize']]={'id':a['id'],'sha256':a['sha256'],'mattressMetres':a['mattressMetres']}
queen_beds={k:v for k,v in beds.items() if 'queen' in v}
require(len(queen_beds)==12 and all(set(v)=={'queen','full','king','twin'} for v in queen_beds.values()),'Twelve configurable bed families / four mattress sizes')
for p in (ROOT/'materials/v1').glob('*.png'):dep(p.relative_to(ROOT).as_posix())
report={'schemaVersion':1,'timeUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'pass':not errors,'errors':errors,'manifestSha256':sha(manifest_path),'reviewLedgerSha256':sha(ledger_path),'geometryAuditSha256':sha(geometry_path),'nearPairReviewSha256':sha(near_path),'newModelFiles':len(rows),'acceptedDistinct':len(eligible),'acceptedCoreExcludingAppliancesAndBathroomFixtures':len(core),'reviewedVariants':len(rows)-len(eligible),'legacyExcluded':39,'roomCoverage':dict(rooms),'themeCoverage':dict(themes),'bedFamilies':dict(beds),'maximumTriangles':max(a['triangles'] for a in rows),'maximumBytes':max(a['bytes'] for a in rows),'nearPairDecisions':len(near['reviews']),'explicitLooseAssemblyExceptions':sum(x['contactComponents']>1 for x in evidence),'assets':evidence,'dependencySha256':dependencies,'scope':'Internal planning asset acceptance only; no user approval, phone/Expo performance or product-safety certification. Overall goal remains active through 06:53 UTC and queued spatial work.'}
(ROOT/'catalogue-v2/completion-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in report.items() if k not in ('assets','dependencySha256','bedFamilies')},indent=2))
if errors:raise SystemExit(1)
release=ROOT/'releases/library-2026-11-10-r1';release.mkdir(parents=True,exist_ok=True)
for name,content in [('manifest.json',manifest_path.read_bytes()),('completion-audit.json',json.dumps(report,indent=2).encode()),('geometry-audit.json',geometry_path.read_bytes()),('near-pair-reviews.json',near_path.read_bytes())]:
 target=release/name
 if target.exists():require(target.read_bytes()==content,'Immutable release file differs '+name)
 else:target.write_bytes(content)
if errors:raise SystemExit(1)
print('IMMUTABLE RELEASE',release.relative_to(ROOT))
