"""Remove unused tangent streams from materials without a normal map.
Does not fabricate tangent vectors or change geometry/material appearance.
"""
import json,struct
from validate_library import read_glb
def finalize_glb(path):
 g,b,raw=read_glb(path);removed=0;unused_accessors=0;unused_views=0
 for mesh in g.get('meshes',[]):
  for p in mesh['primitives']:
   material=g.get('materials',[])[p['material']]
   if 'normalTexture' not in material and 'TANGENT' in p['attributes']:
    del p['attributes']['TANGENT'];removed+=1
 # These static exports have no skin, animation, morph or compressed-extension
 # references. Compact only this explicit supported case; preserve unknown data.
 primitives=[p for mesh in g.get('meshes',[]) for p in mesh['primitives']]
 if not g.get('animations') and not g.get('skins') and not any(p.get('targets') or p.get('extensions') for p in primitives) and not any(a.get('sparse') for a in g.get('accessors',[])):
  used=sorted({i for p in primitives for i in list(p['attributes'].values())+([p['indices']] if 'indices' in p else [])});remap={old:new for new,old in enumerate(used)};unused_accessors=len(g.get('accessors',[]))-len(used);g['accessors']=[g['accessors'][i] for i in used]
  for p in primitives:
   p['attributes']={k:remap[i] for k,i in p['attributes'].items()}
   if 'indices' in p:p['indices']=remap[p['indices']]
  views=sorted({a['bufferView'] for a in g['accessors'] if 'bufferView' in a}|{im['bufferView'] for im in g.get('images',[]) if 'bufferView' in im});mapping={old:new for new,old in enumerate(views)};unused_views=len(g.get('bufferViews',[]))-len(views);packed=bytearray();new_views=[]
  for i in views:
   view=dict(g['bufferViews'][i]);assert view.get('buffer',0)==0
   packed.extend(b'\0'*((-len(packed))%4));start=view.get('byteOffset',0);data=b[start:start+view['byteLength']];view['byteOffset']=len(packed);packed.extend(data);new_views.append(view)
  for accessor in g['accessors']:
   if 'bufferView' in accessor:accessor['bufferView']=mapping[accessor['bufferView']]
  for im in g.get('images',[]):
   if 'bufferView' in im:im['bufferView']=mapping[im['bufferView']]
  g['bufferViews']=new_views;b=bytes(packed);g['buffers']=[{'byteLength':len(b)}]
 if removed or unused_accessors or unused_views:
  j=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode('utf-8');j+=b' '*((-len(j))%4);b+=b'\0'*((-len(b))%4)
  path.write_bytes(struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b)
 return {'unusedTangentAttributesRemoved':removed,'unusedAccessorsRemoved':unused_accessors,'unusedBufferViewsRemoved':unused_views,'bytesRemoved':len(raw)-path.stat().st_size,'normalMappedTangents':'retained, never replaced with arbitrary fallback vectors'}
