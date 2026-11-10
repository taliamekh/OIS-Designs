"""Independent GLB binary/accessor/transform inspection; uses bundled Python + numpy."""
import json,struct,hashlib,math
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
def read_glb(path):
 raw=path.read_bytes(); magic,version,length=struct.unpack_from('<4sII',raw)
 assert magic==b'glTF' and version==2 and length==len(raw)
 off=12; chunks={}
 while off<len(raw):
  n,t=struct.unpack_from('<II',raw,off); off+=8; assert n%4==0
  chunks[t]=raw[off:off+n]; off+=n
 assert off==len(raw)
 return json.loads(chunks[0x4e4f534a]),chunks[0x004e4942],raw
def inspect(path):
 g,b,raw=read_glb(path); assert g['asset']['version']=='2.0'
 assert not g.get('extensionsRequired'), 'decoder dependency'
 assert all('uri' not in x for x in g.get('buffers',[]))
 image_stats=[]
 for image in g.get('images',[]):
  assert 'uri' not in image,'external image dependency'
  view=g['bufferViews'][image['bufferView']];blob=b[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
  assert blob[:8]==b'\x89PNG\r\n\x1a\n','only bounded embedded PNGs are currently supported'
  width,height=struct.unpack_from('>II',blob,16);assert width<=1024 and height<=1024
  image_stats.append({'name':image.get('name',''),'bytes':len(blob),'width':width,'height':height,'sha256':hashlib.sha256(blob).hexdigest()})
 def accessor(i):
  a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]
  dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
  count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  stride=v.get('byteStride',np.dtype(dt).itemsize*count)
  start=v.get('byteOffset',0)+a.get('byteOffset',0)
  assert start+(a['count']-1)*stride+count*np.dtype(dt).itemsize<=v.get('byteOffset',0)+v['byteLength']
  return np.ndarray((a['count'],count),dtype=dt,buffer=b,offset=start,strides=(stride,np.dtype(dt).itemsize))
 def matrix(n):
  if 'matrix' in n:return np.array(n['matrix']).reshape(4,4,order='F')
  x,y,z,w=n.get('rotation',[0,0,0,1]); r=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
  m=np.eye(4);m[:3,:3]=r@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
 points=[];tris=0;verts=0;draws=0;used=set()
 def walk(i,parent):
  nonlocal tris,verts,draws
  n=g['nodes'][i]; m=parent@matrix(n);assert np.linalg.det(m[:3,:3])>0
  if 'mesh' in n:
   for p in g['meshes'][n['mesh']]['primitives']:
    assert p.get('mode',4)==4
    v=accessor(p['attributes']['POSITION']);assert np.isfinite(v).all()
    material=g['materials'][p['material']];pbr=material.get('pbrMetallicRoughness',{})
    if any(k.endswith('Texture') for k in list(material)+list(pbr)):assert 'TEXCOORD_0' in p['attributes'],'textured primitive has no UVs'
    if 'normalTexture' in material:
     assert 'TANGENT' in p['attributes'],'normal-mapped primitive must export explicit tangents'
     tangents=accessor(p['attributes']['TANGENT']);lengths=np.linalg.norm(tangents[:,:3],axis=1)
     assert np.all(np.isfinite(tangents)) and np.all(abs(lengths-1)<.001),f'non-unit normal-map tangents: {int(np.sum(abs(lengths-1)>=.001))}'
    idx=accessor(p['indices']).ravel();assert idx.max()<len(v) and len(idx)%3==0
    points.append((m@np.c_[v,np.ones(len(v))].T).T[:,:3]);tris+=len(idx)//3;verts+=len(v);draws+=1;used.add(p['material'])
  for c in n.get('children',[]):walk(c,m)
 for i in g['scenes'][g.get('scene',0)]['nodes']:walk(i,np.eye(4))
 pts=np.concatenate(points);lo=pts.min(0);hi=pts.max(0)
 assert abs(lo[1])<.00002,(path,lo)
 assert len(raw)<=2_000_000
 assert tris<15000
 assert np.all(hi-lo>.01)
 return {'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'triangles':tris,'vertices':verts,'drawPrimitives':draws,
 'bounds':{'min':lo.tolist(),'max':hi.tolist()},'dimensionsMetres':{'width':float(hi[0]-lo[0]),'depth':float(hi[2]-lo[2]),'height':float(hi[1]-lo[1])},
 'footprint':[[float(lo[0]),float(lo[2])],[float(hi[0]),float(lo[2])],[float(hi[0]),float(hi[2])],[float(lo[0]),float(hi[2])]],
 'variantSlots':[g['materials'][i]['name'] for i in sorted(used)],'requiredExtensions':g.get('extensionsRequired',[]),
 'textures':{'count':len(image_stats),'bytes':sum(i['bytes'] for i in image_stats),'estimatedRgbaBytesWithMipmaps':int(sum(i['width']*i['height']*4*4/3 for i in image_stats)),'images':image_stats}}
if __name__=='__main__':
 data=json.loads((ROOT/'manifest.json').read_text()); rows=[]
 for a in data['assets']:
  result=inspect(ROOT/a['file']);a.update(result);a['materials']=[{'wood':'wood','fabric':'textile','linen':'textile','ceramic':'ceramic','metal':'metal','glass':'opaque-glass-study','dark':'paint'}[x] for x in a['variantSlots']]
  themes={'calm-oak':('pale oak','ivory','dark grey'),'walnut-form':('walnut brown','tobacco','muted brass'),'soft-japandi':('smoked ash','flax','charcoal'),'city-loft':('weathered brown','charcoal','black'),'coastal-linen':('pale oak','mist blue','sand')}
  wood,textile,metal=themes[a['theme']]
  colours={'wood':wood,'fabric':textile,'metal':metal,'linen':'warm ivory','ceramic':'warm white','dark':'near black','glass':'blue grey'}
  a['colourTags']=sorted({colours[s] for s in a['variantSlots']})
  a['category']={'sofa':'seating','armchair':'seating','dining-chair':'seating','bench':'seating','coffee-table':'tables','dining-table':'tables','desk':'tables','media-unit':'storage','storage':'storage','base-cabinet':'cabinetry','vanity':'bathroom-fixtures','washer':'appliances','floor-lamp':'lighting','bed':'beds'}[a['subtype']]
  a['searchAliases']={'full':['double','full-size'],'twin':['single'],'queen':['queen-size'],'king':['king-size'],'bunk':['bunk bed','children'],'loft':['loft bed','children']}.get(a.get('bedSize'),[])
  if a.get('bedSize') in ('twin','full') and 'children' not in a['roomTags']:a['roomTags'].append('children')
  a['favouriteStorage']='user catalogue-ID set; not intrinsic asset metadata'
  rows.append({'id':a['id'],**result,'checks':'pass'})
 data['counts']={'glbFiles':len(rows),'geometryFamilies':len({a['geometryFamily'] for a in data['assets']}),'stages':{s:sum(a['stage']==s for a in data['assets']) for s in sorted({a['stage'] for a in data['assets']})}}
 (ROOT/'manifest.json').write_text(json.dumps(data,indent=2))
 (ROOT/'validation.json').write_text(json.dumps({'validator':'independent structural subset; not Khronos validator or phone runtime','results':rows},indent=2))
 print(json.dumps(data['counts'])); print('bytes',sum(r['bytes'] for r in rows),'max triangles',max(r['triangles'] for r in rows))
