"""Original metre-scale furniture construction toolkit, Blender 5.2.
No downloaded meshes. Builders describe construction rather than random perturbations.
Blender: X right, +Y front, Z up. Export converts front to OIS -Z.
"""
import bpy, math
from mathutils import Vector
from math import sin,cos,pi

PALETTES={
 'calm-oak':((.58,.39,.20,1),(.73,.70,.61,1),(.12,.14,.13,1)),
 'walnut-form':((.22,.09,.038,1),(.39,.18,.07,1),(.47,.30,.10,1)),
 'soft-japandi':((.34,.28,.19,1),(.58,.54,.44,1),(.15,.17,.15,1)),
 'city-loft':((.23,.15,.09,1),(.12,.14,.16,1),(.045,.05,.055,1)),
 'coastal-linen':((.66,.53,.34,1),(.36,.53,.58,1),(.64,.60,.48,1))}
M={}
def mat(name,col,rough=.65,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=col;m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=col;p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 M[name]=m;return m
def reset(theme):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for db in (bpy.data.meshes,bpy.data.curves,bpy.data.materials,bpy.data.cameras,bpy.data.lights):
  for d in list(db):
   if d.users==0:db.remove(d)
 M.clear();w,f,m=PALETTES[theme]
 mat('wood',w,.43);mat('fabric',f,.88);mat('metal',m,.33,.72)
 mat('linen',(.84,.80,.69,1),.95);mat('ceramic',(.80,.81,.76,1),.24)
 mat('stone',(.47,.48,.44,1),.62);glass=mat('glass',(.20,.32,.35,.24),.14,0)
 glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.24
 glass.surface_render_method='DITHERED'
 mat('dark',(.025,.035,.04,1),.48);mat('accent',(.27,.40,.32,1),.68)
 mat('cane',(.48,.34,.17,1),.85)
 mat('mirror',(.92,.94,.95,1),.045,1)
def finish(o,name,slot):
 o.name=name;o.data.materials.append(M[slot]);return o
def box(name,pos,dim,slot='wood',r=.008):
 assert min(dim)>0,(name,dim)
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r>0:
  b=o.modifiers.new('edge radius','BEVEL');b.width=min(r,min(dim)*.48);b.segments=1 if min(dim)<.04 else 3;bpy.ops.object.modifier_apply(modifier=b.name)
  n=o.modifiers.new('manufactured normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name)
 return finish(o,name,slot)
def mesh(name,verts,faces,slot='wood',smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
 for p in me.polygons:p.use_smooth=smooth
 return finish(o,name,slot)
def cylinder(name,pos,r,h,slot='wood',r2=None,n=32):
 bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=r if r2 is None else r2,depth=h,location=pos)
 o=bpy.context.object
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return finish(o,name,slot)
def ellipsoid(name,pos,dim,slot='fabric'):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=pos);o=bpy.context.object;o.scale=tuple(v/2 for v in dim)
 for p in o.data.polygons:p.use_smooth=True
 return finish(o,name,slot)
def rod(name,a,b,r=.016,slot='metal',r2=None,n=16):
 a,b=Vector(a),Vector(b);o=cylinder(name,(a+b)/2,r,(b-a).length,slot,r2,n);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def tube(name,points,r=.014,slot='metal',closed=False):
 # Low-sided continuous tube, parallel-ish local frames; useful for bent frames.
 pts=[Vector(p) for p in points];verts=[];n=8
 previous_u=None
 for i,p in enumerate(pts):
  tangent=pts[(i+1)%len(pts)]-pts[i-1] if closed else (pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)])
  t=tangent.normalized()
  if previous_u is None:
   ref=Vector((0,0,1)) if abs(t.z)<.9 else Vector((0,1,0));u=t.cross(ref).normalized()
  else:
   u=(previous_u-t*previous_u.dot(t)).normalized()
  v=t.cross(u).normalized();previous_u=u
  verts.extend([p+r*(cos(j*2*pi/n)*u+sin(j*2*pi/n)*v) for j in range(n)])
 faces=[]
 for i in range(len(pts) if closed else len(pts)-1):
  for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,((i+1)%len(pts))*n+(j+1)%n,((i+1)%len(pts))*n+j))
 if not closed:faces.extend([tuple(range(n-1,-1,-1)),tuple((len(pts)-1)*n+j for j in range(n))])
 return mesh(name,verts,faces,slot,True)
def ring(name,pos,rx,ry,r=.012,slot='metal',plane='XY'):
 pts=[]
 for i in range(48):
  a=2*pi*i/48
  v=(rx*cos(a),ry*sin(a),0) if plane=='XY' else ((rx*cos(a),0,ry*sin(a)) if plane=='XZ' else (0,rx*cos(a),ry*sin(a)))
  pts.append(tuple(pos[j]+v[j] for j in range(3)))
 return tube(name,pts,r,slot,True)
def lathe(name,profile,slot='ceramic',n=40,pos=(0,0,0)):
 verts=[(r*cos(j*2*pi/n),r*sin(j*2*pi/n),z) for r,z in profile for j in range(n)]
 faces=[]
 for i in range(len(profile)-1):
  for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
 o=mesh(name,verts,faces,slot,True);o.location=pos;return o
def slab(name,pos,w,d,t,shape='rect',slot='wood'):
 if shape in ('round','oval'):
  o=cylinder(name,pos,.5,t,slot,n=48);o.scale=(w,d,1);return o
 if shape=='kidney':
  outline=[((.5+.10*cos(2*a))*cos(a)*w,(.44+.10*sin(a))*sin(a)*d) for a in [i*2*pi/48 for i in range(48)]]
 elif shape=='hex':outline=[(w*.5*cos(i*pi/3),d*.5*sin(i*pi/3)) for i in range(6)]
 elif shape=='triangle':outline=[(-w*.5,-d*.43),(w*.5,-d*.43),(0,d*.57)]
 elif shape=='racetrack':
  outline=[((w-d)/2*(1 if cos(a)>=0 else -1)+d/2*cos(a),d/2*sin(a)) for a in [i*2*pi/48 for i in range(48)]]
 else:return box(name,pos,(w,d,t),slot,.018)
 verts=[(pos[0]+x,pos[1]+y,pos[2]+z) for z in (-t/2,t/2) for x,y in outline];n=len(outline)
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,verts,faces,slot)
def feet(w,d,h,kind='taper',slot='wood'):
 if kind=='plinth':box('recessed plinth',(0,0,h/2),(w-.10,d-.10,h),'dark');return
 if kind=='sled':
  for x in (-w/2+.06,w/2-.06):tube('sled frame',[(x,-d/2+.04,h),(x,-d/2+.04,.025),(x,d/2-.04,.025),(x,d/2-.04,h)],.022,slot)
  return
 if kind=='pedestal':
  cylinder('pedestal foot',(0,0,.025),min(w,d)*.39,.05,slot);cylinder('pedestal stem',(0,0,h/2),.065,h,slot);return
 if kind=='trestle':
  for x in (-w*.32,w*.32):
   rod('trestle',(x,0,h),(x,-d*.4,.025),.03,slot);rod('trestle',(x,0,h),(x,d*.4,.025),.03,slot)
   rod('trestle lower tie',(x,-d*.33,h*.3),(x,d*.33,h*.3),.023,slot)
  rod('stretcher',(-w*.32,0,h*.3),(w*.32,0,h*.3),.025,slot);return
 if kind=='panel':
  for x in (-w*.38,w*.38):box('panel leg',(x,0,h/2),(.055,d*.8,h),slot)
  return
 if kind=='cross':
  for y in (-d*.32,d*.32):
   rod('cross leg',(-w*.4,y,0),(w*.35,y,h),.028,slot);rod('cross leg',(w*.4,y,0),(-w*.35,y,h),.028,slot)
  return
 for x in (-w/2+.055,w/2-.055):
  for y in (-d/2+.055,d/2-.055):rod('leg',(x*1.04,y*1.04,.012),(x,y,h),.026,slot,.018 if kind=='taper' else .026)
def handle(x,y,z,length=.11,vertical=False,normal='Y'):
 a=(x,y,z-length/2) if vertical else ((x,y-length/2,z) if normal=='X' else (x-length/2,y,z));b=(x,y,z+length/2) if vertical else ((x,y+length/2,z) if normal=='X' else (x+length/2,y,z))
 rod('pull',a,b,.006,'metal')
 if normal=='X':box('pull mounting plate',(x-(.0325 if x>=0 else -.0325),y,z),(.016,.028,length+.03) if vertical else (.016,length+.03,.028),'metal',.003)
 else:box('pull mounting plate',(x,y-.0425,z),(.028,.016,length+.03) if vertical else (length+.03,.016,.028),'metal',.003)
 for end in (a,b):
  anchor=(end[0]-(.04 if x>=0 else -.04),end[1],end[2]) if normal=='X' else (end[0],end[1]-.04,end[2])
  rod('pull mounting standoff',anchor,end,.005,'metal',n=12)
def cushion(name,pos,dim,slot='fabric'):
 o=box(name,pos,dim,slot,.075)
 if dim[0]>.35 and dim[1]>.25:box('piping',(pos[0],pos[1],pos[2]-.015),(dim[0]+.004,dim[1]+.004,.009),'linen',.004)
 return o

def seating(p):
 style=p['form'];w=p.get('w',.72);d=p.get('d',.76);h=p.get('h',.86);seat=p.get('seat',.43);slot=p.get('slot','fabric')
 if style in ('sofa','chaise-sectional','corner-sectional','chester','camelback','curved-sofa','daybed','futon','armless-modular','rail-sofa'):
  n=p.get('seats',3);w=p.get('w',2.1);d=p.get('d',.88)
  if style!='curved-sofa':
   feet(w-.18,d-.15,.18,p.get('base','taper'),'metal' if p.get('base')=='sled' else 'wood')
   box('seat deck',(0,0,.24),(w-.10,d-.09,.16), 'wood' if style=='rail-sofa' else slot,.045)
   if style not in ('daybed','futon'):box('concealed back frame',(0,-d/2+.08,.47),(w-.24,.10,.38),'wood' if style=='rail-sofa' else slot,.02)
  if style=='curved-sofa':
   for i in range(7):
    a=(i-3)*.21;x=sin(a)*1.65;y=1.65-cos(a)*1.65
    o=box('radial deck',(x,y,.25),(.35,.72,.17),slot,.035);o.rotation_euler.z=a
    o=cushion('radial seat',(x,y,.42),(.35,.69,.18),slot);o.rotation_euler.z=a
    o=cushion('radial back',(sin(a)*1.99,1.65-cos(a)*1.99,.67),(.40,.18,.50),slot);o.rotation_euler.z=a
    for yy in (-.23,.23):rod('module foot',(x-yy*sin(a),y+yy*cos(a),.005),(x-yy*sin(a),y+yy*cos(a),.20),.022,'wood')
  elif style=='futon':
   o=cushion('folding back',(0,-.25,.64),(w,.16,.65),slot);o.rotation_euler.x=-.35
   cushion('continuous futon',(0,.10,.39),(w,d*.72,.16),slot)
   for x in (-w*.42,w*.42):rod('hinged side rail',(x,-.4,.2),(x,.4,.3),.035,'wood')
   rod('futon hinge beam',(-w*.43,-.27,.335),(w*.43,-.27,.335),.045,'wood')
  else:
   for i in range(n):
    x=(i-(n-1)/2)*(w-.30)/n
    cushion('seat cushion',(x,.055,.41),((w-.31)/n-.01,d-.22,.19),slot)
    if style!='daybed':
     bh=.36+(.13*cos(x/w*pi) if style=='camelback' else 0)
     o=cushion('back cushion',(x,-d/2+.13,.47+bh/2),((w-.30)/n-.01,.20,bh),slot);o.rotation_euler.x=-.12
     if style=='chester':
      for xx in (x-.12,x+.12):ellipsoid('deep tuft button',(xx,-d/2+.242,.69),(.025,.014,.025),'linen')
   if style not in ('armless-modular','daybed'):
    for x in (-w/2+.075,w/2-.075):
     if style=='rail-sofa':
      rod('exposed arm rail',(x,-.33,.64),(x,.35,.64),.027,'wood');rod('arm support',(x,.30,.28),(x,.30,.64),.022,'wood')
     elif style=='chester':
      rod('rolled arm',(x,-.35,.68),(x,.35,.68),.12,slot);box('arm base',(x,0,.47),(.18,.72,.30),slot,.065)
     else:cushion('arm',(x,.01,.50),(.15,d-.05,.39),slot)
  if style in ('chaise-sectional','corner-sectional'):
   x=w/2-.38;ext=.85
   box('chaise foundation',(x,d/2+.25,.24),(.76,ext,.18),slot,.05);cushion('chaise pad',(x,d/2+.25,.41),(.74,ext,.18),slot)
   feet(.70,.76,.17,'taper') if False else None
   for xx in (x-.28,x+.28):rod('chaise foot',(xx,d/2+.55,0),(xx,d/2+.55,.21),.025,'wood')
   if style=='corner-sectional':cushion('return back',(w/2-.04,d/2+.22,.68),(.17,.85,.48),slot)
  if style=='daybed':
   for x in (-w/2+.13,w/2-.13):rod('bolster',(x,-.25,.56),(x,.26,.56),.13,'linen')
  return
 if style in ('ottoman','pouf','storage-ottoman','round-ottoman','footstool','saddle-stool','tripod-stool','hourglass-stool','drum-stool','tractor-stool'):
  if style in ('pouf','round-ottoman'):
   ellipsoid('upholstered pouf',(0,0,h/2),(w,d,h),slot)
   ring('equator seam',(0,0,h/2),w*.495,d*.495,.005,'linen')
  elif style=='hourglass-stool':lathe('hourglass',[(0,0),(.22,0),(.23,.06),(.12,h*.48),(.23,h-.04),(.23,h),(0,h)],'wood')
  elif style=='drum-stool':
   cylinder('hollow drum',(0,0,h/2),w/2,h,'wood');ring('seat band',(0,0,h-.025),w/2,w/2,.018,'metal')
   for i in range(16):rod('vertical stave',(w/2*cos(i*pi/8),w/2*sin(i*pi/8),.04),(w/2*cos(i*pi/8),w/2*sin(i*pi/8),h-.04),.012,'cane')
  else:
   inset=.76 if style in ('saddle-stool','tractor-stool') else 1
   feet(w*inset,d*inset,h-.09,'taper' if style!='footstool' else 'sled')
   if style=='tractor-stool':
    from signature_designs import saddle
    slab('saddle underpan',(0,0,h-.07),w*.82,d*.82,.045,'oval','wood')
    saddle(w,d,h-.025,'wood')
   elif style=='saddle-stool':cushion('upholstered saddle',(0,0,h-.045),(w,d,.09),'fabric')
   else:slab('seat',(0,0,h-.045),w,d,.09,'rect',slot)
   if style=='storage-ottoman':box('hinged lower case',(0,0,h*.45),(w-.02,d-.02,h*.72),slot,.035);handle(0,d/2+.012,h*.6)
   if style=='tripod-stool':
    # Three explicit legs replace the four-leg utility support.
    for o in list(bpy.context.scene.objects):
     if o.name.startswith('leg'):bpy.data.objects.remove(o,do_unlink=True)
    for i in range(3):a=i*2*pi/3;rod('tripod',(w*.38*cos(a),d*.38*sin(a),0),(w*.25*cos(a),d*.25*sin(a),h-.05),.028,'wood')
  return
 # Chairs/benches. Specific structural profiles, not the same body rescaled.
 if style=='rocker':
  for x in (-w*.40,w*.40):tube('curved rocker',[(x,-d*.65+i*d*1.3/20,.025+.17*((i-10)/10)**2) for i in range(21)],.028,'wood')
  feet(w*.9,d*.8,seat-.035,'taper')
 elif style in ('cantilever','sling','wire-chair'):
  for x in (-w*.40,w*.40):tube('continuous side frame',[(x,.32,.025),(x,-.30,.025),(x,-.28,seat),(x,.22,seat)],.018,'metal')
 elif style in ('swivel','task','executive','stool-pedestal'):
  for i in range(5):
   a=i*2*pi/5;rod('star base',(0,0,.10),(cos(a)*w*.45,sin(a)*d*.45,.06),.018,'metal')
   if style in ('task','executive'):ellipsoid('caster',(cos(a)*w*.45,sin(a)*d*.45,.035),(.07,.05,.07),'dark')
  cylinder('gas lift',(0,0,seat/2),.025,seat,'metal')
 elif style in ('tub','barrel','egg','shell','petal'):feet(w*.65,d*.65,seat-.06,p.get('base','taper'))
 else:feet(w*.90,d*.90,seat-.03,p.get('base','taper'))
 if style=='sling':
  # Real tensioned curved fabric panel spanning the tubular frame.
  verts=[]
  for z,y in ((.32,.28),(.35,.12),(.43,-.12),(.65,-.26),(.94,-.35)):
   verts.extend([(-w*.36,y,z),(w*.36,y,z)])
  mesh('sling surface',verts,[(i,i+1,i+3,i+2) for i in range(0,8,2)],slot)
  for x in (-w*.4,w*.4):rod('high sling frame',(x,-.28,.05),(x,-.36,.98),.023,'wood')
  rod('sling front clamp',(-w*.4,.28,.32),(w*.4,.28,.32),.018,'wood')
  rod('sling rear clamp',(-w*.4,-.35,.94),(w*.4,-.35,.94),.018,'wood')
  for x in (-w*.4,w*.4):rod('front clamp brace',(x,.22,seat),(x,.28,.32),.014,'metal')
 elif style in ('tub','barrel','egg','shell','petal'):
  slab('curved chair structural seat pan',(0,.015,seat-.065),w*.86,d*.86,.065,'oval','wood')
  ellipsoid('curved seat pad',(0,.04,seat),(w*.72,d*.64,.15),slot)
  arc=pi*1.25 if style!='shell' else pi
  verts=[];N=40
  for z,rscale in ((seat-.07,1),(h*.8,1),(h, .83 if style=='egg' else 1)):
   for i in range(N+1):
    a=pi/2+arc/2-i*arc/N;verts.append((w*.5*cos(a)*rscale,-d*.5*sin(a)*rscale,z))
  o=mesh('curved enclosing shell',verts,[(j*(N+1)+i,j*(N+1)+i+1,(j+1)*(N+1)+i+1,(j+1)*(N+1)+i) for j in range(2) for i in range(N)],slot,True)
  bpy.context.view_layer.objects.active=o;o.select_set(True);mod=o.modifiers.new('shell thickness','SOLIDIFY');mod.thickness=.055;bpy.ops.object.modifier_apply(modifier=mod.name)
  if style=='petal':
   for x in (-w*.38,w*.38):ellipsoid('petal wing',(x,-.05,h*.72),(.17,.40,.45),slot)
 elif style=='wire-chair':
  slab('seat pad',(0,0,seat),w*.75,d*.72,.045,'oval','fabric')
  for i in range(9):
   x=-w*.37+i*w*.74/8;tube('wire ribs',[(x,.22,seat),(x,-.18,seat),(x,-.28,h)],.006,'metal')
  for z in (seat+.10,seat+.23,h):
   yy=-.18-.10*(z-seat)/(h-seat);rod('wire cross tie',(-w*.38,yy,z),(w*.38,yy,z),.006,'metal')
 else:
  slab('structural chair seat pan',(0,.015,seat-.045),w*.90,d*.93,.04,'rect','wood' if style not in ('task','executive','swivel','stool-pedestal') else 'metal')
  cushion('seat',(0,.025,seat),(w*.85,d*.85,.11),slot if style not in ('windsor','ladder','cross-back','spindle','wishbone','school','folding') else 'wood')
  if style in ('windsor','spindle'):
   for i in range(7):
    x=(i-3)*w*.11;topx=x*1.08;angle=math.acos(max(-1,min(1,topx/(w*.46))));topz=h-.08+.10*sin(angle)
    rod('back spindle',(x,-d*.34,seat),(topx,-d*.40,topz),.009,'wood')
   tube('bent top bow',[(w*.46*cos(pi*i/24),-d*.4,h-.08+.10*sin(pi*i/24)) for i in range(25)],.022,'wood')
  elif style=='ladder':
   for x in (-w*.4,w*.4):rod('back post',(x,-d*.38,seat-.05),(x,-d*.43,h),.018,'wood')
   for z in (seat+.14,seat+.29,h-.04):box('ladder rail',(0,-d*.42,z),(w*.8,.03,.07),'wood')
  elif style=='cross-back':
   for x in (-w*.4,w*.4):rod('upright',(x,-d*.4,seat-.05),(x,-d*.4,h),.018,'wood')
   for sign in (-1,1):rod('cross back',(-w*.38*sign,-d*.4,seat+.05),(w*.38*sign,-d*.4,h-.05),.012,'wood')
   rod('top rail',(-w*.4,-d*.4,h),(w*.4,-d*.4,h),.025,'wood')
  elif style=='wishbone':
   tube('horseshoe arm',[(w*.48*cos(i*pi/24),-d*.30-d*.25*sin(i*pi/24),h-.10) for i in range(25)],.025,'wood')
   for sign in (-1,1):rod('forked back',(0,-d*.43,seat-.04),(sign*w*.24,-d*.45,h-.12),.025,'wood')
  else:
   back=cushion('backrest',(0,-d*.37,(seat+h)/2+.025),(w*.82,.11,h-seat),slot);back.rotation_euler.x=-.1
   if style=='wing':
    for x in (-w*.39,w*.39):cushion('wing',(x,-d*.24,h-.19),(.13,.30,.39),slot)
   if style=='recliner':
    cushion('extended footrest',(0,d*.61,.31),(w*.85,.45,.12),slot)
    for x in (-w*.30,w*.30):rod('footrest linkage',(x,.10,.20),(x,d*.65,.26),.016,'metal')
   if style=='school':box('writing tablet',(w*.52,.14,seat+.26),(.33,.43,.025));rod('tablet support',(w*.42,0,seat),(w*.52,.14,seat+.25),.015,'metal')
   if style=='folding':
    for x in (-w*.4,w*.4):rod('folding diagonal',(x,d*.4,0),(x,-d*.35,seat),.018,'metal')
  if style in ('wing','recliner','task','executive','swivel','club','rocker'):
   for x in (-w*.43,w*.43):
    box('arm',(x,.015,seat+.20),(.09,d*.65,.08),slot,.035)
    rod('arm upright',(x,.20,seat),(x,.20,seat+.20),.015,'metal' if style in ('task','executive') else 'wood')

def tables(p):
 before=set(bpy.context.scene.objects)
 w=p.get('w',1.2);d=p.get('d',.65);h=p.get('h',.74);shape=p.get('shape','rect');form=p.get('form','four-leg');top=p.get('top','wood')
 t=.045
 slab('top',(0,0,h-t/2),w,d,t,shape,top)
 if form in ('four-leg','sled','trestle','panel','cross','pedestal'):
  feet(w-.04,d-.04,h-t,{'four-leg':'taper'}.get(form,form),'metal' if form in ('sled','cross') else 'wood')
 elif form=='tulip':lathe('tulip pedestal',[(0,0),(.34,0),(.35,.035),(.19,.08),(.075,h*.55),(.10,h-.08),(.26,h-.035),(0,h-.035)],'metal')
 elif form=='cone':cylinder('conical pedestal',(0,0,(h-t)/2),min(w,d)*.29,h-t,'wood',min(w,d)*.16)
 elif form=='drum':
  cylinder('drum pedestal',(0,0,(h-t)/2),min(w,d)*.29,h-t,'wood')
  for i in range(28):a=i*pi/14;rod('fluted pedestal',(min(w,d)*.29*cos(a),min(w,d)*.29*sin(a),.02),(min(w,d)*.29*cos(a),min(w,d)*.29*sin(a),h-t),.011,'wood')
 elif form=='dual-disc':
  for x in (-w*.29,w*.29):
   cylinder('disc base',(x,0,.025),d*.28,.05,'metal');cylinder('stem',(x,0,h/2),.045,h-t,'metal')
 elif form=='arch':
  for x in (-w*.30,w*.30):
   tube('arch support',[(x,d*.4*cos(i*pi/24),.03+(h-.07)*sin(i*pi/24)) for i in range(25)],.04,'wood')
 elif form=='waterfall':
  for x in (-w/2+.025,w/2-.025):box('waterfall end',(x,0,(h-t)/2),(.05,d,h-t),top,.018)
 elif form=='hairpin':
  points=[(-w*.28,-d*.30),(w*.28,-d*.30),(0,d*.32)] if shape=='triangle' else [(x,y) for x in (-w*.39,w*.39) for y in (-d*.37,d*.37)]
  for x,y in points:tube('hairpin',[(x-.055,y,h-.035),(x,y,.015),(x+.055,y,h-.035)],.009,'metal')
 elif form=='cantilever':
  box('base plate',(0,0,.015),(w*.75,d*.85,.03),'metal')
  if shape=='triangle':box('rear offset column',(0,-d*.32,h/2),(w*.50,.04,h-.04),'metal')
  else:box('offset column',(-w*.4,0,h/2),(.05,d*.7,h-.04),'metal')
 elif form=='tripod':
  for i in range(3):a=i*2*pi/3;rod('tripod leg',(cos(a)*w*.37,sin(a)*d*.37,0),(cos(a)*w*.20,sin(a)*d*.20,h-t),.025,'wood')
 elif form=='sawhorse':
  for x in (-w*.32,w*.32):
   box('horse beam',(x,0,h-.085),(.10,d*.85,.10))
   for y in (-d*.38,d*.38):rod('horse leg',(x,y*1.15,0),(x,y*.7,h-.085),.03,'wood')
 elif form=='ladder-desk':
  for x in (-w*.46,w*.46):rod('ladder stile',(x,d*.35,0),(x,-d*.4,1.65),.025,'wood')
  for z in (1.12,1.50):box('upper shelf',(0,-d*.25,z),(w,.30,.03))
 elif form=='l-desk':
  box('return',(w*.40,d*.65,h-.022),(w*.45,d*1.4,.045));feet(w-.1,d-.1,h-.045,'taper')
  for x in (w*.18,w*.60):rod('return leg',(x,d*1.18,0),(x,d*1.18,h-.045),.025,'metal')
 elif form=='sit-stand':
  for x in (-w*.35,w*.35):
   box('T foot',(x,0,.025),(.08,d*.85,.05),'metal');box('telescopic lower',(x,0,h*.30),(.08,.08,h*.55),'metal');box('telescopic upper',(x,0,h*.68),(.06,.06,h*.50),'metal')
   box('column top bracket',(x,0,h-.075),(.12,d*.70,.07),'metal')
  box('crossbeam',(0,0,h-.10),(w*.75,.06,.06),'metal')
 elif form=='rolltop':
  feet(w,d,h-.04,'panel');box('rear pigeonhole',(0,-d*.3,h+.17),(w,.22,.34))
  for x in (-w*.3,0,w*.3):box('pigeonhole partition',(x,-d*.25,h+.17),(.02,.25,.30))
  for z in (h+.08,h+.24):box('pigeonhole shelf',(0,-d*.25,z),(w,.25,.02))
 elif form=='drafting':
  # Tilted top on a braced A frame.
  for o in list(bpy.context.scene.objects):
   if o.name=='top':o.rotation_euler.x=.20
  feet(w,d,h-.08,'trestle');rod('angle adjuster',(0,0,.40),(0,-d*.3,h),.02,'metal')
  box('drawing-board pivot beam',(0,0,h-.07),(w*.78,.07,.09),'metal')
 elif form=='nested':
  feet(w,d,h-.045,'sled','metal');slab('lower nesting top',(w*.38,d*.24,h*.64),w*.63,d*.75,.035,'oval',top)
  for xx in (-.2,.2):rod('nesting leg',(w*.38+xx,d*.24,0),(w*.38+xx,d*.24,h*.64),.018,'metal')
 elif form=='trolley':
  for x in (-w/2+.06,w/2-.06):tube('rolling side frame',[(x,-d/2+.04,h-.035),(x,-d/2+.04,.10),(x,d/2-.04,.10),(x,d/2-.04,h-.035)],.022,'metal')
  box('lower tray',(0,0,.13),(w,d,.03))
  for x in (-w/2+.06,w/2-.06):
   for y in (-d/2+.04,d/2-.04):ellipsoid('caster',(x,y,.045),(.07,.05,.09),'dark')
  tube('push handle',[(-w/2+.06,-d*.28,h-.025),(-w/2+.06,-d*.28,h+.15),(-w/2+.06,d*.28,h+.15),(-w/2+.06,d*.28,h-.025)],.015,'metal')
 if p.get('drawers'):
  n=p['drawers']
  for i in range(n):
   x=(i-(n-1)/2)*w/n;box('suspended drawer',(x,0,h-.13),(w/n-.02,d*.75,.16));handle(x,d*.39,h-.13)
 if p.get('shelf'):
  box('undershelf',(0,0,h*.28),(w*.82,d*.75,.025))
  for x in (-w/2+.06,w/2-.06):rod('undershelf side support',(x,-d/2+.04,h*.28-.018),(x,d/2-.04,h*.28-.018),.012,'metal')
  for y in (-d*.30,d*.30):rod('undershelf cross support',(-w/2+.06,y,h*.28-.018),(w/2-.06,y,h*.28-.018),.012,'metal')
 # Keep rectangular leg layouts inside shaped tops. This changes support spacing,
 # not the declared object scale, and prevents floating legs outside hex/oval edges.
 if shape=='triangle' and form=='panel':
  for o in list(set(bpy.context.scene.objects)-before):
   if o.name.startswith('panel leg'):bpy.data.objects.remove(o,do_unlink=True)
  for x in (-w*.22,w*.22):box('triangle-fitted support panel',(x,-d*.14,(h-t)/2),(.045,d*.40,h-t))
 inset=.64 if shape=='hex' else (.76 if shape in ('oval','kidney','round') else 1)
 if inset<1:
  for o in set(bpy.context.scene.objects)-before:
   if o.name.startswith(('top','lower nesting top','suspended drawer')):continue
   o.location.x*=inset;o.location.y*=inset;o.scale.x*=inset;o.scale.y*=inset

def panel_front(name,x,y,z,w,h,style='slab'):
 if style in ('open','mesh','cane','slatted','louvre','shaker','glass','mirror'):
  for xx in (x-w/2+.015,x+w/2-.015):box(name+' stile',(xx,y,z),(.03,.035,h))
  for zz in (z-h/2+.015,z+h/2-.015):box(name+' rail',(x,y,zz),(w-.06,.035,.03))
  if style in ('mesh','cane'):
   for i in range(1,8):
    xx=x-w*.5+i*w/8;rod('woven warp',(xx,y,z-h/2+.020),(xx,y,z+h/2-.020),.0035,'cane' if style=='cane' else 'metal',n=8)
   for i in range(1,11):
    zz=z-h*.5+i*h/11;rod('woven weft',(x-w/2+.020,y+.003,zz),(x+w/2-.020,y+.003,zz),.0035,'cane' if style=='cane' else 'metal',n=8)
  elif style in ('slatted','louvre'):
   if style=='slatted':
    n=max(3,int(w/.045))
    for i in range(n):box('vertical slat',(x-w*.43+i*w*.86/max(n-1,1),y,z),(.018,.025,h-.06))
   else:
    n=max(4,int(h/.065))
    for i in range(n):o=box('louvre',(x,y,z-h*.43+i*h*.86/max(n-1,1)),(w-.06,.035,.036));o.rotation_euler.x=.38
  elif style=='shaker':box('recessed panel',(x,y-.014,z),(w-.06,.016,h-.06))
  elif style in ('glass','mirror'):box('glazed pane',(x,y-.014,z),(w-.06,.012,h-.06),style,.001)
 else:box(name,(x,y,z),(w,.024,h))

def cases(p):
 w=p.get('w',1);d=p.get('d',.4);h=p.get('h',1);form=p.get('form','doors');front=p.get('front','slab');base=p.get('base','taper');bottom=p.get('baseHeight',.13)
 feet(w,d,bottom,base,'metal' if base=='sled' else 'wood')
 if form=='step':
  for i,fraction in enumerate((.65,.82,1.0)):
   x=(i-1)*w/3;hh=h*fraction;bw=w/3
   for xx in (x-bw/2+.015,x+bw/2-.015):box('stepped bay side',(xx,0,(hh+bottom)/2),(.03,d,hh-bottom))
   for zz in (bottom+.015,(bottom+hh)/2,hh-.015):box('stepped bay shelf',(x,0,zz),(bw,d,.03))
  return
 # Open construction has real voids: sides/top/bottom/back, not a solid hidden block.
 box('bottom',(0,0,bottom+.018),(w,d,.036));box('top',(0,0,h-.018),(w,d,.036))
 for x in (-w/2+.018,w/2-.018):box('side',(x,0,(h+bottom)/2),(.036,d,h-bottom-.036))
 if form not in ('open','ladder','grid','etagere','staggered','tree','wine-lattice','rail-rack'):box('back',(0,-d/2+.009,(h+bottom)/2),(w-.072,.018,h-bottom-.036))
 usable=h-bottom-.08
 if form in ('doors','wardrobe','hutch','corner','apothecary'):
  n=p.get('doors',2)
  for i in range(n):
   x=(i-(n-1)/2)*(w-.05)/n
   dw=(w-.06)/n-.01;panel_front('door',x,d/2+.012,(h+bottom)/2,dw,usable,front);handle(x+(w/n)*.30,d/2+.05,(h+bottom)/2,.10,True)
   hinge_x=x-dw/2+.012
   box('door hinge mounting stile',(hinge_x,d/2-.015,(h+bottom)/2),(.025,.05,usable+.035))
   for z in ((h+bottom)/2-usable*.30,(h+bottom)/2+usable*.30):cylinder('door hinge pin',(hinge_x,d/2+.010,z),.010,.045,'metal',n=12)
  if form!='wardrobe':
   for z in (bottom+usable*.36,bottom+usable*.70):box('interior shelf',(0,-.01,z),(w-.08,d-.06,.022))
  if form=='wardrobe':
   rod('hanging rail',(-w/2+.025,-.02,h-.18),(w/2-.025,-.02,h-.18),.012,'metal')
   box('top interior shelf',(0,0,h-.30),(w-.08,d-.04,.025))
  if form=='hutch':
   box('raised hutch shelf',(0,-d*.12,h+.45),(w,d*.65,.03))
   for x in (-w/2+.018,w/2-.018):box('hutch side',(x,-d*.12,h+.25),(.036,d*.65,.50))
  if form=='corner':
   for o in list(bpy.context.scene.objects):
    if o.name.startswith('side'):o.rotation_euler.z=.2 if o.location.x>0 else -.2
 elif form in ('drawers','file','flatfile','drawer-cubby'):
  rows=p.get('rows',4);cols=p.get('cols',1)
  for i in range(1,cols):box('drawer bank divider',(-w/2+.025+i*(w-.05)/cols,0,(h+bottom)/2),(.025,d-.03,usable))
  for j in range(rows):
   for i in range(cols):
    x=(i-(cols-1)/2)*(w-.05)/cols;z=bottom+.04+(j+.5)*usable/rows
    pull=d*.48 if form in ('file','flatfile') and j==rows-1 else 0;dw=(w-.06)/cols-.01;dh=usable/rows-.012
    box('drawer front',(x,d/2+.012+pull,z),(dw,.028,dh));handle(x,d/2+.05+pull,z,min(.14,w/cols*.4))
    box('drawer bottom',(x,pull+.025,z-dh*.44),(dw-.025,d-.025,.018))
    for side in (-1,1):
     box('drawer side',(x+side*(dw/2-.018),pull+.025,z),(.018,d-.025,dh*.88))
     box('fixed drawer runner',(x+side*dw/2,0,z),(.025,d*.90,.020),'metal',.002)
     if pull:box('sliding runner',(x+side*(dw/2-.008),pull*.50,z),(.014,d*.95,.015),'metal',.002)
    box('drawer back',(x,pull-d/2+.038,z),(dw-.025,.018,dh*.88))
    if form=='file':
     box('label frame',(x-.1,d/2+.033+pull,z+.045),(.08,.009,.024),'metal',.002)
     for side in (-1,1):rod('hanging file rail',(x+side*dw*.36,-d*.43+pull,z+dh*.31),(x+side*dw*.36,d*.43+pull,z+dh*.31),.004,'metal')
 elif form in ('open','grid','etagere','ladder','staggered','cubby','drawer-cubby','shoe','linen','locker'):
  rows=p.get('rows',4);cols=p.get('cols',1)
  for j in range(1,rows):box('shelf',(0,0,bottom+.035+j*usable/rows),(w-.06,d-.035,.025))
  for i in range(1,cols):box('partition',(-w/2+i*w/cols,0,(h+bottom)/2),(.025,d-.03,usable))
  if form=='ladder':
   for x in (-w*.48,w*.48):rod('leaning stile',(x,d*.4,0),(x,-d*.4,h+.08),.026,'wood')
  if form=='staggered':
   for j in range(rows-1):box('offset partition',((-.22 if j%2 else .22)*w,0,bottom+(j+.5)*usable/rows),(.025,d,usable/rows))
  if form=='shoe':
   for o in list(bpy.context.scene.objects):
    if o.name.startswith('shelf'):o.rotation_euler.x=-.13
  if form in ('linen','locker'):
   for i in range(cols):
    for j in range(rows):
     x=(i-(cols-1)/2)*w/cols;z=bottom+(j+.5)*usable/rows
     panel_front('vented door',x,d/2+.012,z,w/cols-.05,usable/rows-.04,'louvre' if form=='locker' else 'cane')
     boundary=-w/2+i*w/cols;box('cell hinge mounting stile',(boundary+.015,d/2-.015,z),(.04,.05,usable/rows+.03))
     for zz in (z-usable/rows*.28,z+usable/rows*.28):cylinder('cell hinge pin',(boundary+.030,d/2+.01,zz),.010,.035,'metal',n=12)
 elif form=='wine-lattice':
  # Clip every diagonal to the actual interior rectangle, rather than letting long
  # slats protrude through the carcase as a rotated-box approximation would.
  xmin,xmax=-w/2+.030,w/2-.030;zmin,zmax=bottom+.020,h-.025
  for s in (-1,1):
   for j in range(-12,13):
    c=(zmin+zmax)/2+j*.21;points=[]
    for x in (xmin,xmax):
     z=s*x+c
     if zmin<=z<=zmax:points.append((x,z))
    for z in (zmin,zmax):
     x=(z-c)/s
     if xmin<=x<=xmax:points.append((x,z))
    if len(points)<2:continue
    a,b=points[0],points[-1]
    o=mesh('clipped diagonal divider',[(a[0],-d*.43,a[1]),(a[0],d*.43,a[1]),(b[0],d*.43,b[1]),(b[0],-d*.43,b[1])],[(0,1,2,3)],'wood')
    bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('divider thickness','SOLIDIFY');mod.thickness=.016;bpy.ops.object.modifier_apply(modifier=mod.name)
 elif form=='rail-rack':
  for z in (bottom+.12,h-.12):rod('cross rail',(-w*.45,0,z),(w*.45,0,z),.025,'metal')
  for x in (-w*.44,w*.44):rod('rack upright',(x,0,bottom),(x,0,h),.025,'metal')
 elif form=='tambour':
  for z in (bottom+.045,h-.045):box('tambour guide track',(0,d/2+.006,z),(w-.06,.05,.04))
  for i in range(max(8,int(w/.035))):
   x=-w*.47+i*w*.94/(max(8,int(w/.035))-1);box('tambour stave',(x,d/2+.012,(h+bottom)/2),(.024,.025,usable))
  handle(0,d/2+.055,(h+bottom)/2,.15)
 elif form=='fold-down':
  box('fold-down writing leaf',(0,d*.60,h*.60),(w-.08,d*.90,.028));panel_front('upper door',0,d/2+.01,h*.84,w-.07,h*.25,front)
  for x in (-w*.4,w*.4):rod('leaf support',(x,d*.45,h*.35),(x,d*.95,h*.60),.012,'metal')
  box('fold-down rear hinge beam',(0,d/2,h*.60),(w-.06,.10,.04),'metal')
  for z in (h*.75,h*.92):box('upper door hinge block',(-w/2+.025,d/2,z),(.055,.06,.06),'metal')
 elif form=='step':
  for i in range(3):box('stepped top',(-w*.34+i*w*.34,0,h+(i-1)*h*.18),(w*.32,d,.035))
 if p.get('drawersTop'):
  for i in range(2):x=(i-.5)*w/2;box('top drawer',(x,d/2+.025,h-.13),(w/2-.04,.028,.18));handle(x,d/2+.06,h-.13)

def beds(p):
 form=p['form'];size=p.get('size','queen');w,d={'twin':(.9652,1.905),'full':(1.3716,1.905),'queen':(1.524,2.032),'king':(1.9304,2.032),'toddler':(.70,1.40),'cot':(.71,1.33)}[size]
 W=w+.10;D=d+.12;z=p.get('platform',.35)
 if form in ('bunk-stair','bunk-offset','loft-desk','loft-cubby','bunk-triple'):z=1.42
 if form=='floor-house':z=.08
 if form=='floating':
  box('inset support',(0,0,z/2),(w*.6,d*.65,z));box('cantilever platform',(0,0,z),(W,D,.09))
 elif form in ('bunk-stair','bunk-offset','loft-desk','loft-cubby','bunk-triple'):
  box('upper structural platform',(0,0,z),(W,D,.10))
 else:
  feet(W,D,z-.04,'plinth' if form in ('storage','captain','platform','floor-house') else 'taper');box('frame',(0,0,z),(W,D,.10))
 cushion('mattress',(0,0,z+.15),(w,d,.22),'linen')
 box('duvet',(0,.23,z+.28),(w-.025,d-.50,.045),'fabric',.02)
 for x in ((0,) if w<1.1 else (-w/4,w/4)):cushion('pillow',(x,-d/2+.24,z+.30),(min(.62,w-.12),.38,.12),'linen')
 if form in ('upholstered','wing-head','channel-head','tufted-head'):
  cushion('padded headboard',(0,-D/2,.68),(W+.06,.13,1.20),'fabric')
  if form=='channel-head':
   for i in range(9):cushion('headboard channel',((i-4)*W/9,-D/2+.08,.77),(W/9-.014,.045,.86),'fabric')
  if form=='tufted-head':
   for x in (-W*.3,0,W*.3):
    for zz in (.50,.76,1.02):ellipsoid('tuft button',(x,-D/2+.075,zz),(.026,.014,.026),'linen')
  if form=='wing-head':
   for x in (-W*.5,W*.5):cushion('headboard wing',(x,-D*.43,.72),(.14,.33,1.23),'fabric')
 elif form in ('spindle','cane-head','slat-head'):
  if form=='cane-head':
   panel_front('woven headboard',0,-D/2,.80,W,.68,'cane')
   for x in (-W*.48,W*.48):rod('woven head support',(x,-D/2,.04),(x,-D/2,1.12),.021,'wood')
  else:
   for x in (-W*.48,W*.48):rod('head post',(x,-D/2,0),(x,-D/2,1.12),.028,'wood')
   rod('top rail',(-W*.48,-D/2,1.08),(W*.48,-D/2,1.08),.03,'wood')
   for i in range(11):
    x=(i-5)*W*.083
    if form=='spindle':rod('head spindle',(x,-D/2,.42),(x,-D/2,1.06),.012,'wood')
    else:box('head slat',(x,-D/2,.76),(.055,.025,.60))
 elif form in ('four-poster','canopy','curtain-canopy','floor-house'):
  top=2.05 if form!='floor-house' else 1.5
  for x in (-W/2,W/2):
   for y in (-D/2,D/2):rod('post',(x,y,0),(x,y,top),.028,'wood')
  for y in (-D/2,D/2):rod('canopy crossbar',(-W/2,y,top),(W/2,y,top),.024,'wood')
  for x in (-W/2,W/2):rod('canopy side',(x,-D/2,top),(x,D/2,top),.024,'wood')
  if form=='floor-house':
   for y in (-D/2,D/2):
    rod('roof slope',(-W/2,y,top),(0,y,top+.42),.025,'wood');rod('roof slope',(W/2,y,top),(0,y,top+.42),.025,'wood')
   rod('ridge',(0,-D/2,top+.42),(0,D/2,top+.42),.025,'wood')
  elif form=='curtain-canopy':
   for x in (-W*.38,W*.38):
    for y in (-D*.48,D*.48):
     verts=[];nx=12;nz=20
     for iz in range(nz+1):
      z=.05+(top-.09)*iz/nz;spread=.26-.14*math.exp(-((z-top*.47)/.23)**2)
      for ix in range(nx+1):
       xx=(ix/nx-.5)*spread;yy=.023*sin(ix*pi*.65)*(1+.25*sin(iz*pi/nz));verts.append((x+xx,y+yy,z))
     o=mesh('gathered fabric curtain',verts,[(iz*(nx+1)+ix,iz*(nx+1)+ix+1,(iz+1)*(nx+1)+ix+1,(iz+1)*(nx+1)+ix) for iz in range(nz) for ix in range(nx)],'linen',True)
     bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('cloth thickness','SOLIDIFY');mod.thickness=.003;bpy.ops.object.modifier_apply(modifier=mod.name)
 elif form=='sleigh':
  for y,sign in ((-D/2,-1),(D/2,1)):
   for x in (-W*.48,W*.48):tube('sleigh end',[(x,y+sign*.12*sin(i*pi/24),.25+i*.8/24) for i in range(25)],.035,'wood')
   box('sleigh panel',(0,y,.65),(W,.055,.65))
 elif form not in ('bunk-stair','bunk-offset','loft-desk','loft-cubby','bunk-triple'):box('headboard',(0,-D/2,.67),(W,.06,.94),'wood',.02)
 if form in ('storage','captain','trundle'):
  if form in ('storage','captain'):
   box('underbed storage base',(0,0,.09),(W-.04,D-.04,.04))
   for y in (-D/2+.022,D/2-.022):box('storage end wall',(0,y,.23),(W-.04,.035,.28))
   box('central drawer partition',(0,0,.23),(.035,D-.08,.28))
  if form in ('storage','captain'):
   for x in (-W/2,W/2):
    for y in (-D*.28,D*.28):
     box('storage drawer',(x,y,.19),(.026,D*.42,.24));box('underbed drawer floor',(x/2,y,.09),(W*.50,D*.42,.022));handle(x+(.04 if x>0 else -.04),y,.19,.10,True,normal='X')
  if form=='trundle':
   tw,tl=.9652,1.905;cx=W/2+tw/2+.04
   box('pullout frame',(cx,0,.12),(tw+.10,tl+.12,.12));cushion('trundle mattress',(cx,0,.23),(tw,tl,.12),'linen')
   for xx in (cx-tw*.40,cx+tw*.40):
    for yy in (-tl*.40,tl*.40):ellipsoid('trundle caster',(xx,yy,.03),(.06,.055,.06),'dark')
 if form in ('bunk-stair','bunk-offset','loft-desk','loft-cubby','bunk-triple'):
  for x in (-W/2,W/2):
   for y in (-D/2,D/2):box('tall upright',(x,y,.97),(.055,.055,1.94))
  for x in (-W/2,W/2):box('upper guard',(x,0,1.88),(.04,D+.02,.15))
  for y in (-D/2,D/2):box('end guard',(0,y,1.88),(W,.04,.15))
  if form.startswith('bunk'):
   if form=='bunk-offset':
    box('perpendicular lower deck',(W*.30,.05,.30),(D,W,.10));cushion('lower mattress',(W*.30,.05,.45),(d,w,.20),'linen')
    for xx in (W*.30-D*.42,W*.30+D*.42):
     for yy in (-W*.35,W*.35):rod('lower bunk support',(xx,yy,.005),(xx,yy,.28),.025,'wood')
   else:
    box('lower platform',(0,0,.32),(W,D,.10));cushion('lower mattress',(0,0,.47),(w,d,.20),'linen')
   if form=='bunk-triple':box('pullout third bed',(W*.45,0,.11),(w,D,.10));cushion('third mattress',(W*.45,0,.23),(w,d,.14),'linen')
  if form=='bunk-offset':
   for x in (-W/2,W/2):rod('lower bunk joining rail',(x,-D/2,.30),(x,-W/2+.05,.30),.025,'wood')
  if form=='loft-desk':
   box('under-loft desktop',(0,-D*.28,.73),(W,.55,.04));box('desk modesty',(0,-D*.28-.25,.455),(W,.025,.53))
   for x in (-W/2,W/2):rod('under-loft desk bracket',(x,-D/2,.71),(x,-D*.28,.71),.022,'wood')
  if form=='loft-cubby':
   for zz in (.35,.72,1.08):box('underbed shelf',(0,-D/2+.275,zz),(W,.55,.03))
   for x in (-W*.2,W*.2):box('cubby divider',(x,-D/2+.275,.72),(.025,.55,1.05))
  if form=='bunk-stair':
   for i in range(7):
    yy=D/2-.14-i*.28;hh=(i+1)*.20;box('stair storage',(W/2+.22,yy,hh/2),(.44,.28,hh))
    box('stair storage face',(W/2+.448,yy,hh/2),(.018,.23,max(.06,hh-.06)));handle(W/2+.485,yy,hh/2,.07,True,normal='X')
  else:
   for x in (W/2-.28,W/2-.02):rod('ladder',(x,D/2+.18,0),(x,D/2+.04,1.7),.018,'wood')
   for zz in (.24,.50,.76,1.02,1.28,1.54):rod('ladder rung',(W/2-.28,D/2+.18-zz*.08,zz),(W/2-.02,D/2+.18-zz*.08,zz),.015,'wood')
 return {'bedSize':size,'mattressMetres':[w,d,.22],'secondaryMattressMetres':[.9652,1.905,.12] if form=='trundle' else ([w,d,.14] if form=='bunk-triple' else None),'safetyReviewRequired':form in ('floor-house','bunk-stair','bunk-offset','loft-desk','loft-cubby','bunk-triple')}

def lights(p):
 form=p['form'];h=p.get('h',1.55)
 if form in ('paper','lantern','tripod-shade','drum-shade','arc','task','uplighter','ceramic-table','mushroom','banker','cage','globe-cluster','shelf-lamp'):
  if form=='tripod-shade':
   for i in range(3):a=i*2*pi/3;rod('tripod',(cos(a)*.30,sin(a)*.30,0),(cos(a)*.08,sin(a)*.08,h-.38),.023,'wood')
  elif form=='ceramic-table':lathe('ceramic body',[(0,0),(.15,0),(.18,.10),(.16,.27),(.07,.40),(.035,.44)],'ceramic')
  elif form=='shelf-lamp':
   for z in (.07,.47,.89):slab('lamp shelf',(0,0,z),.46,.46,.025,'round')
   for i in range(3):a=i*2*pi/3;rod('shelf lamp upright',(.2*cos(a),.2*sin(a),0),(.2*cos(a),.2*sin(a),h-.3),.018,'wood')
  else:
   cylinder('weighted base',(0,0,.023),.19 if h>1 else .13,.046,'metal')
   if form=='arc':tube('curved arc',[(.55-.55*cos(i*pi/2/32),0,.03+(h-.20)*sin(i*pi/2/32)) for i in range(33)],.018,'metal')
   elif form=='task':tube('task arm',[(0,0,0),(0,0,h*.55),(.36,0,h*.83),(.12,0,h)],.015,'metal')
   else:cylinder('stem',(0,0,(h-.10)/2),.014,h-.10,'metal')
  x=.55 if form=='arc' else (.12 if form=='task' else 0)
  if form in ('paper','lantern'):
   profile=[(.02,h-.55)]+[(.24*max(.01,sin(pi*(i+.4)/16))**.6,h-.55+i*.50/16) for i in range(17)]+[(.02,h-.05)]
   lathe('paper lantern',profile,'linen')
   for i in range(12):
    z=h-.52+i*.039;r=.24*sin(pi*(i+.8)/12)**.6;ring('paper ribs',(0,0,z),max(r,.04),max(r,.04),.004,'wood')
  elif form=='uplighter':lathe('uplight bowl',[(.025,h-.22),(.07,h-.15),(.20,h-.02),(.20,h),(.19,h-.006),(.06,h-.16)],'ceramic')
  elif form=='mushroom':lathe('mushroom cap',[(0,h),(.06,h-.005),(.16,h-.04),(.23,h-.13),(.23,h-.15),(0,h-.15)],'metal')
  elif form=='banker':
   box('banker shade',(0,0,h-.09),(.42,.19,.15),'accent',.07)
   for x in (-.17,.17):rod('shade bracket',(0,0,h-.18),(x,0,h-.10),.009,'metal')
  elif form=='cage':
   for z in (h-.40,h):ring('cage rim',(0,0,z),.15,.15,.008,'metal')
   for i in range(10):a=i*pi/5;rod('cage rib',(.15*cos(a),.15*sin(a),h-.40),(.15*cos(a),.15*sin(a),h),.006,'metal')
   ellipsoid('bulb',(0,0,h-.20),(.12,.12,.19),'linen')
  elif form=='globe-cluster':
   for a,z in ((0,h),(.9,h-.25),(3.2,h-.45)):
    rod('branch',(0,0,z-.12),(.22*cos(a),.22*sin(a),z),.009,'metal');ellipsoid('opal globe',(.22*cos(a),.22*sin(a),z),(.22,.22,.22),'ceramic')
  elif form=='task':
   o=lathe('task shade',[(.04,-.1),(.13,.02),(.13,.04),(.12,.04),(.035,-.09)],'metal',pos=(x,0,h-.05));o.rotation_euler.y=.3
  else:lathe('open shade',[(.22,h-.38),(.16,h),(.155,h),(.215,h-.38),(.22,h-.38)],'linen',pos=(x,0,0))
  rod('lamp socket mast',(x,0,max(.02,h-.40)),(x,0,h-.018),.009,'metal')
  if form=='tripod-shade':
   for i in range(3):aa=i*2*pi/3;rod('tripod collar spoke',(0,0,h-.38),(.08*cos(aa),.08*sin(aa),h-.38),.012,'metal')
  if form in ('paper','lantern','cage','uplighter','tripod-shade','drum-shade','ceramic-table','arc','shelf-lamp'):
   zz=h-.40 if form=='cage' else (h-.055 if form in ('paper','lantern') else h-.020);radius=.15 if form=='cage' else (.055 if form in ('paper','lantern') else (.20 if form=='uplighter' else .17))
   for i in range(3):aa=i*2*pi/3;rod('shade spider',(x,0,zz),(x+radius*cos(aa),radius*sin(aa),zz),.004,'metal',n=8)
 elif form=='torchiere-tree':
  cylinder('base',(0,0,.025),.23,.05,'metal')
  for x,z in ((-.15,h-.3),(.16,h),(.05,h-.60)):
   rod('tree stem',(0,0,.025),(x,0,z-.16),.011,'metal');lathe('tree bowl',[(.02,z-.16),(.13,z),(.125,z),(.02,z-.15)],'metal',pos=(x,0,0))
   cylinder('bowl socket',(x,0,z-.155),.030,.025,'metal',n=16)

def basin(name,pos,w,d,h,slot='ceramic',oval=False):
 # Hollow vessel with explicit inner bowl surface.
 if oval:
  profile=[(0,0),(.5,0),(.52,h*.70),(.50,h),(.465,h),(.44,h*.2),(0,h*.12)]
  o=lathe(name,profile,slot,pos=pos);o.scale=(w,d,1)
 else:
  x,y,z=pos;box(name+' bottom',(x,y,z+.015),(w-.06,d-.06,.03),slot,.012)
  for xx in (-w/2+.015,w/2-.015):box(name+' side',(x+xx,y,z+h/2),(.03,d,h),slot,.012)
  for yy in (-d/2+.015,d/2-.015):box(name+' end',(x,y+yy,z+h/2),(w-.06,.03,h),slot,.012)
def faucet(x,y,z,tall=.24):
 tube('curved faucet',[(x,y,z),(x,y,z+tall*.75),(x,y+.03,z+tall),(x,y+.12,z+tall),(x,y+.15,z+tall*.82)],.012,'metal')
 rod('tap lever',(x+.008,y,z+tall*.5),(x+.10,y,z+tall*.5),.008,'metal')
def enclosure(name,pos,w,d,h,slot='ceramic',top=True):
 x,y,z=pos
 for xx in (-w/2+.014,w/2-.014):box(name+' side',(x+xx,y,z),(.028,d,h),slot,.007)
 box(name+' back',(x,y-d/2+.014,z),(w-.056,.028,h-.03),slot,.006)
 box(name+' bottom',(x,y,z-h/2+.015),(w-.056,d-.03,.03),slot,.006)
 if top:box(name+' top',(x,y,z+h/2-.015),(w,d,.03),slot,.012)
def bath(p):
 form=p['form'];w=p.get('w',.8);d=p.get('d',.5);h=p.get('h',.85)
 if form in ('single-vanity','double-vanity','vessel-console','floating-vanity','pedestal-sink','washstand','corner-sink','trough'):
  if form=='pedestal-sink':
   lathe('pedestal',[(0,0),(.20,0),(.16,.08),(.12,.60),(.20,.70)],'ceramic');basin('oval basin',(0,0,.70),.60,.47,.15,oval=True);faucet(0,-.20,.78)
  elif form=='washstand':
   feet(w,d,.80,'sled','metal');box('washstand top',(0,0,.81),(w,d,.04),'stone');basin('vessel',(0,.02,.83),w*.70,d*.72,.12,oval=True);faucet(0,-d*.36,.83)
   box('towel shelf',(0,0,.23),(w*.85,d*.80,.025),'wood')
  else:
   cases({'w':w,'d':d,'h':h,'form':'drawers' if form in ('floating-vanity','double-vanity') else 'doors','rows':2,'cols':2 if form=='double-vanity' else 1,'base':'plinth','baseHeight':.30 if form=='floating-vanity' else .12,'front':p.get('front','shaker')})
   if form=='floating-vanity':
    for o in list(bpy.context.scene.objects):
     if o.name.startswith('recessed plinth'):bpy.data.objects.remove(o,do_unlink=True)
   box('stone counter',(0,0,h+.015),(w+.025,d+.025,.03),'stone')
   for x in ((-w*.25,w*.25) if form=='double-vanity' else (0,)):
    basin('basin',(x,.02,h+.03),w*.40 if form=='double-vanity' else w*.68,d*.72,.11,oval=form=='vessel-console');faucet(x,-d*.35,h+.03)
 elif form in ('claw-tub','oval-tub','rect-tub','corner-tub','soaking-tub'):
  w=p.get('w',1.65);d=p.get('d',.78);h=p.get('h',.58)
  if form in ('oval-tub','claw-tub','soaking-tub'):
   o=lathe('hollow tub',[(0,.08),(.37,.08),(.45,.16),(.50,h-.04),(.49,h),(.45,h),(.40,.20),(.31,.15),(0,.15)],'ceramic');o.scale=(w,d,1)
   if form=='claw-tub':
    for x in (-w*.30,w*.30):
     for y in (-d*.25,d*.25):ellipsoid('claw foot',(x,y,.08),(.13,.09,.16),'metal')
  else:basin('bathtub',(0,0,.02),w,d,h,'ceramic')
  if form in ('oval-tub','claw-tub','soaking-tub'):faucet(-w*.42,-d*.23,h-.15,.30)
  else:faucet(0,-d/2+.015,h-.02,.30)
 elif form in ('toilet-close','toilet-wall','toilet-vintage','bidet'):
  lathe('toilet pedestal',[(0,0),(.16,0),(.17,.08),(.12,.26),(.22,.34),(.22,.38),(0,.38)],'ceramic')
  o=lathe('hollow bowl',[(0,.24),(.21,.30),(.25,.43),(.25,.46),(.21,.46),(.17,.35),(0,.30)],'ceramic');o.scale=(.85,1.25,1)
  if form!='bidet':
   ring('seat rim',(0,.03,.475),.225,.29,.024,'linen')
   if form=='toilet-close':box('cistern',(0,-.24,.62),(.40,.16,.43),'ceramic',.04);cylinder('flush button',(0,-.24,.836),.025,.016,'metal')
   elif form=='toilet-wall':box('wall carrier',(0,-.29,.39),(.35,.06,.26),'ceramic')
   if form=='toilet-vintage':box('high cistern',(0,-.28,1.55),(.45,.16,.32),'ceramic');rod('flush pipe',(0,-.27,.34),(0,-.27,1.41),.018,'metal')
  else:box('bidet tap deck',(0,-.23,.40),(.14,.16,.035),'ceramic');faucet(0,-.20,.40,.17)
 elif form=='shower-quadrant':
  w=p.get('w',1.0);d=w;cx=-w/2;cy=-w/2
  outline=[(cx,cy)]+[(cx+w*cos(i*pi/2/32),cy+w*sin(i*pi/2/32)) for i in range(33)]
  verts=[(x,y,z) for z in (0,.06) for x,y in outline];n=len(outline)
  mesh('quadrant tray',verts,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],'ceramic')
  for xx,yy in ((cx,cy),(cx+w,cy),(cx,cy+w)):rod('quadrant upright',(xx,yy,.06),(xx,yy,2.0),.012,'metal')
  v=[(cx+w*cos(i*pi/2/32),cy+w*sin(i*pi/2/32),z) for z in (.07,2) for i in range(33)]
  mesh('curved front glass',v,[(i,i+1,33+i+1,33+i) for i in range(32)],'glass',True)
  for zz in (.07,2):tube('quarter track',[(cx+w*cos(i*pi/2/32),cy+w*sin(i*pi/2/32),zz) for i in range(33)],.012,'metal')
  tube('shower riser',[(cx+.06,cy+.10,.8),(cx+.06,cy+.10,1.9),(cx+.25,cy+.25,1.9)],.011,'metal');cylinder('head',(cx+.25,cy+.25,1.88),.09,.025,'metal')
  for z in (1.0,1.75):rod('quadrant riser clamp',(cx,cy,z),(cx+.06,cy+.10,z),.009,'metal')
 elif form in ('shower-square','shower-walkin'):
  w=p.get('w',.9);d=p.get('d',.9);box('shower tray',(0,0,.035),(w,d,.07),'ceramic',.025)
  for x in (-w/2,w/2):
   rod('screen upright',(x,-d/2,.05),(x,-d/2,2.0),.012,'metal');box('side glass',(x,0,1.04),(.012,d,1.92),'glass',.001)
  if form!='shower-walkin':box('front glass',(0,d/2,1.04),(w,.012,1.92),'glass',.001);handle(w*.25,d/2+.02,1.08,.18,True)
  tube('shower riser',[(0,-d/2+.05,.8),(0,-d/2+.05,1.9),(0,-d/2+.28,1.9)],.011,'metal');cylinder('shower head',(0,-d/2+.28,1.88),.09,.025,'metal')
  box('shower mounting spine',(0,-d/2+.02,1.02),(.06,.025,1.95),'metal')
  for z in (1.0,1.75):rod('riser mounting clamp',(0,-d/2+.02,z),(0,-d/2+.05,z),.009,'metal')
  if form=='shower-quadrant':ring('curved shower track',(0,0,2.02),w*.50,d*.50,.012,'metal')
 elif form=='towel-ladder':
  for x in (-.25,.25):rod('leaning stile',(x,.12,0),(x,-.12,1.6),.022,'wood')
  for z in (.30,.58,.86,1.14,1.42):rod('towel rung',(-.25,.12-z*.15,z),(.25,.12-z*.15,z),.017,'wood')
 elif form=='towel-stand':
  for yy in (-.22,.22):rod('common towel-stand floor beam',(-.22,yy,.016),(.22,yy,.016),.016,'metal')
  for x,z in ((-.2,.75),(0,.95),(.2,1.15)):
   tube('towel hoop',[(x,-.22,0),(x,-.22,z),(x,.22,z),(x,.22,0)],.016,'metal')
 elif form=='bath-stool':
  feet(.46,.30,.375,'panel')
  for y in (-.12,-.06,0,.06,.12):box('drainage seat plank',(0,y,.40),(.46,.050,.045),'wood',.009)
  for x in (-.16,.16):box('bath stool underrail',(x,0,.365),(.035,.34,.04))
 elif form=='bath-caddy':
  for zz in (.12,.48,.84):basin('basket',(0,0,zz),.40,.28,.09,'metal')
  for x in (-.18,.18):rod('stand',(x,0,0),(x,0,.95),.012,'metal')

def appliance(p):
 form=p['form'];w=p.get('w',.60);d=p.get('d',.62);h=p.get('h',.85)
 slot='metal' if p.get('steel') else 'ceramic'
 enclosure('appliance shell',(0,0,h/2),w,d,h,slot,form!='top-washer')
 if form in ('front-washer','dryer','stacked-laundry'):
  levels=(.42,1.27) if form=='stacked-laundry' else (h*.48,)
  if form=='stacked-laundry':enclosure('upper unit',(0,0,1.275),w,d,.85,slot)
  for z in levels:
   # Genuine circular cutout in the rectangular front panel.
   verts=[];N=48;rz=.34;rx=w/2-.01
   for outer in (False,True):
    for i in range(N):
     a=i*2*pi/N;radius=min(rx/max(abs(cos(a)),1e-8),rz/max(abs(sin(a)),1e-8)) if outer else w*.35
     verts.append((radius*cos(a),d/2+.004,z+radius*sin(a)))
   o=mesh('washer front opening',verts,[(i,(i+1)%N,N+(i+1)%N,N+i) for i in range(N)],slot)
   bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('front sheet thickness','SOLIDIFY');mod.thickness=.018;bpy.ops.object.modifier_apply(modifier=mod.name)
   drum=lathe('open metal drum',[(0,-.20),(.20,-.20),(.205,.20),(.195,.20),(.19,-.19),(0,-.19)],'metal',n=32);drum.rotation_euler.x=-pi/2;drum.location.z=z
   rod('drum rear bearing',(0,-d/2+.020,z),(0,-.19,z),.025,'metal')
   ring('door ring',(0,d/2+.025,z),w*.34,w*.34,.028,'metal','XZ')
   o=cylinder('door glazing',(0,d/2+.022,z),w*.29,.018,'glass');o.rotation_euler.x=pi/2
   box('control strip',(0,d/2+.012,z+.29),(w*.88,.02,.10),'dark')
   for x in (-w*.25,w*.24):o=cylinder('control dial',(x,d/2+.033,z+.29),.023,.018,'metal');o.rotation_euler.x=pi/2
  if form=='dryer':
   for i in range(7):box('vent slit',(-.18+i*.06,d/2+.012,.12),(.035,.012,.008),'dark',.002)
 elif form=='top-washer':
  box('front body panel',(0,d/2-.01,h/2),(w-.04,.025,h-.04),slot,.012)
  cylinder('top drum bottom',(0,0,h*.30),w*.36,.025,'metal');ring('top loading rim',(0,0,h-.045),w*.38,w*.38,.025,'metal')
  lathe('top washer tub wall',[(w*.36,h*.30),(w*.36,h-.045),(w*.35,h-.045),(w*.35,h*.30)],'metal')
  for x in (-w/2+.020,w/2-.020):rod('tub suspension',(x,0,h*.2),((w*.36 if x>0 else -w*.36),0,h*.30),.018,'metal')
  box('lid',(0,.05,h+.012),(w-.05,d-.16,.025),'glass');box('raised control',(0,-d*.38,h+.10),(w,.12,.20),slot)
  for x in (-.18,0,.18):o=cylinder('dial',(x,-d*.31,h+.1),.024,.02,'metal');o.rotation_euler.x=pi/2
 elif form in ('fridge','french-fridge','retro-fridge','freezer','wine-fridge'):
  rows=2 if form in ('fridge','retro-fridge') else 1
  cols=2 if form=='french-fridge' else 1
  for j in range(rows):
   for i in range(cols):
    x=(i-(cols-1)/2)*w/cols;z=(j+.5)*h/rows
    box('insulated door',(x,d/2+.02,z),(w/cols-.025,.04,h/rows-.025),'glass' if form=='wine-fridge' else slot,.035 if form=='retro-fridge' else .01)
    handle(x+w/cols*.30,d/2+.07,z,.28,True)
  if form=='french-fridge':box('freezer drawer',(0,d/2+.032,h*.17),(w-.025,.03,h*.29),slot);handle(0,d/2+.075,h*.17,.30)
  if form=='wine-fridge':
   for z in (.20,.40,.60):
    box('wine bottle support shelf',(0,0,z-.045),(w-.03,d-.04,.020),'metal',.002)
    for x in (-.17,0,.17):rod('wine bottle',(x,-.12,z),(x,.20,z),.036,'accent')
 elif form in ('oven-range','double-oven','oven-tower','dishwasher','microwave'):
  n=2 if form=='double-oven' else 1
  for j in range(n):
   z=h*(j+.5)/n
   for xx in (-w/2+.035,w/2-.035):box('door side frame',(xx,d/2+.018,z),(.05,.03,h/n-.06),'dark')
   for zz in (z-h/n*.5+.065,z+h/n*.5-.065):box('door cross frame',(0,d/2+.018,zz),(w-.04,.03,.07),'dark')
   if form!='dishwasher':box('dark oven liner',(0,-d/2+.035,z),(w-.07,.02,h/n-.10),'dark')
   box('glazed viewing pane',(0,d/2+.030,z),(w-.09,.012,max(.05,h/n-.17)),'ceramic' if form=='dishwasher' else 'glass')
   handle(0,d/2+.07,z+h/n*.32,w*.65)
   if form not in ('dishwasher','microwave'):
    for zz in (z-h/n*.20,z):
     for side in (-1,1):
      rod('oven rack side rail',(side*w*.38,-d*.30,zz),(side*w*.38,d*.38,zz),.007,'metal',n=8)
      for yy in (-d*.22,d*.25):rod('oven rack wall mount',(side*w*.38,yy,zz),(side*(w/2-.020),yy,zz),.007,'metal',n=8)
     for i in range(7):rod('oven rack',(-w*.38,-d*.28+i*d*.65/6,zz),(w*.38,-d*.28+i*d*.65/6,zz),.003,'metal',n=8)
   if form=='microwave':
    cylinder('turntable drive',(0,0,.045),.025,.040,'metal');cylinder('microwave turntable',(0,0,.070),min(w,d)*.33,.020,'glass')
  if form=='oven-range':
   for x in (-w*.30,0,w*.30):
    for y in (-d*.25,d*.25):ring('burner',(x,y,h+.007),.095,.095,.009,'dark')
   box('oven control fascia',(0,d/2+.02,h-.07),(w-.04,.04,.11),'dark')
   for x in (-w*.3,-w*.1,w*.1,w*.3):o=cylinder('oven knob',(x,d/2+.05,h-.07),.023,.02,'metal');o.rotation_euler.x=pi/2
  if form=='dishwasher':
   box('dishwasher control fascia',(0,d/2+.027,h-.07),(w-.04,.030,.09),'dark')
   for x in (-.16,-.08,0,.08):box('button',(x,d/2+.045,h-.07),(.035,.008,.012),'metal',.002)
 elif form=='chest-freezer':box('body front panel',(0,d/2-.014,h/2),(w-.04,.028,h-.03),slot);box('hinged lid',(0,0,h+.018),(w+.02,d+.02,.035),slot);handle(0,d/2+.04,h-.05,.18)
 elif form=='rangehood':
  for o in list(bpy.context.scene.objects):bpy.data.objects.remove(o,do_unlink=True)
  box('hood canopy',(0,0,.10),(w,d,.20),'metal',.035);box('flue',(0,-d*.15,.50),(w*.35,d*.45,.70),'metal');box('underside filter',(0,.02,.008),(w*.8,d*.7,.015),'dark')
 elif form=='utility-sink':
  for o in list(bpy.context.scene.objects):bpy.data.objects.remove(o,do_unlink=True)
  feet(w,d,.77,'taper','metal');basin('deep sink',(0,0,.65),w,d,.23,'ceramic');faucet(0,-d/2+.015,.86,.26)

def kitchen(p):
 form=p['form'];w=p.get('w',.9);d=p.get('d',.6);h=p.get('h',.90)
 if form in ('island','breakfast-island','butcher-block','sink-island','open-island'):
  if form=='open-island':
   feet(w,d,h-.02,'taper');box('open shelf',(0,0,.24),(w-.10,d-.10,.035))
  else:cases({'w':w,'d':d,'h':h-.02,'form':'drawers' if form=='butcher-block' else 'doors','rows':3,'cols':2,'front':p.get('front','shaker'),'base':'plinth'})
  box('worktop',(0,.10 if form=='breakfast-island' else 0,h),(w+.06,d+(.38 if form=='breakfast-island' else .06),.08 if form=='butcher-block' else .04),'wood' if form=='butcher-block' else 'stone')
  if form=='sink-island':basin('sink',(0,0,h+.015),.60,.40,.14,'metal');faucet(0,-.22,h+.015)
 elif form in ('sink-base','farmhouse-sink','corner-base','drawer-base','pullout-pantry','tall-pantry','wall-plate','glass-wall','open-wall','spice-pullout','appliance-garage'):
  f={'drawer-base':'drawers','open-wall':'open','wall-plate':'open','pullout-pantry':'open','spice-pullout':'open'}.get(form,'doors')
  cases({'w':w,'d':d,'h':h,'form':f,'rows':p.get('rows',3),'cols':1,'baseHeight':.10 if h<1 else .08,'base':'plinth','front':'glass' if form=='glass-wall' else p.get('front','shaker')})
  if form in ('sink-base','farmhouse-sink'):
   box('counter',(0,0,h+.02),(w+.02,d+.02,.04),'stone');basin('sink',(0,.06,h+.025),w*.78,d*.70,.17,'ceramic' if form=='farmhouse-sink' else 'metal');faucet(0,-d*.36,h+.03)
  if form=='corner-base':box('L return',(w*.40,d*.35,h/2),(w*.55,d*.75,h))
  if form=='wall-plate':
   for x in [(-w*.4+i*w*.8/9) for i in range(10)]:rod('plate rail',(x,d/2+.04,.12),(x,d/2+.04,h-.12),.006,'wood')
   for z in (.12,h-.12):
    rod('plate-rack attachment rail',(-w*.43,d/2+.04,z),(w*.43,d/2+.04,z),.018,'wood')
    for x in (-w*.43,w*.43):rod('plate-rack cheek',(x,d/2-.025,z),(x,d/2+.04,z),.018,'wood')
  if form in ('pullout-pantry','spice-pullout'):
   for o in list(bpy.context.scene.objects):
    if o.name.startswith('shelf'):bpy.data.objects.remove(o,do_unlink=True)
   for z in (.20,h*.45,h*.75):
    box('pullout tray',(0,.08,z),(w-.07,d+.08,.025))
    for x in (-w/2+.035,w/2-.035):box('pullout tray guide',(x,.04,z),(.018,d,.025),'metal',.002)
    ring('basket rail',(0,.06,z+.06),w*.40,d*.43,.007,'metal')
    for x in (-w*.40,w*.40):rod('basket upright',(x,.06,z),(x,.06,z+.06),.006,'metal')
   panel_front('pullout face',0,d/2+.13,h/2,w-.035,h-.15,'slab');handle(0,d/2+.17,h*.7,.23,True)
  if form=='appliance-garage':
   for i in range(14):box('rolling door slat',(0,d/2+.04,h*.35+i*h*.035),(w-.07,.025,.025))
 elif form=='plate-rack':
  for z in (.05,.40,.72):box('rack shelf',(0,0,z),(w,d,.025))
  for x in (-w/2,w/2):box('rack side',(x,0,.385),(.025,d,.77))
  for i in range(13):x=-w*.45+i*w*.9/12;rod('plate divider',(x,d*.4,.405),(x,d*.4,.72),.007,'wood')
 elif form=='pot-rack':
  for x in (-w*.45,w*.45):rod('upright',(x,0,0),(x,0,h),.022,'metal')
  for z in (.12,.52,1.02,h):box('rack shelf',(0,0,z),(w,d,.028),'metal')
  for x in (-w*.25,0,w*.25):tube('pot hook',[(x,0,h),(x,0,h-.12),(x,.04,h-.15),(x,.07,h-.10)],.006,'metal')
 elif form=='bakers-rack':
  feet(w,d,h*.5,'sled','metal');box('work surface',(0,0,h*.5),(w,d,.04))
  for x in (-w*.47,w*.47):rod('upper upright',(x,-d*.40,h*.5),(x,-d*.40,h),.018,'metal')
  for z in (h*.70,h*.95):box('upper rack shelf',(0,-d*.20,z),(w,d*.6,.025))

def specialty(p):
 form=p['form'];w=p.get('w',.8);d=p.get('d',.4);h=p.get('h',1.2)
 if form in ('coat-tree','hat-stand','valet','umbrella','coat-rail','garment-rack'):
  if form in ('coat-tree','hat-stand'):
   feet(.60,.60,.12,'pedestal','metal');rod('trunk',(0,0,0),(0,0,h),.024,'wood')
   for i in range(6):
    a=i*pi/3;z=h-.10-(i%2)*.25;rod('coat branch',(0,0,z-.10),(.25*cos(a),.25*sin(a),z),.014,'wood');ellipsoid('hook finial',(.25*cos(a),.25*sin(a),z),(.045,.045,.045),'wood')
   if form=='hat-stand':ring('hat ring',(0,0,h-.38),.24,.24,.014,'metal')
  elif form=='umbrella':
   cylinder('drip tray',(0,0,.025),.19,.05,'metal')
   for z in (.12,h):ring('basket rim',(0,0,z),.19,.19,.014,'metal')
   for i in range(12):a=i*pi/6;rod('basket upright',(.18*cos(a),.18*sin(a),.045),(.18*cos(a),.18*sin(a),h),.008,'metal')
  elif form=='valet':
   for x in (-w*.40,w*.40):box('valet sled',(x,0,.025),(.065,d,.05))
   box('valet crossmember',(0,-.08,.055),(w*.85,.065,.065));rod('valet upright',(0,-.08,.05),(0,-.08,h),.025,'wood');tube('shoulder hanger',[(-w*.45,-.08,h-.10),(0,-.08,h),(w*.45,-.08,h-.10)],.025,'wood');rod('trouser rail',(-w*.4,.16,h*.7),(w*.4,.16,h*.7),.016,'metal')
   for x in (-w*.4,w*.4):rod('trouser bracket',(0,-.08,h*.7-.1),(x,.16,h*.7),.012,'metal')
  else:
   for x in (-w/2,w/2):tube('rack side',[(x,-d/2,.02),(x,0,.02),(x,0,h),(x,d/2,.02)],.019,'metal')
   rod('garment bar',(-w/2,0,h),(w/2,0,h),.022,'metal')
   if form=='coat-rail':box('shoe platform',(0,0,.12),(w,d,.03))
 elif form in ('screen','fold-screen','room-divider'):
  n=p.get('panels',3);pw=w/n;hinge=Vector((-w/2,0,0))
  for i in range(n):
   angle=(-.32 if i%2 else .32);x=hinge.x+pw*.5*cos(angle);y=hinge.y+pw*.5*sin(angle)
   before=set(bpy.context.scene.objects);panel_front('screen',x,y,h/2,pw,h-.04,p.get('front','cane'))
   for o in set(bpy.context.scene.objects)-before:
    dx=o.location.x-x;dy=o.location.y-y;o.location.x=x+dx*cos(angle)-dy*sin(angle);o.location.y=y+dx*sin(angle)+dy*cos(angle);o.rotation_euler.z+=angle
   if i:
    for z in (.20,h*.50,h-.20):cylinder('screen hinge',(hinge.x,hinge.y,z),.018,.07,'metal',n=16)
   hinge+=Vector((pw*cos(angle),pw*sin(angle),0))
 elif form in ('drying-wings','drying-tower','ironing-board','fold-table','quilt-rack'):
  if form=='ironing-board':
   slab('ironing pad',(0,0,h),w,d,.045,'racetrack','fabric');feet(w*.7,d*.8,h-.025,'cross','metal');box('iron rest',(-w*.55,0,h),(.25,d,.025),'metal')
  elif form=='drying-wings':
   feet(w*.6,d,h-.01,'cross','metal')
   tube('main drying perimeter',[(-w/2,-d/2,h),(w/2,-d/2,h),(w/2,d/2,h),(-w/2,d/2,h)],.012,'metal',True)
   for yy in (-d*.32,d*.32):rod('leg support beam',(-w*.30,yy,h-.01),(w*.30,yy,h-.01),.014,'metal')
   for i in range(10):y=-d/2+i*d/9;rod('drying wire',(-w/2,y,h),(w/2,y,h),.004,'metal')
   for s in (-1,1):
    rod('wing hinge rail',(s*w*.4,-d/2,h),(s*w*.4,d/2,h),.012,'metal')
    rod('wing outer rail',(s*w*.8,-d/2,h+.20),(s*w*.8,d/2,h+.20),.012,'metal')
    for yy in (-d/2,d/2):rod('wing edge',(s*w*.4,yy,h),(s*w*.8,yy,h+.20),.012,'metal')
    for i in range(6):y=-d/2+i*d/5;rod('wing wire',(s*w*.4,y,h),(s*w*.8,y,h+.20),.004,'metal')
  elif form=='drying-tower':
   feet(w,d,.10,'sled','metal')
   for x in (-w/2+.06,w/2-.06):rod('tower stile',(x,0,0),(x,0,h),.017,'metal')
   for zz in (.25,.70,1.15):
    tube('drying deck rim',[(-w/2,-d*.45,zz),(w/2,-d*.45,zz),(w/2,d*.45,zz),(-w/2,d*.45,zz)],.010,'metal',True)
    for i in range(7):rod('rack wire',(-w/2,-d*.45+i*d*.9/6,zz),(w/2,-d*.45+i*d*.9/6,zz),.004,'metal')
  elif form=='quilt-rack':
   for x in (-w/2,w/2):tube('rack end',[(x,-d/2,0),(x,-d/2,h),(x,d/2,h),(x,d/2,0)],.025,'wood')
   for y in (-d*.4,0,d*.4):rod('quilt rail',(-w/2,y,h),(w/2,y,h),.02,'wood')
  else:tables({'w':w,'d':d,'h':h,'form':'cross','top':'wood'})
 elif form in ('hamper','sorter','woven-basket','pedal-bin'):
  cols=p.get('cols',1)
  for i in range(cols):
   x=(i-(cols-1)/2)*w/cols;bw=w/cols-.025
   if form=='woven-basket':
    for z in (.02,h):ring('basket rim',(x,0,z),bw/2,d/2,.015,'cane')
    for j in range(18):a=j*pi/9;rod('basket stave',(x+bw*.48*cos(a),d*.48*sin(a),.02),(x+bw*.48*cos(a),d*.48*sin(a),h),.007,'cane')
    for z in [h*j/12 for j in range(1,12)]:ring('woven band',(x,0,z),bw*.48,d*.48,.005,'cane')
   else:
    material='fabric' if form=='sorter' else ('metal' if form=='pedal-bin' else 'wood')
    box('hamper floor',(x,0,.025),(bw,d,.05),material,.015)
    for s in (-1,1):
     box('hamper side',(x+s*(bw/2-.014),0,h/2),(.028,d,h),material,.012);box('hamper end',(x,s*(d/2-.014),h/2),(bw-.028,.028,h),material,.012)
    if form!='sorter':box('lift lid',(x,0,h+.013),(bw+.01,d+.01,.026));handle(x,d/2+.03,h-.06,.12)
    if form=='pedal-bin':box('foot pedal',(x,d/2+.04,.05),(.17,.09,.02),'metal')
  if form=='sorter':
   for x in (-w/2,w/2):rod('sorter frame',(x,0,0),(x,0,h+.1),.014,'metal')
   for y in (-d/2,d/2):rod('bag suspension rail',(-w/2,y,h),(w/2,y,h),.014,'metal')
 elif form in ('crib','round-crib','changing','learning-tower','playpen','highchair','easel','dollhouse','toy-kitchen','toy-workbench','activity-cube','book-sling','art-cart','train-table','rocking-horse','teepee','pet-bed','pet-tower','step-stool'):
  children(p)
 elif form in ('mirror-stand','cheval','jewellery','dressing-screen'):
  if form=='jewellery':cases({'w':w,'d':d,'h':h,'form':'drawers','rows':6,'cols':2,'baseHeight':.3});box('mirror',(0,-d*.40,h+.23),(w,.02,.42),'glass')
  else:
   for x in (-w/2,w/2):box('mirror sled',(x,0,.025),(.075,d,.05))
   panel_front('mirror frame',0,0,h*.55,w*.85,h*.80,'mirror')
   for x in (-w/2,w/2):
    rod('mirror support',(x,0,.025),(x,0,h*.70),.025,'wood');rod('mirror pivot',(x,0,h*.70),((1 if x>0 else -1)*w*.40,0,h*.70),.014,'metal')
 elif form in ('tv-stand','record-console','aquarium-stand','fireplace','piano','keyboard','sewing','workbench','tool-pegboard','bike-rack','guitar-stand','luggage-rack','magazine-rack','plant-stand','plant-tier','dog-crate','safe','server-rack','reception','lectern','printer-cart','monitor-arm','standing-mirror','charging-station','cat-litter'):
  extras(p)
 else:raise ValueError('unknown specialty '+form)

def children(p):
 f=p['form'];w=p.get('w',.9);d=p.get('d',.5);h=p.get('h',.8)
 if f in ('crib','round-crib','playpen'):
  if f=='round-crib':
   slab('oval crib mattress deck',(0,0,.245),w,d,.03,'oval','wood')
   for zz in (.15,.85):ring('oval crib rail',(0,0,zz),w/2,d/2,.025,'wood')
   for i in range(28):a=i*pi/14;rod('crib spindle',(w/2*cos(a),d/2*sin(a),.15),(w/2*cos(a),d/2*sin(a),.85),.009,'wood')
   slab('crib mattress',(0,0,.30),w-.08,d-.08,.08,'oval','linen')
  else:
   box('crib base',(0,0,.18),(w,d,.06));cushion('crib mattress',(0,0,.26),(w-.06,d-.06,.10),'linen')
   for x in (-w/2,w/2):
    for y in (-d/2,d/2):box('crib post',(x,y,h/2),(.04,.04,h))
   for yy in (-d/2,d/2):
    rod('top rail',(-w/2,yy,h),(w/2,yy,h),.024,'wood')
    count=math.ceil(w/.055)
    for i in range(count):x=-w*.47+i*w*.94/(count-1);rod('vertical bar',(x,yy,.20),(x,yy,h),.008,'wood')
   for xx in (-w/2,w/2):
    rod('end rail',(xx,-d/2,h),(xx,d/2,h),.024,'wood')
    count=math.ceil(d/.055)
    for i in range(count):y=-d*.45+i*d*.9/(count-1);rod('end bar',(xx,y,.20),(xx,y,h),.009,'wood')
 elif f=='changing':
  cases({'w':w,'d':d,'h':h-.12,'form':'drawers','rows':3,'base':'plinth'});cushion('changing pad',(0,0,h-.075),(w-.10,d-.10,.09),'linen')
  for x in (-w/2,w/2):box('raised changing rail',(x,0,h-.04),(.025,d,.20))
 elif f in ('learning-tower','highchair','step-stool'):
  z=.46 if f=='learning-tower' else (.58 if f=='highchair' else .26)
  feet(w,d,z,'taper');box('platform',(0,0,z),(w,d,.045));box('step',(0,d*.35,z*.5),(w*.8,d*.5,.035))
  if f!='step-stool':
   for x in (-w*.45,w*.45):
    for y in (-d*.4,d*.4):rod('safety upright',(x,y,z),(x,y,h),.017,'wood')
   rod('rear rail',(-w*.45,-d*.4,h),(w*.45,-d*.4,h),.02,'wood')
   if f=='highchair':box('tray',(0,d*.35,z+.25),(w+.15,d*.6,.03));box('backrest',(0,-d*.35,z+.20),(w,.03,.35))
   else:
    for x in (-w*.45,w*.45):rod('side guard',(x,-d*.4,h),(x,d*.4,h),.018,'wood')
 elif f=='easel':
  for x in (-w*.45,w*.45):rod('easel leg',(x,.18,0),(x,0,h),.022,'wood')
  rod('rear strut',(0,-d*.7,0),(0,0,h*.8),.022,'wood');box('drawing board',(0,.02,h*.59),(w,.025,h*.63),'dark');box('paint tray',(0,.10,h*.25),(w+.1,.16,.025))
 elif f=='dollhouse':
  cases({'w':w,'d':d,'h':h*.72,'form':'grid','rows':2,'cols':2,'baseHeight':.03})
  for s in (-1,1):
   o=box('roof slope',(s*w*.26,0,h*.72+sin(.48)*w*.295-.015),(w*.59,d+.06,.025),'accent');o.rotation_euler.y=s*.48
 elif f in ('toy-kitchen','toy-workbench'):
  cases({'w':w,'d':d,'h':h*.65,'form':'open' if f=='toy-workbench' else 'doors','rows':2,'baseHeight':.04})
  box('worktop',(0,0,h*.65+.0175),(w+.04,d+.04,.035))
  if f=='toy-kitchen':
   basin('play sink',(-w*.22,0,h*.65+.030),w*.35,d*.65,.05,'metal');faucet(-w*.22,-d*.3,h*.65+.030,.13)
   for y in (-.09,.09):ring('play burner',(w*.22,y,h*.65+.038),.06,.06,.006,'dark')
  else:
   box('pegboard',(0,-d/2,h*.85),(w,.02,h*.42));box('vice',(w*.27,d*.35,h*.74),(.18,.12,.12),'metal')
   for i in range(6):o=cylinder('peg',(-.3+i*.12,-d/2+.025,h*.86),.008,.06,'metal');o.rotation_euler.x=pi/2
 elif f=='activity-cube':
  box('activity base',(0,0,h*.40),(w,d,h*.8),'wood',.025)
  for i in range(3):
   pts=[(-w*.35+j*w*.7/24,(i-1)*d*.26,h*.8+.20*sin(j*pi/24)) for j in range(25)];tube('bead maze wire',pts,.007,'metal')
   for j in (5,12,19):ellipsoid('maze bead',pts[j],(.06,.06,.06),'accent')
 elif f=='book-sling':
  for x in (-w/2,w/2):box('sling rack side',(x,0,h/2),(.035,d,h))
  for i in range(3):
   y=-d*.3+i*d*.3;z=h*.8-i*h*.22
   rod('sling rod',(-w/2,y,z),(w/2,y,z),.013,'wood');box('canvas pocket',(0,y+.045,z-.12),(w-.06,.10,.21),'fabric',.04)
   for x in (-w*.30,w*.30):box('canvas suspension loop',(x,y+.010,z-.005),(.035,.060,.045),'fabric',.008)
 elif f in ('art-cart','train-table'):
  tables({'w':w,'d':d,'h':h,'form':'trolley' if f=='art-cart' else 'panel','shelf':True})
  if f=='art-cart':
   for x in (-w*.3,0,w*.3):basin('art pot',(x,0,h-.005),.18,.18,.12,'ceramic')
  else:
   for x in (-w/2,w/2):box('table rim',(x,0,h+.04),(.025,d,.10))
   ring('wood train track',(0,0,h+.008),w*.36,d*.32,.012,'dark')
 elif f=='rocking-horse':
  for y in (-d*.32,d*.32):tube('rocker',[(-w*.55+i*w*1.1/24,y,.02+.14*((i-12)/12)**2) for i in range(25)],.025,'wood')
  ellipsoid('horse body',(0,0,.43),(w*.65,d*.60,.27),'wood');box('neck',(w*.24,0,.65),(.15,d*.5,.34));ellipsoid('head',(w*.33,0,.83),(.31,d*.48,.20),'wood')
  for x in (-w*.22,w*.20):
   for y in (-d*.21,d*.21):rod('horse leg',(x,y,.10),(x*.8,y*.8,.43),.026,'wood')
   zz=.02+.14*(x/(w*.55))**2;rod('rocker transverse brace',(x,-d*.32,zz),(x,d*.32,zz),.025,'wood');rod('horse foot mount',(x,0,zz),(x,0,.12),.023,'wood');rod('horse leg cross tie',(x,-d*.21,.10),(x,d*.21,.10),.022,'wood')
  rod('handgrip',(w*.28,-d*.5,.72),(w*.28,d*.5,.72),.016,'wood');cushion('saddle',(0,0,.58),(.30,.22,.055),'fabric')
 elif f=='teepee':
  for x,y in ((-w/2,-d/2),(-w/2,d/2),(w/2,-d/2),(w/2,d/2)):rod('tent pole',(x,y,0),(0,0,h+.12),.015,'wood')
  mesh('canvas tent',[(-w/2,-d/2,0),(w/2,-d/2,0),(-w/2,d/2,0),(w/2,d/2,0),(0,0,h)],[(0,1,4),(0,4,2),(1,3,4)],'linen')
  cushion('play mat',(0,0,.03),(w,d,.06),'fabric')
 elif f=='pet-bed':
  cushion('pet pad',(0,0,.10),(w,d,.20),'fabric')
  for x in (-w*.45,w*.45):cushion('pet bolster',(x,0,.23),(.14,d,.26),'fabric')
  cushion('rear bolster',(0,-d*.43,.23),(w,.14,.26),'fabric')
 elif f=='pet-tower':
  box('tower base',(0,0,.035),(w,d,.07))
  for x,y,zz in ((-w*.25,-d*.2,h*.45),(w*.25,d*.2,h*.70),(0,0,h)):
   cylinder('scratching post',(x,y,zz/2),.055,zz,'cane');slab('cat platform',(x,y,zz),.45,.38,.045,'oval','fabric')

def extras(p):
 f=p['form'];w=p.get('w',.9);d=p.get('d',.4);h=p.get('h',1)
 if f=='fireplace':
  for x in (-w*.43,w*.43):box('mantel pier',(x,0,h*.45),(w*.14,d,h*.9),'stone')
  box('mantel',(0,0,h-.055),(w,d+.07,.13),'stone');box('hearth',(0,d*.12,.025),(w+.12,d+.20,.05),'stone');box('firebox back',(0,-d*.4,h*.35),(w*.75,.025,h*.7),'dark')
  box('log support grate',(0,.025,.115),(w*.65,.13,.035),'metal');rod('grate pedestal',(0,.025,.04),(0,.025,.12),.025,'metal')
  for i in range(4):rod('log',(-w*.25,.02,.13+i*.035),(w*.25,.03,.13+i*.035),.025,'wood')
 elif f in ('piano','keyboard'):
  if f=='piano':box('piano case',(0,-.08,h/2),(w,d*.55,h),'wood');box('keyboard bed',(0,d*.35,h*.65),(w,d*.5,.10));feet(w,d*.8,h*.65-.035,'taper')
  else:feet(w,d,h-.07,'cross','metal');box('keyboard housing',(0,0,h-.04),(w,d,.08),'dark')
  z=h*.70 if f=='piano' else h+.005
  for i in range(28):x=-w*.45+i*w*.9/28;box('ivory key',(x,d*.40,z),(w*.9/28-.002,d*.30,.018),'linen',.001)
  for i in range(20):x=-w*.43+i*w*.86/20;box('black key',(x,d*.31,z+.018),(w*.9/45,d*.15,.024),'dark',.001)
 elif f in ('sewing','workbench','tool-pegboard','reception','lectern','printer-cart'):
  if f=='lectern':
   box('lectern foot',(0,0,.025),(w,d,.05));box('lectern column',(0,-d*.10,h/2),(w*.4,d*.4,h));o=box('reading slope',(0,0,h),(w,d,.035));o.rotation_euler.x=-.18;box('book stop',(0,d*.43,h-d*.43*math.tan(.18)+.025),(w,.025,.025))
  elif f=='reception':
   cases({'w':w,'d':d,'h':h,'form':'doors','front':'slatted','base':'plinth'});box('transaction ledge',(0,d*.25,h+.020),(w+.1,d*.65,.045),'stone');box('inner desk',(0,-d*.40,.74),(w,d*.70,.04))
  else:
   tables({'w':w,'d':d,'h':h*.55 if f=='tool-pegboard' else h,'form':'trestle' if f in ('workbench','sewing') else 'trolley','drawers':2 if f=='workbench' else 0,'shelf':True})
   if f=='sewing':box('sewing machine body',(0,-.05,h+.15),(.32,.17,.30),'ceramic',.035);box('machine arm',(.15,-.05,h+.27),(.35,.15,.08),'ceramic');rod('needle',(.29,.0,h+.08),(.29,.0,h+.25),.003,'metal')
   if f=='tool-pegboard':
    box('pegboard',(0,-d*.4,h*.80),(w,.035,h*.60))
    for i in range(8):
     for j in range(4):o=cylinder('peg hole',(-w*.42+i*w*.84/7,-d*.4+.022,h*.57+j*h*.45/3),.008,.009,'dark',n=8);o.rotation_euler.x=pi/2
 elif f in ('record-console','tv-stand','aquarium-stand','charging-station','cat-litter'):
  cases({'w':w,'d':d,'h':h,'form':'open' if f=='record-console' else 'doors','rows':1,'cols':3,'front':'cane' if f=='record-console' else 'shaker'})
  if f=='record-console':
   for i in range(10):o=box('record sleeve',(-w*.30+i*.025,.02,h*.45),(.012,d*.65,h*.48),'dark');o.rotation_euler.y=.07
   box('turntable',(w*.22,0,h+.035),(w*.40,d*.72,.07),'dark');cylinder('platter',(w*.22,0,h+.08),min(w*.16,d*.28),.012,'metal')
  if f=='tv-stand':
   rod('TV support',(0,0,h),(0,0,h+.25),.025,'metal');box('television',(0,0,h+.55),(w*.80,.045,.62),'dark',.015);box('screen',(0,.026,h+.55),(w*.77,.005,.58),'glass',.001)
  if f=='aquarium-stand':
   box('aquarium base',(0,0,h+.018),(w,d,.045),'dark');
   for x in (-w/2,w/2):box('tank side',(x,0,h+.30),(.012,d,.52),'glass')
   for y in (-d/2,d/2):box('tank front',(0,y,h+.30),(w,.012,.52),'glass')
  if f=='charging-station':
   for x in (-w*.3,0,w*.3):box('device slot',(x,.0,h+.05),(.015,d*.6,.10),'metal')
  if f=='cat-litter':
   # Entry is built as a real framed opening on the front extension.
   for x in (-w*.18,w*.18):box('entry jamb',(x,d/2+.04,.22),(.03,.025,.35))
   box('entry lintel',(0,d/2+.04,.41),(w*.4,.025,.035))
 elif f in ('plant-stand','plant-tier','guitar-stand','luggage-rack','magazine-rack','bike-rack'):
  if f=='plant-stand':
   for i in range(3):aa=i*2*pi/3;rod('plant tripod',(w*.40*cos(aa),d*.40*sin(aa),0),(w*.24*cos(aa),d*.24*sin(aa),h-.015),.024,'wood')
   slab('plant tray',(0,0,h),w,d,.04,'round')
  elif f=='plant-tier':
   for x,z in ((-w*.3,h*.45),(w*.3,h*.72),(0,h)):
    cylinder('plant post',(x,0,z/2),.025,z,'metal');slab('plant tray',(x,0,z),.30,.30,.025,'round')
   box('base',(0,0,.02),(w,d,.04),'metal')
  elif f=='guitar-stand':
   feet(w,d,.12,'trestle','metal');box('guitar stand foot',(0,0,.0175),(w,d,.035),'metal');rod('neck support',(0,-d*.3,.02),(0,-d*.3,h),.015,'metal');tube('neck fork',[(-.07,-d*.3,h),(0,-d*.3,h-.06),(.07,-d*.3,h)],.012,'dark')
   for x in (-w*.3,w*.3):
    tube('body cradle',[(x,-.10,.12),(x,.15,.14),(x,.21,.21)],.014,'dark');rod('cradle bracket',(x,-.10,.12),(x,0,.12),.014,'metal')
  elif f=='luggage-rack':
   feet(w,d,h,'cross','wood')
   for y in (-d*.32,d*.32):rod('strap attachment rail',(-w*.45,y,h),(w*.45,y,h),.020,'wood')
   for x in (-w*.3,-w*.1,w*.1,w*.3):box('luggage strap',(x,0,h),(.055,d,.008),'fabric',.001)
  elif f=='magazine-rack':
   for x in (-w*.48,w*.48):tube('rack end',[(x,-d*.4,h),(x,0,.06),(x,d*.4,h)],.014,'metal')
   for x in (-w*.48,w*.48):
    rod('rack floor foot',(x,-d*.38,.02),(x,d*.38,.02),.014,'metal');rod('rack base connection',(x,0,.02),(x,0,.07),.012,'metal')
   for yy in (-d*.4,d*.4):rod('sling top rail',(-w*.48,yy,h),(w*.48,yy,h),.012,'metal')
   verts=[];profile=[(-d*.4,h),(0,.08),(d*.4,h)]
   for yy,zz in profile:
    for i in range(9):u=i/8;verts.append(((u-.5)*w*.96,yy,zz-.018*sin(pi*u)))
   mesh('continuous magazine sling',verts,[(j*9+i,j*9+i+1,(j+1)*9+i+1,(j+1)*9+i) for j in range(2) for i in range(8)],'linen',True)
  else:
   box('rack base',(0,0,.02),(w,d,.04),'metal')
   for x in (-w*.3,0,w*.3):tube('wheel hoop',[(x,-d*.4,.04),(x,-d*.4,.55),(x,d*.4,.55),(x,d*.4,.04)],.018,'metal')
 elif f in ('safe','server-rack','dog-crate'):
  cases({'w':w,'d':d,'h':h,'form':'doors','base':'plinth','baseHeight':.04,'front':'mesh' if f=='dog-crate' else 'glass' if f=='server-rack' else 'slab'})
  if f=='safe':
   rod('safe wheel spindle',(0,d/2+.01,h*.55),(0,d/2+.09,h*.55),.018,'metal')
   ring('safe wheel',(0,d/2+.09,h*.55),.10,.10,.012,'metal','XZ')
   for a in (0,2*pi/3,4*pi/3):rod('safe spoke',(0,d/2+.09,h*.55),(.10*cos(a),d/2+.09,h*.55+.10*sin(a)),.009,'metal')
  if f=='server-rack':
   for zz in [h*.1+i*h*.08 for i in range(10)]:box('server front',(0,d/2+.033,zz),(w*.82,.025,h*.065),'dark');ellipsoid('status LED',(w*.28,d/2+.05,zz),(.012,.006,.012),'accent')
 elif f in ('monitor-arm','standing-mirror'):
  cylinder('display base',(0,0,.025),.22,.05,'metal');tube('display arm',[(0,0,.04),(0,0,h*.55),(-.12,0,h*.75),(0,0,h*.85)],.018,'metal')
  box('display',(0,0,h*.80),(w,.045,h*.55),'dark' if f=='monitor-arm' else 'wood');box('screen',(0,.025,h*.80),(w-.04,.008,h*.55-.04),'glass')
 else:raise ValueError(f)

def sculptural(p):
 f=p['form'];w=p.get('w',1.0);d=p.get('d',.4);h=p.get('h',1.4)
 if f in ('arch-bookcase','arch-door','arch-cane'):
  radius=w/2;spring=h-radius;th=.035
  # Arched top is a real continuous curved frame, not a box with a painted arch.
  for x in (-radius+th/2,radius-th/2):box('arch side',(x,0,spring/2),(th,d,spring))
  verts=[];N=32
  for y in (-d/2,d/2):
   for r in (radius-th,radius):verts.extend([(r*cos(i*pi/N),y,spring+r*sin(i*pi/N)) for i in range(N+1)])
  k=N+1;faces=[]
  for i in range(N):faces.extend([(i,i+1,k+i+1,k+i),(2*k+i,3*k+i,3*k+i+1,2*k+i+1),(k+i,k+i+1,3*k+i+1,3*k+i),(i,2*k+i,2*k+i+1,i+1)])
  faces.extend([(0,k,3*k,2*k),(k-1,3*k-1,4*k-1,2*k-1)]);mesh('arched crown',verts,faces,'wood')
  for x in (-radius+th/2,radius-th/2):box('arch spring joint',(x,0,spring-.010),(th,d,.045))
  for z in (.035,spring*.38,spring*.75):box('arch shelf',(0,0,z),(w-th*2,d,.035))
  if f!='arch-bookcase':
   for x in (-w*.25,w*.25):panel_front('lower door',x,d/2+.015,spring*.25,w/2-.03,spring*.45,'cane' if f=='arch-cane' else 'shaker')
 elif f=='tree-bookcase':
  box('tree foot',(0,0,.025),(w,d,.05));box('trunk',(0,-d*.15,h/2),(.08,d*.55,h))
  for i in range(6):
   sign=1 if i%2 else -1;z=.22+i*h*.12;o=box('branch shelf',(sign*w*.22,0,z),(w*.60,d,.025));o.rotation_euler.y=sign*.45
 elif f=='zigzag-shelf':
  for i in range(5):
   z=(i+.5)*h/5;sign=1 if i%2 else -1;o=box('zigzag shelf',(0,0,z),(w,d,.035));o.rotation_euler.y=sign*.25
  for x in (-w/2,w/2):rod('outer rail',(x,-d*.35,0),(x,-d*.35,h),.018,'metal')
 elif f=='circular-shelf':
  ring('outer circular frame',(0,0,h/2),w/2,h/2,.035,'wood','XZ')
  for z in (h*.25,h*.5,h*.75):
   width=w*math.sqrt(max(0,1-((z-h/2)/(h/2))**2));box('chord shelf',(0,0,z),(width,d,.025))
  feet(w*.7,d,.10,'panel')
 elif f=='diamond-shelf':
  for i in range(3):
   x=(i-1)*w*.33
   tube('diamond frame',[(x,0,.12),(x+w*.3,0,h*.48),(x,0,h*.84),(x-w*.3,0,h*.48)],.025,'wood',True)
  box('centre display shelf',(0,0,h*.48),(w,d,.025))
 elif f=='cantilever-shelf':
  box('rear structural panel',(0,-d/2,h/2),(w*.40,.06,h))
  for i in range(6):box('cantilever shelf',((-.15 if i%2 else .15)*w,0,.12+i*h*.16),(w*.70,d,.03))
 elif f=='stair-cubby':
  for i in range(4):
   x=-w*.375+i*w*.25;hh=h*(i+1)/4
   for xx in (x-w*.125+.012,x+w*.125-.012):box('step side',(xx,0,hh/2),(.025,d,hh))
   for j in range(i+2):box('step shelf',(x,0,j*hh/(i+1)),(w*.25,d,.025))
 elif f=='hex-cells':
  for j in range(3):
   for i in range(2):
    cx=(i-.5)*w*.52+(w*.13 if j%2 else 0);cz=.23+j*h*.30;r=w*.28
    for side in range(6):
     a=side*pi/3;b=(side+1)*pi/3
     rod('hexagonal cell edge',(cx+r*cos(a),0,cz+r*sin(a)),(cx+r*cos(b),0,cz+r*sin(b)),.018,'wood')
    box('cell ledge',(cx,0,cz-r*.86),(r,d,.025))
 elif f in ('slat-bench','storage-bench','church-bench','curved-bench','picnic-bench','planter-bench','spindle-settle','cane-settle'):
  seat=.45;feet(w,d,seat-.045,'trestle' if f=='picnic-bench' else 'taper')
  for yy in (-d/2+.055,d/2-.055):box('bench apron rail',(0,yy,seat-.045),(w-.06,.06,.06))
  for xx in (-w*.35,w*.35):box('bench slat batten',(xx,0,seat-.045),(.065,d*.95,.06))
  if f=='curved-bench':
   for i in range(9):
    a=(i-4)*.12;o=box('curved seat stave',(w*.48*sin(a)/sin(.48),.4*(1-cos(a)),seat),(.17,d,.045));o.rotation_euler.z=-a
  else:
   for j in range(5):box('bench seat slat',(0,-d*.4+j*d*.2,seat),(w,d*.17,.045))
  if f=='storage-bench':
   for yy in (-d*.44,d*.44):box('storage wall',(0,yy,.23),(w,.025,.34))
   for xx in (-w*.48,w*.48):box('storage end',(xx,0,.23),(.025,d,.34))
   handle(0,d*.5,.29,.15)
  if f in ('church-bench','spindle-settle','cane-settle'):
   if f=='church-bench':box('continuous back',(0,-d*.45,.74),(w,.045,.47))
   else:panel_front('settle back',0,-d*.45,.76,w,.45,'cane' if f=='cane-settle' else 'slatted')
   for xx in (-w*.46,w*.46):rod('back support',(xx,-d*.45,.20),(xx,-d*.45,.99),.025,'wood');rod('armrail',(xx,-d*.45,.69),(xx,d*.35,.69),.025,'wood')
  if f=='planter-bench':
   for x in (-w*.62,w*.62):basin('end planter',(x,0,0),.38,d,.55,'wood')
 elif f in ('rounded-trunk','ribbed-trunk','travel-trunk'):
  box('trunk body',(0,0,h*.40),(w,d,h*.80),'wood',.025)
  # Rounded barrel lid is a swept semicircular surface with end caps.
  verts=[];N=24
  for x in (-w/2,w/2):verts.extend([(x,d/2*cos(i*pi/N),h*.8+d*.20*sin(i*pi/N)) for i in range(N+1)])
  faces=[(i,i+1,N+2+i,N+1+i) for i in range(N)]+[tuple(range(N,-1,-1)),tuple(range(N+1,2*(N+1)))]
  mesh('barrel trunk lid',verts,faces,'wood',True)
  for xx in (-w*.30,w*.30):rod('trunk lid hinge',(xx,-d/2+.015,h*.75),(xx,-d/2+.015,h*.825),.012,'metal')
  for x in (-w*.28,w*.28):
   if f in ('ribbed-trunk','travel-trunk'):tube('trunk band',[(x,d/2*cos(i*pi/24),h*.8+d*.2*sin(i*pi/24)+.008) for i in range(25)],.012,'metal')
   handle(x,d/2+.025,h*.55,.11,True)
  if f=='travel-trunk':
   for x in (-w*.48,w*.48):
    for y in (-d*.48,d*.48):box('corner fitting',(x,y,.055),(.06,.06,.09),'metal')
 elif f in ('radial-coffee','ring-base-table','cross-panel-table','y-base-table','sphere-base-table'):
  slab('sculptural table top',(0,0,h-.025),w,d,.05,p.get('shape','round'),'stone' if f=='sphere-base-table' else 'wood')
  if f=='radial-coffee':
   for i in range(12):a=i*pi/6;box_o=box('radial fin',(w*.15*cos(a),d*.15*sin(a),(h-.05)/2),(.035,d*.48,h-.05));box_o.rotation_euler.z=a
  elif f=='ring-base-table':
   for y in (-d*.25,d*.25):ring('ring support',(0,y,(h-.05)/2),w*.34,(h-.05)/2,.025,'metal','XZ')
  elif f=='cross-panel-table':
   for a in (0,pi/2):o=box('cross panel',(0,0,(h-.05)/2),(w*.65,.04,h-.05));o.rotation_euler.z=a
  elif f=='y-base-table':
   for i in range(3):a=i*2*pi/3;rod('Y leg',(w*.35*cos(a),d*.35*sin(a),0),(0,0,h*.6),.045,'wood')
   cylinder('upper stem',(0,0,h*.78),.055,h*.40,'wood')
  else:ellipsoid('sculptural sphere base',(0,0,(h-.05)/2),(w*.65,d*.65,h-.05),'stone')
 else:raise ValueError('unknown sculptural form '+f)

def functional(p):
 f=p['form'];w=p.get('w',1.0);d=p.get('d',.6);h=p.get('h',.8)
 if f in ('drop-leaf','gateleg','lift-top','picnic-combined','drafting-ledge','fold-wall'):
  if f in ('drop-leaf','gateleg'):
   box('central top',(0,0,h),(w*.42,d,.04))
   for s in (-1,1):
    pivot=Vector((s*w*.21,0,h));offset=Vector((s*w*.17*cos(.65),0,-w*.17*sin(.65)));o=box('hinged leaf',pivot+offset,(w*.34,d,.035));o.rotation_euler.y=s*.65
    rod('hinge pin',(s*w*.21,-d*.42,h-.005),(s*w*.21,d*.42,h-.005),.009,'metal')
   feet(w*.4,d,h-.012,'panel' if f=='drop-leaf' else 'taper')
   if f=='gateleg':
    for s in (-1,1):
     box('central gate pivot beam',(s*w*.15,0,h*.30),(.065,d*.85,.055));rod('swing gate rail',(s*w*.15,0,h*.30),(s*w*.36,d*.22,h*.30),.025,'wood');rod('gate foot',(s*w*.36,d*.22,0),(s*w*.36,d*.22,h-math.tan(.65)*w*.15),.025,'wood')
  elif f=='lift-top':
   box('storage floor',(0,0,.17),(w,d,.035));
   for x in (-w/2,w/2):box('case end',(x,0,.28),(.03,d,.23))
   for y in (-d/2,d/2):box('case face',(0,y,.28),(w,.03,.23))
   box('raised lift top',(0,d*.28,h),(w,d,.04))
   for x in (-w*.35,w*.35):
    for yy in (-d*.2,d*.2):rod('scissor lift',(x,yy,.31),(x,yy+d*.28,h-.012),.012,'metal')
   for yy in (-d*.2,d*.2):rod('lower lift axle',(-w/2,yy,.31),(w/2,yy,.31),.014,'metal')
   feet(w,d,.15,'sled','metal')
  elif f=='picnic-combined':
   tables({'w':w,'d':d*.55,'h':h,'form':'trestle'})
   for s in (-1,1):
    for j in (-1,1):box('picnic bench slat',(0,s*d*.54+j*.055,.44),(w,.10,.035))
    for x in (-w*.3,w*.3):
     rod('bench outrigger',(x,0,.25),(x,s*d*.54,.415),.03,'wood');rod('picnic seat crossbeam',(x,s*d*.54-.12,.415),(x,s*d*.54+.12,.415),.022,'wood')
  elif f=='drafting-ledge':
   o=box('tilting drafting top',(0,0,h),(w,d,.045));o.rotation_euler.x=-.35
   for yy in (-d*.30,d*.30):
    zz=h-yy*math.tan(.35)-.012;rod('crossed drafting support',(-w*.40,yy,0),(w*.35,yy,zz),.028,'metal');rod('crossed drafting support',(w*.40,yy,0),(-w*.35,yy,zz),.028,'metal')
   box('instrument ledge',(0,d*.46,h-d*.46*math.tan(.35)+.025),(w,.03,.04))
  else:
   box('wall mounting plate',(0,-d*.45,h*.7),(w,.04,h*.6));box('folding top',(0,0,h*.6),(w,d,.035))
   for x in (-w*.35,w*.35):rod('folding wall stay',(x,-d*.43,h*.35),(x,d*.35,h*.58),.016,'metal')
 elif f in ('papasan','bean-chair','floor-chair','butterfly','chaise-longue','bent-ply','corner-banquette'):
  if f=='papasan':
   ring('bowl base',(0,0,.06),.28,.28,.025,'cane');cylinder('bowl pedestal',(0,0,.25),.10,.40,'wood')
   for i in range(3):aa=i*2*pi/3;rod('papasan base spoke',(0,0,.065),(.28*cos(aa),.28*sin(aa),.065),.020,'wood')
   # Open bowl profile, tilted to make the chair's seating direction explicit.
   o=lathe('papasan bowl',[(0,0),(.15,.015),(.30,.07),(.44,.20),(.47,.30),(.45,.30),(.42,.21),(.28,.09),(.10,.04),(0,.035)],'cane');o.location.z=.33;o.rotation_euler.x=-.30
   o=ellipsoid('bowl cushion',(0,.015,.48),(.80,.80,.18),'fabric');o.rotation_euler.x=-.30
  elif f=='bean-chair':
   ellipsoid('bean seat',(0,.12,.22),(.88,.78,.44),'fabric');o=ellipsoid('bean back',(0,-.20,.48),(.76,.46,.75),'fabric');o.rotation_euler.x=-.25
  elif f=='floor-chair':
   cushion('floor pad',(0,.12,.08),(.57,.55,.16),'fabric');o=cushion('reclined floor back',(0,-.15,.37),(.57,.13,.60),'fabric');o.rotation_euler.x=-.3
   for x in (-.24,.24):tube('floor rocker',[(x,.42,.02),(x,-.24,.02),(x,-.45,.68)],.018,'wood')
  elif f=='butterfly':
   for x in (-.36,.36):tube('butterfly frame',[(x,.34,.78),(x,-.30,.04),(x,.25,.04),(x,-.36,.85)],.014,'metal')
   mesh('suspended butterfly sling',[(-.36,.34,.78),(.36,.34,.78),(-.36,-.36,.85),(.36,-.36,.85),(-.23,.04,.37),(.23,.04,.37)],[(0,4,5,1),(2,3,5,4),(0,2,4),(1,5,3)],'fabric')
  elif f=='chaise-longue':
   for x in (-.30,.30):tube('chaise frame',[(x,-.76,.90),(x,-.38,.42),(x,.20,.36),(x,.78,.48)],.03,'wood')
   for i in range(12):
    y=-.75+i*1.5/11;z=.40+(.50*(-y-.32)/.43 if y<-.32 else .09*max(y,0)/.75)
    o=box('chaise cushion channel',(0,y,z),(.64,.13,.09),'fabric',.035);o.rotation_euler.x=.6 if y<-.32 else -.1
   for x in (-.27,.27):
    for y in (-.50,.57):
     zz=.42+(-y-.38)/.38*.48 if y<-.38 else .36+(y-.20)/.58*.12
     rod('chaise leg',(x,y,0),(x,y,zz),.025,'wood')
  elif f=='bent-ply':
   # Broad continuous ribbon swept through a C-frame, visible from both sides.
   profile=[(.35,.02),(-.30,.02),(-.35,.10),(-.20,.38),(.28,.44),(.34,.49),(.20,.58),(-.20,.86)]
   verts=[(x,y,z) for x in (-.27,.27) for y,z in profile];n=len(profile)
   o=mesh('bent plywood ribbon',verts,[(i,i+1,n+i+1,n+i) for i in range(n-1)],'wood');bpy.context.view_layer.objects.active=o;m=o.modifiers.new('laminated thickness','SOLIDIFY');m.thickness=.025;bpy.ops.object.modifier_apply(modifier=m.name)
  else:
   for x,y,ww,dd in ((0,0,w,d*.45),(w*.37,d*.35,w*.26,d*.75)):
    box('banquette plinth',(x,y,.18),(ww,dd,.36));cushion('banquette seat',(x,y,.43),(ww,dd,.16),'fabric')
   cushion('long wall back',(0,-d*.25,.72),(w,.13,.50),'fabric');cushion('return wall back',(w*.49,d*.25,.72),(.13,d*.85,.50),'fabric');box('banquette rear frame',(0,-d*.24,.47),(w,.10,.48))
 elif f in ('corner-shelf','spiral-shelf','offset-cube-shelf','cylinder-display','rotating-book-tower','a-frame-shelf','suspended-rope-shelf','sliding-bookcase'):
  if f=='corner-shelf':
   for z in (.08,.43,.78,1.13,1.48):slab('triangular corner shelf',(0,0,z),w,d,.028,'triangle')
   for x,y in ((-w/2,-d*.43),(w/2,-d*.43),(0,d*.57)):rod('corner post',(x,y,0),(x,y,h),.02,'wood')
  elif f=='spiral-shelf':
   cylinder('central shelf mast',(0,0,h/2),.045,h,'metal')
   for i in range(9):
    a=i*pi/3;slab('spiral display',(w*.22*cos(a),w*.22*sin(a),.10+i*h*.1),w*.48,w*.42,.025,'oval')
  elif f=='offset-cube-shelf':
   for i in range(4):
    x=(-.18 if i%2 else .18)*w;zz=(i+.5)*h/4;hh=h/4
    for z in (zz-hh/2,zz+hh/2):box('offset cube shelf',(x,0,z),(w*.70,d,.025))
    for xx in (x-w*.35,x+w*.35):box('offset cube side',(xx,0,zz),(.025,d,hh))
  elif f in ('cylinder-display','rotating-book-tower'):
   cylinder('turntable foot',(0,0,.025),w*.35,.05,'metal')
   cylinder('turntable axle',(0,0,.075),.06,.10,'metal')
   for z in (.10,h*.34,h*.66,h):slab('circular shelf',(0,0,z),w,w,.03,'round')
   if f=='cylinder-display':
    for i in range(3):a=i*2*pi/3;rod('display upright',(w*.45*cos(a),w*.45*sin(a),.10),(w*.45*cos(a),w*.45*sin(a),h),.015,'metal')
   else:
    for a in (0,pi/2):o=box('radial book partition',(0,0,h*.54),(w*.90,.025,h*.93));o.rotation_euler.z=a
  elif f=='a-frame-shelf':
   for x in (-w*.46,w*.46):
    rod('A stile',(x,-d/2,0),(x,0,h),.025,'wood');rod('A stile',(x,d/2,0),(x,0,h),.025,'wood')
   for z in (.18,h*.40,h*.68):box('A shelf',(0,0,z),(w,d*(1-z/h),.03))
  elif f=='suspended-rope-shelf':
   box('floor foot',(0,0,.02),(w,d,.04),'metal')
   for x in (-w*.42,w*.42):
    for y in (-d*.40,d*.40):rod('rope suspension',(x,y,0),(x,y,h),.007,'cane')
   for z in (.08,.48,.88,1.28):box('suspended shelf',(0,0,z),(w,d,.028))
  else:
   cases({'w':w,'d':d,'h':h,'form':'open','rows':4,'cols':2})
   for x in (-w*.5,w*.5):rod('door track',(x,d/2+.035,.20),(x,d/2+.035,h-.03),.009,'metal')
   for x in (-w*.5,w*.5):
    for z in (.20,h-.03):rod('door track mount',(x,d/2-.02,z),(x,d/2+.035,z),.012,'metal')
   panel_front('sliding panel',w*.22,d/2+.045,h*.55,w*.52,h*.80,'slatted')
   for z in (h*.20,h*.90):rod('sliding door hanger',(w*.46,d/2+.035,z),(w*.50,d/2+.035,z),.010,'metal')
 elif f in ('bassinet-rocker','acoustic-booth','double-study','circular-banquette','hall-tree','boot-wash-bench'):
  if f=='bassinet-rocker':
   for y in (-d*.32,d*.32):tube('cradle rocker',[(-w*.55+i*w*1.1/24,y,.02+.12*((i-12)/12)**2) for i in range(25)],.025,'wood')
   for x in (-w*.3,w*.3):rod('cradle support',(x,0,.10),(x,0,.50),.028,'wood')
   for x in (-w*.3,w*.3):
    zz=.02+.12*(x/(w*.55))**2;rod('cradle rocker crossbeam',(x,-d*.32,zz),(x,d*.32,zz),.025,'wood');rod('cradle foot block',(x,0,zz),(x,0,.12),.025,'wood')
   slab('cradle base',(0,0,.465),w*.70,d*.70,.035,'oval','wood')
   for i in range(24):
    a=i*2*pi/24;pts=[]
    for j in range(6):
     t=j/5;r=.34+.16*t**.60;pts.append((w*r*cos(a),d*r*sin(a),.47+.33*t))
    tube('woven cradle stave',pts,.006,'cane')
   for j in range(7):
    t=j/6;r=.34+.16*t**.60;ring('cradle woven band',(0,0,.47+.33*t),w*r,d*r,.006,'cane')
   slab('cradle mattress',(0,0,.51),w*.75,d*.75,.07,'oval','linen')
  elif f=='acoustic-booth':
   box('booth floor',(0,0,.03),(w,d,.06));box('booth back',(0,-d/2,h/2),(w,.07,h),'fabric')
   for x in (-w/2,w/2):box('booth side',(x,0,h/2),(.07,d,h),'fabric')
   box('booth roof',(0,0,h),(w,d,.07),'fabric');box('booth desk',(0,-d*.10,.75),(w-.03,d*.65,.035));cushion('booth seat',(0,d*.23,.45),(w*.65,d*.35,.12),'fabric');box('booth bench pedestal',(0,d*.23,.215),(w*.65,d*.35,.43))
  elif f=='double-study':
   tables({'w':w,'d':d,'h':.75,'form':'sled'});box('central privacy screen',(0,0,1.0),(w,.035,.50),'fabric')
   for x in (-w*.45,w*.45):box('end privacy screen',(x,0,1.0),(.035,d,.50),'fabric')
  elif f=='circular-banquette':
   for i in range(9):
    a=(-.9+i*1.8/8);x=w*.45*sin(a);y=d*.45*cos(a)
    o=cushion('arc banquette seat',(x,y,.45),(.30,.48,.16),'fabric');o.rotation_euler.z=-a
    o=cushion('arc back',(x*1.18,y*1.18,.75),(.32,.12,.52),'fabric');o.rotation_euler.z=-a
    box('arc support',(x,y,.20),(.20,.34,.40))
  elif f=='hall-tree':
   sculptural({'form':'storage-bench','w':w,'d':d,'h':.45});box('hall-tree back',(0,-d*.47,h/2),(w,.035,h))
   box('hat shelf',(0,-d*.15,h),(w,d*.75,.035))
   for x in (-w*.3,0,w*.3):tube('coat hook',[(x,-d*.47,h*.72),(x,-d*.25,h*.72),(x,-d*.25,h*.80)],.009,'metal')
  else:
   sculptural({'form':'slat-bench','w':w,'d':d,'h':.45});basin('boot tray',(0,0,.05),w*.80,d*.90,.06,'metal')
 else:raise ValueError(f)

def signature(p):
 from signature_designs import build
 return build(p)

BUILDERS={'seating':seating,'table':tables,'case':cases,'bed':beds,'light':lights,'bath':bath,'appliance':appliance,'kitchen':kitchen,'special':specialty,'sculptural':sculptural,'functional':functional,'signature':signature}
