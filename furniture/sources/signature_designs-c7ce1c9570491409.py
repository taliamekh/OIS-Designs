"""Additional original construction designs. No random or size-only multiplication.
All lengths metres, Blender Z-up/+Y front. Shapes are planning furniture, not build plans.
"""
import math
from math import sin,cos,pi
from mathutils import Vector,Matrix
import bpy
import design_geometry as g

def bezier(a,b,c,d,n=25):
 a,b,c,d=map(Vector,(a,b,c,d));return [tuple((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d) for t in [i/(n-1) for i in range(n)]]
def rotate_parts(parts,pivot,axis,angle):
 p=Vector(pivot);r=Matrix.Rotation(angle,4,axis);transform=Matrix.Translation(p)@r@Matrix.Translation(-p)
 bpy.context.view_layer.update()
 for o in parts:o.matrix_world=transform@o.matrix_world
def sector(name,r1,r2,a0,a1,z,t,slot='wood',n=40,offset=(0,0)):
 vertices=[(offset[0]+r*cos(a0+(a1-a0)*i/n),offset[1]+r*sin(a0+(a1-a0)*i/n),zz) for zz in (z-t/2,z+t/2) for r in (r1,r2) for i in range(n+1)]
 k=n+1;faces=[]
 for i in range(n):faces.extend([(i,k+i,k+i+1,i+1),(2*k+i,2*k+i+1,3*k+i+1,3*k+i),(i,i+1,2*k+i+1,2*k+i),(k+i,3*k+i,3*k+i+1,k+i+1)])
 faces.extend([(0,2*k,3*k,k),(k-1,2*k-1,4*k-1,3*k-1)])
 return g.mesh(name,vertices,faces,slot)
def star_base(height=.43,r=.30):
 for i in range(5):
  a=i*2*pi/5;g.rod('star leg',(0,0,.10),(r*cos(a),r*sin(a),.07),.018,'metal');g.ellipsoid('caster',(r*cos(a),r*sin(a),.035),(.075,.055,.07),'dark')
 g.cylinder('gas stem',(0,0,height/2+.04),.033,height-.04,'metal')
def saddle(w,d,z,slot='wood'):
 N=48;R=8;vertices=[(0,0,z-.014)]
 for j in range(1,R+1):
  r=j/R
  for i in range(N):
   a=i*2*pi/N;x=w*.5*r*cos(a);y=d*.5*r*sin(a)
   dip=sum(math.exp(-((x-s*w*.21)/(w*.19))**2-(y/(d*.36))**2) for s in (-1,1))
   zz=z-.036*dip+.025*r**4-.012*max(y,0)/(d*.5)
   vertices.append((x,y,zz))
 faces=[(0,1+i,1+(i+1)%N) for i in range(N)]
 for j in range(R-1):
  for i in range(N):faces.append((1+j*N+i,1+j*N+(i+1)%N,1+(j+1)*N+(i+1)%N,1+(j+1)*N+i))
 o=g.mesh('carved saddle',vertices,faces,slot,True);bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('seat thickness','SOLIDIFY');mod.thickness=.028;bpy.ops.object.modifier_apply(modifier=mod.name);return o
def ribbon(name,profile,depth,thickness=.035,slot='wood',plane='XZ'):
 verts=[]
 for i,(u,z) in enumerate(profile):
  previous=Vector(profile[max(0,i-1)]);following=Vector(profile[min(len(profile)-1,i+1)]);t=(following-previous).normalized();n=Vector((-t.y,t.x))
  for side_y,side_t in ((-1,-1),(1,-1),(1,1),(-1,1)):
   uu=u+n.x*thickness*.5*side_t;zz=z+n.y*thickness*.5*side_t
   verts.append((uu,side_y*depth/2,zz) if plane=='XZ' else (side_y*depth/2,uu,zz))
 faces=[]
 for i in range(len(profile)-1):
  for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
 faces.extend([(3,2,1,0),tuple((len(profile)-1)*4+j for j in range(4))]);return g.mesh(name,verts,faces,slot)
def smooth_profile(points,steps=12):
 # Catmull-Rom interpolation for deliberately drawn furniture profiles.
 p=[Vector(points[0])]+list(map(Vector,points))+[Vector(points[-1])];out=[]
 for i in range(1,len(p)-2):
  a,b,c,d=p[i-1:i+3]
  for j in range(steps):
   t=j/steps;out.append(tuple(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)))
 out.append(tuple(p[-2]));return out

def build(p):
 f=p['form']
 if f=='kneeling-chair':
  for x in (-.25,.25):g.tube('rocking kneel runner',[(x,-.45+i*.9/24,.03+.10*((i-12)/12)**2) for i in range(25)],.027,'wood')
  seat=g.cushion('tilted main seat',(0,-.18,.60),(.47,.40,.10));seat.rotation_euler.x=-.20
  shin=g.cushion('shin support',(0,.32,.33),(.46,.28,.10));shin.rotation_euler.x=.25
  for x in (-.20,.20):
   g.rod('seat support',(x,-.35,.08),(x,-.20,.56),.03,'wood');g.rod('knee support',(x,.35,.08),(x,.30,.30),.03,'wood');g.rod('diagonal frame',(x,-.20,.52),(x,.35,.08),.028,'wood')
 elif f=='mesh-task-chair':
  star_base();g.box('seat pan',(0,.02,.445),(.55,.54,.045),'metal');g.cushion('seat',(0,.02,.50),(.52,.50,.10))
  g.tube('back support spine',[(0,-.10,.43),(0,-.26,.56),(0,-.32,.78)],.025,'metal')
  g.tube('mesh back perimeter',[(-.27,-.25,.50),(-.28,-.31,.97),(-.22,-.33,1.10),(.22,-.33,1.10),(.28,-.31,.97),(.27,-.25,.50)],.020,'metal')
  for i in range(15):
   x=-.25+i*.5/14;g.tube('back tension cord',[(x,-.25-.08*j/8,.52+.56*j/8) for j in range(9)],.0035,'dark')
  for j in range(12):
   z=.54+j*.50/11;y=-.25-.08*(z-.52)/.56;g.rod('weft cord',(-.26,y,z),(.26,y,z),.0035,'dark',n=8)
  g.box('lumbar pad',(0,-.29,.70),(.40,.035,.09),'fabric',.025)
 elif f=='rolling-saddle':
  star_base(.52,.28);g.slab('saddle support',(0,0,.50),.44,.35,.045,'oval','metal');saddle(.49,.39,.565,'fabric')
 elif f=='director-chair':
  for x in (-.25,.25):
   g.rod('crossing leg',(x,-.25,0),(x,.25,.48),.024,'wood');g.rod('crossing leg',(x,.25,0),(x,-.25,.48),.024,'wood')
   g.rod('seat rail',(x,-.25,.48),(x,.25,.48),.021,'wood');g.rod('back stile',(x,-.23,.46),(x,-.23,.88),.020,'wood');g.rod('arm rail',(x,-.23,.68),(x,.23,.68),.023,'wood');g.rod('front arm support',(x,.23,.48),(x,.23,.68),.018,'wood')
   g.ellipsoid('hinge bolt',(x,0,.24),(.045,.045,.045),'metal')
  g.mesh('canvas seat',[(-.25,-.23,.48),(.25,-.23,.48),(.25,.23,.48),(-.25,.23,.48)],[(0,1,2,3)],'fabric')
  g.mesh('canvas back',[(-.25,-.23,.65),(.25,-.23,.65),(.25,-.23,.85),(-.25,-.23,.85)],[(0,1,2,3)],'fabric')
 elif f=='slat-reclining-chair':
  for x in (-.32,.32):
   g.rod('front leg',(x,.30,0),(x,.30,.65),.032,'wood');g.rod('rear frame',(x,-.45,0),(x,.20,.45),.035,'wood');g.rod('seat rail',(x,-.30,.34),(x,.30,.45),.026,'wood')
  for i in range(7):
   y=-.25+i*.50/6;z=.34+(y+.25)*.18;o=g.box('seat plank',(0,y,z),(.62,.066,.035));o.rotation_euler.x=.18
  for i in range(7):
   x=(i-3)*.082;hh=1.10-.12*abs(i-3)/3;o=g.box('fan back plank',(x,-.34,(hh+.35)/2),(.073,.033,hh-.35));o.rotation_euler.x=-.16
  for x in (-.35,.35):g.box('broad arm',(x,-.02,.65),(.17,.75,.04))
 elif f=='string-hoop-chair':
  g.slab('underseat pan',(0,0,.38),.60,.50,.04,'oval','wood');g.feet(.49,.43,.37,'taper','metal')
  outline=[(.45*cos(a),-.05-.28*sin(a),.68+.40*sin(a)) for a in [i*2*pi/48 for i in range(48)]];g.tube('outer hoop',outline,.021,'metal',True)
  for i in range(24):
   a=i*2*pi/24;outer=Vector((.45*cos(a),-.05-.28*sin(a),.68+.40*sin(a)));inner=Vector((.07*cos(a),.10+.05*sin(a),.40));mid=(outer+inner)/2;mid.z-=.05
   g.tube('woven radial cord',bezier(tuple(inner),tuple(inner*.4+mid*.6),tuple(mid),tuple(outer),9),.005,'cane')
  g.ring('inner anchor',(0,.10,.40),.07,.05,.012,'metal')
  for s in (-1,1):g.rod('hoop brace',(s*.20,-.18,.37),(s*.45,-.05,.68),.018,'metal')
 elif f=='suspended-wicker-chair':
  g.cylinder('weighted floor disc',(0,-.10,.035),.55,.07,'metal')
  g.tube('cantilever suspension frame',bezier((0,-.42,.04),(0,-.70,1.55),(0,-.40,2.17),(0,-.02,2.02),40),.035,'metal')
  g.rod('suspension cable',(0,-.02,2.02),(0,-.02,1.65),.009,'metal')
  profile=[(.48,.35),(.60,.70),(.85,1),(1.10,1),(1.40,.76),(1.62,.12)];arc=pi*1.3
  for i in range(20):
   a=pi/2+arc/2-i*arc/19;g.tube('basket spine',[(.43*r*cos(a),-.36*r*sin(a),z) for z,r in profile],.009,'cane')
  for z,r in profile:g.tube('basket curved rib',[(.43*r*cos(a),-.36*r*sin(a),z) for a in [pi/2+arc/2-i*arc/32 for i in range(33)]],.009,'cane')
  for s in (-1,1):g.rod('basket hanger yoke',(0,-.02,1.65),(s*.04,-.02,1.62),.009,'metal')
  g.slab('basket seat support',(0,.01,.56),.65,.55,.04,'oval','wood');g.cushion('loose seat cushion',(0,.02,.65),(.65,.55,.15),'linen')
 elif f=='peacock-chair':
  g.feet(.48,.42,.41);g.slab('seat pan',(0,0,.41),.62,.55,.06,'oval');g.ellipsoid('seat cushion',(0,0,.48),(.62,.54,.12),'linen')
  g.ring('fan back rim',(0,-.26,.95),.50,.60,.025,'cane','XZ')
  for i in range(23):
   a=i*pi/22;g.rod('fan spoke',(0,-.26,.43),(.50*cos(a),-.26,.95+.60*sin(a)),.007,'cane',n=8)
  g.rod('back spine',(0,-.26,.41),(0,-.26,.95),.022,'wood')
  for s in (-1,1):g.rod('fan brace',(s*.22,-.20,.42),(s*.50,-.26,.95),.023,'wood')
 elif f in ('arched-iron-bed','lift-storage-bed','murphy-bed'):
  size=p.get('size','queen');w,d={'twin':(.9652,1.905),'full':(1.3716,1.905),'queen':(1.524,2.032),'king':(1.9304,2.032)}[size];W=w+.10;D=d+.12
  if f=='arched-iron-bed':
   g.feet(W-.10,D-.10,.32,'taper','metal');g.box('bed frame',(0,0,.34),(W,D,.08),'metal');g.cushion('mattress',(0,0,.49),(w,d,.22),'linen')
   for y,base,rise in ((-D/2,1.10,.18),(D/2,.72,.13)):
    g.tube('arched rail',[(W*.5*cos(i*pi/32),y,base+rise*sin(i*pi/32)) for i in range(33)],.024,'metal')
    for x in (-W/2,W/2):g.rod('bed post',(x,y,0),(x,y,base),.026,'metal');g.ellipsoid('post finial',(x,y,base),(.065,.065,.065),'metal')
    for i in range(11):
     x=(i-5)*W*.085;top=base+rise*math.sqrt(1-(x/(W/2))**2);g.rod('metal spindle',(x,y,.37),(x,y,top),.010,'metal')
  elif f=='lift-storage-bed':
   g.box('storage floor',(0,0,.045),(W,D,.09))
   for x in (-W/2,W/2):g.box('side wall',(x,0,.19),(.04,D,.30))
   for y in (-D/2,D/2):g.box('end wall',(0,y,.19),(W,.04,.30))
   before=set(bpy.context.scene.objects);g.box('lift deck',(0,0,.37),(W,D,.08));g.cushion('lift mattress',(0,0,.52),(w,d,.22),'linen');g.box('duvet',(0,.24,.66),(w-.03,d-.52,.04),'fabric',.018)
   rotate_parts(set(bpy.context.scene.objects)-before,(0,-D/2,.32),'X',.40)
   for x in (-W*.40,W*.40):
    target=Vector((x,D*.2,.37));pivot=Vector((0,-D/2,.32));target=pivot+Matrix.Rotation(.40,3,'X')@(target-pivot);start=Vector((x,-D*.1,.20));middle=(start+target)/2
    g.rod('gas strut barrel',start,middle,.019,'metal');g.rod('gas strut piston',middle,target,.011,'metal')
  else:
   w,d=1.3716,1.905;W=w+.14;D=d+.12;ch=2.16
   for x in (-W/2,W/2):g.box('wall-bed cabinet side',(x,0,ch/2),(.04,.45,ch))
   g.box('cabinet back',(0,-.21,ch/2),(W,.03,ch));g.box('cabinet top',(0,0,ch-.02),(W,.45,.04));g.box('cabinet floor',(0,0,.025),(W,.45,.05));g.box('upper internal shelf',(0,0,1.90),(W-.08,.40,.025))
   cy=.225+D/2;g.box('hinged deployed deck',(0,cy,.30),(W,D,.08));g.cushion('fold-bed mattress',(0,cy,.45),(w,d,.22),'linen')
   g.rod('long hinge',(-W/2,.225,.30),(W/2,.225,.30),.018,'metal')
   for x in (-w*.40,w*.40):g.rod('deployed foot',(x,.225+D-.10,0),(x,.225+D-.10,.28),.025,'metal')
  return {'bedSize':'full' if f=='murphy-bed' else size,'mattressMetres':[w,d,.22],'modelState':'deployed/open display pose' if f!='arched-iron-bed' else 'fixed frame','safetyReviewRequired':f=='murphy-bed'}
 elif f=='curved-rolltop-desk':
  g.tables({'w':1.20,'d':.65,'h':.75,'form':'four-leg','drawers':2})
  for x in (-.60,.60):g.tube('curved tambour track',[(x,.35*cos(i*pi/2/32)-.20,.80+.35*sin(i*pi/2/32)) for i in range(33)],.025,'wood')
  g.box('hutch back',(0,-.30,.97),(1.20,.03,.44))
  for i in range(15):
   a=.12+i*1.36/14;y=.35*cos(a)-.20;z=.80+.35*sin(a);o=g.box('rolling tambour slat',(0,y,z),(1.15,.025,.034));o.rotation_euler.x=a
  for x in (-.25,.25):g.box('pigeonhole partition',(x,-.17,.90),(.025,.24,.27))
  g.box('pigeonhole shelf',(0,-.17,.94),(1.15,.24,.025))
 elif f=='compass-desk':
  g.box('desktop',(0,0,.7275),(1.40,.70,.045))
  for x in (-.52,.52):
   for s in (-1,1):
    y=s*.28;verts=[(x+xx,yy,zz) for xx in (-.035,.035) for yy,zz in ((y-.055,0),(y+.055,0),(s*.12+.04,.71),(s*.12-.04,.71))]
    g.mesh('tapered compass plank',verts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'wood')
  g.box('under-top spine',(0,0,.68),(1.12,.08,.07),'metal')
 elif f=='wave-bookcase':
  for x in (-.63,0,.63):g.rod('shelf mast',(x,-.11,0),(x,-.11,1.68),.025,'wood')
  for j in range(5):
   profile=[(-.70+i*1.4/48,.14+j*.32+.05*sin(i*2*pi/48+j*pi)) for i in range(49)];ribbon('continuous wave shelf',profile,.30,.027)
 elif f=='ribbon-s-bookcase':
  profile=smooth_profile([(-.48,.02),(.32,.02),(.48,.17),(.32,.40),(-.32,.40),(-.48,.60),(-.30,.83),(.30,.83),(.48,1.05),(.30,1.30),(-.42,1.30)],10);ribbon('continuous S shelf',profile,.32,.035)
 elif f=='cylinder-tambour-cabinet':
  g.cylinder('recessed round plinth',(0,0,.04),.31,.08,'dark');g.cylinder('bottom',(0,0,.10),.39,.04);g.cylinder('top',(0,0,.76),.41,.04)
  for z in (.30,.53):g.cylinder('interior round shelf',(0,0,z),.365,.025)
  for i in range(38):
   a=pi/2+.72+i*(2*pi-1.44)/37;g.rod('curved tambour stave',(.385*cos(a),.385*sin(a),.12),(.385*cos(a),.385*sin(a),.735),.014,'wood')
  g.handle(0,.42,.45,.12,True)
 elif f=='ovoid-open-nightstand':
  profile=[(.18,.08),(.29,.20),(.31,.34),(.28,.49),(.18,.58)];arc=2*pi-1.25;verts=[];N=40
  for r,z in profile:
   for i in range(N+1):a=pi/2+.625+i*arc/N;verts.append((r*cos(a),r*sin(a),z))
  o=g.mesh('ovoid open shell',verts,[(j*(N+1)+i,j*(N+1)+i+1,(j+1)*(N+1)+i+1,(j+1)*(N+1)+i) for j in range(len(profile)-1) for i in range(N)],'wood',True);bpy.context.view_layer.objects.active=o;m=o.modifiers.new('bent shell thickness','SOLIDIFY');m.thickness=.025;bpy.ops.object.modifier_apply(modifier=m.name)
  g.slab('oval internal shelf',(0,-.015,.29),.56,.56,.025,'oval');g.slab('oval bottom',(0,0,.085),.38,.38,.025,'round')
  for i in range(3):a=i*2*pi/3;g.rod('pod foot',(.14*cos(a),.14*sin(a),0),(.14*cos(a),.14*sin(a),.09),.022,'wood')
 else:return build_second_half(p)

def build_second_half(p):
 f=p['form']
 if f=='tilting-shoe-cabinet':
  w,d,h=.85,.27,1.12;g.cases({'w':w,'d':d,'h':h,'form':'open','rows':3,'base':'plinth','baseHeight':.06})
  for z in (.25,.58,.91):
   before=set(bpy.context.scene.objects);hinge=z-.14;y=d/2+.025
   g.box('tilt bin front',(0,y,z),(w-.06,.025,.28));g.handle(0,y+.035,z+.09,.14)
   g.box('tilt bin bottom',(0,y-.10,hinge+.018),(w-.09,.22,.025))
   for x in (-w*.43,w*.43):g.mesh('triangular bin cheek',[(x,y,hinge),(x,y-.22,hinge+.02),(x,y-.22,hinge+.22),(x,y,hinge+.28)],[(0,1,2,3)],'wood')
   rotate_parts(set(bpy.context.scene.objects)-before,(0,y,hinge),'X',-.35)
  return {'modelState':'tilt bins partly open; measured bounds include them','nominalClosedDimensionsMetres':{'width':w,'depth':d,'height':h}}
 elif f=='corner-carousel':
  R=.86;cx=cy=-R/2;h=.9
  for z in (.035,h):sector('quarter-circle cabinet plate',0,R,0,pi/2,z,.05,'wood',offset=(cx,cy))
  g.box('corner cabinet back X',(cx,0,h/2),(.035,R,h));g.box('corner cabinet back Y',(0,cy,h/2),(R,.035,h))
  centre=(cx+.325,cy+.325)
  g.cylinder('carousel mast',(centre[0],centre[1],h/2),.020,h,'metal')
  for z in (.20,.49,.77):g.cylinder('rotating shelf',(centre[0],centre[1],z),.30,.025,'wood');g.ring('carousel retaining rail',(centre[0],centre[1],z+.055),.285,.285,.007,'metal')
  for start,end in ((0,.28),(pi/2-.28,pi/2)):
   for i in range(7):
    a=start+(end-start)*i/6;g.rod('curved side closure',(cx+R*cos(a),cy+R*sin(a),.08),(cx+R*cos(a),cy+R*sin(a),.86),.018,'wood')
 elif f=='curved-breakfast-counter':
  sector('curved breakfast top',.65,1.10,0,pi,.94,.055,'stone',offset=(0,-.35))
  for a in (.28,pi/2,pi-.28):g.cylinder('bar support',( .84*cos(a),.84*sin(a)-.35,.46),.10,.92,'wood')
  for i in range(25):
   a=.10+i*(pi-.20)/24;g.rod('curved apron stave',(.84*cos(a),.84*sin(a)-.35,.18),(.84*cos(a),.84*sin(a)-.35,.90),.015,'wood')
 elif f=='bakers-bin-hutch':
  w,d=1.2,.60;g.cases({'w':w,'d':d,'h':.90,'form':'grid','rows':1,'cols':3,'base':'plinth'})
  g.box('thick worktop',(0,0,.91),(w+.05,d+.04,.08))
  for i in range(3):
   x=(i-1)*.39;before=set(bpy.context.scene.objects);g.box('ingredient bin front',(x,.31,.46),(.36,.025,.56));g.handle(x,.345,.65,.10);g.box('ingredient bin bottom',(x,.18,.20),(.33,.25,.025));rotate_parts(set(bpy.context.scene.objects)-before,(x,.31,.18),'X',-.19)
  for x in (-.58,.58):g.box('hutch upright',(x,-.16,1.27),(.035,.30,.72))
  for z in (1.18,1.58):g.box('hutch shelf',(0,-.16,z),(1.20,.30,.025))
  g.box('hutch back',(0,-.30,1.27),(1.20,.025,.72))
 elif f=='arched-reading-nook':
  for x in (-.65,.65):
   before=set(bpy.context.scene.objects);g.cases({'w':.25,'d':.50,'h':1.0,'form':'open','rows':3,'base':'plinth','baseHeight':.03})
   for o in set(bpy.context.scene.objects)-before:o.location.x+=x
  g.box('shared back',(0,-.26,.55),(1.55,.03,1.10));g.box('reading bench',(0,0,.23),(1.04,.50,.46));g.cushion('reading pad',(0,0,.50),(1.04,.50,.10),'fabric')
  # Elliptical arch ribbon, extruded through the full nook depth.
  verts=[];N=48
  for y in (-.275,.275):
   for outer in (False,True):
    rx=.75+(.05 if outer else 0);rz=.55+(.05 if outer else 0)
    verts.extend([(rx*cos(i*pi/N),y,.90+rz*sin(i*pi/N)) for i in range(N+1)])
  k=N+1;faces=[]
  for i in range(N):faces.extend([(i,i+1,k+i+1,k+i),(2*k+i,3*k+i,3*k+i+1,2*k+i+1),(i,2*k+i,2*k+i+1,i+1),(k+i,k+i+1,3*k+i+1,3*k+i)])
  g.mesh('reading arch canopy',verts,faces,'wood')
 elif f=='integrated-play-table':
  g.cylinder('table foot',(0,0,.025),.28,.05,'metal');g.cylinder('centre mast',(0,0,.27),.07,.50,'wood');g.cylinder('round play top',(0,0,.55),.475,.045,'wood')
  for i in range(4):
   a0=i*pi/2+.16;a1=(i+1)*pi/2-.16;sector('integrated wedge seat base',.15,.43,a0,a1,.16,.25,'wood');sector('wedge cushion',.16,.44,a0,a1,.325,.08,'fabric')
   a=(a0+a1)/2;g.rod('fixed seat outrigger',(0,0,.12),(.30*cos(a),.30*sin(a),.12),.020,'metal')
 elif f=='library-book-cart':
  w,d,h=1.0,.50,1.15
  for y in (-.24,.24):g.rod('base longitudinal rail',(-.44,y,.08),(.44,y,.08),.018,'metal')
  for x in (-.44,.44):g.rod('base cross rail',(x,-.24,.08),(x,.24,.08),.018,'metal')
  for x in (-.46,.46):
   g.rod('end upright',(x,0,.07),(x,0,h),.022,'metal');g.tube('push handle',[(x,-.20,1.0),(x,-.20,h),(x,.20,h),(x,.20,1.0)],.018,'metal')
  for x in (-.44,.44):
   for y in (-.24,.24):g.ellipsoid('caster',(x,y,.035),(.075,.055,.07),'dark')
  for z in (.45,.86):
   for s in (-1,1):
    o=g.mesh('inclined book tray',[(-.45,0,z+.10),(.45,0,z+.10),(.45,s*.25,z-.06),(-.45,s*.25,z-.06)],[(0,1,2,3)],'wood');bpy.context.view_layer.objects.active=o;m=o.modifiers.new('tray thickness','SOLIDIFY');m.thickness=.025;bpy.ops.object.modifier_apply(modifier=m.name)
    g.rod('retaining ledge',(-.46,s*.25,z-.035),(.46,s*.25,z-.035),.016,'wood')
 elif f=='classroom-coat-station':
  w=1.5;g.cases({'w':w,'d':.40,'h':.34,'form':'grid','rows':1,'cols':3,'base':'plinth','baseHeight':.03});g.box('bench seat',(0,0,.365),(w,.42,.05))
  g.box('full-height back',(0,-.19,.85),(w,.025,1.0))
  for x in (-.75,-.25,.25,.75):g.box('upper bay partition',(x,-.01,.865),(.025,.36,.95))
  g.box('shared upper shelf',(0,-.01,1.35),(w,.36,.035))
  for x in (-.50,0,.50):g.tube('school coat hook',[(x,-.17,1.04),(x,-.07,1.04),(x,-.04,1.12)],.009,'metal')
 elif f=='extension-dining-table':
  for x,ww in ((-.55,.80),(0,.28),(.55,.80)):
   o=g.box('separate extension leaf',(x,0,.73),(ww,.85,.04));o['grainAxis']=0
  for x in (-.78,.78):
   for y in (-.32,.32):g.rod('support leg',(x,y,0),(x,y,.715),.028,'wood')
  for y in (-.27,.27):
   g.box('apron',(0,y,.67),(1.65,.045,.09));g.box('extension outer rail',(0,y,.688),(1.25,.035,.035),'metal');g.box('sliding inner rail',(0,y,.709),(.95,.023,.023),'metal')
 elif f=='ribbon-console':
  profile=smooth_profile([(-.20,.02),(.14,.02),(.20,.13),(-.13,.33),(-.20,.52),(.13,.79)],15);ribbon('continuous bent console',profile,.92,.035,plane='YZ');g.box('console top',(0,0,.79),(1.10,.42,.045))
 elif f=='stone-bridge-coffee':
  w,d,h=1.10,.55,.43;outline=[(-w/2,0),(-w/2,h),(w/2,h),(w/2,0),(.32,0)]+[(.32*cos(i*pi/40),.30*sin(i*pi/40)) for i in range(1,41)]
  vertices=[(x,y,z) for y in (-d/2,d/2) for x,z in outline];n=len(outline)
  g.mesh('monolithic arched bridge',vertices,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],'stone')
 elif f=='twisted-root-coffee':
  g.slab('oval timber top',(0,0,.405),.95,.70,.055,'oval')
  for i in range(3):
   a=i*2*pi/3;start=(.30*cos(a),.25*sin(a),.015);end=(.22*cos(a+1.1),.18*sin(a+1.1),.38)
   g.tube('laminated curved root',bezier(start,(.20*cos(a+.3),.18*sin(a+.3),.10),(.03*cos(a+.8),.03*sin(a+.8),.26),end,26),.045,'wood')
 elif f=='double-sided-booth':
  g.box('shared booth plinth',(0,0,.175),(1.60,1.25,.35),'wood',.025)
  for y in (-.36,.36):g.cushion('opposite booth seat',(0,y,.43),(1.60,.55,.16),'fabric')
  g.cushion('shared padded back',(0,0,.75),(1.60,.18,.70),'fabric')
 else:raise ValueError('Unknown original signature design: '+f)
