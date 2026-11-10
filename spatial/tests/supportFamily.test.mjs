import test from 'node:test';import assert from 'node:assert/strict';
import {proposeSupportFamilyMove,materializeSupportFamily,supportSceneSignature} from '../dist/supportFamily.js';
const asset={id:'asset',version:'1',sha256:'exact-hash',bounds:{min:[-.1,0,-.1],max:[.1,.4,.1]}},make=(id,x,z,elevation=0,yaw=0)=>({id,roomId:'office',assetId:asset.id,assetVersion:asset.version,assetHash:asset.sha256,x,z,elevation,yaw,locked:false,materialOverrides:{fabric:'#aabbcc'}});
const parent=make('parent',1,2),child=make('child',1.4,2.2,.8,.1),grandchild=make('grandchild',1.5,2.2,1.2,.1),other=make('other',8,8);
const a=(parentItemId,localX,localZ,localElevation,relativeYaw=0)=>({parentItemId,surfaceId:'reviewed-top',parentAssetId:asset.id,parentAssetVersion:asset.version,parentAssetHash:asset.sha256,localX,localZ,localElevation,relativeYaw});
const attachments={child:a('parent',.4,.2,.8,.1),grandchild:a('child',Math.cos(.1)*.1,Math.sin(.1)*.1,.4)},items=[grandchild,other,child,parent],target={x:4,z:8,elevation:.3,yaw:Math.PI/2};
const request=(patch={})=>({items,attachments,rootItemId:'parent',pose:target,contextToken:'room/wall/asset-snapshot-1',canEdit:true,mode:'3d',resolve:()=>asset,validateAll:()=>({valid:true}),...patch});
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-6,`${x} != ${y}`);
test('nested attached family gets independently known rigid world poses and parent-first patches',()=>{
 const p=proposeSupportFamilyMove(request());assert.equal(p.status,'validated-family-proposal');assert.deepEqual(p.patches.map(x=>x.itemId),['parent','child','grandchild']);
 const c=p.patches[1].pose,g=p.patches[2].pose;near(c.x,4.2);near(c.z,7.6);near(c.elevation,1.1);near(c.yaw,Math.PI/2+.1);near(g.x,4.2);near(g.z,7.5);near(g.elevation,1.5);
});
test('materialization is one immutable pose collection preserving unrelated identity and extra fields',()=>{
 const before=JSON.stringify([items,attachments]),p=proposeSupportFamilyMove(request()),r=materializeSupportFamily(items,attachments,p,p.contextToken,true,'3d');assert.equal(r.status,'materialized-proposal');assert.equal(r.items.find(i=>i.id==='other'),other);for(const i of r.items)assert.deepEqual(i.materialOverrides,{fabric:'#aabbcc'});assert.equal(JSON.stringify([items,attachments]),before);assert.deepEqual(r.attachments,attachments);
});
test('any locked descendant rejects the complete move without invoking clearance',()=>{
 let called=false;const r=proposeSupportFamilyMove(request({items:items.map(i=>i.id==='grandchild'?{...i,locked:true}:i),validateAll:()=>{called=true;return {valid:true}}}));assert.equal(r.reason,'family-item-locked');assert.equal(r.itemId,'grandchild');assert.equal(called,false);
});
test('Walk and read-only policy reject proposal and later materialization',()=>{
 for(const patch of [{mode:'walk'},{canEdit:false}])assert.equal(proposeSupportFamilyMove(request(patch)).reason,'read-only-view');const p=proposeSupportFamilyMove(request());assert.equal(materializeSupportFamily(items,attachments,p,p.contextToken,true,'walk').reason,'read-only-view');assert.equal(materializeSupportFamily(items,attachments,p,p.contextToken,false,'3d').reason,'read-only-view');
});
test('unresolved exact revisions, missing child and cross-room attachments fail',()=>{
 assert.equal(proposeSupportFamilyMove(request({resolve:()=>({...asset,sha256:'newest'})})).reason,'family-revision-unresolved');assert.equal(proposeSupportFamilyMove(request({items:items.filter(i=>i.id!=='grandchild')})).reason,'attached-item-missing');assert.equal(proposeSupportFamilyMove(request({items:items.map(i=>i.id==='child'?{...i,roomId:'bedroom'}:i)})).reason,'family-crosses-room');
});
test('cycles and stale parent identity or child local/world pose fail explicitly',()=>{
 const cycle={...attachments,parent:a('grandchild',0,0,0)};assert.equal(proposeSupportFamilyMove(request({attachments:cycle,detachRoot:true})).reason,'attachment-cycle');
 assert.equal(proposeSupportFamilyMove(request({attachments:{...attachments,child:{...attachments.child,parentAssetHash:'old'}}})).reason,'attachment-parent-identity-or-pose-invalid');
 assert.equal(proposeSupportFamilyMove(request({items:items.map(i=>i.id==='child'?{...i,x:i.x+.2}:i)})).reason,'stale-attached-item-pose');
});
test('collision provider receives the entire proposed scene and rejects the family as a unit',()=>{
 let seen;const r=proposeSupportFamilyMove(request({validateAll:(proposed,ids)=>{seen={proposed,ids:[...ids]};return {valid:false,reason:'cabinet-intersection'}}}));assert.equal(r.reason,'cabinet-intersection');assert.equal(seen.proposed.length,4);assert.deepEqual(seen.ids,['parent','child','grandchild']);near(seen.proposed.find(i=>i.id==='child').x,4.2);assert.ok(Object.isFrozen(seen.proposed));assert.ok(seen.proposed.every(Object.isFrozen));
 assert.equal(proposeSupportFamilyMove(request({validateAll:()=>{throw Error('unavailable')}})).reason,'family-clearance-provider-failed');
});
test('room context, unrelated obstacle, lock and attachment changes invalidate old proposals',()=>{
 const p=proposeSupportFamilyMove(request());assert.equal(materializeSupportFamily(items,attachments,p,'changed-walls',true,'3d').reason,'proposal-scene-changed');for(const changed of [items.map(i=>i.id==='other'?{...i,x:7}:i),items.map(i=>i.id==='child'?{...i,locked:true}:i),[...items,make('new',4,8)]])assert.equal(materializeSupportFamily(changed,attachments,p,p.contextToken,true,'3d').reason,'proposal-scene-changed');assert.equal(materializeSupportFamily(items,{...attachments,child:{...attachments.child,localX:.3}},p,p.contextToken,true,'3d').reason,'proposal-scene-changed');
});
test('live proposals are deeply immutable and reconstructed data cannot bypass clearance',()=>{
 const p=proposeSupportFamilyMove(request());assert.throws(()=>{p.patches[0].pose.x=999},TypeError);assert.equal(materializeSupportFamily(items,attachments,JSON.parse(JSON.stringify(p)),p.contextToken,true,'3d').reason,'proposal-not-live-or-reconstructed');
});
test('root already supported requires an explicit detach proposal and retains descendants',()=>{
 const top={...attachments,parent:a('other',-7,-6,0)};assert.equal(proposeSupportFamilyMove(request({attachments:top})).reason,'root-still-attached');const p=proposeSupportFamilyMove(request({attachments:top,detachRoot:true}));assert.equal(p.status,'validated-family-proposal');const r=materializeSupportFamily(items,top,p,p.contextToken,true,'3d');assert.equal(r.status,'materialized-proposal');assert.equal(r.attachments.parent,undefined);assert.deepEqual(r.attachments.child,attachments.child);assert.ok(top.parent);
});
test('canonical signature ignores array/key ordering while detecting geometry-relevant changes',()=>{
 assert.equal(supportSceneSignature(items,attachments),supportSceneSignature([...items].reverse(),{grandchild:attachments.grandchild,child:attachments.child}));const p=proposeSupportFamilyMove(request()),recoloured=items.map(i=>({...i,materialOverrides:{fabric:'#332211'}}));const r=materializeSupportFamily(recoloured,attachments,p,p.contextToken,true,'3d');assert.equal(r.status,'materialized-proposal');assert.ok(r.items.every(i=>i.materialOverrides.fabric==='#332211'));
});
test('invalid context, root/child poses and repeated IDs fail before clearance',()=>{
 assert.equal(proposeSupportFamilyMove(request({contextToken:''})).reason,'invalid-context-or-root-pose');assert.equal(proposeSupportFamilyMove(request({pose:{...target,x:NaN}})).reason,'invalid-context-or-root-pose');assert.equal(proposeSupportFamilyMove(request({items:[...items,parent]})).reason,'duplicate-scene-item-id');assert.equal(proposeSupportFamilyMove(request({rootItemId:'missing'})).reason,'root-item-missing');assert.equal(proposeSupportFamilyMove(request({items:items.map(i=>i.id==='child'?{...i,elevation:Infinity}:i)})).reason,'invalid-current-item-pose');
});
