"""Meaningful regression checks for stale visual-review acceptance."""
import hashlib,json,tempfile,shutil
from pathlib import Path
from catalogue_manifest import ROOT,review_matches
parent=(ROOT/'catalogue-v2').resolve();folder=Path(tempfile.mkdtemp(prefix='qa-review-',dir=parent)).resolve();assert folder.is_relative_to(parent)
results=[]
try:
 for name,content in (('asset.glb',b'actual GLB bytes'),('front.png',b'front render'),('back.png',b'back render'),('sheet.jpg',b'actual inspected sheet')):(folder/name).write_bytes(content)
 def digest(name):return hashlib.sha256((folder/name).read_bytes()).hexdigest()
 sha=digest('asset.glb');a={'id':'test','version':'1','sha256':sha,'file':'asset.glb','thumbnail':'front.png','backThumbnail':'back.png'}
 d={'version':'1','sha256':sha,'status':'pass','memberBinding':{'id':'test','version':'1','assetSha256':sha,'front':'front.png','frontSha256':digest('front.png'),'back':'back.png','backSha256':digest('back.png')},'imageSha256':{'front.png':digest('front.png'),'back.png':digest('back.png')},'sheetArchive':'sheet.jpg','sheetSha256':digest('sheet.jpg')}
 def expect(name,row,decision,want):
  actual,reason=review_matches(folder,row,decision);assert actual==want,(name,actual,reason);results.append({'case':name,'pass':True,'reason':reason})
 expect('current matched geometry/images/archived sheet',a,d,True)
 expect('new geometry hash cannot inherit prior approval',{**a,'sha256':'mesh-b'},d,False)
 expect('new version cannot inherit prior approval',{**a,'version':'2'},d,False)
 expect('legacy hash-only decision is insufficient',a,{'sha256':'mesh-a','status':'pass'},False)
 (folder/'front.png').write_bytes(b'changed render');expect('changed front render invalidates decision',a,d,False);(folder/'front.png').write_bytes(b'front render')
 (folder/'back.png').write_bytes(b'changed back');expect('changed rear render invalidates decision',a,d,False);(folder/'back.png').write_bytes(b'back render')
 (folder/'sheet.jpg').write_bytes(b'different sheet');expect('changed archived sheet invalidates decision',a,d,False);(folder/'sheet.jpg').write_bytes(b'actual inspected sheet')
 expect('sheet member mismatch invalidates approval',a,{**d,'memberBinding':{**d['memberBinding'],'assetSha256':'old-mesh'}},False)
 expect('current matching review remains usable independently of mutable sheet names',a,d,True)
 (folder/'asset.glb').write_bytes(b'altered bytes');expect('changed GLB bytes despite unchanged metadata',a,d,False);(folder/'asset.glb').write_bytes(b'actual GLB bytes')
 (folder/'front.png').unlink();expect('missing image and missing digests cannot compare equal',a,{**d,'memberBinding':{**d['memberBinding'],'frontSha256':None},'imageSha256':{}},False);(folder/'front.png').write_bytes(b'front render')
 (folder/'sheet.jpg').unlink();expect('missing archive and missing digest cannot compare equal',a,{**d,'sheetSha256':None},False)
 (ROOT/'catalogue-v2/review-provenance-tests.json').write_text(json.dumps({'results':results,'passed':len(results)},indent=2));print('PASS',len(results),'review provenance cases')
finally:
 assert folder.is_relative_to(parent) and folder.name.startswith('qa-review-')
 shutil.rmtree(folder)
