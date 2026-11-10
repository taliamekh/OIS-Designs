const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const {load,mobile}=require('./probe-domain.cjs'),THREE=createRequire(path.join(mobile,'package.json'))('three');
const g=load('src/domain/geometry.ts'),p=load('src/domain/project.ts'),t=load('src/domain/types.ts'),m=load('src/scene/meshes.ts');
const checks=[],check=(id,pass,observed)=>checks.push({id,pass:!!pass,observed});
function stats(geometry){
 const pos=geometry.attributes.position,idx=geometry.index?.array??Array.from({length:pos.count},(_,i)=>i),edges=new Map();let volume=0,surfaceArea=0;
 for(let n=0;n<idx.length;n+=3){const a=new THREE.Vector3().fromBufferAttribute(pos,idx[n]),b=new THREE.Vector3().fromBufferAttribute(pos,idx[n+1]),c=new THREE.Vector3().fromBufferAttribute(pos,idx[n+2]);volume+=a.dot(b.clone().cross(c))/6;surfaceArea+=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;for(const [x,y]of[[idx[n],idx[n+1]],[idx[n+1],idx[n+2]],[idx[n+2],idx[n]]]){const key=Math.min(x,y)+':'+Math.max(x,y),value=edges.get(key)??{count:0,direction:0};value.count++;value.direction+=x<y?1:-1;edges.set(key,value);}}
 return{vertices:pos.count,triangles:idx.length/3,volume,surfaceArea,nonManifoldEdges:[...edges].filter(([,v])=>v.count!==2).length,inconsistentWindingEdges:[...edges].filter(([,v])=>v.direction!==0).length,allFinite:[...pos.array,...geometry.attributes.normal.array].every(Number.isFinite)};
}
for(const profile of['flat','bevel','ogee','stepped']){
 const trim={...t.defaultTrim,profile},geometry=m.trimGeometry(trim,2),info=stats(geometry),mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()),ray=new THREE.Raycaster(new THREE.Vector3(1,.025,1),new THREE.Vector3(0,0,-1));mesh.updateMatrixWorld();
 const hits=ray.intersectObject(mesh),firstZ=hits[0]?.point.z;
 check('trim-'+profile+'-manifold',info.nonManifoldEdges===0&&info.inconsistentWindingEdges===0,info);
 check('trim-'+profile+'-outward-front-face',info.volume>0&&Math.abs(firstZ-trim.projection)<1e-5,{signedVolume:info.volume,firstRayHitZ:firstZ,expectedFrontZ:trim.projection,hitDistances:hits.map(h=>h.distance)});
 geometry.dispose();mesh.material.dispose();
}
for(const [name,polygon]of[['rectangle',g.shapePolygon('rectangle',4,3)],['L',g.shapePolygon('l',6,6)],['U',[{x:0,z:0},{x:6,z:0},{x:6,z:6},{x:4,z:6},{x:4,z:2},{x:2,z:2},{x:2,z:6},{x:0,z:6}]]])for(const reverse of[false,true]){
 const points=reverse?[...polygon].reverse():polygon,geometry=m.floorGeometry({polygon:points}),info=stats(geometry),pos=geometry.attributes.position,uv=geometry.attributes.uv;
 check('floor-'+name+'-'+reverse+'-area',Math.abs(info.surfaceArea-Math.abs(g.area(points)))<1e-5,{area:info.surfaceArea,expected:Math.abs(g.area(points))});
 let worldUV=true,flat=true;for(let i=0;i<pos.count;i++){if(Math.abs(uv.getX(i)-pos.getX(i))>1e-5||Math.abs(uv.getY(i)+pos.getZ(i))>1e-5)worldUV=false;if(Math.abs(pos.getY(i))>1e-5)flat=false;}
 check('floor-'+name+'-'+reverse+'-metre-UV',worldUV&&flat);geometry.dispose();
}
for(const type of['single','double','sliding','open','window','pocket']){
 const project=p.makeProject('living',8,4),floor=project.floors[0],wall=floor.walls.find(w=>w.a.z===0&&w.b.z===0);wall.thickness=.2;
 const opening={id:'qa-opening',wallId:wall.id,type,offset:3,width:1,height:type==='window'?1.2:2.1,sill:type==='window'?.8:0,hinge:'left',flip:false};floor.openings=[opening];
 const pieces=m.wallPieces(wall,floor.openings,2.7),actual=pieces.reduce((sum,v)=>sum+(v.end-v.start)*(v.top-v.bottom),0),expected=8*2.7-opening.width*opening.height;
 check('wall-'+type+'-hole-area',Math.abs(actual-expected)<1e-6,{actual,expected});
 const intervals=m.trimIntervals(wall,floor);
 check('trim-'+type+'-clear-opening',opening.sill>0||intervals.every(([a,b])=>Math.min(b,opening.offset+opening.width)-Math.max(a,opening.offset)<=1e-6),intervals);
 if(type==='single')check('trim-terminates-at-visible-casing',intervals.every(([a,b])=>Math.min(b,opening.offset+opening.width+.0475)-Math.max(a,opening.offset-.0475)<=1e-6),{intervals,renderedJambOuterExtent:.0475,source:'Openings jamb centre -.025 / leafWidth+.025; jamb width .045 in RoomScene at this snapshot'});
}
const result={timestamp:new Date().toISOString(),evidence:'Actual Three geometry generation, topology/area/UV checks and FrontSide CPU ray intersections. Not native GPU proof.',sourceHashes:Object.fromEntries(['src/scene/meshes.ts','src/scene/RoomScene.tsx'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,f))).digest('hex')])),passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks};
fs.writeFileSync(path.join(__dirname,'mesh-audit.json'),JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify({...result,checks:checks.filter(c=>!c.pass)},null,2)+'\n');
