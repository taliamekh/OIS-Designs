"""Independent geometry fingerprints, variant detection and structural inventory audit.
Fingerprints ignore materials/names; normalized mirror/axis tests prevent size-copy counts.
"""
import json,struct,hashlib,math,argparse
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from validate_library import read_glb,inspect
ROOT=Path(__file__).resolve().parents[1]
def geometry(path):
 g,b,_=read_glb(path)
 def acc(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];c={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];size=np.dtype(dt).itemsize
  return np.ndarray((a['count'],c),dtype=dt,buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',size*c),size))
 def transform(n):
  if 'matrix' in n:return np.array(n['matrix']).reshape(4,4,order='F')
  x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4);m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
 triangles=[]
 def walk(i,parent):
  n=g['nodes'][i];m=parent@transform(n)
  if 'mesh' in n:
   for p in g['meshes'][n['mesh']]['primitives']:
    v=acc(p['attributes']['POSITION']);v=(m@np.c_[v,np.ones(len(v))].T).T[:,:3];idx=acc(p['indices']).ravel().reshape(-1,3);triangles.append(v[idx])
  for c in n.get('children',[]):walk(c,m)
 for i in g['scenes'][g.get('scene',0)]['nodes']:walk(i,np.eye(4))
 return np.concatenate(triangles)
def fingerprint(tris,normalized=False):
 pts=tris.reshape(-1,3)
 if normalized:pts=(pts-pts.min(0))/np.maximum(np.ptp(pts,axis=0),1e-8)
 quant=np.rint(pts/(.0001 if not normalized else .0002)).astype('<i4')
 tri=quant.reshape(-1,3,3)
 # Canonical triangle corners and triangle order, independent of material and indexing.
 tri=np.array([t[np.lexsort((t[:,2],t[:,1],t[:,0]))].ravel() for t in tri],dtype='<i4');tri=tri[np.lexsort(tuple(tri[:,i] for i in range(8,-1,-1)))]
 return hashlib.sha256(tri.tobytes()).hexdigest()
def shape_family(tris):
 variants=[]
 for swap in (False,True):
  p=tris[:,:,[2,1,0]] if swap else tris
  for sx,sz in ((1,1),(-1,1),(1,-1),(-1,-1)):variants.append(fingerprint(p*np.array([sx,1,sz]),True))
 return min(variants)
def mask(tris,view):
 pts=tris.copy()
 if view=='front':u=pts[:,:,0]+pts[:,:,2]*.55;v=pts[:,:,1]-.33*pts[:,:,2]
 elif view=='side':u=pts[:,:,2];v=pts[:,:,1]
 else:u=pts[:,:,0];v=pts[:,:,2]
 u=(u-u.min())/max(np.ptp(u),1e-8)*59+2;v=(v-v.min())/max(np.ptp(v),1e-8)*59+2
 im=Image.new('1',(64,64));d=ImageDraw.Draw(im)
 for x,y in zip(u,v):d.polygon([(float(a),float(63-b)) for a,b in zip(x,y)],fill=1)
 return np.array(im,dtype=bool)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--stage');parser.add_argument('--reviewed-only',action='store_true');args=parser.parse_args()
 record_dir=ROOT/('catalogue-v2/staged/v'+args.stage if args.stage else 'catalogue-v2/records')
 rows=[json.loads(p.read_text()) for p in sorted(record_dir.glob('*.json'))]
 from catalogue_inventory import DESIGNS
 briefs={a['id']:a for a in DESIGNS}
 for a in rows:
  for key in ('countEligible','variantOf','familyId','constructionKey','countExclusion'):
   if key in briefs.get(a['id'],{}):a[key]=briefs[a['id']][key]
 if args.reviewed_only:
  ledger=ROOT/('catalogue-v2/visual-decisions-v'+args.stage+'.json' if args.stage else 'catalogue-v2/visual-decisions.json');decisions=json.loads(ledger.read_text())['decisions'];rows=[a for a in rows if a['id'] in decisions]
 exact={};scaled={};report=[];masks={};errors=[]
 for a in rows:
  try:
   stats=inspect(ROOT/a['file']);tris=geometry(ROOT/a['file']);eh=fingerprint(tris);sh=shape_family(tris)
   exact.setdefault(eh,[]).append(a['id']);scaled.setdefault(sh,[]).append(a['id'])
   a['geometryHash']=eh;a['normalizedMirrorGeometryHash']=sh
   record=record_dir/(a['id']+'.json');temp=record.with_suffix('.audit.tmp');temp.write_text(json.dumps(a,indent=2));temp.replace(record)
   masks[a['id']]=[mask(tris,v) for v in ('front','side','top')]
   report.append({'id':a['id'],'geometryHash':eh,'normalizedMirrorGeometryHash':sh,'triangles':stats['triangles'],'bytes':stats['bytes'],'status':'pass'})
  except Exception as e:errors.append({'id':a['id'],'error':str(e)})
 near=[]
 for i,a in enumerate(rows):
  if a['id'] not in masks:continue
  for b in rows[i+1:]:
   if b['id'] not in masks:continue
   scores=[float(np.logical_and(x,y).sum()/max(1,np.logical_or(x,y).sum())) for x,y in zip(masks[a['id']],masks[b['id']])]
   if min(scores)>.94:near.append({'a':a['id'],'b':b['id'],'silhouetteIoU':scores,'decision':'requires construction/visual distinction review; silhouette alone cannot accept/reject'})
 output={'count':len(rows),'passed':len(report),'errors':errors,'exactDuplicates':[v for v in exact.values() if len(v)>1],'normalizedOrMirroredDuplicates':[v for v in scaled.values() if len(v)>1],'nearSilhouettePairs':near,'checks':report,'limitations':'structural subset, no phone or user approval; canonical shape and silhouette are screening tools, visual construction review determines eligibility'}
 output_path=ROOT/('catalogue-v2/geometry-audit-v'+args.stage+('-reviewed' if args.reviewed_only else '')+'.json' if args.stage else 'catalogue-v2/geometry-audit.json')
 output_path.write_text(json.dumps(output,indent=2));print('audited',len(rows),'errors',len(errors),'exact duplicate groups',len(output['exactDuplicates']),'scaled/mirror groups',len(output['normalizedOrMirroredDuplicates']),'near pairs',len(near))
if __name__=='__main__':main()
