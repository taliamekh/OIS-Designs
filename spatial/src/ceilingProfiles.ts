/** Explicit planar ceiling facets for original Phase 3 geometry experiments.
 * Stored flat room heights and production project schemas are never changed here. */
import type {Point2,Vec3} from "./viewPlan.js";
import {containsPoint,coversFootprint} from "./supportPlacement.js";
export type CeilingFacet=Readonly<{id:string;boundary:readonly Point2[];plane:Readonly<{xSlope:number;zSlope:number;intercept:number}>}>;
export type CeilingProfile=Readonly<{version:1;facets:readonly CeilingFacet[]}>;
export type ProfileIssue=Readonly<{code:string;facetId?:string;message:string}>;
export type ProfileBreak=Readonly<{a:Point2;b:Point2;firstFacet:string;secondFacet:string;heightFirst:readonly[number,number];heightSecond:readonly[number,number];kind:"crease"|"drop"}>;
const EPS=1e-7;
const cross=(a:Point2,b:Point2,c:Point2)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const edges=(p:readonly Point2[])=>p.map((a,i)=>[a,p[(i+1)%p.length]!] as const);
export const polygonArea=(p:readonly Point2[])=>edges(p).reduce((s,[a,b])=>s+a.x*b.z-b.x*a.z,0)/2;
const height=(f:CeilingFacet,p:Point2)=>f.plane.xSlope*p.x+f.plane.zSlope*p.z+f.plane.intercept;
const finitePolygon=(p:readonly Point2[])=>p.length>=3&&p.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.z));
function convex(p:readonly Point2[]):boolean {
 if(!finitePolygon(p)||Math.abs(polygonArea(p))<EPS)return false;let sign=0;
 for(let i=0;i<p.length;i++){const c=cross(p[i]!,p[(i+1)%p.length]!,p[(i+2)%p.length]!);if(Math.abs(c)<EPS)continue;const next=Math.sign(c);if(sign&&next!==sign)return false;sign=next}return sign!==0;
}
/** Convex clipping oracle: affine height extrema occur at intersection vertices. */
export function convexIntersection(subject:readonly Point2[],clip:readonly Point2[]):Point2[] {
 if(!convex(subject)||!convex(clip))return [];let output=subject.map(p=>({...p}));const sign=Math.sign(polygonArea(clip));
 for(const [a,b]of edges(clip)){
  const input=output;output=[];if(!input.length)break;
  for(let i=0;i<input.length;i++){
   const p=input[i]!,q=input[(i+1)%input.length]!,dp=sign*cross(a,b,p),dq=sign*cross(a,b,q),pIn=dp>=-EPS,qIn=dq>=-EPS;
   if(pIn)output.push(p);
   if(pIn!==qIn){const t=dp/(dp-dq);output.push({x:p.x+t*(q.x-p.x),z:p.z+t*(q.z-p.z)})}
  }
  output=output.filter((p,i)=>i===0||Math.hypot(p.x-output[i-1]!.x,p.z-output[i-1]!.z)>EPS);
  if(output.length>1&&Math.hypot(output[0]!.x-output.at(-1)!.x,output[0]!.z-output.at(-1)!.z)<EPS)output.pop();
 }
 return output;
}
function sharedSegment(a:Point2,b:Point2,c:Point2,d:Point2):readonly[Point2,Point2]|null {
 const dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;if(len2<EPS*EPS||Math.abs(cross(a,b,c))>EPS||Math.abs(cross(a,b,d))>EPS)return null;
 const t=(p:Point2)=>((p.x-a.x)*dx+(p.z-a.z)*dz)/len2,lo=Math.max(0,Math.min(t(c),t(d))),hi=Math.min(1,Math.max(t(c),t(d)));
 return hi-lo>EPS?[{x:a.x+lo*dx,z:a.z+lo*dz},{x:a.x+hi*dx,z:a.z+hi*dz}]:null;
}
export function profileBreaks(profile:CeilingProfile):ProfileBreak[] {
 const result:ProfileBreak[]=[];
 for(let i=0;i<profile.facets.length;i++)for(const b of profile.facets.slice(i+1)){
  const a=profile.facets[i]!;for(const [p,q]of edges(a.boundary))for(const [r,s]of edges(b.boundary)){
   const segment=sharedSegment(p,q,r,s);if(!segment)continue;const [u,v]=segment,ha=[height(a,u),height(a,v)]as const,hb=[height(b,u),height(b,v)]as const;
   const drop=Math.max(Math.abs(ha[0]-hb[0]),Math.abs(ha[1]-hb[1]))>EPS;
   if(drop||Math.abs(a.plane.xSlope-b.plane.xSlope)>EPS||Math.abs(a.plane.zSlope-b.plane.zSlope)>EPS)
    result.push({a:u,b:v,firstFacet:a.id,secondFacet:b.id,heightFirst:ha,heightSecond:hb,kind:drop?"drop":"crease"});
  }
 }
 return result;
}
export function validateCeilingProfile(room:readonly Point2[],profile:CeilingProfile):ProfileIssue[] {
 const issues:ProfileIssue[]=[];if(profile.version!==1||!profile.facets.length)return [{code:"profile-empty-or-version",message:"Explicit version-1 ceiling facets are required"}];
 if(!coversFootprint(room,{boundary:room}))return [{code:"room-boundary-invalid",message:"Room boundary is invalid"}];
 const ids=new Set<string>();let area=0;
 for(const f of profile.facets){
  if(ids.has(f.id))issues.push({code:"facet-id-duplicate",facetId:f.id,message:"Facet IDs must be unique"});ids.add(f.id);
  if(!convex(f.boundary)||!coversFootprint(f.boundary,{boundary:room})){issues.push({code:"facet-boundary-invalid",facetId:f.id,message:"Each explicit convex facet must stay inside the room"});continue;}
  if(![f.plane.xSlope,f.plane.zSlope,f.plane.intercept].every(Number.isFinite)||f.boundary.some(p=>!Number.isFinite(height(f,p))||height(f,p)<=0||height(f,p)>30))issues.push({code:"facet-height-invalid",facetId:f.id,message:"Facet heights must be positive finite floor-relative metres"});
  area+=Math.abs(polygonArea(f.boundary));
 }
 for(let i=0;i<profile.facets.length;i++)for(const b of profile.facets.slice(i+1)){
  const a=profile.facets[i]!,intersection=convexIntersection(a.boundary,b.boundary);if(intersection.length>=3&&Math.abs(polygonArea(intersection))>1e-6)issues.push({code:"facet-overlap",facetId:b.id,message:"Ceiling facets overlap instead of forming a surface partition"});
 }
 if(Math.abs(area-Math.abs(polygonArea(room)))>Math.max(1e-5,Math.abs(polygonArea(room))*1e-6))issues.push({code:"profile-coverage-gap",message:"Facets must cover the entire room; an upper-level void needs its separate explicit connection"});
 for(const b of profileBreaks(profile))if((b.heightFirst[0]-b.heightSecond[0])*(b.heightFirst[1]-b.heightSecond[1])<-EPS)issues.push({code:"crossing-drop-edge",message:"Split the crossing vertical drop into explicit consistent regions"});
 return issues;
}
export function ceilingHeightAt(profile:CeilingProfile,point:Point2):number|null {
 const values=profile.facets.filter(f=>containsPoint(point,f.boundary)).map(f=>height(f,point));return values.length?Math.min(...values):null;
}
export function minimumCeilingOverFootprint(room:readonly Point2[],profile:CeilingProfile,footprint:readonly Point2[]):Readonly<{status:"measured";minimumHeight:number;facetIds:readonly string[]}|{status:"invalid";reason:string}> {
 const issues=validateCeilingProfile(room,profile);if(issues.length)return {status:"invalid",reason:issues.map(i=>i.code).join(",")};
 if(!convex(footprint)||!coversFootprint(footprint,{boundary:room}))return {status:"invalid",reason:"footprint-outside-profile"};
 let min=Infinity;const ids:string[]=[];
 for(const f of profile.facets){const intersection=convexIntersection(footprint,f.boundary);if(intersection.length<3||Math.abs(polygonArea(intersection))<EPS)continue;ids.push(f.id);for(const p of intersection)min=Math.min(min,height(f,p));}
 return Number.isFinite(min)?{status:"measured",minimumHeight:min,facetIds:ids}:{status:"invalid",reason:"uncovered-footprint"};
}

/** Downward-facing interior triangles plus actual vertical soffit/drop faces. */
export function ceilingProfileTriangles(room:readonly Point2[],profile:CeilingProfile):Readonly<{positions:Float32Array;surfaceTriangles:number;riserTriangles:number;breaks:readonly ProfileBreak[]}> {
 const issues=validateCeilingProfile(room,profile);if(issues.length)throw new Error(issues.map(i=>i.code).join(","));const values:number[]=[];let surfaces=0,risers=0;
 const tri=(a:Vec3,b:Vec3,c:Vec3)=>{const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;if(Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)<1e-10)return false;values.push(a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z);return true};
 for(const f of profile.facets){const p=polygonArea(f.boundary)>0?[...f.boundary]:[...f.boundary].reverse();for(let i=1;i<p.length-1;i++){const a=p[0]!,b=p[i]!,c=p[i+1]!;if(tri({x:a.x,y:height(f,a),z:a.z},{x:b.x,y:height(f,b),z:b.z},{x:c.x,y:height(f,c),z:c.z}))surfaces++}}
 const breaks=profileBreaks(profile);for(const b of breaks)if(b.kind==="drop"){
  const a={x:b.a.x,y:b.heightFirst[0],z:b.a.z},c={x:b.b.x,y:b.heightFirst[1],z:b.b.z},d={x:b.b.x,y:b.heightSecond[1],z:b.b.z},e={x:b.a.x,y:b.heightSecond[0],z:b.a.z};if(tri(a,c,d))risers++;if(tri(a,d,e))risers++;
 }
 return {positions:new Float32Array(values),surfaceTriangles:surfaces,riserTriangles:risers,breaks};
}

/** Split wall-face top at facet boundaries; a drop stays a step, never an invented ramp. */
export function wallProfileSegments(profile:CeilingProfile,a:Point2,b:Point2):Readonly<{a:Point2;b:Point2;heightA:number;heightB:number;facetId:string}>[] {
 const dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;if(len2<EPS*EPS)throw new Error("Wall segment is degenerate");const cuts=[0,1];
 for(const f of profile.facets)for(const [p,q]of edges(f.boundary)){
  const ex=q.x-p.x,ez=q.z-p.z,den=dx*ez-dz*ex;
  if(Math.abs(den)<EPS){if(Math.abs(cross(a,b,p))<EPS)for(const v of [p,q]){const t=((v.x-a.x)*dx+(v.z-a.z)*dz)/len2;if(t>EPS&&t<1-EPS)cuts.push(t)}continue;}
  const t=((p.x-a.x)*ez-(p.z-a.z)*ex)/den,u=((p.x-a.x)*dz-(p.z-a.z)*dx)/den;if(t>EPS&&t<1-EPS&&u>=-EPS&&u<=1+EPS)cuts.push(t);
 }
 const times=cuts.sort((x,y)=>x-y).filter((t,i,all)=>i===0||t-all[i-1]!>EPS),segments=[];
 for(let i=0;i<times.length-1;i++){
  const t0=times[i]!,t1=times[i+1]!,p={x:a.x+dx*t0,z:a.z+dz*t0},q={x:a.x+dx*t1,z:a.z+dz*t1},mid={x:(p.x+q.x)/2,z:(p.z+q.z)/2};
  const f=profile.facets.filter(f=>containsPoint(mid,f.boundary)).sort((x,y)=>height(x,mid)-height(y,mid))[0];if(!f)throw new Error("Wall crosses an uncovered ceiling region");segments.push({a:p,b:q,heightA:height(f,p),heightB:height(f,q),facetId:f.id});
 }
 return segments;
}

export function openingCeilingClearance(room:readonly Point2[],profile:CeilingProfile,a:Point2,b:Point2,sill:number,clearHeight:number):Readonly<{fits:boolean;minimumCeiling:number;openingTop:number;clearance:number}> {
 const issues=validateCeilingProfile(room,profile);if(issues.length)throw new Error(issues.map(i=>i.code).join(","));
 if(!Number.isFinite(sill)||sill<0||!Number.isFinite(clearHeight)||clearHeight<=0)throw new Error("Invalid opening height/sill");
 const segments=wallProfileSegments(profile,a,b),minimumCeiling=Math.min(...segments.flatMap(s=>[s.heightA,s.heightB])),openingTop=sill+clearHeight,clearance=minimumCeiling-openingTop;
 return {fits:clearance>=-1e-6,minimumCeiling,openingTop,clearance};
}
