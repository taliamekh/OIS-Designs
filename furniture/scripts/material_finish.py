"""Apply real exported image maps and metre-derived UVs to original furniture."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def apply_finish():
 bpy.context.view_layer.update()
 folder=ROOT/'materials/v1'
 for m in bpy.data.materials:
  name=m.name
  if name not in ('wood','fabric','linen'):continue
  stem={'wood':'wood','fabric':'fabric','linen':'linen'}[name];nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF');tint=tuple(bs.inputs['Base Color'].default_value)
  image=nodes.new('ShaderNodeTexImage');image.image=bpy.data.images.load(str(folder/f'{stem}-neutral-base.png'),check_existing=True);image.image.colorspace_settings.name='sRGB'
  # Blender 5.2's glTF factor detector recognizes the new RGBA Mix node, not
  # legacy MixRGB. Keep a neutral shared texture and an independently editable tint.
  multiply=nodes.new('ShaderNodeMix');multiply.data_type='RGBA';multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[7].default_value=tint;links.new(image.outputs['Color'],multiply.inputs[6]);links.new(multiply.outputs[2],bs.inputs['Base Color'])
  normal=nodes.new('ShaderNodeTexImage');normal.image=bpy.data.images.load(str(folder/f'{stem}-normal.png'),check_existing=True);normal.image.colorspace_settings.name='Non-Color'
  convert=nodes.new('ShaderNodeNormalMap');convert.inputs['Strength'].default_value=.22 if name=='wood' else .30;links.new(normal.outputs['Color'],convert.inputs['Color']);links.new(convert.outputs['Normal'],bs.inputs['Normal'])
  rough=nodes.new('ShaderNodeTexImage');rough.image=bpy.data.images.load(str(folder/f'{stem}-roughness.png'),check_existing=True);rough.image.colorspace_settings.name='Non-Color';links.new(rough.outputs['Color'],bs.inputs['Roughness'])
 for o in bpy.context.scene.objects:
  if o.type!='MESH' or not o.data.materials:continue
  slot=o.data.materials[0].name
  if slot not in ('wood','fabric','linen'):continue
  repeat=(.16,.75) if slot=='wood' else ((.14,.14) if slot=='fabric' else (.12,.12))
  me=o.data;uv=me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap');co=[v.co for v in me.vertices];scale=[o.matrix_world.to_3x3().col[i].length for i in range(3)];extent=[(max(v[i] for v in co)-min(v[i] for v in co))*scale[i] for i in range(3)];grain=max(range(3),key=lambda i:extent[i])
  grain=int(o.get('grainAxis',grain))
  # Distinct charts at every shared vertex avoid tangent averaging across
  # incompatible projections on tiny bevel triangles. Reuse integer tiles only
  # across nonadjacent faces; repeat phase and visible texels remain unchanged.
  vertex_colours=[set() for unused in me.vertices]
  for face in me.polygons:
   normalaxis=max(range(3),key=lambda i:abs(face.normal[i]));vaxis=grain if grain!=normalaxis else max((i for i in range(3) if i!=normalaxis),key=lambda i:extent[i]);uaxis=next(i for i in range(3) if i not in (normalaxis,vaxis))
   forbidden=set().union(*(vertex_colours[v] for v in face.vertices));colour=0
   while colour in forbidden:colour+=1
   for v in face.vertices:vertex_colours[v].add(colour)
   chart_offset=normalaxis*4+(2 if face.normal[normalaxis]<0 else 0)+colour*16
   for loop in face.loop_indices:
    # Integer tile offsets keep identical visible phase while separating projection
    # charts for MikkTSpace. Coincident UVs across opposing charts can cancel tangents.
    p=me.vertices[me.loops[loop].vertex_index].co;uv.data[loop].uv=(chart_offset+p[uaxis]*scale[uaxis]/repeat[0],p[vaxis]*scale[vaxis]/repeat[1])
 return {'source':'materials/v1/manifest.json','repeatMetres':{'wood':[.16,.75],'fabric':[.14,.14],'linen':[.12,.12]},'maps':'original base colour / roughness / tangent normal, embedded in GLB'}
