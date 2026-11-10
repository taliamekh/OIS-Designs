"""Independent source-part contact graph; flags, never automatically accepts/rejects.
Uses real world-space triangles, intersection and nearest surface distances.
"""
import bpy,sys,argparse,json,hashlib,time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;ROOT=HERE.parent
p=argparse.ArgumentParser();p.add_argument('--stage',required=True);p.add_argument('--live-source',action='store_true');p.add_argument('--only');p.add_argument('--start',type=int,default=0);p.add_argument('--limit',type=int,default=999);args=p.parse_args(sys.argv[sys.argv.index('--')+1:])
sys.path.insert(0,str(HERE));source_hash=hashlib.sha256(b''.join((HERE/name).read_bytes() for name in ('design_geometry.py','signature_designs.py','catalogue_inventory.py'))).hexdigest()
out=ROOT/('catalogue-v2/connection-live-'+source_hash[:12] if args.live_source else f'catalogue-v2/connection-audit-v{args.stage}');out.mkdir(exist_ok=True)
if args.live_source:
 from catalogue_inventory import DESIGNS
 import design_geometry as geo
 rows=[{**a,'sha256':'unexported-source-'+source_hash,'sourceModel':None} for a in DESIGNS]
else:rows=[json.loads(file.read_text()) for file in sorted((ROOT/f'catalogue-v2/staged/v{args.stage}').glob('*.json'))]
if args.only:rows=[a for a in rows if any(s in a['id'] for s in args.only.split(','))]
for a in rows[args.start:args.start+args.limit]:
 target=out/(a['id']+'.json')
 if target.exists() and json.loads(target.read_text()).get('sha256')==a['sha256']:continue
 if args.live_source:geo.reset(a['theme']);geo.BUILDERS[a['builder']](a['parameters'])
 else:bpy.ops.wm.open_mainfile(filepath=str(ROOT/a['sourceModel']))
 if not args.live_source and a.get('provenance',{}).get('sourceModelSha256'):assert hashlib.sha256((ROOT/a['sourceModel']).read_bytes()).hexdigest()==a['provenance']['sourceModelSha256'],'Immutable source bytes changed'
 bpy.context.view_layer.update();parts=[]
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  points=[o.matrix_world@v.co for v in o.data.vertices];faces=[tuple(f.vertices) for f in o.data.polygons];tree=BVHTree.FromPolygons(points,faces,all_triangles=False);points.extend(o.matrix_world@f.center for f in o.data.polygons);lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)]);parts.append({'name':o.name,'points':points,'tree':tree,'lo':lo,'hi':hi})
 parent=list(range(len(parts)));edges=[]
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 def join(i,j,method,distance=0):parent[find(i)]=find(j);edges.append({'a':parts[i]['name'],'b':parts[j]['name'],'method':method,'distance':distance})
 def inside(point,tree):
  # An enclosed part may be entirely embedded in another (e.g. piping under a cushion).
  direction=Vector((.934,.233,.271)).normalized();origin=point.copy();crossings=0
  for unused in range(40):
   hit,normal,index,distance=tree.ray_cast(origin,direction,100)
   if hit is None:break
   crossings+=1;origin=hit+direction*.00001
  return crossings%2==1
 for i,x in enumerate(parts):
  for j in range(i):
   y=parts[j]
   if any(x['lo'][k]>y['hi'][k]+.004 or y['lo'][k]>x['hi'][k]+.004 for k in range(3)):continue
   if x['tree'].overlap(y['tree']):join(i,j,'triangle intersection');continue
   connected=False
   for points,tree in ((x['points'],y['tree']),(y['points'],x['tree'])):
    for point in points:
     nearest,normal,index,distance=tree.find_nearest(point,.004)
     if nearest is not None:join(i,j,'surface distance',float(distance));connected=True;break
    if connected:break
   if connected:continue
   if inside(x['points'][0],y['tree']) or inside(y['points'][0],x['tree']):join(i,j,'point containment')
 groups={}
 for i,part in enumerate(parts):groups.setdefault(find(i),[]).append(i)
 components=[]
 for indices in sorted(groups.values(),key=len,reverse=True):
  components.append({'parts':[parts[i]['name'] for i in indices],'minimum':[min(parts[i]['lo'][k] for i in indices) for k in range(3)],'maximum':[max(parts[i]['hi'][k] for i in indices) for k in range(3)]})
 report={'id':a['id'],'sha256':a['sha256'],'sourceModel':a['sourceModel'],'sourceSha256':source_hash if args.live_source else hashlib.sha256((ROOT/a['sourceModel']).read_bytes()).hexdigest(),'partCount':len(parts),'componentCount':len(components),'components':components,'contacts':edges,'toleranceMetres':.004,'scope':'visual support screening only; live-source reports are NOT exported-asset evidence; disconnected loose pieces may be intentional, intersections are not structural certification','timeUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())};target.write_text(json.dumps(report,indent=2));print('CONTACT GRAPH',a['id'],len(parts),'parts',len(components),'groups',flush=True)
