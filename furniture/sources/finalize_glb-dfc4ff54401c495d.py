"""Remove unused tangent streams from materials without a normal map.
Does not fabricate tangent vectors or change geometry/material appearance.
"""
import json,struct
from validate_library import read_glb
def finalize_glb(path):
 g,b,_=read_glb(path);removed=0
 for mesh in g.get('meshes',[]):
  for p in mesh['primitives']:
   material=g.get('materials',[])[p['material']]
   if 'normalTexture' not in material and 'TANGENT' in p['attributes']:
    del p['attributes']['TANGENT'];removed+=1
 if removed:
  j=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode('utf-8');j+=b' '*((-len(j))%4);b+=b'\0'*((-len(b))%4)
  path.write_bytes(struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b)
 return {'unusedTangentAttributesRemoved':removed,'normalMappedTangents':'retained, never replaced with arbitrary fallback vectors'}
