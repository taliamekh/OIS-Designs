import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCeilingProfile,ceilingHeightAt,minimumCeilingOverFootprint,ceilingProfileTriangles,profileBreaks,wallProfileSegments,openingCeilingClearance,convexIntersection,polygonArea} from '../dist/ceilingProfiles.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/ceiling-profiles.json',import.meta.url))),{room,profiles}=fixture;
const clone=x=>JSON.parse(JSON.stringify(x)),rect=(x0,z0,x1,z1)=>[{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}],near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function area3D(values){let result=0;for(let i=0;i<values.length;i+=9){const ux=values[i+3]-values[i],uy=values[i+4]-values[i+1],uz=values[i+5]-values[i+2],vx=values[i+6]-values[i],vy=values[i+7]-values[i+1],vz=values[i+8]-values[i+2],area=Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)/2;assert.ok(area>1e-10,'No degenerate triangles');result+=area}return result}
test('flat, sloped, vaulted and dropped explicit profiles partition the same room',()=>{
 for(const profile of Object.values(profiles))assert.deepEqual(validateCeilingProfile(room,profile),[]);
 near(ceilingHeightAt(profiles.flat,{x:2,z:1.5}),2.7);near(ceilingHeightAt(profiles.slope,{x:4,z:3}),3.5);near(ceilingHeightAt(profiles.vault,{x:2,z:1}),3.2);near(ceilingHeightAt(profiles.vault,{x:0,z:1}),2.2);near(ceilingHeightAt(profiles.soffit,{x:2,z:1.5}),2.05);
});
test('real sloped/vaulted surface area and four vertical soffit faces match independent formulae',()=>{
 const flat=ceilingProfileTriangles(room,profiles.flat),slope=ceilingProfileTriangles(room,profiles.slope),vault=ceilingProfileTriangles(room,profiles.vault),soffit=ceilingProfileTriangles(room,profiles.soffit);
 near(area3D(flat.positions),12);near(area3D(slope.positions),12*Math.sqrt(1+.3**2+.1**2),2e-6);near(area3D(vault.positions),12*Math.sqrt(1+.5**2),2e-6);near(area3D(soffit.positions),12+4*.75,2e-6);assert.equal(soffit.riserTriangles,8);assert.equal(vault.riserTriangles,0);assert.equal(profileBreaks(profiles.vault).length,1);
});
test('a low soffit inside a furniture footprint is caught even when every footprint corner is high',()=>{
 const footprint=rect(1.25,.75,2.75,2.25);assert.ok(footprint.every(p=>ceilingHeightAt(profiles.soffit,p)===2.8));
 const result=minimumCeilingOverFootprint(room,profiles.soffit,footprint);assert.equal(result.status,'measured');near(result.minimumHeight,2.05);assert.ok(result.facetIds.includes('drop'));assert.ok(result.minimumHeight<2.3,'2.3m cabinet conflicts despite high corners');
});
test('minimum sloped clearance is the analytic affine minimum on the actual intersection',()=>{
 const f=rect(.5,.4,1.5,2.4),result=minimumCeilingOverFootprint(room,profiles.slope,f);assert.equal(result.status,'measured');near(result.minimumHeight,2+.3*.5+.1*.4);
 const outside=minimumCeilingOverFootprint(room,profiles.flat,rect(-.1,0,1,1));assert.equal(outside.status,'invalid');
});
test('wall top splits at ridge and discontinuous drop without turning a soffit into a ramp',()=>{
 const ridge=wallProfileSegments(profiles.vault,{x:0,z:0},{x:4,z:0});assert.equal(ridge.length,2);near(ridge[0].heightA,2.2);near(ridge[0].heightB,3.2);near(ridge[1].heightB,2.2);
 const cross=wallProfileSegments(profiles.soffit,{x:0,z:1.5},{x:4,z:1.5});assert.equal(cross.length,3);near(cross[0].heightA,2.8);near(cross[0].heightB,2.8);near(cross[1].heightA,2.05);near(cross[1].heightB,2.05);near(cross[2].heightA,2.8);
});
test('opening crossing a low interior band uses the lower height, not its high jamb endpoints',()=>{
 const clearance=openingCeilingClearance(room,profiles.soffit,{x:1.25,z:1.5},{x:2.75,z:1.5},.4,1.8);assert.equal(clearance.fits,false);near(clearance.minimumCeiling,2.05);near(clearance.clearance,-.15);
 assert.equal(openingCeilingClearance(room,profiles.flat,{x:0,z:0},{x:2,z:0},0,2.1).fits,true);
});
test('gaps, overlaps, outside facets, invalid heights and repeated IDs are rejected',()=>{
 const gap=clone(profiles.vault);gap.facets[0].boundary=rect(0,0,1.9,3);assert.ok(validateCeilingProfile(room,gap).some(i=>i.code==='profile-coverage-gap'));
 const overlap=clone(profiles.vault);overlap.facets[0].boundary=rect(0,0,2.1,3);assert.ok(validateCeilingProfile(room,overlap).some(i=>i.code==='facet-overlap'));
 const bad=clone(profiles.flat);bad.facets[0].plane.intercept=-1;assert.ok(validateCeilingProfile(room,bad).some(i=>i.code==='facet-height-invalid'));assert.throws(()=>ceilingProfileTriangles(room,bad),/height/);
 const dup=clone(profiles.vault);dup.facets[1].id=dup.facets[0].id;assert.ok(validateCeilingProfile(room,dup).some(i=>i.code==='facet-id-duplicate'));
 const outside=clone(profiles.flat);outside.facets[0].boundary[0].x=-1;assert.ok(validateCeilingProfile(room,outside).some(i=>i.code==='facet-boundary-invalid'));
});
test('profile voids are not faked by omitting ceiling area',()=>{
 const missing=clone(profiles.soffit);missing.facets=missing.facets.filter(f=>f.id!=='drop');const issues=validateCeilingProfile(room,missing);assert.ok(issues.some(i=>i.code==='profile-coverage-gap'));assert.match(issues.find(i=>i.code==='profile-coverage-gap').message,/separate explicit connection/);
});
test('reversed room/facet winding preserves heights, clearance and nondegenerate mesh area',()=>{
 for(const p of Object.values(profiles)){const reversed=clone(p);reversed.facets.forEach(f=>f.boundary.reverse());assert.deepEqual(validateCeilingProfile([...room].reverse(),reversed),[]);near(area3D(ceilingProfileTriangles([...room].reverse(),reversed).positions),area3D(ceilingProfileTriangles(room,p).positions));}
});
test('clipping has an independent known rectangle intersection and rejects disconnected regions',()=>{
 const p=convexIntersection(rect(0,0,3,2),rect(1,-1,4,1));near(Math.abs(polygonArea(p)),2);assert.deepEqual(convexIntersection(rect(0,0,1,1),rect(2,2,3,3)),[]);
});
test('collinear facet boundary vertices and taper-to-zero risers create no zero-area triangles',()=>{
 const p=clone(profiles.flat);p.facets[0].boundary=[{x:0,z:0},{x:2,z:0},{x:4,z:0},{x:4,z:3},{x:0,z:3}];area3D(ceilingProfileTriangles(room,p).positions);
 const taper={version:1,facets:[{id:'a',boundary:rect(0,0,2,3),plane:{xSlope:0,zSlope:0,intercept:2.5}},{id:'b',boundary:rect(2,0,4,3),plane:{xSlope:0,zSlope:.1,intercept:2.5}}]};assert.deepEqual(validateCeilingProfile(room,taper),[]);area3D(ceilingProfileTriangles(room,taper).positions);assert.equal(ceilingProfileTriangles(room,taper).riserTriangles,1);
});
test('geometry and queries never mutate room/profile source data or floor elevations',()=>{
 const before=JSON.stringify(fixture);for(let i=0;i<5;i++)for(const p of Object.values(profiles)){ceilingProfileTriangles(room,p);minimumCeilingOverFootprint(room,p,rect(.4,.4,1.2,1.2));}assert.equal(JSON.stringify(fixture),before);
});

test('negative-origin concave room and off-centre unequal vault preserve the actual notch and ridge',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('../fixtures/ceiling-asymmetric.json',import.meta.url))),before=JSON.stringify(f);
 assert.deepEqual(validateCeilingProfile(f.room,f.profile),[]);near(Math.abs(polygonArea(f.room)),16);
 const mesh=ceilingProfileTriangles(f.room,f.profile);near(area3D(mesh.positions),5*Math.sqrt(1.16)+11*Math.sqrt(1.04),3e-6);assert.equal(mesh.riserTriangles,0);
 near(ceilingHeightAt(f.profile,f.probes[1]),2.7);assert.equal(ceilingHeightAt(f.profile,{x:2,z:2}),null,'Missing L corner remains outside the ceiling');
 const wall=wallProfileSegments(f.profile,f.room[0],f.room[1]);assert.equal(wall.length,2);near(wall[0].heightA,2.2);near(wall[0].heightB,2.7);near(wall[1].heightB,1.95);
 const reverse=clone(f.profile);reverse.facets.forEach(v=>v.boundary.reverse());near(area3D(ceilingProfileTriangles([...f.room].reverse(),reverse).positions),area3D(mesh.positions));assert.equal(JSON.stringify(f),before);
});
