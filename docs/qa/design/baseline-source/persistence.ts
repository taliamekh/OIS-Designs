import { History, Project } from './types';
import { validPolygon } from './geometry';
export type Library = { version:1; projects:History[]; activeId:string|null; favourites:string[]; recent:string[]; settings:{unit:'m'|'ft'; grid:boolean; quickMove:boolean; appearance:'system'|'light'|'dark'}; lastDoor:{type:'single'|'double'|'sliding'|'pocket'|'open';width:number;height:number;hinge:'left'|'right';flip:boolean;repeat:boolean} };
export interface StorageAdapter { getItem(key:string):Promise<string|null>; setItem(key:string,value:string):Promise<void> }
export const PRIMARY='ois.library.v1', BACKUP='ois.library.v1.backup';
export const checksum=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
export function validProject(p:Project):boolean {
  if(!p||p.schemaVersion!==1||typeof p.id!=='string'||typeof p.name!=='string'||!Array.isArray(p.floors)||!p.floors.length)return false;
  const ids=new Set<string>();const id=(s:string)=>{if(typeof s!=='string'||ids.has(s))return false;ids.add(s);return true;};
  try{return p.floors.every(f=>id(f.id)&&Number.isFinite(f.elevation)&&Number.isFinite(f.ceiling)&&f.ceiling>=1.8&&Number.isFinite(f.alignment.x)&&Number.isFinite(f.alignment.z)&&Array.isArray(f.rooms)&&f.rooms.every(r=>id(r.id)&&validPolygon(r.polygon)&&(r.ceiling===null||Number.isFinite(r.ceiling))&&r.floorFinish&&r.trim&&r.wallFaces&&r.trimOverrides)&&f.items.every(i=>id(i.id)&&f.rooms.some(r=>r.id===i.roomId)&&[i.x,i.z,i.yaw].every(Number.isFinite)&&typeof i.locked==='boolean'&&typeof i.assetId==='string')&&f.walls.every(w=>typeof w.id==='string'&&[w.a.x,w.a.z,w.b.x,w.b.z,w.thickness].every(Number.isFinite)&&w.faces.every(face=>f.rooms.some(r=>r.id===face.roomId)))&&f.openings.every(o=>id(o.id)&&f.walls.some(w=>w.id===o.wallId)&&[o.width,o.height,o.offset,o.sill].every(Number.isFinite)));}catch{return false;}
}
export function encode(library:Library):string { const payload=JSON.stringify(library);return JSON.stringify({schema:1,checksum:checksum(payload),payload}); }
export function decode(raw:string):Library {
  const wrapper=JSON.parse(raw);if(wrapper.schema!==1)throw new Error('This save uses a newer format. Your saved bytes have been preserved.');
  if(typeof wrapper.payload!=='string'||checksum(wrapper.payload)!==wrapper.checksum)throw new Error('Save integrity check failed.');
  const l=JSON.parse(wrapper.payload) as Library;
  if(l.version!==1||!Array.isArray(l.projects)||!l.projects.every(h=>validProject(h.present)&&Array.isArray(h.past)&&Array.isArray(h.future)&&h.past.every(validProject)&&h.future.every(validProject))||!l.settings||!Array.isArray(l.favourites)||!Array.isArray(l.recent)||!l.lastDoor)throw new Error('Save data is incomplete.');
  return l;
}
export async function loadLibrary(storage:StorageAdapter):Promise<{library:Library|null;notice:string|null;protected:boolean}> {
  const primary=await storage.getItem(PRIMARY);if(!primary)return {library:null,notice:null,protected:false};
  try{return {library:decode(primary),notice:null,protected:false};}catch(e){
    // A newer schema must never be downgraded by auto-recovery.
    try{if(JSON.parse(primary).schema!==1)return {library:null,notice:String(e),protected:true};}catch{}
    const backup=await storage.getItem(BACKUP);if(backup)try{return {library:decode(backup),notice:'Recovered the last verified local save. The unreadable save is preserved until your next edit.',protected:false};}catch{}
    return {library:null,notice:'Local save could not be read. It has been preserved. Export it in Settings before starting a fresh library.',protected:true};
  }
}
export async function saveLibrary(storage:StorageAdapter,l:Library):Promise<void> {
  const raw=encode(l);decode(raw);const previous=await storage.getItem(PRIMARY);
  if(previous){try{decode(previous);await storage.setItem(BACKUP,previous);}catch{await storage.setItem(`${PRIMARY}.unreadable`,previous);}}
  await storage.setItem(PRIMARY,raw);
}
