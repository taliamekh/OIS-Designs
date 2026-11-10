/** Gesture math for the unadopted wall-placement draft. No pointer listeners/app writes. */
import type {Vec3} from '../../src/viewPlan.js';
import type {WallPlacementRequest,WallPlacementResult} from '../../next-wall/src/wallPlacement.js';
import {proposeWallPlacement} from '../../next-wall/src/wallPlacement.js';
export type WallDragAnchor=Readonly<{
 itemId:string;assetId:string;assetVersion:string;assetHash:string;
 wallId:string;wallRevision:string;floorId:string;roomId:string;
 floorOffset:Vec3;depth:number;alongOffset:number;heightOffset:number;
 start:Readonly<{x:number;z:number;yaw:number;elevation:number}>;
}>;
type Capture=Readonly<{status:'drag-anchor';anchor:WallDragAnchor}>|Readonly<{status:'blocked';reason:string}>;
const EPS=1e-6,finite=(p:Vec3)=>[p.x,p.y,p.z].every(Number.isFinite);
export function captureWallDrag(r:WallPlacementRequest,worldHit:Vec3):Capture {
 if(!r.canEdit||r.mode==='walk')return {status:'blocked',reason:'read-only-view'};if(r.item.locked)return {status:'blocked',reason:'item-locked'};
 const f=r.face,i=r.item,a=r.asset,n=f.inward,len=Math.hypot(f.b.x-f.a.x,f.b.z-f.a.z),elevation=i.elevation??0;
 if(r.anchor!=='wall'||r.frame!=='-Z-front/+Z-rear')return {status:'blocked',reason:'wall-anchor-or-authored-frame-required'};
 if(f.floorId!==r.activeFloorId||f.roomId!==r.activeRoomId||i.roomId!==r.activeRoomId)return {status:'blocked',reason:'wrong-active-room-or-floor'};
 if(!finite(worldHit)||!finite(r.floorOffset)||len<EPS||![i.x,i.z,i.yaw,elevation,...a.bounds.min,...a.bounds.max].every(Number.isFinite))return {status:'blocked',reason:'invalid-drag-hit-or-pose'};
 if(i.assetId!==a.id||i.assetVersion!==a.version||i.assetHash!==a.sha256||f.revision!==r.currentWallRevision)return {status:'blocked',reason:'drag-identity-unresolved'};
 if(Math.abs(-Math.sin(i.yaw)-n.x)>EPS||Math.abs(-Math.cos(i.yaw)-n.z)>EPS||Math.abs((i.x-f.a.x)*n.x+(i.z-f.a.z)*n.z-a.bounds.max[2]!)>EPS)return {status:'blocked',reason:'item-is-not-on-this-wall-face'};
 const tx=(f.b.x-f.a.x)/len,tz=(f.b.z-f.a.z)/len,hit={x:worldHit.x-r.floorOffset.x,y:worldHit.y-r.floorOffset.y,z:worldHit.z-r.floorOffset.z},depth=(hit.x-f.a.x)*n.x+(hit.z-f.a.z)*n.z,localX=Math.cos(i.yaw)*(hit.x-i.x)-Math.sin(i.yaw)*(hit.z-i.z);
 if(depth< -EPS||depth>a.bounds.max[2]!-a.bounds.min[2]!+EPS||hit.y<elevation+a.bounds.min[1]!-EPS||hit.y>elevation+a.bounds.max[1]!+EPS||localX<a.bounds.min[0]!-EPS||localX>a.bounds.max[0]!+EPS)return {status:'blocked',reason:'picked-point-outside-item-cage'};
 const anchor:WallDragAnchor=Object.freeze({itemId:i.id,assetId:a.id,assetVersion:a.version,assetHash:a.sha256,wallId:f.wallId,wallRevision:f.revision,floorId:f.floorId,roomId:f.roomId,floorOffset:Object.freeze({...r.floorOffset}),depth:Math.max(0,depth),alongOffset:(i.x-hit.x)*tx+(i.z-hit.z)*tz,heightOffset:elevation-hit.y,start:Object.freeze({x:i.x,z:i.z,yaw:i.yaw,elevation})});return {status:'drag-anchor',anchor};
}
export function proposeWallDrag(r:WallPlacementRequest,a:WallDragAnchor):WallPlacementResult {
 const blocked=(reason:string):WallPlacementResult=>({status:'blocked',reason});if(!r.canEdit||r.mode==='walk')return blocked('read-only-view');if(r.item.locked)return blocked('item-locked');
 const f=r.face,i=r.item;if(i.id!==a.itemId||i.assetId!==a.assetId||i.assetVersion!==a.assetVersion||i.assetHash!==a.assetHash||f.wallId!==a.wallId||f.revision!==a.wallRevision||f.floorId!==a.floorId||f.roomId!==a.roomId||r.floorOffset.x!==a.floorOffset.x||r.floorOffset.y!==a.floorOffset.y||r.floorOffset.z!==a.floorOffset.z||i.x!==a.start.x||i.z!==a.start.z||i.yaw!==a.start.yaw||(i.elevation??0)!==a.start.elevation)return blocked('drag-context-changed');
 if(!finite(r.ray.origin)||!finite(r.ray.direction)||![a.depth,a.alongOffset,a.heightOffset].every(Number.isFinite))return blocked('invalid-drag-ray');
 const n=f.inward,den=r.ray.direction.x*n.x+r.ray.direction.z*n.z;if(den>=-EPS)return blocked('ray-does-not-face-inside-wall');
 const signed=(r.ray.origin.x-r.floorOffset.x-f.a.x)*n.x+(r.ray.origin.z-r.floorOffset.z-f.a.z)*n.z,t=(a.depth-signed)/den;if(!Number.isFinite(t)||t<0)return blocked('grab-plane-behind-ray');
 // Intersect the parallel plane THROUGH the picked point, then feed its along/Y
 // coordinates to the existing wall constraint. The model rear remains flush.
 const hit={x:r.ray.origin.x+t*r.ray.direction.x,y:r.ray.origin.y+t*r.ray.direction.y,z:r.ray.origin.z+t*r.ray.direction.z};
 return proposeWallPlacement({...r,grab:{along:a.alongOffset,height:a.heightOffset},ray:{origin:{x:hit.x+n.x*.5,y:hit.y,z:hit.z+n.z*.5},direction:{x:-n.x,y:0,z:-n.z}}});
}
