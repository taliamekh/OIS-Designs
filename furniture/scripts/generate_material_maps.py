"""Original deterministic, tileable 256px phone material maps; no external imagery."""
from pathlib import Path
import numpy as np,json,hashlib
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'materials/v1';OUT.mkdir(parents=True,exist_ok=True)
N=256;rng=np.random.default_rng(2409);y,x=np.mgrid[:N,:N]/N
def save(name,a,mode='RGB'):
 a=np.clip(a,0,1);a=(a*255+.5).astype('uint8');Image.fromarray(a,mode).save(OUT/name,optimize=True)
def normal(height,strength):
 dx=(np.roll(height,-1,1)-np.roll(height,1,1))*strength;dy=(np.roll(height,-1,0)-np.roll(height,1,0))*strength
 n=np.dstack((-dx,-dy,np.ones_like(dx)));n/=np.linalg.norm(n,axis=2,keepdims=True);return n*.5+.5
# Periodic Fourier components produce seamless grain with variable growth-line width.
warp=.006*np.sin(2*np.pi*y*3)+.008*np.sin(2*np.pi*y*7+.8*np.sin(2*np.pi*x*2))
grain=.52+.13*np.sin(2*np.pi*(x*29+warp*30))+.055*np.sin(2*np.pi*(x*77+warp*65))+.025*np.sin(2*np.pi*(x*143+y*3))
grain+=.025*np.sin(2*np.pi*y*4+np.sin(2*np.pi*x*7))
pores=np.maximum(0,np.sin(2*np.pi*(x*97+warp*80)))**16*(.6+.4*np.sin(2*np.pi*y*19))
wood=np.clip(.86+(grain-.52)*.32-pores*.035,.65,1)
save('wood-neutral-base.png',np.repeat(wood[:,:,None],3,2));save('wood-normal.png',normal(grain,1.7));save('wood-roughness.png',.48+.12*grain,'L')
# Woven fabric: crossing warp/weft ridges, with alternating over/under shading.
freq=64;u=(x*freq)%1;v=(y*freq)%1;warp=np.sin(np.pi*u)**1.6;weft=np.sin(np.pi*v)**1.6
over=((np.floor(x*freq)+np.floor(y*freq))%2);height=np.where(over==0,warp*.65+weft*.35,warp*.35+weft*.65)
fabric=.83+.12*height+.015*np.sin(2*np.pi*(x*181+y*173))
save('fabric-neutral-base.png',np.repeat(fabric[:,:,None],3,2));save('fabric-normal.png',normal(height,.60));save('fabric-roughness.png',.86+.08*(1-height),'L')
# Linen has thicker, less regular yarn spacing than the upholstery cloth.
u=(x*43+.055*np.sin(2*np.pi*y*9))%1;v=(y*41+.045*np.sin(2*np.pi*x*7))%1
linenheight=.5*(np.sin(np.pi*u)**1.5+np.sin(np.pi*v)**1.5);linen=.82+.14*linenheight
save('linen-neutral-base.png',np.repeat(linen[:,:,None],3,2));save('linen-normal.png',normal(linenheight,.70));save('linen-roughness.png',.88+.07*(1-linenheight),'L')
rows=[]
for p in OUT.glob('*.png'):rows.append({'file':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'dimensions':[N,N],'provenance':'original periodic analytic texture; scripts/generate_material_maps.py','licence':'LicenseRef-OIS-Original-Project'})
(OUT/'manifest.json').write_text(json.dumps({'version':1,'maps':rows,'uvRepeatMetres':{'wood':[.16,.75],'fabric':[.14,.14],'linen':[.12,.12]},'normalConvention':'tangent-space OpenGL +Y green, strength applied in material'},indent=2));print('Generated',len(rows),'original maps;',sum(a['bytes'] for a in rows),'bytes')
