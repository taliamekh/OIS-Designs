import test from 'node:test';
import assert from 'node:assert/strict';
import {authoredItemSurface,proposeSupportPlacement,attachedPose,coversFootprint,containsPoint} from '../dist/supportPlacement.js';
const rect=(x0,z0,x1,z1)=>[{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}];
const desk={id:'desk-asset',version:'1',sha256:'desk-hash',bounds:{min:[-1,0,-.5],max:[1,.8,.5]}};
const lamp={id:'lamp-asset',version:'2',sha256:'lamp-hash',bounds:{min:[-.1,0,-.1],max:[.1,.4,.1]}};
const owner={id:'desk',roomId:'office',assetId:desk.id,assetVersion:desk.version,assetHash:desk.sha256,x:2,z:3,yaw:Math.PI/2,locked:true};
const item={id:'lamp',roomId:'office',assetId:lamp.id,assetVersion:lamp.version,assetHash:lamp.sha256,x:0,z:0,yaw:0,locked:false};
const surface=authoredItemSurface(owner,desk,'upper',{id:'desk-top',height:.8,boundary:rect(-.9,-.4,.9,.4)});
const request=(patch={})=>({item,asset:lamp,surface,canonicalFloorOffset:{x:4,y:-2,z:-5},activeFloorId:'upper',activeRoomId:'office',ray:{origin:{x:6,y:5,z:-2},direction:{x:0,y:-2,z:0}},grabOffset:{x:0,z:0},roomCeiling:2.7,canEdit:true,mode:'3d',items:[owner,item],obstacles:[{item:owner,asset:desk}],...patch});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('known transformed support hit preserves grab offset and floor-relative height',()=>{
 const p=proposeSupportPlacement(request({grabOffset:{x:.2,z:-.1}}));assert.equal(p.status,'valid-proposal');
 near(p.localHit.x,2);near(p.localHit.z,3);near(p.pose.x,2.2);near(p.pose.z,2.9);near(p.pose.elevation,.8);near(p.pose.elevation-2,-1.2);
});
test('legacy zero-height floor proposal uses canonical floor and no attachment',()=>{
 const f={id:'floor',floorId:'upper',roomId:'office',height:0,boundary:rect(-5,-5,5,5),source:{kind:'floor'}};
 const p=proposeSupportPlacement(request({surface:f,ray:{origin:{x:2,y:3,z:-7},direction:{x:0,y:-1,z:0}}}));assert.equal(p.status,'valid-proposal');near(p.pose.x,-2);near(p.pose.z,-2);assert.equal(p.pose.elevation,0);assert.equal(p.attachment,null);
});
test('grid is applied in common floor metres after grab offset, without moving any source item',()=>{
 const before=JSON.stringify([owner,item]);const p=proposeSupportPlacement(request({grabOffset:{x:.13,z:.06},gridMetres:.1}));assert.equal(p.status,'valid-proposal');near(p.pose.x,2.1);near(p.pose.z,3.1);near(p.pose.elevation,.8);assert.equal(JSON.stringify([owner,item]),before);
});
test('locked and read-only requests cannot propose an edit',()=>{
 for(const patch of [{canEdit:false},{mode:'walk'}])assert.equal(proposeSupportPlacement(request(patch)).reason,'read-only-view');
 assert.equal(proposeSupportPlacement(request({item:{...item,locked:true}})).reason,'item-locked');
});
test('parallel/upward/behind rays and wrong floor/room are rejected',()=>{
 assert.equal(proposeSupportPlacement(request({ray:{origin:{x:6,y:5,z:-2},direction:{x:1,y:0,z:0}}})).reason,'ray-does-not-face-support-top');
 assert.equal(proposeSupportPlacement(request({ray:{origin:{x:6,y:5,z:-2},direction:{x:0,y:1,z:0}}})).reason,'ray-does-not-face-support-top');
 assert.equal(proposeSupportPlacement(request({ray:{origin:{x:6,y:-3,z:-2},direction:{x:0,y:-1,z:0}}})).reason,'support-behind-ray');
 assert.equal(proposeSupportPlacement(request({activeFloorId:'ground'})).reason,'support-outside-active-room-or-floor');
 assert.equal(proposeSupportPlacement(request({activeRoomId:'bedroom'})).reason,'support-outside-active-room-or-floor');
});
test('overhang and ceiling clearance are checked on the whole rotated bounding footprint',()=>{
 assert.equal(proposeSupportPlacement(request({grabOffset:{x:.39,z:0}})).reason,'footprint-overhangs-support');
 assert.equal(proposeSupportPlacement(request({roomCeiling:1.0})).reason,'ceiling-clearance');
});
test('concave notch crossing is rejected even when all four footprint corners lie inside',()=>{
 const boundary=[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:.5,z:2},{x:.5,z:-.5},{x:-.5,z:-.5},{x:-.5,z:2},{x:-2,z:2}],foot=rect(-1,0,1,1);
 assert.ok(foot.every(p=>containsPoint(p,boundary)));assert.equal(coversFootprint(foot,{boundary}),false);
});
test('a hole wholly enclosed by the footprint is unsupported, regardless of polygon winding',()=>{
 const boundary=rect(-1,-1,1,1),holes=[rect(-.025,-.025,.025,.025)],foot=rect(-.1,-.1,.1,.1);
 for(const reverse of [false,true])assert.equal(coversFootprint(foot,{boundary:reverse?[...boundary].reverse():boundary,holes:holes.map(h=>reverse?[...h].reverse():h)}),false);
 assert.equal(coversFootprint(rect(.2,.2,.4,.4),{boundary,holes}),true);
});
test('vertical intervals allow an object above a low obstacle but reject actual overlap',()=>{
 const box={...item,id:'other',x:2,z:3,elevation:0};
 assert.equal(proposeSupportPlacement(request({items:[owner,item,box],obstacles:[{item:owner,asset:desk},{item:box,asset:lamp}]})).status,'valid-proposal');
 const raised={...box,elevation:1};assert.equal(proposeSupportPlacement(request({items:[owner,item,raised],obstacles:[{item:owner,asset:desk},{item:raised,asset:lamp}]})).reason,'obstacle-collision');
});
test('exact owner identity, pose and collision evidence are mandatory',()=>{
 assert.equal(proposeSupportPlacement(request({items:[{...owner,assetHash:'changed'},item]})).reason,'support-owner-revision-unresolved');
 assert.equal(proposeSupportPlacement(request({items:[{...owner,x:owner.x+.1},item]})).reason,'stale-support-owner-pose');
 assert.equal(proposeSupportPlacement(request({obstacles:[]})).reason,'support-owner-collision-evidence-missing');
 const tall={...desk,bounds:{min:[-1,0,-.5],max:[1,1.5,.5]}};assert.equal(proposeSupportPlacement(request({obstacles:[{item:owner,asset:tall}]})).reason,'support-owner-geometry-needs-precise-collision');
});
test('self-support, attachment cycles and unresolved ancestors are blocked',()=>{
 assert.equal(proposeSupportPlacement(request({item:owner,asset:desk})).reason,'item-locked');
 assert.equal(proposeSupportPlacement(request({item:{...owner,locked:false},asset:desk})).reason,'self-support');
 assert.equal(proposeSupportPlacement(request({attachments:{desk:{parentItemId:'lamp'}}})).reason,'attachment-cycle');
 assert.equal(proposeSupportPlacement(request({attachments:{desk:{parentItemId:'missing'}}})).reason,'support-ancestor-unresolved');
});
test('persistable relative proposal follows translated/rotated parent with independently known result',()=>{
 const p=proposeSupportPlacement(request({grabOffset:{x:.2,z:-.1}}));assert.equal(p.status,'valid-proposal');const a=JSON.parse(JSON.stringify(p.attachment));
 const moved={...owner,x:4,z:8,yaw:0,elevation:.3};const pose=attachedPose(a,moved);near(pose.x,4.1);near(pose.z,8.2);near(pose.elevation,1.1);near(pose.yaw,-Math.PI/2);
 assert.throws(()=>attachedPose(a,{...moved,assetHash:'different'}),/identity/);assert.throws(()=>attachedPose({...a,localX:NaN},moved),/Invalid/);
});
test('nonfinite input, invalid grid and false authored regions do not become proposals',()=>{
 assert.equal(proposeSupportPlacement(request({roomCeiling:NaN})).reason,'invalid-input');assert.equal(proposeSupportPlacement(request({gridMetres:0})).reason,'invalid-grid');
 assert.equal(proposeSupportPlacement(request({surface:{...surface,holes:[[{x:NaN,z:0},{x:1,z:0},{x:0,z:1}]]}})).reason,'invalid-support-polygon');
 assert.throws(()=>authoredItemSurface(owner,desk,'upper',{id:'bad',height:2,boundary:rect(-.2,-.2,.2,.2)}),/height/);
 assert.throws(()=>authoredItemSurface(owner,desk,'upper',{id:'bad',height:.8,boundary:rect(-2,-2,2,2)}),/polygon/);
});

test('missing or stale scene collision evidence cannot authorize a new support placement',()=>{
 const other={...item,id:'other',x:2,z:3,elevation:.9};
 assert.equal(proposeSupportPlacement(request({items:[owner,item,other]})).reason,'scene-collision-evidence-missing');
 assert.equal(proposeSupportPlacement(request({obstacles:[{item:{...owner,x:owner.x+1},asset:desk}]})).reason,'stale-obstacle-state');
 assert.equal(proposeSupportPlacement(request({items:[owner,item,other],obstacles:[{item:owner,asset:desk},{item:{...other,elevation:0},asset:lamp}]})).reason,'stale-obstacle-state');
 assert.equal(proposeSupportPlacement(request({obstacles:[{item:owner,asset:desk},{item:owner,asset:desk}]})).reason,'duplicate-obstacle-id');
 assert.equal(proposeSupportPlacement(request({items:[owner,item,{...owner}]})).reason,'duplicate-scene-item-id');
});

test('nonfinite or inverted obstacle metadata fails explicitly rather than bypassing collision',()=>{
 for(const bounds of [{min:[-1,0,-.5],max:[1,NaN,.5]},{min:[1,0,-.5],max:[-1,.8,.5]},{min:[0],max:[1]}])assert.equal(proposeSupportPlacement(request({obstacles:[{item:owner,asset:{...desk,bounds}}]})).reason,'invalid-obstacle-bounds-or-pose');
 assert.equal(proposeSupportPlacement(request({item:{...item,yaw:NaN}})).reason,'invalid-asset-bounds-or-pose');
 assert.throws(()=>authoredItemSurface({...owner,x:NaN},desk,'upper',{id:'bad',height:.8,boundary:rect(-.2,-.2,.2,.2)}),/invalid/);
});

test('raw authored-region claims above or beyond the support cage do not create floating furniture',()=>{
 assert.equal(proposeSupportPlacement(request({surface:{...surface,height:1.3}})).reason,'support-region-outside-owner-bounds');
 const expanded={...surface,boundary:rect(.5,1.5,3.5,4.5)};
 assert.equal(proposeSupportPlacement(request({surface:expanded})).reason,'support-region-outside-owner-bounds');
});
