"""Source-part support screening. Ray tests flag visible unattached leg tops.
This is furniture visual QA, not structural engineering or load certification.
"""
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
def check_supports():
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];checks=[]
 for support in objects:
  name=support.name.lower()
  if not any(word in name for word in ('leg','module foot','bunk support','hairpin','sled frame')):continue
  # Target all other source parts, excluding other identified leg members.
  others=[o for o in objects if o!=support and not any(word in o.name.lower() for word in ('leg','module foot','bunk support','hairpin','sled frame'))]
  if not others:continue
  verts=[];faces=[]
  for o in others:
   offset=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices);faces.extend(tuple(offset+i for i in p.vertices) for p in o.data.polygons)
  tree=BVHTree.FromPolygons(verts,faces,all_triangles=False)
  localtop=max(v.co.z for v in support.data.vertices);cap=[support.matrix_world@v.co for v in support.data.vertices if v.co.z>=localtop-.012]
  centre=sum(cap,Vector())/len(cap);axis=(support.matrix_world.to_3x3()@Vector((0,0,1))).normalized()
  hit,normal,index,distance=tree.ray_cast(centre-axis*.15,axis,.30)
  gap=None if hit is None else float(distance-.15)
  status='pass' if gap is not None and -.149<=gap<=.015 else 'needs-visual-review'
  checks.append({'part':support.name,'gapMetresAlongSupport':gap,'status':status})
 return {'method':'source-part upper-end ray to non-leg geometry, 15mm join tolerance','status':'pass' if all(c['status']=='pass' for c in checks) else 'needs-visual-review','parts':checks,'limitation':'screening only; hidden joints, whole-model connectivity, load paths and safety remain visual/product-review concerns'}
