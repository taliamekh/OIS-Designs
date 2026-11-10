import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planLevelConnections,validateLevelVoids,slabOutlines,translationFromAnchors} from '../dist/levelConnections.js';
const source=JSON.parse(fs.readFileSync(new URL('../fixtures/level-connection.json',import.meta.url))),clone=x=>JSON.parse(JSON.stringify(x));
const plan=(f=source)=>planLevelConnections(f.project,f.voids,f.markers),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('canonical two-floor alignment and declared conceptual marker geometry have known endpoints',()=>{
 const p=plan();assert.deepEqual(p.issues,[]);assert.equal(p.connections.length,1);const c=p.connections[0];
 assert.deepEqual(c.startWorld,{x:-.5,y:0,z:3});assert.deepEqual(c.endWorld,{x:-.5,y:3.1,z:6.5});assert.deepEqual(c.upperLandingWorld,c.endWorld);near(c.landingResidualMetres,0);near(c.rise,3.1);near(c.run,3.5);assert.equal(c.steps.length,18);assert.equal(c.markerOnly,true);assert.equal(c.visibleInSeparatedFloors,false);assert.match(p.warnings[0],/not structural/);
 near(c.steps[0].center.y,3.1/36);near(c.steps[0].center.z,3+3.5/36);near(c.steps.at(-1).height,3.1);near(c.steps.at(-1).center.z+c.steps.at(-1).depth/2,6.5);
});
test('upper slab hole and lower ceiling cutout share world XZ despite different local origins',()=>{
 const c=plan().connections[0],s=slabOutlines(source.project,'upper','upper-room',source.voids,.18);
 near(s.topY,3.1);near(s.bottomY,2.92);assert.equal(s.holes.length,1);
 for(let i=0;i<c.upperVoid.boundary.length;i++){
  const u=c.upperVoid.boundary[i],l=c.lowerCeilingCutout.boundary[i];near(u.x-1,l.x-3);near(u.z+3,l.z+2);
 }
});
test('wrong-floor local coordinates cannot masquerade as a connected upper landing',()=>{
 const f=clone(source);f.markers[0].upperLanding={...f.markers[0].end};const p=plan(f);assert.equal(p.connections.length,0);assert.ok(p.issues.some(i=>i.code==='landing-alignment-mismatch'));
});
test('small alignment residual is reported without silently snapping canonical marker endpoints',()=>{
 const f=clone(source);f.markers[0].upperLanding.x+=.02;const p=plan(f);assert.deepEqual(p.issues,[]);near(p.connections[0].endWorld.x,-.5);near(p.connections[0].upperLandingWorld.x,-.48);near(p.connections[0].landingResidualMetres,.02);
});
test('a short void cannot leave conceptual step/viewer envelope blocked by a solid lower ceiling',()=>{
 const f=clone(source);for(const p of f.voids[0].boundary)if(p.z===1)p.z=2.2;
 const p=plan(f);assert.ok(p.issues.some(i=>i.code==='viewer-envelope-outside-void'));assert.equal(p.connections.length,0);
});
test('marker cannot terminate unsupported inside an oversized void without a solid landing',()=>{
 const f=clone(source);for(const p of f.voids[0].boundary)if(p.z===3.5)p.z=4;
 const p=plan(f);assert.equal(p.connections.length,0);assert.ok(p.issues.some(i=>i.code==='landing-not-on-solid-upper-floor'));assert.ok(p.issues.some(i=>i.code==='landing-away-from-void-edge'));
});
test('stairs need the correct actual upper-floor void and cannot ascend to their own level',()=>{
 const missing=clone(source);missing.voids=[];assert.ok(plan(missing).issues.some(i=>i.code==='upper-void-missing'));
 const wrong=clone(source);wrong.voids[0].floorId='lower';assert.ok(plan(wrong).issues.some(i=>i.code==='upper-void-missing'));
 const same=clone(source);same.markers[0].upperFloorId='lower';same.markers[0].upperRoomId='lower-room';assert.ok(plan(same).issues.some(i=>i.code==='invalid-level-rise'));
});
test('wall thickness and actual room boundary reject a run or void through the wall volume',()=>{
 const f=clone(source);f.markers[0].start.x=.1;f.markers[0].end.x=.1;const p=plan(f);assert.ok(p.issues.some(i=>i.code==='run-outside-clear-room'));
 const v=clone(source);v.voids[0].boundary=[{x:-1.97,z:1},{x:-1.4,z:1},{x:-1.4,z:2},{x:-1.97,z:2}];assert.ok(validateLevelVoids(v.project,v.voids).some(i=>i.code==='void-cuts-wall-volume'));
});
test('overlapping, touching, malformed and duplicate voids never become slab holes',()=>{
 const f=clone(source);f.voids.push({...clone(f.voids[0]),id:'overlap'});assert.ok(validateLevelVoids(f.project,f.voids).some(i=>i.code==='overlapping-voids'));assert.throws(()=>slabOutlines(f.project,'upper','upper-room',f.voids),/overlapping/);
 const dup=clone(source);dup.voids.push(clone(dup.voids[0]));assert.ok(validateLevelVoids(dup.project,dup.voids).some(i=>i.code==='duplicate-void-id'));
 const malformed=clone(source);malformed.voids[0].boundary[0].x=NaN;assert.ok(validateLevelVoids(malformed.project,malformed.voids).some(i=>i.code==='void-outside-room'));
});
test('both room/void windings preserve canonical marker and hole results',()=>{
 const f=clone(source);for(const floor of f.project.floors)for(const room of floor.rooms)room.polygon.reverse();f.voids[0].boundary.reverse();const p=plan(f);assert.deepEqual(p.issues,[]);assert.deepEqual(p.connections[0].startWorld,plan().connections[0].startWorld);near(p.connections[0].rise,3.1);
});
test('view proposals leave source project/marker data unchanged and loops are independent copies',()=>{
 const before=JSON.stringify(source);for(let i=0;i<10;i++){plan();const s=slabOutlines(source.project,'upper','upper-room',source.voids);s.outer[0].x+=1;s.holes[0][0].z+=1}assert.equal(JSON.stringify(source),before);
});
test('invalid marker dimensions and slab thickness fail explicitly',()=>{
 for(const [key,value] of [['width',0],['stepCount',1],['stepCount',2.5],['viewerEnvelopeHeight',Infinity]]){const f=clone(source);f.markers[0][key]=value;assert.ok(plan(f).issues.some(i=>i.code==='invalid-marker-dimensions'))}
 assert.throws(()=>slabOutlines(source.project,'upper','upper-room',source.voids,0),/thickness/);
});
test('two independent anchors verify translation and flag rotation instead of inventing registration',()=>{
 const p=translationFromAnchors([{local:{x:-2,z:-1},world:{x:-3,z:2}},{local:{x:3,z:5},world:{x:2,z:8}}]);assert.equal(p.status,'translation');assert.deepEqual(p.offset,{x:-1,z:3});near(p.maximumResidual,0);
 const rotated=translationFromAnchors([{local:{x:0,z:0},world:{x:0,z:0}},{local:{x:4,z:0},world:{x:0,z:4}}]);assert.equal(rotated.status,'needs-rotation-or-review');assert.ok(rotated.maximumResidual>2);
 assert.throws(()=>translationFromAnchors([{local:{x:0,z:0},world:{x:0,z:0}}]),/two/);
 assert.throws(()=>translationFromAnchors([{local:{x:0,z:0},world:{x:0,z:0}},{local:{x:0,z:0},world:{x:0,z:0}}]),/degenerate/);
});
