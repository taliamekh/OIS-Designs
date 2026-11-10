"""Immutable reduced-geometry exports from exact original part-editable source models.
These are non-counting candidates until silhouette, format and rendered review pass.
"""
import bpy,bmesh,sys,argparse,json,hashlib,time
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from validate_library import inspect
from finalize_glb import finalize_glb
ROOT=HERE.parent
p=argparse.ArgumentParser();p.add_argument('--stage',required=True);p.add_argument('--only',required=True);p.add_argument('--revision',default='1');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
VERSION=a.stage+'-lod'+a.revision;folder=ROOT/f'catalogue-v2/staged/v{VERSION}';folder.mkdir(parents=True,exist_ok=True)
for sub in ('assets','previews'):(ROOT/sub/('v'+VERSION)).mkdir(parents=True,exist_ok=True)

def render(path,back=False):
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.world.color=(.25,.25,.25)
 points=[o.matrix_world@v.co for o in scene.objects if o.type=='MESH' for v in o.data.vertices];lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);centre=(lo+hi)/2;extent=max(hi-lo)
 direction=Vector((-1.25,-1.8,1.15)) if back else Vector((1.25,1.8,1.15));bpy.ops.object.camera_add(location=centre+direction*extent);cam=bpy.context.object;cam.rotation_euler=(centre-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.55;scene.camera=cam;helpers=[cam]
 for pos,power in (((-3,4,6),550),((4,1,4),400),((0,-4,5),450)):
  bpy.ops.object.light_add(type='AREA',location=centre+Vector(pos));light=bpy.context.object;light.data.energy=power;light.data.size=4;light.rotation_euler=(centre-light.location).to_track_quat('-Z','Y').to_euler();helpers.append(light)
 scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
 for o in helpers:bpy.data.objects.remove(o,do_unlink=True)

for slug in a.only.split(','):
 parent=json.loads((ROOT/f'catalogue-v2/staged/v{a.stage}/ois.design.{slug}.json').read_text())
 assert hashlib.sha256((ROOT/parent['file']).read_bytes()).hexdigest()==parent['sha256']
 for level in (1,2):
  identifier=parent['id']+f'.lod{level}';record=folder/(identifier+'.json')
  if record.exists():continue
  target=ROOT/f'assets/v{VERSION}/{slug}-lod{level}.glb';assert not target.exists(),'Choose a new immutable revision'
  bpy.ops.wm.open_mainfile(filepath=str(ROOT/parent['sourceModel']));source_hash=hashlib.sha256((ROOT/parent['sourceModel']).read_bytes()).hexdigest();changes=[]
  for o in list(bpy.context.scene.objects):
   if o.type!='MESH':continue
   before=sum(len(f.vertices)-2 for f in o.data.polygons)
   # Retain low-sided structural joints and planar cabinetry; simplify curved soft
   # bodies and dense weaving, rather than blindly collapsing every support leg.
   if before>=180:
    bpy.context.view_layer.objects.active=o;modifier=o.modifiers.new('reviewed distance simplification','DECIMATE');modifier.ratio=.58 if level==1 else .30;modifier.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=modifier.name)
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-8);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update();changes.append({'part':o.name,'before':before,'after':sum(len(f.vertices)-2 for f in o.data.polygons)})
   if o.data.has_custom_normals:o.data.normals_split_custom_set([(0,0,0)]*len(o.data.loops))
  # Decimation of a rounded caster can move its lowest vertex slightly. Restore
  # the shared floor pivot from measured vertices before export.
  bpy.context.view_layer.update();floor=min((o.matrix_world@v.co).z for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices)
  for o in bpy.context.scene.objects:o.location.z-=floor
  bpy.context.view_layer.update()
  # UV charts already exist in the immutable source; decimation interpolates them.
  by_material={}
  for o in bpy.context.scene.objects:
   if o.type=='MESH':by_material.setdefault(o.data.materials[0].name,[]).append(o)
  for objects in by_material.values():
   bpy.ops.object.select_all(action='DESELECT')
   for o in objects:o.select_set(True)
   bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
  bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_yup=True,export_tangents=True,export_materials='EXPORT')
  finalize_glb(target);stats=inspect(target);front=ROOT/f'previews/v{VERSION}/{slug}-lod{level}.png';rear=front.with_stem(front.stem+'-back');render(front);render(rear,True)
  row={**parent,**stats,'id':identifier,'version':VERSION,'file':target.relative_to(ROOT).as_posix(),'thumbnail':front.relative_to(ROOT).as_posix(),'backThumbnail':rear.relative_to(ROOT).as_posix(),'countEligible':False,'variantOf':parent['id'],'qualityStatus':'validated-candidate','stage':'validated-candidate','lodLevel':level,'visualReview':{'status':'pending'},'lodParent':{'id':parent['id'],'version':parent['version'],'sha256':parent['sha256'],'file':parent['file'],'sourceModelSha256':source_hash},'lodMethod':{'minimumPartTriangles':180,'collapseRatio':.58 if level==1 else .30,'parts':changes}}
  record.write_text(json.dumps(row,indent=2));print('LOD CANDIDATE',identifier,stats['triangles'],'parent',parent['triangles'],flush=True)

