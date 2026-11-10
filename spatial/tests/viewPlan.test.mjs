import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createScenePlan,canonicalFloorOffset,floorToWorld,worldToFloor,itemWorldBounds,boundsCorners} from '../dist/viewPlan.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/six-room-house.json',import.meta.url)));
const project=fixture.project;
const assets=new Map(fixture.assets.map(a=>[`${a.id}|${a.version}|${a.sha256}`,a]));
const resolve=i=>assets.get(`${i.assetId}|${i.assetVersion}|${i.assetHash}`);
const request=(patch={})=>({activeFloorId:'ground',scope:{kind:'house'},mode:'3d',shell:'cutaway',camera:{x:18,y:12,z:15},...patch});
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const clone=x=>JSON.parse(JSON.stringify(x));
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
freeze(project);

test('six-room/forty distinct exact-revision fixture and two independent alignment anchors',()=>{
  assert.equal(project.floors.flatMap(f=>f.rooms).length,6);
  assert.equal(project.floors.flatMap(f=>f.items).length,40);
  assert.equal(assets.size,40);
  for(const anchor of fixture.knownSharedAnchors){
    for(const id of ['ground','upper']){
      const f=project.floors.find(f=>f.id===id),p=floorToWorld({...anchor[id],y:0},canonicalFloorOffset(f));
      near(p.x,anchor.world.x);near(p.z,anchor.world.z);near(p.y,f.elevation);
    }
  }
});
test('all scopes preserve every canonical project byte, locks and saved asset identity',()=>{
  const before=JSON.stringify(project);
  for(const scope of [{kind:'house'},{kind:'floor'},{kind:'room',roomId:'living'}])
    for(const shell of ['solid','cutaway'])
      for(const gap of [0,2.8]) createScenePlan(project,resolve,request({scope,shell,separatedFloorGap:gap}));
  assert.equal(JSON.stringify(project),before);
});
test('separated house is visual-only and read-only; canonical bounds stay exact',()=>{
  const normal=createScenePlan(project,resolve,request()),separated=createScenePlan(project,resolve,request({separatedFloorGap:2.8}));
  assert.deepEqual(separated.canonicalBounds,normal.canonicalBounds);
  assert.equal(separated.canEdit,false);assert.equal(separated.readOnlyReason,'house-overview');
  const upper=separated.floors.find(f=>f.id==='upper');near(upper.canonicalOffset.y,3.15);near(upper.displayOffset.y,5.95);
  near(separated.displayBounds.max.y,normal.displayBounds.max.y+2.8);
});
test('floor order, not input array order, determines presentation offsets',()=>{
  const p={floors:[...project.floors].reverse()};
  assert.deepEqual(createScenePlan(p,resolve,request({separatedFloorGap:3})),createScenePlan(project,resolve,request({separatedFloorGap:3})));
});
test('floor isolation and room focus limit geometry to their own scope',()=>{
  const floor=createScenePlan(project,resolve,request({activeFloorId:'upper',scope:{kind:'floor'}}));
  assert.equal(floor.floors.length,1);assert.equal(floor.floors[0].roomIds.length,3);assert.equal(floor.canEdit,true);near(floor.displayBounds.max.y,6.05);
  const room=createScenePlan(project,resolve,request({scope:{kind:'room',roomId:'living'}}));
  assert.deepEqual(room.floors[0].roomIds,['living']);assert.equal(room.floors[0].itemIds.length,8);
});
test('low-room framing includes a taller shared physical wall without changing its own ceiling',()=>{
  const room=createScenePlan(project,resolve,request({scope:{kind:'room',roomId:'kitchen'}}));
  near(room.displayBounds.max.y,2.72);
  assert.equal(project.floors[0].rooms.find(r=>r.id==='kitchen').ceiling,2.55);
  const bath=createScenePlan(project,resolve,request({activeFloorId:'upper',scope:{kind:'room',roomId:'bathroom'}}));
  near(bath.displayBounds.max.y,6.05);
});
test('physical shared partitions remain visible while near exterior boundaries cut away',()=>{
  const plan=createScenePlan(project,resolve,request());
  for(const f of plan.floors){
    const source=project.floors.find(x=>x.id===f.id);
    for(const wall of f.walls){
      const w=source.walls.find(x=>x.id===wall.id);
      if(w.faces.length===2){assert.equal(wall.visible,true);assert.equal(wall.reason,'interior-partition')}
    }
    assert.ok(f.walls.some(w=>!w.visible));assert.ok(f.walls.some(w=>w.visible));
    assert.equal(new Set(f.walls.map(w=>w.id)).size,f.walls.length);
  }
});
test('room-only boundary may cut shared wall whose adjoining room is out of scope',()=>{
  const f=project.floors[0],wall=f.walls.find(w=>w.faces.some(x=>x.roomId==='living')&&w.faces.some(x=>x.roomId==='kitchen'));
  const plan=createScenePlan(project,resolve,request({scope:{kind:'room',roomId:'living'},camera:{x:15,y:3,z:1}}));
  const result=plan.floors[0].walls.find(w=>w.id===wall.id);assert.equal(result.visible,false);assert.equal(result.reason,'near-boundary');
});
test('selection/paint can force one scoped wall; identical wall IDs on other floors stay independent',()=>{
  const initial=createScenePlan(project,resolve,request());
  const hidden=initial.floors[0].walls.find(w=>!w.visible);
  const next=createScenePlan(project,resolve,request({forceVisibleWallKeys:[hidden.key]}));
  assert.equal(next.floors[0].walls.find(w=>w.key===hidden.key).reason,'forced');
  assert.deepEqual(next.floors[1],initial.floors[1]);
});
test('camera at wall plane preserves last visibility and avoids orbit flicker',()=>{
  const f=project.floors[0],wall=f.walls[0],key=`${f.id}:${wall.id}`;
  const camera={x:f.alignment.x+(wall.a.x+wall.b.x)/2,y:4,z:f.alignment.z+(wall.a.z+wall.b.z)/2};
  const r=createScenePlan(project,resolve,request({camera,previousWallVisibility:{[key]:false}})).floors[0].walls.find(w=>w.key===key);
  assert.equal(r.visible,false);assert.equal(r.reason,'hysteresis');
});
test('Walk always shows connected active-floor walls and ceilings and never allows editing',()=>{
  const plan=createScenePlan(project,resolve,request({activeFloorId:'upper',mode:'walk',hiddenFloorIds:['upper'],separatedFloorGap:3,showCeilings:false}));
  assert.equal(plan.floors.length,1);assert.equal(plan.floors[0].id,'upper');assert.equal(plan.floors[0].roomIds.length,3);
  assert.ok(plan.floors[0].walls.every(w=>w.visible));assert.equal(plan.floors[0].ceilingsVisible,true);assert.equal(plan.canEdit,false);assert.equal(plan.readOnlyReason,'walk');near(plan.floors[0].presentationOffsetY,0);
});
test('all hidden floors return explicit empty bounds, never Infinity or stale selection',()=>{
  const plan=createScenePlan(project,resolve,request({hiddenFloorIds:['ground','upper'],selectedItemId:'item-1'}));
  assert.deepEqual(plan.floors,[]);assert.equal(plan.displayBounds,null);assert.equal(plan.canonicalBounds,null);assert.equal(plan.selectedItemBounds,null);assert.equal(plan.canEdit,false);
});
test('conservative asymmetric local-AABB rotation has independently known coordinates and vertical origin',()=>{
  const item={id:'test',assetId:'asymmetric',assetVersion:'1',assetHash:'hash',x:3,z:5,yaw:Math.PI/2,roomId:'r',locked:false,elevation:.7};
  const asset={id:'asymmetric',version:'1',sha256:'hash',bounds:{min:[-1,0,-.2],max:[2,1,.8]}};
  const offset={x:4,y:-2,z:-7},b=itemWorldBounds(item,asset,offset);
  near(b.min.x,6.8);near(b.max.x,7.8);near(b.min.z,-4);near(b.max.z,-1);near(b.min.y,-1.3);near(b.max.y,-.3);
  const p={x:-8.1,y:2.7,z:0};assert.deepEqual(worldToFloor(floorToWorld(p,offset),offset),p);
});
test('rotated local AABB encloses true mesh vertices and is explicitly not a tight mesh bound',()=>{
  const item={id:'triangle',assetId:'triangle',assetVersion:'1',assetHash:'hash',x:0,z:0,yaw:Math.PI/4,roomId:'r',locked:false};
  const asset={id:'triangle',version:'1',sha256:'hash',bounds:{min:[-1,0,0],max:[1,1,1]}};
  const b=itemWorldBounds(item,asset,{x:0,y:0,z:0});
  const mesh=[[-1,0,0],[1,0,0],[0,1,1]].map(([x,y,z])=>({x:(x+z)/Math.sqrt(2),y,z:(z-x)/Math.sqrt(2)}));
  for(const p of mesh)for(const k of ['x','y','z'])assert.ok(p[k]>=b.min[k]-1e-6&&p[k]<=b.max[k]+1e-6);
  assert.ok(b.max.x-Math.max(...mesh.map(p=>p.x))>.7);
});
test('polygon winding and corresponding explicit wall-face orientation do not change world visibility',()=>{
  const reversed=clone(project);
  for(const f of reversed.floors){
    for(const r of f.rooms)r.polygon.reverse();
    for(const w of f.walls){[w.a,w.b]=[w.b,w.a];for(const face of w.faces)face.reversed=!face.reversed}
  }
  for(const camera of [{x:18,y:10,z:15},{x:-8,y:3,z:-12}]){
    const a=createScenePlan(project,resolve,request({camera})),b=createScenePlan(reversed,resolve,request({camera}));
    assert.deepEqual(a,b);
  }
});
test('hidden active floor cannot be edited while another house floor remains displayed',()=>{
  const p=createScenePlan(project,resolve,request({hiddenFloorIds:['ground']}));
  assert.deepEqual(p.floors.map(f=>f.id),['upper']);assert.equal(p.canEdit,false);
  const f=createScenePlan(project,resolve,request({scope:{kind:'floor'},hiddenFloorIds:['ground']}));
  assert.equal(f.readOnlyReason,'active-floor-hidden');assert.equal(f.displayBounds,null);
});
test('tall or offset furniture expands view bounds; selection bounds use displayed floor',()=>{
  const p=clone(project),f=p.floors[1],i=f.items[0];i.elevation=3;
  const plan=createScenePlan(p,resolve,request({separatedFloorGap:2,selectedItemId:i.id}));
  assert.ok(plan.canonicalBounds.max.y>6.05);near(plan.selectedItemBounds.min.y,8.15);
});
test('missing saved model is reported and wrong-version substitution is rejected',()=>{
  const plan=createScenePlan(project,()=>undefined,request());assert.equal(plan.warnings.length,40);
  assert.throws(()=>createScenePlan(project,i=>({...resolve(i),version:'wrong'}),request()),/Exact saved asset/);
});
test('invalid scope and non-finite inputs fail explicitly without modifying project',()=>{
  assert.throws(()=>createScenePlan(project,resolve,request({activeFloorId:'missing'})),/Active floor/);
  assert.throws(()=>createScenePlan(project,resolve,request({scope:{kind:'room',roomId:'missing'}})),/Active room/);
  assert.throws(()=>createScenePlan(project,resolve,request({camera:{x:NaN,y:0,z:0}})),/finite/);
  assert.throws(()=>createScenePlan(project,resolve,request({separatedFloorGap:Infinity})),/separation/);
  assert.throws(()=>createScenePlan(project,resolve,request({separatedFloorGap:-1})),/separation/);
});
