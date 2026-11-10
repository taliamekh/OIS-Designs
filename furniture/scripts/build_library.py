"""Run with Blender --background --python furniture/scripts/build_library.py.
Original procedural furniture; Blender Z-up is converted by the glTF exporter.
"""
import bpy, math, json, hashlib, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
if (ROOT/'manifest.json').exists() and json.loads((ROOT/'manifest.json').read_text()).get('catalogueVersion')!='0.1.0':
 raise SystemExit('Legacy 0.1.0 builder is frozen. Use build_catalogue_v2.py with a new immutable version; do not overwrite current manifest or saved hashes.')
VERSION = '0.1.0'
OUT = ROOT/'assets'/('v'+VERSION)
PRE = ROOT/'previews'
for p in (OUT, PRE, ROOT/'sources'): p.mkdir(parents=True, exist_ok=True)

PALETTES = {
 'calm-oak': ('Calm Oak', (0.62,.43,.24,1), (.79,.75,.65,1), (.12,.13,.12,1)),
 'walnut-form': ('Walnut Form', (.23,.105,.048,1), (.40,.19,.085,1), (.48,.32,.12,1)),
 'soft-japandi': ('Soft Japandi', (.40,.33,.23,1), (.65,.60,.48,1), (.20,.21,.18,1)),
 'city-loft': ('City Loft', (.25,.18,.12,1), (.13,.15,.16,1), (.045,.05,.055,1)),
 'coastal-linen': ('Coastal Linen', (.73,.61,.42,1), (.44,.60,.64,1), (.79,.76,.66,1)),
}
assets=[]
def material(name,color,rough=.65,metal=0):
 m=bpy.data.materials.new(name); m.diffuse_color=color; m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=color
 bs.inputs['Roughness'].default_value=rough; bs.inputs['Metallic'].default_value=metal
 return m
def reset(theme):
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
 for m in list(bpy.data.materials): bpy.data.materials.remove(m)
 _,wood,fabric,metal=PALETTES[theme]
 global mats
 mats={'wood':material('wood',wood,.42),'fabric':material('fabric',fabric,.9),
 'metal':material('metal',metal,.35,.65),'ceramic':material('ceramic',(.86,.85,.79,1),.4),
 'linen':material('linen',(.88,.84,.73,1),.95),'dark':material('dark',(.035,.045,.05,1),.5),
 'glass':material('glass',(.15,.23,.27,1),.18,.3)}
def finish(o,name,slot):
 o.name=name; o.data.materials.append(mats[slot]); return o
def box(name,xyz,dim,slot='wood',r=.012):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz); o=bpy.context.object; o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r:
  mod=o.modifiers.new('soft manufactured edge','BEVEL'); mod.width=r; mod.segments=3
  bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('weighted surface normals','WEIGHTED_NORMAL'); bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,slot)
def cyl(name,xyz,radius,depth,slot='wood',top=None):
 if top is None: bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=depth,location=xyz)
 else: bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=radius,radius2=top,depth=depth,location=xyz)
 o=bpy.context.object
 for f in o.data.polygons: f.use_smooth=len(f.vertices)==4
 return finish(o,name,slot)
def rod(name,a,b,r=.012,slot='wood'):
 a,b=Vector(a),Vector(b); o=cyl(name,(a+b)/2,r,(b-a).length,slot)
 o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o
def legs(w,d,h=.18):
 for x in (-w/2+.09,w/2-.09):
  for y in (-d/2+.09,d/2-.09):
   rod('splayed leg',(x*1.04,y*1.04,0),(x,y,h),.027)
def sofa(chair=False):
 w=.78 if chair else 2.10; d=.82 if chair else .9; legs(w,d,.19)
 box('upholstered apron',(0,0,.245),(w-.07,d-.06,.17),'fabric',.055)
 box('back upholstered shell',(0,-d/2+.10,.555),(w-.08,.18,.49),'fabric',.065)
 for x in (-w/2+.075,w/2-.075): box('rounded arm',(x,.025,.49),(.15,d-.08,.40),'fabric',.06)
 n=1 if chair else 3; sw=(w-.35)/n
 for i in range(n):
  x=(i-(n-1)/2)*sw
  box('separate seat cushion',(x,.055,.405),(sw-.012,d-.25,.17),'fabric',.057)
  o=box('separate back cushion',(x,-d/2+.225,.64),(sw-.015,.20,.32),'fabric',.062); o.rotation_euler.x=math.radians(-9)
  box('seat welt',(x,.058,.397),(sw-.009,d-.247,.018),'linen',.008)
def table():
 o=cyl('oval solid oak top',(0,0,.352),.5,.056); o.scale=(1.1,.55,1)
 for x in (-.35,.35):
  for y in (-.14,.14): rod('tapered table support',(x*1.10,y*1.10,0),(x,y,.326),.026)
def cabinet():
 legs(1.6,.4,.15); box('carcase',(0,0,.34),(1.6,.4,.38))
 for x in (-.395,.395):
  box('door',(x,.207,.34),(.777,.022,.31),'wood',.008)
  for j in range(15): box('door vertical relief',(x-.355+j*.05,.224,.34),(.019,.018,.28),'wood',.004)
  cyl_o=rod('handle',(x+.24,.248,.30),(x+.24,.248,.38),.007,'metal')
 box('top',(0,0,.535),(1.6,.4,.03))
def lamp():
 cyl('weighted base',(0,0,.022),.17,.044,'metal')
 cyl('stem',(0,0,.73),.014,1.42,'metal')
 # Open frustum, with real inner wall and rim; no opaque cap over the shade.
 verts=[]; n=48
 for z,r in ((1.24,.20),(1.6,.145),(1.6,.141),(1.24,.196)):
  verts.extend([(r*math.cos(i*2*math.pi/n),r*math.sin(i*2*math.pi/n),z) for i in range(n)])
 faces=[]
 for a,b in ((0,1),(1,2),(2,3),(3,0)):
  for i in range(n): faces.append((a*n+i,a*n+(i+1)%n,b*n+(i+1)%n,b*n+i))
 mesh=bpy.data.meshes.new('shade mesh'); mesh.from_pydata(verts,[],faces); mesh.update()
 o=bpy.data.objects.new('open linen shade',mesh); bpy.context.collection.objects.link(o); finish(o,'open linen shade','linen')
 cyl('bulb',(0,0,1.34),.04,.10,'ceramic')
def bed(size):
 sizes={'twin':(.9652,1.905),'full':(1.3716,1.905),'queen':(1.524,2.032),'king':(1.9304,2.032),'bunk':(.9652,1.905),'loft':(.9652,1.905)}
 w,d=sizes[size]; W=w+.10; D=d+.12
 tall=size in ('bunk','loft'); levels=[.42] if not tall else ([.42,1.50] if size=='bunk' else [1.50])
 for h in levels:
  box('bed platform',(0,0,h-.055),(W,D,.11))
  box('mattress',(0,0,h+.10),(w,d,.20),'linen',.05)
  box('duvet',(0,.24,h+.215),(w-.02,d-.55,.05),'fabric',.024)
  for x in ((0,) if w<1.1 else (-w/4,w/4)):
   box('pillow',(x,-d/2+.24,h+.24),(min(.62,w-.1),.38,.12),'linen',.05)
 if tall:
  for x in (-W/2,W/2):
   for y in (-D/2,D/2): box('upright',(x,y,.98),(.05,.05,1.96))
  for y in (-D/2+.025,D/2-.025):
   box('upper end rail',(0,y,1.89),(W,.04,.12))
  # Long side rails supplement the end rails without coincident duplicate surfaces.
  box('left side guard',(-W/2+.025,0,1.89),(.04,D-.10,.12))
  box('right side guard',(W/2-.025,-.18,1.89),(.04,D-.46,.12))
  for x in (W/2-.30,W/2-.04): rod('ladder stile',(x,D/2+.16,0),(x,D/2+.03,1.72),.018)
  for z in (.24,.50,.76,1.02,1.28,1.54): rod('ladder rung',(W/2-.30,D/2+.16-z*.075,z),(W/2-.04,D/2+.16-z*.075,z),.015)
 else:
  legs(W,D,.37); box('headboard',(0,-D/2+.02,.55),(W,.06,1.10),'wood',.025)
 return {'mattressMetres':[w,d,.20], 'convention':'nominal North American mattress; frame dimensions measured separately', 'safetyReviewRequired':tall}
def dining_table():
 box('table top',(0,0,.725),(1.6,.85,.05),'wood',.025)
 for x in (-.70,.70):
  for y in (-.33,.33): rod('leg',(x,y,0),(x*.96,y*.96,.70),.032)
def dining_chair():
 legs(.46,.50,.43); box('seat',(0,0,.455),(.46,.50,.05),'fabric',.022)
 for x in (-.20,.20): rod('back upright',(x,-.20,.40),(x,-.23,.84),.018)
 box('back rest',(0,-.23,.75),(.44,.045,.20),'wood',.025)
def base_cabinet(vanity=False):
 w=.8 if vanity else .6; d=.48 if vanity else .6; h=.85 if vanity else .9
 box('plinth',(0,-.02,.06),(w-.08,d-.08,.12),'dark')
 box('carcase',(0,0,h/2),(w,d,h-.06))
 for x in (-w/4,w/4):
  box('door',(x,d/2+.008,h/2),(w/2-.012,.02,h-.16))
  rod('pull',(x,d/2+.035,h-.19),(x+.10,d/2+.035,h-.19),.006,'metal')
 box('countertop',(0,0,h-.015),(w+.02,d+.02,.03),'ceramic')
 if vanity:
  # A visibly recessed basin assembled from four walls and a bottom.
  box('basin bottom',(0,0,h+.015),(.46,.30,.03),'ceramic')
  for x in (-.245,.245): box('basin side',(x,0,h+.07),(.03,.36,.14),'ceramic')
  for y in (-.165,.165): box('basin end',(0,y,h+.07),(.46,.03,.14),'ceramic')
  rod('tap',(0,-.205,h),(0,-.205,h+.24),.014,'metal'); rod('spout',(0,-.205,h+.24),(0,-.08,h+.24),.014,'metal')
def desk():
 box('desktop',(0,0,.725),(1.2,.6,.05))
 for x in (-.53,.53):
  for y in (-.23,.23): rod('desk leg',(x,y,0),(x,y,.70),.023,'metal')
 box('drawer',(0,-.02,.64),(.55,.46,.12))
def bench():
 box('seat',(0,0,.435),(1.0,.36,.05)); legs(1,.36,.41)
 for j in range(6): box('shoe shelf slat',(-.40+j*.16,0,.16),(.12,.30,.025))
def washer():
 box('appliance enclosure',(0,0,.425),(.60,.62,.85),'ceramic',.025)
 box('control panel',(0,.319,.76),(.54,.015,.11),'dark')
 o=cyl('door surround',(0,.325,.405),.215,.025,'metal'); o.rotation_euler.x=math.pi/2
 o=cyl('door glass',(0,.345,.405),.17,.012,'glass'); o.rotation_euler.x=math.pi/2
 for x in (.10,.21):
  o=cyl('dial',(x,.337,.76),.024,.02,'metal'); o.rotation_euler.x=math.pi/2
def toy_storage():
 box('base',(0,0,.035),(.9,.35,.07)); box('top',(0,0,.575),(.9,.35,.05))
 for x in (-.43,0,.43): box('divider',(x,0,.30),(.04,.35,.52))
 box('back',(0,-.165,.30),(.9,.02,.52))
 for x in (-.215,.215): box('storage bin',(x,.03,.20),(.36,.28,.30),'fabric',.025)

SPECS=[('sofa','Linen sofa','living','sofa',lambda:sofa(),True),
 ('lounge-chair','Upholstered lounge chair','living','armchair',lambda:sofa(True),True),
 ('coffee-table','Oval oak coffee table','living','coffee-table',table,True),
 ('media-unit','Slatted media unit','living','media-unit',cabinet,True),
 ('floor-lamp','Linen floor lamp','living','floor-lamp',lamp,True)]
for size in ('twin','full','queen','king','bunk','loft'):
 SPECS.append(('bed-'+size,size.title()+' bed','children' if size in ('bunk','loft') else 'bedroom','bed',lambda s=size:bed(s),False))
SPECS.extend([('dining-table','Dining table','dining','dining-table',dining_table,False),('dining-chair','Dining chair','dining','dining-chair',dining_chair,False),
 ('kitchen-base','Kitchen base cabinet','kitchen','base-cabinet',base_cabinet,False),('bath-vanity','Bathroom vanity','bathroom','vanity',lambda:base_cabinet(True),False),
 ('desk','Writing desk','office','desk',desk,False),('entry-bench','Shoe bench','entry-hall','bench',bench,False),
 ('washer','Front-load washer','laundry-utility','washer',washer,False),('toy-storage','Toy storage','children','storage',toy_storage,False)])

def render(path):
 scene=bpy.context.scene
 scene.render.engine='CYCLES'; scene.cycles.samples=24
 scene.render.resolution_x=600; scene.render.resolution_y=500; scene.render.resolution_percentage=100
 scene.world.color=(.30,.30,.30)
 objs=[o for o in scene.objects if o.type=='MESH']
 pts=[o.matrix_world@Vector(c) for o in objs for c in o.bound_box]
 lo=Vector([min(p[i] for p in pts) for i in range(3)]); hi=Vector([max(p[i] for p in pts) for i in range(3)])
 center=(lo+hi)/2; extent=max(hi.x-lo.x,hi.y-lo.y,hi.z-lo.z)
 bpy.ops.object.camera_add(location=center+Vector((1.15,1.7,1.0))*extent)
 cam=bpy.context.object; cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=extent*1.55; scene.camera=cam
 for pos,power,size in (((-3,4,6),500,4),((4,1,4),350,3),((0,-4,5),400,3)):
  bpy.ops.object.light_add(type='AREA',location=center+Vector(pos)); l=bpy.context.object; l.data.energy=power; l.data.shape='DISK'; l.data.size=size; l.rotation_euler=(center-l.location).to_track_quat('-Z','Y').to_euler()
 # Studio ground is preview-only, excluded from GLBs.
 groundmat=material('preview ground',(.73,.75,.73,1),.9)
 bpy.ops.mesh.primitive_plane_add(size=200); bpy.context.object.data.materials.append(groundmat)
 scene.render.filepath=str(path); bpy.ops.render.render(write_still=True)

for slug,label,room,subtype,builder,detailed in SPECS:
 themes=list(PALETTES) if detailed else ['calm-oak']
 for theme in themes:
  reset(theme); extra=builder() or {}; item_id=f'ois.{theme}.{slug}'
  # Splayed cylinders can project slightly below their endpoint. Normalize actual mesh floor.
  floor=min((o.matrix_world@v.co).z for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices)
  for o in bpy.context.scene.objects: o.location.z-=floor
  stage='detailed-review-candidate' if detailed and theme=='calm-oak' else ('material-study' if detailed else 'geometry-prototype')
  path=OUT/(item_id+'.glb')
  if theme=='calm-oak': bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'sources'/(slug+'.blend')))
  # Batch disconnected parts per material for phone draw budgets. Sources retain named parts.
  for slot in list(mats):
   group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mats[slot]]
   if not group: continue
   bpy.ops.object.select_all(action='DESELECT')
   for o in group:o.select_set(True)
   bpy.context.view_layer.objects.active=group[0]
   if len(group)>1:bpy.ops.object.join()
   bpy.context.object.name=slot+' geometry'
  bpy.ops.object.select_all(action='SELECT')
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True)
  assets.append({'id':item_id,'version':VERSION,'name':label,'roomTags':[room], 'category':subtype,'subtype':subtype,'theme':theme,'stage':stage,
   'geometryFamily':slug,'bedSize':slug[4:] if slug.startswith('bed-') else None,'file':str(path.relative_to(ROOT)).replace('\\','/'),
   'thumbnail':f'previews/{item_id}.png','licence':'LicenseRef-OIS-Original-Pending-Owner-Release','source':'scripts/build_library.py',
   'variantSlots':['wood','fabric','metal','ceramic','linen','dark','glass'],'colors':[list(c[:3]) for c in PALETTES[theme][1:]],
   'materials':['wood','textile','metal'],'units':'metres','frame':'RH Y-up, +X right, -Z furniture front','pivot':'floor centre of primary body; tall-bed ladder extends footprint',
   'placement':{'anchor':'floor','allowArbitraryScale':False,'allowedYaw':'any','collision':'conservative XZ oriented rectangle; not clearance'},
   'lod':{'delivered':['LOD0'],'planned':'LOD1 <=50% triangles; LOD2 <=20%, silhouette review required'},'textures':{'count':0,'bytes':0},**extra})
  if '--no-render' not in sys.argv or ('--render-beds' in sys.argv and slug in ('bed-bunk','bed-loft')): render(PRE/(item_id+'.png'))
  (ROOT/'manifest.json').write_text(json.dumps({'schemaVersion':1,'catalogueVersion':VERSION,'assets':assets},indent=2))
print('DELIVERED',len(assets))
