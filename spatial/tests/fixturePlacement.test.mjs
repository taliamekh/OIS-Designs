import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/six-room-house.json',import.meta.url)));
const project=fixture.project,assets=new Map(fixture.assets.map(a=>[a.id,a]));
function footprint(item){
 const b=assets.get(item.assetId).bounds,c=Math.cos(item.yaw),s=Math.sin(item.yaw);
 return [[b.min[0],b.min[2]],[b.max[0],b.min[2]],[b.max[0],b.max[2]],[b.min[0],b.max[2]]].map(([x,z])=>[item.x+c*x+s*z,item.z-s*x+c*z]);
}
function overlaps(a,b){
 for(const p of [a,b])for(let i=0;i<p.length;i++){
  const u=p[i],v=p[(i+1)%p.length],axis=[u[1]-v[1],v[0]-u[0]],pa=a.map(q=>q[0]*axis[0]+q[1]*axis[1]),pb=b.map(q=>q[0]*axis[0]+q[1]*axis[1]);
  if(Math.max(...pa)<=Math.min(...pb)+.001||Math.max(...pb)<=Math.min(...pa)+.001)return false;
 }return true;
}
function blocked(point,item,radius){
 const b=assets.get(item.assetId).bounds,c=Math.cos(item.yaw),s=Math.sin(item.yaw),dx=point.x-item.x,dz=point.z-item.z,x=c*dx-s*dz,z=s*dx+c*dz;
 return x>b.min[0]-radius&&x<b.max[0]+radius&&z>b.min[2]-radius&&z<b.max[2]+radius;
}
test('all forty authored placements resolve actual frozen library bytes and floor anchors',()=>{
 for(const f of project.floors)for(const i of f.items){
  const a=assets.get(i.assetId);assert.equal(a.version,i.assetVersion);assert.equal(a.sha256,i.assetHash);assert.equal(a.placement.anchor,'floor');
  const bytes=fs.readFileSync(new URL('../../furniture/'+a.file,import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),i.assetHash);
 }
});
test('fixture furniture stays inside authored wall faces and below its room ceiling',()=>{
 for(const f of project.floors)for(const i of f.items){
  const room=f.rooms.find(r=>r.id===i.roomId),points=room.polygon,minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minZ=Math.min(...points.map(p=>p.z)),maxZ=Math.max(...points.map(p=>p.z));
  for(const [x,z] of footprint(i)){assert.ok(x>=minX+.08&&x<=maxX-.08,i.id+' wall x');assert.ok(z>=minZ+.08&&z<=maxZ-.08,i.id+' wall z')}
  const a=assets.get(i.assetId);assert.ok(a.bounds.max[1]<= (room.ceiling??f.ceiling),i.id+' ceiling');
 }
});
test('no two conservative furniture cages overlap in an authored room',()=>{
 for(const f of project.floors)for(let n=0;n<f.items.length;n++)for(const b of f.items.slice(n+1)){
  const a=f.items[n];if(a.roomId===b.roomId)assert.equal(overlaps(footprint(a),footprint(b)),false,`${a.assetId} overlaps ${b.assetId}`);
 }
});
test('each shared doorway has a common free approach on both sides for a 20cm-radius viewer',()=>{
 const radius=.20,results=[];
 for(const f of project.floors)for(const o of f.openings){
  const w=f.walls.find(w=>w.id===o.wallId),dx=w.b.x-w.a.x,dz=w.b.z-w.a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,standOff=w.thickness/2+radius+.03;
  let clear=null;
  for(let n=0;n<=20;n++){
   const along=o.offset+radius+(o.width-2*radius)*n/20,center={x:w.a.x+ux*along,z:w.a.z+uz*along};
   const probes=w.faces.map(face=>{const sign=face.reversed?-1:1;return {roomId:face.roomId,x:center.x-uz*sign*standOff,z:center.z+ux*sign*standOff}});
   if(probes.every(p=>!f.items.some(i=>i.roomId===p.roomId&&blocked(p,i,radius)))){clear=probes;break}
  }
  assert.ok(clear,'Blocked approach '+o.id);results.push({id:o.id,clear});
 }
 assert.equal(results.length,5);
 // A free doorway approach is not an entire navigation/pathfinding or stair-traversal proof.
});
