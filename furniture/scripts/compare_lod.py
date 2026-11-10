"""Quantitative screening of LOD geometry against its exact immutable parent.
Silhouette overlap is a gate, not a substitute for rendered visual inspection.
"""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from audit_catalogue_v2 import geometry,mask,ROOT
version=sys.argv[1];folder=ROOT/f'catalogue-v2/staged/v{version}';rows=[]
for path in sorted(folder.glob('*.json')):
 a=json.loads(path.read_text());parent=a['lodParent'];p=ROOT/parent['file'];assert hashlib.sha256(p.read_bytes()).hexdigest()==parent['sha256'];assert hashlib.sha256((ROOT/a['file']).read_bytes()).hexdigest()==a['sha256']
 original=geometry(p);reduced=geometry(ROOT/a['file']);scores={}
 for view in ('front','side','top'):
  x,y=mask(original,view),mask(reduced,view);scores[view]=float(np.logical_and(x,y).sum()/max(1,np.logical_or(x,y).sum()))
 x,y=original.reshape(-1,3),reduced.reshape(-1,3);difference=np.max(np.abs(np.r_[x.min(0)-y.min(0),x.max(0)-y.max(0)]));ratio=len(reduced)/len(original)
 row={'id':a['id'],'sha256':a['sha256'],'parentSha256':parent['sha256'],'parentTriangles':len(original),'triangles':len(reduced),'ratio':ratio,'silhouetteIoU':scores,'maximumBoundsDifferenceMetres':float(difference),'screeningPass':bool(min(scores.values())>=.965 and difference<=.005 and ratio<.95)};rows.append(row)
result={'version':version,'thresholds':{'minimumThreeViewIoU':.965,'maximumBoundsDifferenceMetres':.005,'maximumTriangleRatio':.95},'rows':rows,'screeningPassed':sum(a['screeningPass'] for a in rows),'count':len(rows),'scope':'geometry-only screening; require exact-asset formal and rendered visual evidence before LOD delivery'}
(ROOT/f'catalogue-v2/lod-comparison-v{version}.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))

