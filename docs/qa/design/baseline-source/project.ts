import { AssetRecord, defaultTrim, Floor, History, newId, Opening, Project, Room, RoomKind, Finish, Trim, FloorFinish, Item, Point } from './types';
import { bounds, canPlace, distance, inside, openingError, overlaps, rebuildWalls, shapePolygon, validPolygon } from './geometry';

export function makeRoom(kind:RoomKind,name:string,polygon:Point[]):Room { return { id:newId('room'),name,kind,polygon,ceiling:null,floorFinish:{id:'white-oak',repeat:2,angle:0},wallFaces:{},trim:{...defaultTrim},trimOverrides:{} }; }
export function makeFloor(name='Ground floor',elevation=0):Floor { return {id:newId('floor'),name,elevation,ceiling:2.7,alignment:{x:0,z:0},rooms:[],walls:[],openings:[],items:[]}; }
export function makeProject(kind:RoomKind,width=4.8,depth=3.8,height=2.7,shape='rectangle',polygon?:Point[]):Project {
  const floor=makeFloor();floor.ceiling=height;floor.rooms=[makeRoom(kind,kind==='living'?'Living room':kind.charAt(0).toUpperCase()+kind.slice(1),polygon??shapePolygon(shape,width,depth))];floor.walls=rebuildWalls(floor.rooms);
  return { id:newId('project'),schemaVersion:1,name:'Untitled project',updatedAt:Date.now(),floors:[floor] };
}
export function sampleProject(assets:AssetRecord[]):Project {
  const p=makeProject('living');p.name='Maple House';const f=p.floors[0],living=f.rooms[0];
  const kitchen=makeRoom('kitchen','Kitchen',shapePolygon('rectangle',3.2,3.8,{x:4.8,z:0}));kitchen.floorFinish.id='slate';f.rooms.push(kitchen);f.walls=rebuildWalls(f.rooms);
  const shared=f.walls.find(w=>w.faces.length===2)!;
  f.openings.push({id:newId('opening'),wallId:shared.id,type:'open',offset:1.5,width:1.1,height:2.1,sill:0,hinge:'left',flip:false});
  const placements=[['sofa',2,2.95,Math.PI],['armchair',3.7,1.5,Math.PI/2],['coffee',1.9,1.65,0]] as const;
  for(const [tag,x,z,yaw] of placements) { const a=assets.find(a=>a.roomTags.includes('living')&&a.theme==='calm-oak'&&(a.subtype.includes(tag)||a.geometryFamily.includes(tag)));if(a) f.items.push({id:newId('item'),roomId:living.id,assetId:a.id,assetVersion:a.version,assetHash:a.sha256,x,z,yaw,locked:false,materialOverrides:{}}); }
  const upper=makeFloor('First floor',3);upper.rooms=[makeRoom('bedroom','Bedroom',shapePolygon('rectangle',4.8,3.8)),makeRoom('bathroom','Bathroom',shapePolygon('rectangle',3.2,3.8,{x:4.8,z:0}))];upper.rooms[1].floorFinish.id='marble';upper.walls=rebuildWalls(upper.rooms);p.floors.push(upper);return p;
}
export type Command =
 | { type:'add-item'; floorId:string; item:Item }
 | { type:'transform'; floorId:string; itemId:string; x:number; z:number; yaw:number }
 | { type:'lock'; floorId:string; itemId:string; locked:boolean }
 | { type:'delete-item'; floorId:string; itemId:string; intentional:boolean }
 | { type:'item-material'; floorId:string; itemId:string; slot:string; colour:string }
 | { type:'room-dimensions'; floorId:string; roomId:string; width:number; depth:number; ceiling:number|null }
 | { type:'floor-finish'; floorId:string; roomId:string; finish:FloorFinish }
 | { type:'wall-finish'; floorId:string; roomId:string; wallId:string|'all'; finish:Finish }
 | { type:'trim'; floorId:string; roomId:string; wallId?:string; trim:Trim }
 | { type:'opening'; floorId:string; opening:Opening }
 | { type:'delete-opening'; floorId:string; openingId:string }
 | { type:'wall-thickness'; floorId:string; wallId:string; thickness:number }
 | { type:'add-room'; floorId:string; room:Room }
 | { type:'room-polygon'; floorId:string; roomId:string; polygon:Point[] }
 | { type:'add-floor'; floor:Floor }
 | { type:'floor-settings'; floorId:string; name:string; elevation:number; ceiling:number; alignment:Point }
 | { type:'rename'; name:string };
export type CommandResult={history:History;error:string|null};
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
export function execute(history:History,command:Command,mode:'2d'|'3d'|'walk',assets:AssetRecord[]):CommandResult {
  const fail=(error:string):CommandResult=>({history,error});
  if(mode==='walk')return fail('Walk is read-only. Exit Walk to edit.');
  const p=clone(history.present);const f='floorId' in command?p.floors.find(f=>f.id===command.floorId):undefined;
  if('floorId' in command && !f)return fail('Floor no longer exists.');
  const room=f&&'roomId' in command?f.rooms.find(r=>r.id===command.roomId):undefined;
  if('roomId' in command && !room)return fail('Room no longer exists.');
  const item=f&&'itemId' in command?f.items.find(i=>i.id===command.itemId):undefined;
  if('itemId' in command && !item)return fail('Item no longer exists.');
  let error:string|null=null;
  if(command.type==='rename')p.name=command.name.trim().slice(0,80)||'Untitled project';
  if(command.type==='add-floor')p.floors.push(command.floor);
  if(command.type==='floor-settings'&&f){ if(![command.elevation,command.ceiling,command.alignment.x,command.alignment.z].every(Number.isFinite)||command.ceiling<1.8||command.ceiling>8)return fail('Use a ceiling height from 1.8 to 8 metres and finite alignment.');Object.assign(f,{name:command.name.trim()||f.name,elevation:command.elevation,ceiling:command.ceiling,alignment:command.alignment}); }
  if(command.type==='add-room'&&f){if(!validPolygon(command.room.polygon))return fail('Draw a closed outline without crossing walls. Minimum area 0.25 m².');if(f.rooms.some(r=>overlaps(r.polygon,command.room.polygon)))return fail('New room overlaps an existing room. Place it beside the current plan.');f.rooms.push(command.room);f.walls=rebuildWalls(f.rooms,f.walls);}
  if(command.type==='room-polygon'&&f&&room){if(!validPolygon(command.polygon))return fail('Outline is invalid or crosses itself.');room.polygon=command.polygon;f.walls=rebuildWalls(f.rooms,f.walls);}
  if(command.type==='room-dimensions'&&f&&room){
    if(![command.width,command.depth].every(Number.isFinite)||command.width<.5||command.depth<.5||command.width>50||command.depth>50|| (command.ceiling!==null&&(!Number.isFinite(command.ceiling)||command.ceiling<1.8||command.ceiling>8)))return fail('Use room dimensions 0.5–50 m and ceiling 1.8–8 m.');
    const b=bounds(room.polygon);room.polygon=room.polygon.map(v=>({x:b.minX+(v.x-b.minX)*command.width/(b.maxX-b.minX),z:b.minZ+(v.z-b.minZ)*command.depth/(b.maxZ-b.minZ)}));room.ceiling=command.ceiling;
    if(f.rooms.some(r=>r.id!==room.id&&overlaps(r.polygon,room.polygon)))return fail('Resizing would overlap another room. Edit the outline or neighbouring room first.');
    f.walls=rebuildWalls(f.rooms,f.walls);
  }
  if(command.type==='add-item'&&f){ const a=assets.find(a=>a.id===command.item.assetId),r=f.rooms.find(r=>r.id===command.item.roomId);if(!a||!r)return fail('Asset or room is unavailable.');if(f.items.some(i=>i.id===command.item.id))return fail('Item ID already exists.');error=canPlace(f,r,command.item,a,assets);if(!error)f.items.push(command.item); }
  if(command.type==='transform'&&f&&item){if(item.locked)return fail('Unlock the selected item to move or rotate it.');if(![command.x,command.z,command.yaw].every(Number.isFinite))return fail('Position must contain finite numbers.');Object.assign(item,{x:command.x,z:command.z,yaw:command.yaw});}
  if(command.type==='lock'&&item)item.locked=command.locked;
  if(command.type==='delete-item'&&f&&item){if(!command.intentional)return fail('Select the item and use Delete intentionally.');f.items=f.items.filter(i=>i.id!==item.id);}
  if(command.type==='item-material'&&item){if(!/^#[\da-f]{6}$/i.test(command.colour))return fail('Use a six-digit HEX colour.');const a=assets.find(a=>a.id===item.assetId);if(!a?.variantSlots.includes(command.slot))return fail('This model does not expose that material slot.');item.materialOverrides[command.slot]=command.colour;}
  if(command.type==='floor-finish'&&room){if(!Number.isFinite(command.finish.repeat)||command.finish.repeat<.2||command.finish.repeat>10||!Number.isFinite(command.finish.angle))return fail('Repeat size must be 0.2–10 m.');room.floorFinish=command.finish;}
  if(command.type==='wall-finish'&&room&&f){if(!/^#[\da-f]{6}$/i.test(command.finish.colour))return fail('Use a six-digit HEX colour.');const walls=f.walls.filter(w=>w.faces.some(face=>face.roomId===room.id));if(command.wallId!=='all'&&!walls.some(w=>w.id===command.wallId))return fail('Choose a wall face in the current room.');for(const w of walls)if(command.wallId==='all'||command.wallId===w.id)room.wallFaces[w.id]=command.finish;}
  if(command.type==='trim'&&room){if(![command.trim.height,command.trim.projection].every(Number.isFinite)||command.trim.height<.02||command.trim.height>.5||command.trim.projection<.003||command.trim.projection>.08)return fail('Trim height 2–50 cm, projection 3–80 mm.');if(command.wallId)room.trimOverrides[command.wallId]=command.trim;else room.trim=command.trim;}
  if(command.type==='opening'&&f){error=openingError(f,command.opening);if(!error){f.openings=f.openings.filter(o=>o.id!==command.opening.id);f.openings.push(command.opening);}}
  if(command.type==='delete-opening'&&f)f.openings=f.openings.filter(o=>o.id!==command.openingId);
  if(command.type==='wall-thickness'&&f){const w=f.walls.find(w=>w.id===command.wallId);if(!w||command.thickness<.08||command.thickness>.6)return fail('Wall thickness must be 8–60 cm.');w.thickness=command.thickness;}
  if(error)return fail(error);
  // Revalidate all affected geometry, including existing objects and openings after resizing.
  if(f){
    for(const o of f.openings){error=openingError(f,o);if(error)return fail(`Existing opening: ${error}`);}
    if(['room-dimensions','room-polygon','floor-settings','trim','transform','opening'].includes(command.type))for(const i of f.items){const a=assets.find(a=>a.id===i.assetId),r=f.rooms.find(r=>r.id===i.roomId);if(a&&r){error=canPlace(f,r,i,a,assets);if(error)return fail(`${a.name}: ${error}`);}}
  }
  p.updatedAt=Date.now();return {history:{past:[...history.past,history.present].slice(-50),present:p,future:[]},error:null};
}
export function travelHistory(history:History,direction:'undo'|'redo',mode:'2d'|'3d'|'walk'):CommandResult {
  if(mode==='walk')return {history,error:'Walk is read-only. Exit Walk to edit.'};
  if(direction==='undo'){if(!history.past.length)return {history,error:null};return {history:{past:history.past.slice(0,-1),present:history.past[history.past.length-1],future:[history.present,...history.future].slice(0,50)},error:null};}
  if(!history.future.length)return {history,error:null};return {history:{past:[...history.past,history.present].slice(-50),present:history.future[0],future:history.future.slice(1)},error:null};
}
export function freePosition(f:Floor,r:Room,a:AssetRecord,assets:AssetRecord[]):Item|null {
  const b=bounds(r.polygon);for(let z=b.minZ+.15;z<b.maxZ;z+=.2)for(let x=b.minX+.15;x<b.maxX;x+=.2){const i:Item={id:newId('item'),roomId:r.id,assetId:a.id,assetVersion:a.version,assetHash:a.sha256,x:Math.round(x*100)/100,z:Math.round(z*100)/100,yaw:0,locked:false,materialOverrides:{}};if(!canPlace(f,r,i,a,assets))return i;}return null;
}
/** Collision-aware first-person movement: sample the path to avoid tunnelling. */
export function walkMove(f:Floor,roomId:string,from:Point,to:Point,assets:AssetRecord[]):Point {
  let pos=from;const steps=Math.max(1,Math.ceil(distance(from,to)/.05));
  for(let n=1;n<=steps;n++){const p={x:from.x+(to.x-from.x)*n/steps,z:from.z+(to.z-from.z)*n/steps};const room=f.rooms.find(r=>inside(p,r.polygon,.18));if(!room||room.id!==roomId)break;
    if(f.items.some(i=>{const a=assets.find(a=>a.id===i.assetId);return a&&inside(p,importFootprint(i,a,.18));}))break;pos=p;}
  return pos;
}
function importFootprint(i:Item,a:AssetRecord,padding:number){const c=Math.cos(i.yaw),s=Math.sin(i.yaw);return [[a.bounds.min[0]-padding,a.bounds.min[2]-padding],[a.bounds.max[0]+padding,a.bounds.min[2]-padding],[a.bounds.max[0]+padding,a.bounds.max[2]+padding],[a.bounds.min[0]-padding,a.bounds.max[2]+padding]].map(([x,z])=>({x:i.x+x*c+z*s,z:i.z-x*s+z*c}));}
