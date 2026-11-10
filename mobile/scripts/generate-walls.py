"""Original wall-covering PBR maps; positive PNG-row dY matches TextureLoader flipY.
The companion generate-floors.py owns all floor maps. No third-party image inputs.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
root=Path(__file__).resolve().parents[1];dest=root/'assets'/'materials';dest.mkdir(parents=True,exist_ok=True)
n=512;y,x=np.mgrid[0:n,0:n]/n
rng=np.random.default_rng(1024)
noise=rng.random((n,n))-.5
cloud=np.sin(x*2*np.pi*3+np.sin(y*2*np.pi*2))*.45+np.cos(y*2*np.pi*4+x*2*np.pi)*.3+np.sin((x+y)*2*np.pi*7)*.12
floors=[('white-oak','White oak planks',.65),('walnut','Walnut planks',.48),('maple','Maple planks',.55),('herringbone','Oak herringbone',.62),('bamboo','Bamboo',.52),('slate','Slate tile',.86),('marble','Marble tile',.22),('terrazzo','Terrazzo',.53),('concrete','Concrete',.75),('carpet','Wool carpet',.98)]
walls=[('plaster','Mineral plaster',(235,229,217),.96,2),('limewash','Limewash',(232,222,202),.98,2),('microcement','Microcement',(182,181,174),.72,2),('brick','Exposed brick',(169,103,76),.9,1),('slats','Timber slats',(177,145,101),.65,1),('panelling','Painted wall panelling',(223,221,212),.65,1),('wallpaper','Linen wallpaper',(221,216,200),.93,2),('tile','Ceramic tile',(219,224,218),.23,1),('stone','Stone veneer',(150,145,132),.87,2)]
entries=[]
for ident,label,rough in floors:
    entries.append((ident,label,rough,2))
for ident,label,base,rough,repeat in walls:
    brightness=1+noise*.012;height=cloud*.00012+noise*.00002
    if ident in ['plaster','limewash','microcement','stone']:
        strength={'plaster':.05,'limewash':.12,'microcement':.03,'stone':.1}[ident]
        brightness+=cloud*strength;height=cloud*({'stone':.0008,'plaster':.0003,'limewash':.0001,'microcement':.00006}[ident])+noise*.00002
    elif ident=='brick':
        row=np.floor(y*8);u=np.mod(x*4+(row%2)*.5,1);v=np.mod(y*8,1)
        bevel=np.minimum(np.minimum(u,1-u)*20,np.minimum(v,1-v)*12);face=np.clip(bevel,0,1)
        height=face*.003+noise*.0001;brightness+=np.sin(row*13+np.floor(x*4))*.09-(1-face)*.3
    elif ident in ['slats','panelling']:
        bands=16 if ident=='slats' else 4;u=np.mod(x*bands,1)
        face=np.clip(np.minimum(u,1-u)*18,0,1);height=face*(.012 if ident=='slats' else .003)
        brightness-=(1-face)*.55
        if ident=='slats':brightness+=np.sin(y*2*np.pi*30+x*2*np.pi)*.025
    elif ident=='wallpaper':
        fibre=np.sin(x*2*np.pi*128)*np.cos(y*2*np.pi*128);height=fibre*.00005+noise*.000015;brightness+=fibre*.015
    elif ident=='tile':
        u=np.mod(x*4,1);v=np.mod(y*4,1);face=np.clip(np.minimum(np.minimum(u,1-u),np.minimum(v,1-v))*55,0,1)
        height=face*.0015;brightness-=(1-face)*.2
    colour=np.clip(np.array(base)[None,None,:]*brightness[:,:,None],0,255).astype('uint8')
    pixel=repeat/n;dx=(np.roll(height,-1,1)-np.roll(height,1,1))/(2*pixel);dy=(np.roll(height,-1,0)-np.roll(height,1,0))/(2*pixel)
    normal=np.stack((-dx,dy,np.ones_like(height)),axis=-1);normal/=np.linalg.norm(normal,axis=-1)[:,:,None]
    Image.fromarray(colour).save(dest/(ident+'-colour.png'))
    Image.fromarray(np.uint8(np.rint(np.clip((normal*.5+.5)*255,0,255)))).save(dest/(ident+'-normal.png'))
    Image.fromarray(np.uint8(np.clip(rough*255+noise*3,0,255))).save(dest/(ident+'-rough.png'))
    entries.append((ident,label,rough,repeat))
rows=[f"'{i}':{{id:'{i}',name:'{label}',roughness:{rough},repeat:{repeat},colour:require('../../assets/materials/{i}-colour.png'),normal:require('../../assets/materials/{i}-normal.png'),rough:require('../../assets/materials/{i}-rough.png')}}" for i,label,rough,repeat in entries]
text="// Original procedural maps. Rebuild with scripts/generate-materials.py.\nexport const materialMaps:Record<string,{id:string;name:string;roughness:number;repeat:number;colour:number;normal:number;rough:number}>={\n"+',\n'.join(rows)+"\n};\nexport const floorIds="+repr([r[0] for r in floors])+";\nexport const wallIds=['paint',"+','.join(repr(r[0]) for r in walls)+"];\n"
(root/'src'/'scene'/'materials.ts').write_text(text)
print('Generated9 wall PBR sets and19 material registrations')
