"""Import exported GLBs, assemble a review scene, render; no app implementation."""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
layout=[('sofa',(0,-1.25,0),0),('lounge-chair',(-1.5,.20,0),-.45),('coffee-table',(0,.05,0),0),('media-unit',(0,1.75,0),0),('floor-lamp',(1.55,-1.20,0),0)]
records=[]
manifest=json.loads((ROOT/'manifest.json').read_text())
for slug,pos,yaw in layout:
 before=set(bpy.context.scene.objects)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/v0.1.0'/f'ois.calm-oak.{slug}.glb'))
 imported=set(bpy.context.scene.objects)-before
 bpy.context.view_layer.update()
 pts=[o.matrix_world@v.co for o in imported if o.type=='MESH' for v in o.data.vertices]
 low=[min(p[i] for p in pts) for i in range(3)];high=[max(p[i] for p in pts) for i in range(3)]
 dimensions=[high[i]-low[i] for i in range(3)]
 a=next(a for a in manifest['assets'] if a['id']=='ois.calm-oak.'+slug)
 expected=[a['dimensionsMetres'][k] for k in ('width','depth','height')]
 assert max(abs(x-y) for x,y in zip(dimensions,expected))<.00002,(slug,dimensions,expected)
 assert abs(low[2])<.00002
 root=bpy.data.objects.new('placement-'+slug,None);bpy.context.collection.objects.link(root)
 for o in imported:
  if o.parent is None:o.parent=root
 root.location=pos;root.rotation_euler.z=yaw
 records.append({'assetId':'ois.calm-oak.'+slug,'version':'0.1.0','sha256':a['sha256'],'importedDimensionsWDH':dimensions,'floorScaleCheck':'pass','positionMetres':[pos[0],0,-pos[1]],'yawRadians':yaw})
# asymmetric axis fixture: one-metre X bar with shorter north/-Z bar
def cube(name,loc,dim,color):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1);o.data.materials.append(m)
cube('1m X marker',(-2,-1.8,.012),(1,.025,.024),(.65,.12,.10))
cube('0.5m north marker',(-2.5,-1.55,.012),(.025,.5,.024),(.12,.35,.65))
cube('preview floor',(0,0,-.04),(5,5,.08),(.68,.69,.65))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.world.color=(.35,.35,.35)
target=Vector((0,0,.45));bpy.ops.object.camera_add(location=(5,7,5.5));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=6.5;scene.camera=cam
for loc,power,size in (((-3,4,6),800,5),((4,-2,5),600,4)):
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(target-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'sources/calm-oak-import-test.blend'))
scene.render.filepath=str(ROOT/'previews/calm-oak-import-test.png');bpy.ops.render.render(write_still=True)
(ROOT/'test-scene.json').write_text(json.dumps({'schemaVersion':1,'frame':'RH Y-up metres; -Z north/front','source':'reimported GLBs, not authoring objects','items':records,'marker':'1m X / 0.5m -Z asymmetric L, preview only'},indent=2))
print('IMPORT TEST: 5 GLBs imported and rendered')
