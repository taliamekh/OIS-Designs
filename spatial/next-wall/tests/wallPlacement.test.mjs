import test from 'node:test';import assert from 'node:assert/strict';
import {proposeWallPlacement,remapWallAttachment} from '../dist/next-wall/src/wallPlacement.js';
const asset={id:'wall-cabinet',version:'2',sha256:'exact',bounds:{min:[-.4,0,-.2],max:[.4,.7,.15]}},item={id:'cabinet',roomId:'kitchen',assetId:asset.id,assetVersion:asset.version,assetHash:asset.sha256,x:0,z:0,yaw:0,locked:false};
const rect=(x0,z0,x1,z1)=>[{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}],near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const face={floorId:'upper',roomId:'kitchen',wallId:'wall-1',side:'left',revision:'physical-face-3',a:{x:-2,z:-1},b:{x:4,z:-1},inward:{x:0,z:1},height:3,trim:{height:.12,projection:.02},openings:[]};
const request=(patch={})=>({item,asset,anchor:'wall',frame:'-Z-front/+Z-rear',face,currentWallRevision:face.revision,floorOffset:{x:4.2,y:3.15,z:-.3},activeFloorId:'upper',activeRoomId:'kitchen',roomInterior:rect(-2,-1,4,3),ray:{origin:{x:5.2,y:4.55,z:1.7},direction:{x:0,y:0,z:-1}},grab:{along:0,height:0},canEdit:true,mode:'3d',items:[item],movingOpeningIds:[],openingEnvelopes:[],resolve:()=>asset,ceiling:{kind:'flat',height:3},...patch});
test('front ray places the actual +Z rear plane on an explicit inside face with floor-relative height',()=>{
 const p=proposeWallPlacement(request());assert.equal(p.status,'wall-proposal');near(p.pose.x,1);near(p.pose.z,-.85);near(p.pose.elevation,1.4);near(Math.cos(p.pose.yaw),-1);near(Math.sin(p.pose.yaw),0);near(p.wallRange.minAlong,2.6);near(p.wallRange.maxAlong,3.4);near(p.wallRange.top,2.1);assert.equal(p.forceVisibleWallKey,'upper:wall-1');near(Math.min(...p.footprint.map(p=>p.z)),-1);
});
test('reversing explicit face endpoints/side preserves the same physical cabinet pose',()=>{
 const a=proposeWallPlacement(request()),b=proposeWallPlacement(request({face:{...face,a:face.b,b:face.a,side:'right'}}));assert.equal(b.status,'wall-proposal');for(const k of ['x','z','yaw','elevation'])near(a.pose[k],b.pose[k]);near(b.attachment.along,3);
});
test('four sides and arbitrary rotated negative-origin walls preserve rear contact and front direction',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5,.41,1.17]){const t={x:Math.cos(angle),z:Math.sin(angle)},n={x:-t.z,z:t.x},a={x:-4.1,z:-2.3},b={x:a.x+t.x*6,z:a.z+t.z*6},boundary=[a,b,{x:b.x+n.x*4,z:b.z+n.z*4},{x:a.x+n.x*4,z:a.z+n.z*4}],f={...face,a,b,inward:n},local={x:a.x+t.x*3+n.x*2,z:a.z+t.z*3+n.z*2},p=proposeWallPlacement(request({face:f,roomInterior:boundary,ray:{origin:{x:4.2+local.x,y:4.55,z:-.3+local.z},direction:{x:-n.x,y:0,z:-n.z}}}));assert.equal(p.status,'wall-proposal');near(-Math.sin(p.pose.yaw),n.x);near(-Math.cos(p.pose.yaw),n.z);near(Math.min(...p.footprint.map(q=>(q.x-a.x)*n.x+(q.z-a.z)*n.z)),0);}
});
test('grab offset and grid use canonical face-along/elevation metres without moving source data',()=>{
 const r=request({grab:{along:.17,height:.06},gridMetres:.1}),before=JSON.stringify([r.item,r.face]),p=proposeWallPlacement(r);assert.equal(p.status,'wall-proposal');near(p.attachment.along,3.2);near(p.pose.elevation,1.5);assert.equal(JSON.stringify([r.item,r.face]),before);
});
test('read-only, Walk, lock, wrong anchor and missing exact revision block',()=>{
 for(const patch of [{canEdit:false},{mode:'walk'}])assert.equal(proposeWallPlacement(request(patch)).reason,'read-only-view');assert.equal(proposeWallPlacement(request({item:{...item,locked:true}})).reason,'item-locked');assert.equal(proposeWallPlacement(request({anchor:'floor'})).reason,'wall-anchor-or-authored-frame-required');assert.equal(proposeWallPlacement(request({asset:{...asset,sha256:'newest'}})).reason,'saved-asset-revision-unresolved');
});
test('stale face, wrong floor/room and nonunit or wrong-facing normals block',()=>{
 assert.equal(proposeWallPlacement(request({currentWallRevision:'moved'})).reason,'stale-wall-face');for(const patch of [{activeFloorId:'ground'},{activeRoomId:'bedroom'}])assert.equal(proposeWallPlacement(request(patch)).reason,'wrong-active-room-or-floor');for(const inward of [{x:0,z:2},{x:0,z:-1},{x:1,z:0}])assert.equal(proposeWallPlacement(request({face:{...face,inward}})).reason,'invalid-inside-face');
});
test('back-facing, parallel, behind-wall and nonfinite rays block',()=>{
 for(const direction of [{x:0,y:0,z:1},{x:1,y:0,z:0}])assert.equal(proposeWallPlacement(request({ray:{origin:request().ray.origin,direction}})).reason,'ray-does-not-face-inside-wall');assert.equal(proposeWallPlacement(request({ray:{origin:{x:5.2,y:4.55,z:-3},direction:{x:0,y:0,z:-1}}})).reason,'ray-origin-behind-inside-face');assert.equal(proposeWallPlacement(request({grab:{along:NaN,height:0}})).reason,'invalid-ray-or-frame');
});
test('wall endpoint, floor, baseboard and ceiling bounds are hard rejections',()=>{
 assert.equal(proposeWallPlacement(request({grab:{along:-2.9,height:0}})).reason,'wall-end-overhang');assert.equal(proposeWallPlacement(request({grab:{along:0,height:-1.5}})).reason,'below-floor');assert.equal(proposeWallPlacement(request({grab:{along:0,height:-1.35}})).reason,'baseboard-intersection');assert.equal(proposeWallPlacement(request({grab:{along:0,height:1}})).reason,'ceiling-clearance');
});
test('door/window and casing are tested as along-height intervals with touching allowed',()=>{
 const opening={id:'window',minAlong:2.6,maxAlong:3.4,bottom:.8,top:2.05,clearance:.06};assert.equal(proposeWallPlacement(request({face:{...face,openings:[opening]}})).reason,'opening-or-casing-intersection');const beside={...opening,minAlong:3.46,maxAlong:4.2};assert.equal(proposeWallPlacement(request({face:{...face,openings:[beside]}})).status,'wall-proposal');const slightlyInside={...beside,minAlong:3.459};assert.equal(proposeWallPlacement(request({face:{...face,openings:[slightlyInside]}})).reason,'opening-or-casing-intersection');
});
test('clear-room footprint catches a concave corner despite valid wall extents',()=>{
 const boundary=[{x:-2,z:-1},{x:.8,z:-1},{x:.8,z:-.8},{x:4,z:-.8},{x:4,z:3},{x:-2,z:3}];assert.equal(proposeWallPlacement(request({roomInterior:boundary})).reason,'footprint-outside-clear-room');
});
test('profile query uses the whole footprint and unresolved heights fail explicitly',()=>{
 let footprint;assert.equal(proposeWallPlacement(request({ceiling:{kind:'profile',minimum:f=>{footprint=f;return 2}}})).reason,'ceiling-clearance');assert.equal(footprint.length,4);for(const minimum of [()=>null,()=>NaN,()=>{throw Error('stale')}])assert.equal(proposeWallPlacement(request({ceiling:{kind:'profile',minimum}})).reason,'ceiling-profile-unresolved');
});
test('low furniture below mount is clear; raised furniture in its actual 3D cage blocks',()=>{
 const other={...item,id:'other',x:1,z:-.85,yaw:Math.PI,elevation:0},r=request({items:[item,other]});assert.equal(proposeWallPlacement(r).status,'wall-proposal');assert.equal(proposeWallPlacement({...r,items:[item,{...other,elevation:1.5}]}).reason,'obstacle-collision');assert.equal(proposeWallPlacement({...r,resolve:()=>undefined}).reason,'obstacle-revision-unresolved');
});
test('invalid bounds, obstacle poses, duplicate IDs, gaps and grids never become proposals',()=>{
 assert.equal(proposeWallPlacement(request({asset:{...asset,bounds:{min:[0,0,0],max:[1,NaN,1]}}})).reason,'invalid-item-bounds-or-pose');assert.equal(proposeWallPlacement(request({items:[item,{...item}]})).reason,'duplicate-scene-item-id');assert.equal(proposeWallPlacement(request({items:[item,{...item,id:'other',x:NaN}]})).reason,'invalid-obstacle-bounds-or-pose');assert.equal(proposeWallPlacement(request({face:{...face,openings:[{id:'bad',minAlong:2,maxAlong:1,bottom:0,top:2,clearance:0}]}})).reason,'invalid-inside-face');assert.equal(proposeWallPlacement(request({gridMetres:0})).reason,'invalid-grid');
});
test('attachment JSON retains canonical height, exact model and physical wall face identity',()=>{
 const p=proposeWallPlacement(request()),a=JSON.parse(JSON.stringify(p.attachment));assert.deepEqual(a,p.attachment);assert.equal(a.floorId,'upper');assert.equal(a.side,'left');near(a.localRearZ,.15);near(a.elevation,1.4);assert.equal(a.assetHash,'exact');assert.equal(a.wallRevision,face.revision);
});

test('empty face identities, invalid side and out-of-face opening intervals are unresolved context',()=>{
 for(const patch of [{wallId:''},{side:'unknown'},{openings:[{id:'wrong',minAlong:-1,maxAlong:2,bottom:0,top:2,clearance:0}]},{openings:[{id:'wrong',minAlong:1,maxAlong:2,bottom:0,top:4,clearance:0}]}])assert.equal(proposeWallPlacement(request({face:{...face,...patch}})).reason,'invalid-inside-face');assert.equal(proposeWallPlacement(request({ceiling:{kind:'unknown',height:3}})).reason,'ceiling-profile-unresolved');
});

test('explicit rigid translation remaps coordinate-derived wall ID without changing height or model',()=>{
 const original=proposeWallPlacement(request({grab:{along:.13,height:0}})),moved={...face,a:{x:face.a.x+1,z:face.a.z+.4},b:{x:face.b.x+1,z:face.b.z+.4},wallId:'coordinate-derived-successor',revision:'moved-4'},r=request({face:moved,currentWallRevision:moved.revision,roomInterior:rect(-1,-.6,5,3.4),gridMetres:.1}),p=remapWallAttachment(r,original.attachment,face,'a-to-a');assert.equal(p.status,'wall-proposal');near(p.pose.x,original.pose.x+1);near(p.pose.z,original.pose.z+.4);near(p.pose.elevation,original.pose.elevation);near(p.attachment.along,3.13);assert.equal(p.attachment.wallId,moved.wallId);assert.equal(p.attachment.assetHash,asset.sha256);
});
test('explicit reversed endpoint correspondence preserves the same physical position',()=>{
 const original=proposeWallPlacement(request({grab:{along:-.4,height:0}})),reversed={...face,a:face.b,b:face.a,side:'right',wallId:'reversed-physical-wall',revision:'reversed-4'},p=remapWallAttachment(request({face:reversed,currentWallRevision:reversed.revision}),original.attachment,face,'a-to-b');assert.equal(p.status,'wall-proposal');near(p.pose.x,original.pose.x);near(p.pose.z,original.pose.z);near(p.attachment.along,6-original.attachment.along);
});
test('split/resized walls, ambiguous side, stale model and old-face identity cannot silently remount',()=>{
 const a=proposeWallPlacement(request()).attachment;
 const resized={...face,b:{x:5,z:-1},revision:'longer'};assert.equal(remapWallAttachment(request({face:resized,currentWallRevision:resized.revision}),a,face,'a-to-a').reason,'wall-remap-length-changed');
 assert.equal(remapWallAttachment(request(),a,face,'a-to-b').reason,'wall-remap-interior-side-ambiguous');assert.equal(remapWallAttachment(request(),{...a,assetHash:'old'},face,'a-to-a').reason,'attachment-asset-unresolved');assert.equal(remapWallAttachment(request(),{...a,wallRevision:'old'},face,'a-to-a').reason,'old-wall-attachment-unresolved');assert.equal(remapWallAttachment(request(),a,face,'nearest').reason,'wall-correspondence-required');
});
test('remapped opening/ceiling/lock constraints are revalidated in the destination',()=>{
 const a=proposeWallPlacement(request()).attachment,moved={...face,revision:'new-window',openings:[{id:'new',minAlong:2.6,maxAlong:3.4,bottom:0,top:2.5,clearance:.04}]};assert.equal(remapWallAttachment(request({face:moved,currentWallRevision:moved.revision}),a,face,'a-to-a').reason,'opening-or-casing-intersection');assert.equal(remapWallAttachment(request({ceiling:{kind:'flat',height:2}}),a,face,'a-to-a').reason,'ceiling-clearance');assert.equal(remapWallAttachment(request({item:{...item,locked:true}}),a,face,'a-to-a').reason,'item-locked');
});

test('sliding-panel motion outside its nominal opening cannot intersect a wall cabinet',()=>{
 const gap={id:'slider',minAlong:.5,maxAlong:1.2,bottom:0,top:2.1,clearance:.06},envelope={openingId:'slider',footprint:rect(.4,-1.02,1.4,-.91),bottom:0,top:2.1},r=request({face:{...face,openings:[gap]},movingOpeningIds:['slider'],openingEnvelopes:[envelope]});assert.equal(proposeWallPlacement(r).reason,'opening-motion-intersection');assert.equal(proposeWallPlacement({...r,openingEnvelopes:[]}).reason,'opening-motion-evidence-missing');const high={...envelope,top:1.3};assert.equal(proposeWallPlacement({...r,openingEnvelopes:[high]}).status,'wall-proposal');
});
test('malformed or orphaned motion envelopes cannot silently bypass collision',()=>{
 const e={openingId:'slider',footprint:rect(.4,-1.02,1.4,-.91),bottom:0,top:2.1};for(const openingEnvelopes of [[{...e,top:NaN}],[{...e,footprint:[{x:0,z:0},{x:1,z:0},{x:NaN,z:1}]}],[{...e,openingId:'other'}]])assert.equal(proposeWallPlacement(request({movingOpeningIds:['slider'],openingEnvelopes})).status,'blocked');assert.equal(proposeWallPlacement(request({openingEnvelopes:[e]})).reason,'invalid-opening-motion-envelope');
});
