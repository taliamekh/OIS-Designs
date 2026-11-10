"""Isolated original-material test, outside the live catalogue and its counts."""
import bpy,sys,json,ast,hashlib,bmesh
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));ROOT=HERE.parent
import design_geometry as geo
from catalogue_inventory import DESIGNS
from material_finish import apply_finish
from validate_library import inspect,read_glb
OUT=ROOT/'catalogue-v2/material-tests';OUT.mkdir(exist_ok=True)
syntax=ast.parse((HERE/'build_catalogue_v2.py').read_text());function=next(n for n in syntax.body if isinstance(n,ast.FunctionDef) and n.name=='render');exec(compile(ast.Module(body=[function],type_ignores=[]),'shared-render','exec'))
results=[]
for slug in ('rail-frame-sofa','barrel-enclosure','draped-canopy-bed','rect-trestle-dining'):
 a=next(a for a in DESIGNS if a['id']=='ois.design.'+slug);geo.reset(a['theme']);geo.BUILDERS[a['builder']](a['parameters'])
 bpy.context.view_layer.update();floor=min((o.matrix_world@v.co).z for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices)
 for o in bpy.context.scene.objects:o.location.z-=floor
 apply_finish()
 for slot,m in geo.M.items():
  group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
  if not group:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0]
  if len(group)>1:bpy.ops.object.join()
  bpy.context.object.name=slot+' geometry'
 bpy.ops.object.select_all(action='SELECT');file=OUT/(slug+'.glb');bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
 stats=inspect(file);g,_,_=read_glb(file);stats['materialFactors']=[{'name':m.get('name'),'pbr':m.get('pbrMetallicRoughness'),'normal':m.get('normalTexture')} for m in g['materials']]
 for material in g['materials']:
  if material.get('name')=='wood':
   expected=geo.PALETTES[a['theme']][0];actual=material['pbrMetallicRoughness'].get('baseColorFactor',[1,1,1,1]);assert max(abs(x-y) for x,y in zip(expected,actual))<.00001,('lost editable material tint',actual,expected)
 results.append({'id':a['id'],**stats});render(OUT/(slug+'.png'));render(OUT/(slug+'-back.png'),True)
(OUT/'result.json').write_text(json.dumps({'scope':'isolated original texture/UV/export tests; not published catalogue designs','results':results},indent=2));print('MATERIAL PROBE COMPLETE',len(results))
