"""Atomic producer publication shared by Blender and bundled Python.
Quality acceptance is read only from explicit hash-bound visual decisions.
"""
import json,os,time,hashlib,csv,io,re
from pathlib import Path
from catalogue_inventory import DESIGNS
ROOT=Path(__file__).resolve().parents[1]
def review_matches(root,a,decision,cache=None):
 cache={} if cache is None else cache
 def digest(relative):
  if not isinstance(relative,str) or not relative:return None
  p=(root/relative).resolve()
  if not p.is_relative_to(root.resolve()) or not p.is_file():return None
  key=str(p)
  if key not in cache:cache[key]=hashlib.sha256(p.read_bytes()).hexdigest()
  return cache[key]
 def valid_hash(value):return isinstance(value,str) and re.fullmatch('[0-9a-f]{64}',value) is not None
 if not valid_hash(a.get('sha256')) or digest(a.get('file'))!=a['sha256']:return False,'current GLB missing or bytes changed'
 if decision.get('sha256')!=a['sha256'] or decision.get('version')!=a['version']:return False,'asset/version changed or legacy unbound decision'
 member=decision.get('memberBinding',{})
 if member.get('id')!=a['id'] or member.get('assetSha256')!=a['sha256'] or member.get('version')!=a['version']:return False,'sheet member asset binding missing/mismatched'
 for role,key in (('front','thumbnail'),('back','backThumbnail')):
  image_hash=digest(a[key])
  if not valid_hash(image_hash) or member.get(role)!=a[key] or member.get(role+'Sha256')!=image_hash or decision.get('imageSha256',{}).get(a[key])!=image_hash:return False,'sheet/current image mismatch: '+role
 archive=decision.get('sheetArchive')
 if not archive or not valid_hash(decision.get('sheetSha256')) or digest(archive)!=decision.get('sheetSha256'):return False,'archived inspected sheet missing/changed'
 return True,'asset, version, member images and immutable sheet archive match'
def atomic(path,data):
 temp=path.with_suffix(path.suffix+'.publish.tmp');temp.write_text(json.dumps(data,indent=2))
 for i in range(10):
  try:os.replace(temp,path);return
  except PermissionError:time.sleep(.1)
 raise RuntimeError('cannot publish '+str(path))
def publish_catalogue(root=ROOT,version=None):
 legacy=json.loads((root/'catalogue-v2/legacy-manifest-v0.1.0.json').read_text())['assets']
 for a in legacy:
  slug=a['geometryFamily'];family='legacy-platform-bed' if slug.startswith('bed-') and a.get('bedSize') in ('twin','full','queen','king') else slug
  a.update({'designId':'ois.legacy-design.'+family,'familyId':'ois.legacy-family.'+family,'variantOf':None if a['theme']=='calm-oak' else 'ois.calm-oak.'+slug,'countEligible':False,'countReason':'legacy; excluded from new 300-design target','qualityStatus':a['stage']})
 rows=[json.loads(p.read_text()) for p in sorted((root/'catalogue-v2/records').glob('*.json'))];briefs={a['id']:a for a in DESIGNS}
 previous=json.loads((root/'manifest.json').read_text()).get('catalogueVersion','0.1.0') if (root/'manifest.json').exists() else '0.1.0'
 versions=[previous]+[a['version'] for a in rows]+([version] if version else [])
 version=max(versions,key=lambda v:tuple(int(x) for x in v.split('-')[0].split('.')))
 review_path=root/'catalogue-v2/visual-decisions.json';decisions=json.loads(review_path.read_text()).get('decisions',{}) if review_path.exists() else {}
 review_digest=hashlib.sha256(review_path.read_bytes()).hexdigest() if review_path.exists() else None
 review_cache={}
 lod_path=root/'catalogue-v2/lod-delivery.json';lods=json.loads(lod_path.read_text()).get('levels',{}) if lod_path.exists() else {}
 for a in rows:
  current=briefs[a['id']]
  for k in ('name','distinction','countEligible','variantOf','familyId','constructionKey','countExclusion'):
   if k in current:a[k]=current[k]
  # Never inherit acceptance stored in a record; current bound evidence is the authority.
  a['stage']='validated-candidate';a['qualityStatus']='validated-candidate';a['visualReview']={'status':'pending','images':[a['thumbnail'],a['backThumbnail']]}
  decision=decisions.get(a['id'],{});matches,reason=review_matches(root,a,decision,review_cache)
  if matches:
   status=decision['status'];a['visualReview']={**a.get('visualReview',{}),'status':status,'notes':decision.get('notes',''),'sheet':decision.get('sheet'),'reviewer':'Codex rendered visual inspection; not user approval'}
   if status=='pass':a['qualityStatus']='internally-accepted' if a['countEligible'] else 'reviewed-variant';a['stage']=a['qualityStatus']
   else:a['qualityStatus']='needs-rework' if status=='rework' else 'rejected';a['stage']=a['qualityStatus']
  elif decision:a['visualReview'].update({'status':'stale','reason':reason})
  a['roomAliases']={'entry-hall':'entry','laundry-utility':'utility'}
  levels=[]
  for level in (1,2):
   delivered=lods.get(a['id']+'@'+a['sha256']+f'@LOD{level}')
   if delivered:
    l=delivered['asset'];valid,_=review_matches(root,l,delivered['decision'],review_cache)
    if valid and delivered['decision'].get('status')=='pass' and delivered['comparison'].get('screeningPass') and l['lodParent']['sha256']==a['sha256']:
     levels.append({'level':level,'file':l['file'],'sha256':l['sha256'],'bytes':l['bytes'],'triangles':l['triangles'],'parentSha256':a['sha256'],'silhouetteIoU':delivered['comparison']['silhouetteIoU'],'maximumBoundsDifferenceMetres':delivered['comparison']['maximumBoundsDifferenceMetres'],'reviewStatus':'internally-reviewed; desktop planning use'})
  a['lod']={'delivered':['LOD0']+['LOD'+str(l['level']) for l in levels],'levels':levels,'selection':'optional renderer-selected distance levels; no phone thresholds established'}
 historical=[json.loads(p.read_text()) for p in sorted((root/'catalogue-v2/history').glob('*.json'))]
 accepted=[a for a in rows if a['qualityStatus']=='internally-accepted']
 counts={'glbFiles':len(legacy)+len(rows),'legacyFiles':len(legacy),'newCandidates':len(rows),'plannedBriefs':len(DESIGNS),'countEligibleCandidates':sum(a['countEligible'] for a in rows),'visuallyReviewed':sum(a.get('visualReview',{}).get('status') in ('pass','rework','reject') for a in rows),'internallyAcceptedDistinctDesigns':len(accepted),'reviewedVariants':sum(a['qualityStatus']=='reviewed-variant' for a in rows),'needsRework':sum(a['qualityStatus']=='needs-rework' for a in rows),'rejected':sum(a['qualityStatus']=='rejected' for a in rows),'phoneValidated':0,'userApproved':0}
 counts.update({'acceptedExcludingAppliancesAndBathroomFixtures':sum(a['builder'] not in ('bath','appliance') for a in accepted),'acceptedWithReviewedDistanceLods':sum(bool(a.get('lod',{}).get('levels')) for a in accepted),'reviewedDistanceLodFiles':sum(len(a.get('lod',{}).get('levels',[])) for a in rows)})
 manifest={'schemaVersion':1,'catalogueVersion':version,'assets':legacy+rows,'historicalAssets':historical,'counts':counts,'compatibility':{'legacyAssets':'all 39 original IDs/versions/files preserved','basePath':'furniture/','roomAliases':{'entry-hall':'entry','laundry-utility':'utility'},'immutableRevisions':'resolve id/version/sha256 against current or historicalAssets','appValidation':'not established by exports'}}
 atomic(root/'manifest.json',manifest);mh=hashlib.sha256((root/'manifest.json').read_bytes()).hexdigest()
 atomic(root/'catalogue-v2/history.json',{'assets':historical,'rule':'exact id/version/hash; no silent substitution'})
 atomic(root/'catalogue-v2/batch-ready.json',{'manifestSha256':mh,'reviewLedgerSha256':review_digest,'catalogueVersion':version,'counts':counts,'completedFilesOnly':True,'history':'catalogue-v2/history.json'})
 atomic(root/'catalogue-v2/accepted-assets.json',{'schemaVersion':1,'manifestSha256':mh,'reviewLedgerSha256':review_digest,'catalogueVersion':version,'counts':counts,'scope':'current internally accepted distinct designs only; not user-approved or phone-validated','assets':accepted})
 atomic(root/'catalogue-v2/status.json',{'counts':counts,'manifestSha256':mh,'reviewLedgerSha256':review_digest,'lastUpdateUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'target':300,'minimumWorkGateUtc':'2026-11-10T06:53:00Z','goalStatus':'active','countPolicy':'catalogue-v2/COUNTING.md','countChangeRule':'Not monotonic: replacing geometry with a new hash invalidates prior current-asset acceptance until the new render is reviewed. Old decisions remain historical; regeneration does not copy approval.'})
 room_counts={};theme_counts={}
 for a in accepted:
  room_counts[a['roomTags'][0]]=room_counts.get(a['roomTags'][0],0)+1;theme_counts[a['theme']]=theme_counts.get(a['theme'],0)+1
 themes=['calm-oak','walnut-form','soft-japandi','city-loft','coastal-linen'];rooms=sorted({a['roomTags'][0] for a in DESIGNS})
 coverage=['# Live distinct-design coverage','',f"Current catalogue: {len(rows)} complete candidates / {len(DESIGNS)} briefs; {sum(a['countEligible'] for a in DESIGNS)} potentially distinct briefs after construction-family exclusions. **{len(accepted)} internally accepted distinct designs**. The required target is at least 300, with visual quality; this table does not claim completion.",'','The earlier 54 × 5 / 270-entry expansion proposal is superseded by this inventory. Colours, dimensions, mirrored copies and the 39 original files do not inflate the target. A candidate must pass structural checks, geometry/family screening and explicit rendered review before acceptance.','', '| Primary room | Briefs | Complete candidates | Accepted distinct | '+' | '.join(themes)+' |','|---|---:|---:|---:|'+'---:|'*5]
 for room in rooms:
  cells=[room,str(sum(a['roomTags'][0]==room for a in DESIGNS)),str(sum(a['roomTags'][0]==room for a in rows)),str(room_counts.get(room,0))]+[str(sum(a['roomTags'][0]==room and a['theme']==t for a in accepted)) for t in themes]
  coverage.append('| '+' | '.join(cells)+' |')
 coverage+=['','Theme columns show **accepted distinct designs**, not recolour exports. Themes share a coherent material language; individual construction briefs differ independently. All proposed looks still require user approval.','', 'The full row inventory, including excluded variants and their canonical family links, is [`furniture/catalogue-v2/inventory.csv`](../../furniture/catalogue-v2/inventory.csv). Source briefs are `catalogue_inventory.py`; exact delivered files, hashes, dimensions, performance and review status are in `manifest.json`.','', 'Next quality gates: resolve flagged geometry/near-duplicates; add real bounded material maps and tested LODs; compare room/theme contact sheets; verify renderer import/material overrides and a 40-item fixture. Expo/native/device evidence remains separate.']
 (root.parent/'docs/furniture/COVERAGE.md').write_text('\n'.join(coverage)+'\n')
 current={a['id']:a for a in rows};s=io.StringIO();writer=csv.writer(s);writer.writerow(['id','designId','familyId','name','primaryRoom','theme','construction','distinction','countEligible','variantOf','qualityStatus','version','sha256','file'])
 for brief in DESIGNS:
  a=current.get(brief['id'],brief);writer.writerow([a.get(k,'') for k in ('id','designId','familyId','name')]+[brief['roomTags'][0],brief['theme'],brief['parameters']['form'],brief['distinction'],a['countEligible'],a.get('variantOf'),a.get('qualityStatus','planned'),a.get('version',''),a.get('sha256',''),a.get('file','')])
 (root/'catalogue-v2/inventory.csv').write_text(s.getvalue(),encoding='utf-8-sig')
 lines=['# Furniture production status','',f"Catalogue {version}; {counts['newCandidates']} complete new candidates, **{len(accepted)} internally accepted distinct designs**, {counts['reviewedVariants']} reviewed variants, {counts['needsRework']} needing rework. {counts['visuallyReviewed']} current GLBs have matching hash-bound visual decisions. 39 legacy assets remain compatible.",'',f'Manifest SHA-256: `{mh}`. Review-ledger SHA-256: `{review_digest}`. Exact counts and batch-ready marker: `furniture/catalogue-v2/status.json`, `batch-ready.json`. Manifest publication is atomic; a row appears after export, structural checks and both renders.','', '**Count changes during repairs are deliberate, not monotonic progress:** a new geometry version/hash returns to candidate status until its new renders are reviewed. The earlier 97-reviewed / 72-accepted checkpoint applied to the then-current 0.2.0 shapes. Replacing the first 20 shapes with 0.2.1 invalidated their prior current-asset decisions; old review decisions were not copied forward. The review-ledger digest and manifest hash pin each count snapshot.','', '**Work remains active.** Minimum work gate: November 10, 2026 at 01:53 America/Toronto / 06:53 UTC. The goal requires at least 300 distinct designs plus visual quality and the minimum work window; no premature completion.','',f'Accepted by primary room: `{room_counts}`.',f'Accepted by theme: `{theme_counts}`.','', 'Count method: curated construction briefs; no colour/size/mirror counts; canonical triangle and normalized mirror/scale fingerprints; three-view silhouette screening; explicit rendered front/back sheet review. Acceptance is internal planning-asset review, not user approval, product certification or phone validation.','', 'Blender 5.2.2 exports + bundled Python structural audit. Run `furniture/scripts/audit_catalogue_v2.py`; inspect `catalogue-v2/geometry-audit.json` for its exact audited count, errors and duplicate groups. Visual decisions are in `catalogue-v2/visual-decisions.json`.','', 'Current production: all-room geometry batches, followed by seating/table/intersection corrections, richer materials, LOD and interoperability tests. See `INTEGRATION.md` for room aliases and immutable revision handling. Old 0.2.0 geometry remains on disk when replaced by a new version; historical manifests exclude it from new-design counts.','', 'Known review themes: curved cushion/shell intersection, shaped-table support fit, wine-divider clipping and visible canopy fabric are under correction before acceptance. Plain material factors are still used in the first candidates. Poly Haven API returned HTTP 403; external models remain research candidates, not falsely claimed imports.']
 (root.parent/'docs/furniture/STATUS.md').write_text('\n'.join(lines)+'\n')
 fixture_path=root/'catalogue-v2/fixtures/textured-v0.3.2.json'
 if fixture_path.exists():
  with (root.parent/'docs/furniture/STATUS.md').open('a') as output:
   output.write('\n## Frozen textured interoperability fixture\n\n`furniture/catalogue-v2/fixtures/textured-v0.3.2.json` — SHA-256 `'+hashlib.sha256(fixture_path.read_bytes()).hexdigest()+'`. Five staged assets (sofa, barrel chair, draped bed, glazed wall cabinet, dining table), exact GLB/image hashes and paths included. No promotion/count implication. Formal report: `furniture/catalogue-v2/format-validation-v0.3.2/summary.json`: 5 checked, 0 errors, 0 warnings at the frozen fixture checkpoint.\n')
 return counts
if __name__=='__main__':print(publish_catalogue())
