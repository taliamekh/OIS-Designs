/** Transport proposals for an attached family. No production schema or history writes. */
import type {AssetBounds,SpatialItem} from './viewPlan.js';
import type {SurfaceAttachment} from './supportPlacement.js';
import {attachedPose} from './supportPlacement.js';
export type ItemPose=Readonly<{x:number;z:number;yaw:number;elevation:number}>;
export type FamilyPatch=Readonly<{itemId:string;pose:ItemPose}>;
export type FamilyProposal=Readonly<{
 status:'validated-family-proposal';rootItemId:string;contextToken:string;sourceSignature:string;
 patches:readonly FamilyPatch[];detachRoot:boolean;
}>;
export type FamilyResult=FamilyProposal|Readonly<{status:'blocked';reason:string;itemId?:string}>;
export type FamilyRequest=Readonly<{
 items:readonly SpatialItem[];attachments:Readonly<Record<string,SurfaceAttachment>>;
 rootItemId:string;pose:ItemPose;detachRoot?:boolean;contextToken:string;
 canEdit:boolean;mode:'3d'|'walk';resolve:(item:SpatialItem)=>AssetBounds|undefined;
 /** Must validate the entire proposed family against the same room/wall/support/
  * ceiling/obstacle snapshot. Transport alone is never clearance acceptance. */
 validateAll:(items:readonly SpatialItem[],movingIds:ReadonlySet<string>)=>Readonly<{valid:boolean;reason?:string}>;
}>;
const pose=(i:SpatialItem):ItemPose=>({x:i.x,z:i.z,yaw:i.yaw,elevation:i.elevation??0});
const valid=(p:ItemPose)=>Object.values(p).every(Number.isFinite);
const near=(a:ItemPose,b:ItemPose)=>Math.abs(a.x-b.x)<1e-6&&Math.abs(a.z-b.z)<1e-6&&Math.abs(a.yaw-b.yaw)<1e-6&&Math.abs(a.elevation-b.elevation)<1e-6;
const itemState=(i:SpatialItem)=>({id:i.id,roomId:i.roomId,assetId:i.assetId,assetVersion:i.assetVersion,assetHash:i.assetHash,locked:i.locked,...pose(i)});
const attachmentState=(a:SurfaceAttachment)=>({parentItemId:a.parentItemId,surfaceId:a.surfaceId,parentAssetId:a.parentAssetId,parentAssetVersion:a.parentAssetVersion,parentAssetHash:a.parentAssetHash,localX:a.localX,localZ:a.localZ,localElevation:a.localElevation,relativeYaw:a.relativeYaw});
const liveProposals=new WeakSet<object>();
export function supportSceneSignature(items:readonly SpatialItem[],attachments:Readonly<Record<string,SurfaceAttachment>>):string {
 return JSON.stringify({items:items.map(itemState).sort((a,b)=>a.id.localeCompare(b.id)),attachments:Object.entries(attachments).sort(([a],[b])=>a.localeCompare(b)).map(([id,a])=>[id,attachmentState(a)])});
}
export function proposeSupportFamilyMove(r:FamilyRequest):FamilyResult {
 const blocked=(reason:string,itemId?:string):FamilyResult=>({status:'blocked',reason,...(itemId?{itemId}:{})});
 if(!r.canEdit||r.mode==='walk')return blocked('read-only-view');
 if(!r.contextToken||!valid(r.pose))return blocked('invalid-context-or-root-pose');
 const byId=new Map(r.items.map(i=>[i.id,i]));if(byId.size!==r.items.length)return blocked('duplicate-scene-item-id');
 const root=byId.get(r.rootItemId);if(!root)return blocked('root-item-missing');
 if(r.attachments[root.id]&&!r.detachRoot)return blocked('root-still-attached',root.id);
 const children=new Map<string,string[]>();for(const [id,a]of Object.entries(r.attachments)){const list=children.get(a.parentItemId)??[];list.push(id);children.set(a.parentItemId,list)}
 const moving=new Set<string>(),ordered:SpatialItem[]=[],active=new Set<string>();let failure:FamilyResult|undefined;
 function visit(id:string){
  if(failure)return;if(active.has(id)){failure=blocked('attachment-cycle',id);return;}if(moving.has(id))return;
  const item=byId.get(id);if(!item){failure=blocked('attached-item-missing',id);return;}
  if(item.roomId!==root!.roomId){failure=blocked('family-crosses-room',id);return;}
  if(item.locked){failure=blocked('family-item-locked',id);return;}
  const asset=r.resolve(item);if(!asset||asset.id!==item.assetId||asset.version!==item.assetVersion||asset.sha256!==item.assetHash){failure=blocked('family-revision-unresolved',id);return;}
  if(!valid(pose(item))){failure=blocked('invalid-current-item-pose',id);return;}
  active.add(id);moving.add(id);ordered.push(item);for(const child of [...(children.get(id)??[])].sort())visit(child);active.delete(id);
 }
 visit(root.id);if(failure)return failure;
 const next=new Map<string,SpatialItem>(),patches:FamilyPatch[]=[];
 for(const item of ordered){
  let nextPose:ItemPose;
  if(item.id===root.id)nextPose={...r.pose};else{
   const a=r.attachments[item.id]!,parent=byId.get(a.parentItemId)!,movedParent=next.get(a.parentItemId);
   if(!movedParent)return blocked('attachment-parent-order',item.id);
   try{if(!near(attachedPose(a,parent),pose(item)))return blocked('stale-attached-item-pose',item.id);nextPose=attachedPose(a,movedParent)}catch{return blocked('attachment-parent-identity-or-pose-invalid',item.id)}
  }
  const moved={...item,...nextPose};next.set(item.id,moved);patches.push({itemId:item.id,pose:nextPose});
 }
 const candidates=Object.freeze(r.items.map(i=>Object.freeze({...next.get(i.id)??i})));let clearance:ReturnType<FamilyRequest['validateAll']>;
 try{clearance=r.validateAll(candidates,moving)}catch{return blocked('family-clearance-provider-failed')}
 if(!clearance.valid)return blocked(clearance.reason??'family-clearance-rejected');
 const proposal:FamilyProposal=Object.freeze({status:'validated-family-proposal',rootItemId:root.id,contextToken:r.contextToken,sourceSignature:supportSceneSignature(r.items,r.attachments),patches:Object.freeze(patches.map(p=>Object.freeze({...p,pose:Object.freeze({...p.pose})}))),detachRoot:!!r.detachRoot});liveProposals.add(proposal);return proposal;
}

/** Immutable proposal materialization only. Production must commit its result as one
 * domain command/Undo step after the same guards and full scene context check. */
export function materializeSupportFamily<T extends SpatialItem>(items:readonly T[],attachments:Readonly<Record<string,SurfaceAttachment>>,proposal:FamilyProposal,contextToken:string,canEdit:boolean,mode:'3d'|'walk'):
 Readonly<{status:'materialized-proposal';items:readonly T[];attachments:Readonly<Record<string,SurfaceAttachment>>}>|Readonly<{status:'blocked';reason:string}> {
 if(!canEdit||mode==='walk')return {status:'blocked',reason:'read-only-view'};
 if(!liveProposals.has(proposal))return {status:'blocked',reason:'proposal-not-live-or-reconstructed'};
 if(!contextToken||contextToken!==proposal.contextToken||supportSceneSignature(items,attachments)!==proposal.sourceSignature)return {status:'blocked',reason:'proposal-scene-changed'};
 const patches=new Map(proposal.patches.map(p=>[p.itemId,p.pose]));if(patches.size!==proposal.patches.length||!patches.has(proposal.rootItemId)||[...patches.values()].some(p=>!valid(p)))return {status:'blocked',reason:'invalid-family-patches'};
 if(proposal.patches.some(p=>!items.some(i=>i.id===p.itemId)||items.find(i=>i.id===p.itemId)!.locked))return {status:'blocked',reason:'family-item-missing-or-locked'};
 const nextItems=items.map(i=>patches.has(i.id)?{...i,...patches.get(i.id)!}:i),nextAttachments={...attachments};if(proposal.detachRoot)delete nextAttachments[proposal.rootItemId];
 return {status:'materialized-proposal',items:nextItems,attachments:nextAttachments};
}
