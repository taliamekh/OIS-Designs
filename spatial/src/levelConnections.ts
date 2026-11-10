/** Original Phase 3 marker/void geometry proposals. No stair engineering or automatic traversal. */
import type { Point2, Vec3, SpatialFloor, SpatialProject, SpatialRoom } from "./viewPlan.js";
import { canonicalFloorOffset, floorToWorld, worldToFloor } from "./viewPlan.js";
import { coversFootprint, containsPoint } from "./supportPlacement.js";

export type LevelVoid = Readonly<{ id:string; floorId:string; roomId:string; boundary:readonly Point2[] }>;
export type StairMarker = Readonly<{
  id:string; lowerFloorId:string; lowerRoomId:string; upperFloorId:string; upperRoomId:string;
  /** Run endpoints use the lower floor's canonical local XZ. */
  start:Point2; end:Point2; width:number; stepCount:number;
  upperLanding:Point2; upperVoidId:string;
  /** Explicit viewing envelope, not a code-compliance headroom standard. */
  viewerEnvelopeHeight?:number;
}>;
export type ConnectionIssue = Readonly<{ id:string; code:string; message:string }>;
export type StepMarkerBox = Readonly<{ center:Vec3; width:number; depth:number; height:number; yaw:number }>;
export type PlannedConnection = Readonly<{
  id:string; startWorld:Vec3; endWorld:Vec3; rise:number; run:number; inclineDegrees:number;
  upperLandingWorld:Vec3; landingResidualMetres:number;
  footprintWorld:readonly Point2[]; steps:readonly StepMarkerBox[];
  upperLandingFootprintWorld:readonly Point2[];
  upperVoid:LevelVoid; lowerCeilingCutout:Readonly<{floorId:string;roomId:string;boundary:readonly Point2[]}>;
  markerOnly:true; visibleInSeparatedFloors:false;
}>;
export type LevelConnectionPlan = Readonly<{ connections:readonly PlannedConnection[]; issues:readonly ConnectionIssue[]; warnings:readonly string[] }>;
const EPS=1e-6;
const finitePoint=(p:Point2)=>Number.isFinite(p.x)&&Number.isFinite(p.z);
const distance=(a:Point2,b:Point2)=>Math.hypot(a.x-b.x,a.z-b.z);
const edges=(p:readonly Point2[])=>p.map((a,i)=>[a,p[(i+1)%p.length]!] as const);
const orient=(a:Point2,b:Point2,c:Point2)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const projectDistance=(p:Point2,a:Point2,b:Point2)=>{
  const d=(b.x-a.x)**2+(b.z-a.z)**2;if(d<EPS*EPS)return distance(p,a);
  const t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.z-a.z)*(b.z-a.z))/d));
  return Math.hypot(p.x-a.x-t*(b.x-a.x),p.z-a.z-t*(b.z-a.z));
};
function segmentsDistance(a:Point2,b:Point2,c:Point2,d:Point2):number {
  if(orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0)return 0;
  return Math.min(projectDistance(a,c,d),projectDistance(b,c,d),projectDistance(c,a,b),projectDistance(d,a,b));
}
function polygonsTouch(a:readonly Point2[],b:readonly Point2[]):boolean {
  return a.some(p=>containsPoint(p,b))||b.some(p=>containsPoint(p,a))||edges(a).some(([p,q])=>edges(b).some(([r,s])=>segmentsDistance(p,q,r,s)<EPS));
}
function clearsWalls(polygon:readonly Point2[],floor:SpatialFloor,roomId:string):boolean {
  return floor.walls.filter(w=>w.faces.some(f=>f.roomId===roomId)).every(w=>Number.isFinite(w.thickness)&&w.thickness>0&&
    edges(polygon).every(([a,b])=>segmentsDistance(a,b,w.a,w.b)>=w.thickness/2+.005-EPS));
}
function runRectangle(start:Point2,end:Point2,width:number):Point2[] {
  const len=distance(start,end),nx=-(end.z-start.z)/len*width/2,nz=(end.x-start.x)/len*width/2;
  return [{x:start.x+nx,z:start.z+nz},{x:start.x-nx,z:start.z-nz},{x:end.x-nx,z:end.z-nz},{x:end.x+nx,z:end.z+nz}];
}
export function validateLevelVoids(project:SpatialProject,voids:readonly LevelVoid[]):ConnectionIssue[] {
  const issues:ConnectionIssue[]=[],ids=new Set<string>();
  for(const v of voids){
    const floor=project.floors.find(f=>f.id===v.floorId),room=floor?.rooms.find(r=>r.id===v.roomId);
    const issue=(code:string,message:string)=>issues.push({id:v.id,code,message});
    if(ids.has(v.id))issue("duplicate-void-id","Void IDs must be unique");ids.add(v.id);
    if(!floor||!room){issue("void-room-missing","Void floor/room is missing");continue;}
    if(!coversFootprint(v.boundary,{boundary:room.polygon})){issue("void-outside-room","Void must be a valid polygon fully within one room");continue;}
    if(!clearsWalls(v.boundary,floor,room.id))issue("void-cuts-wall-volume","Void intersects the actual wall-thickness envelope");
  }
  for(let i=0;i<voids.length;i++)for(const b of voids.slice(i+1)){
    const a=voids[i]!;if(a.floorId===b.floorId&&polygonsTouch(a.boundary,b.boundary))issues.push({id:b.id,code:"overlapping-voids",message:"Floor voids must not overlap or touch"});
  }
  return issues;
}

/** Renderer-independent loops for a real slab hole; winding is handled by the renderer.
 * The same reviewed opening must also cut the lower ceiling, not just draw a marker above it. */
export function slabOutlines(project:SpatialProject,floorId:string,roomId:string,voids:readonly LevelVoid[],thickness=.16):Readonly<{outer:readonly Point2[];holes:readonly (readonly Point2[])[];topY:number;bottomY:number}> {
  const floor=project.floors.find(f=>f.id===floorId),room=floor?.rooms.find(r=>r.id===roomId);
  if(!floor||!room)throw new Error("Slab room is missing");
  if(!Number.isFinite(thickness)||thickness<=0||thickness>1)throw new Error("Invalid authored slab thickness");
  const selected=voids.filter(v=>v.floorId===floorId&&v.roomId===roomId);
  const issues=validateLevelVoids(project,selected);if(issues.length)throw new Error(issues.map(i=>i.code).join(", "));
  return {outer:room.polygon.map(p=>({...p})),holes:selected.map(v=>v.boundary.map(p=>({...p}))),topY:floor.elevation,bottomY:floor.elevation-thickness};
}

export function planLevelConnections(project:SpatialProject,voids:readonly LevelVoid[],markers:readonly StairMarker[]):LevelConnectionPlan {
  const issues=validateLevelVoids(project,voids),connections:PlannedConnection[]=[],warnings:string[]=[],ids=new Set<string>();
  for(const marker of markers){
    const firstIssue=issues.length,issue=(code:string,message:string)=>issues.push({id:marker.id,code,message});
    if(ids.has(marker.id))issue("duplicate-marker-id","Marker IDs must be unique");ids.add(marker.id);
    const lower=project.floors.find(f=>f.id===marker.lowerFloorId),upper=project.floors.find(f=>f.id===marker.upperFloorId),lowerRoom=lower?.rooms.find(r=>r.id===marker.lowerRoomId),upperRoom=upper?.rooms.find(r=>r.id===marker.upperRoomId);
    if(!lower||!upper||!lowerRoom||!upperRoom){issue("marker-room-missing","Both floor/room references must exist");continue;}
    if(lower.id===upper.id||!Number.isFinite(upper.elevation-lower.elevation)||upper.elevation<=lower.elevation){issue("invalid-level-rise","Upper floor must be above lower floor");continue;}
    const run=distance(marker.start,marker.end),rise=upper.elevation-lower.elevation,envelope=marker.viewerEnvelopeHeight??1.6;
    if(![marker.start,marker.end,marker.upperLanding].every(finitePoint)||!Number.isFinite(marker.width)||marker.width<.05||marker.width>5||!Number.isFinite(run)||run<.05||!Number.isInteger(marker.stepCount)||marker.stepCount<2||marker.stepCount>100||!Number.isFinite(envelope)||envelope<0||envelope>3){issue("invalid-marker-dimensions","Marker needs finite endpoints, positive run/width and 2–100 declared steps");continue;}
    const opening=voids.find(v=>v.id===marker.upperVoidId);
    if(!opening||opening.floorId!==upper.id||opening.roomId!==upperRoom.id){issue("upper-void-missing","Marker needs a void in its actual upper room");continue;}
    if(issues.some(i=>i.id===opening.id)){issue("upper-void-invalid","Referenced upper void did not validate");continue;}
    const lowOffset=canonicalFloorOffset(lower),upperOffset=canonicalFloorOffset(upper),startWorld=floorToWorld({x:marker.start.x,y:0,z:marker.start.z},lowOffset),endWorld=floorToWorld({x:marker.end.x,y:rise,z:marker.end.z},lowOffset),upperLandingWorld=floorToWorld({x:marker.upperLanding.x,y:0,z:marker.upperLanding.z},upperOffset),landingResidualMetres=distance(endWorld,upperLandingWorld);
    if(landingResidualMetres>.03)issue("landing-alignment-mismatch","Upper landing does not align in shared world XZ");
    const footprint=runRectangle(marker.start,marker.end,marker.width);
    if(!coversFootprint(footprint,{boundary:lowerRoom.polygon})||!clearsWalls(footprint,lower,lowerRoom.id))issue("run-outside-clear-room","Marker run intersects a room boundary or actual wall envelope");
    if(!containsPoint(marker.upperLanding,opening.boundary))issue("landing-outside-void","Upper landing is outside the actual upper floor void");
    if(Math.min(...edges(opening.boundary).map(([a,b])=>projectDistance(marker.upperLanding,a,b)))>.03)
      issue("landing-away-from-void-edge","Marker must finish at the opening edge, not in unsupported space inside the void");
    const endUpper=worldToFloor(endWorld,upperOffset),ux=(endWorld.x-startWorld.x)/run,uz=(endWorld.z-startWorld.z)/run;
    const landing=runRectangle({x:endUpper.x+ux*.005,z:endUpper.z+uz*.005},{x:endUpper.x+ux*.35,z:endUpper.z+uz*.35},marker.width);
    if(!coversFootprint(landing,{boundary:upperRoom.polygon})||!clearsWalls(landing,upper,upperRoom.id)||voids.some(v=>v.floorId===upper.id&&polygonsTouch(landing,v.boundary)))
      issue("landing-not-on-solid-upper-floor","The conceptual run needs a clear solid upper-floor landing beyond the opening edge");
    const lowerCutout=opening.boundary.map(p=>{const w=floorToWorld({x:p.x,y:0,z:p.z},upperOffset),q=worldToFloor(w,lowOffset);return {x:q.x,z:q.z}});
    if(!coversFootprint(lowerCutout,{boundary:lowerRoom.polygon}))issue("ceiling-cutout-crosses-room","Projected opening needs a multi-room ceiling cutout; unsupported in this initial marker proposal");
    const lowCeiling=lowerRoom.ceiling??lower.ceiling,firstObstructedStep=Math.floor((lowCeiling-envelope)/(rise/marker.stepCount)),t=Math.max(0,Math.min(1,firstObstructedStep/marker.stepCount)),headStart={x:marker.start.x+(marker.end.x-marker.start.x)*t,z:marker.start.z+(marker.end.z-marker.start.z)*t};
    if(t<1-EPS&&!coversFootprint(runRectangle(headStart,marker.end,marker.width),{boundary:lowerCutout}))issue("viewer-envelope-outside-void","Part of the declared viewer-height envelope hits the lower ceiling outside its cutout");
    if(issues.length!==firstIssue)continue;
    const yaw=Math.atan2(ux,uz),steps:StepMarkerBox[]=[];
    for(let n=0;n<marker.stepCount;n++){
      const along=(n+.5)/marker.stepCount,height=(n+1)*rise/marker.stepCount;
      steps.push({center:{x:startWorld.x+(endWorld.x-startWorld.x)*along,y:startWorld.y+height/2,z:startWorld.z+(endWorld.z-startWorld.z)*along},width:marker.width,depth:run/marker.stepCount,height,yaw});
    }
    connections.push({id:marker.id,startWorld,endWorld,upperLandingWorld,landingResidualMetres,rise,run,inclineDegrees:Math.atan2(rise,run)*180/Math.PI,footprintWorld:footprint.map(p=>({x:p.x+lowOffset.x,z:p.z+lowOffset.z})),upperLandingFootprintWorld:landing.map(p=>({x:p.x+upperOffset.x,z:p.z+upperOffset.z})),steps,upperVoid:opening,lowerCeilingCutout:{floorId:lower.id,roomId:lowerRoom.id,boundary:lowerCutout},markerOnly:true,visibleInSeparatedFloors:false});
    warnings.push(`${marker.id}: conceptual marker only; declared step count/incline are not structural or code-compliance approval, and Walk traversal is not enabled`);
  }
  return {connections,issues,warnings};
}

/** Two measured anchors can verify translation; rotation disagreement remains explicit. */
export function translationFromAnchors(pairs:readonly Readonly<{local:Point2;world:Point2}>[],tolerance=.02):Readonly<{status:"translation"|"needs-rotation-or-review";offset:Point2;maximumResidual:number}> {
  if(pairs.length<2||pairs.some(p=>!finitePoint(p.local)||!finitePoint(p.world))||!Number.isFinite(tolerance)||tolerance<0)throw new Error("At least two finite anchor pairs are required");
  if(pairs.every(p=>distance(p.local,pairs[0]!.local)<EPS)||pairs.every(p=>distance(p.world,pairs[0]!.world)<EPS))throw new Error("Anchor baseline is degenerate");
  const offset={x:pairs.reduce((sum,p)=>sum+p.world.x-p.local.x,0)/pairs.length,z:pairs.reduce((sum,p)=>sum+p.world.z-p.local.z,0)/pairs.length};
  const residual=Math.max(...pairs.map(p=>Math.hypot(p.local.x+offset.x-p.world.x,p.local.z+offset.z-p.world.z)));
  return {status:residual<=tolerance?"translation":"needs-rotation-or-review",offset,maximumResidual:residual};
}
