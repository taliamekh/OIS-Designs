import { AssetRecord, Floor, Item, Opening, Point, Room, Wall } from './types';

export const EPS = 1e-5;
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
export const bounds = (points: Point[]) => ({ minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) });
export const area = (p: Point[]) => p.reduce((sum, a, i) => { const b = p[(i + 1) % p.length]; return sum + a.x * b.z - b.x * a.z; }, 0) / 2;
export function projectToSegment(p: Point, a: Point, b: Point) {
  const len = distance(a, b); const t = len < EPS ? 0 : Math.max(0, Math.min(1, ((p.x-a.x)*(b.x-a.x)+(p.z-a.z)*(b.z-a.z))/(len*len)));
  const point = lerp(a, b, t); return { point, t, distance: distance(p, point), offset: t * len };
}
export function inside(p: Point, polygon: Point[], margin = 0): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const edge = projectToSegment(p, a, b);
    if (edge.distance < margin - EPS) return false;
    if (edge.distance < EPS) return margin <= EPS;
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x) result = !result;
  }
  return result;
}
function orient(a: Point, b: Point, c: Point) { return (b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x); }
export function validPolygon(p: Point[]): boolean {
  if (p.length < 3 || p.length > 64 || p.some(v => !Number.isFinite(v.x) || !Number.isFinite(v.z)) || Math.abs(area(p)) < .25) return false;
  for (let i=0;i<p.length;i++) {
    if (distance(p[i],p[(i+1)%p.length]) < .15) return false;
    for (let j=i+1;j<p.length;j++) {
      if (j===i+1 || (i===0 && j===p.length-1)) continue;
      const a=p[i], b=p[(i+1)%p.length], c=p[j], d=p[(j+1)%p.length];
      if (orient(a,b,c)*orient(a,b,d)<=0 && orient(c,d,a)*orient(c,d,b)<=0 && Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))+EPS && Math.max(Math.min(a.z,b.z),Math.min(c.z,d.z))<=Math.min(Math.max(a.z,b.z),Math.max(c.z,d.z))+EPS) return false;
    }
  }
  return true;
}
const coordKey = (p: Point) => `${Math.round(p.x*10000)},${Math.round(p.z*10000)}`;
/** Split collinear edges at every vertex so partial shared walls have one identity. */
export function rebuildWalls(rooms: Room[], previous: Wall[] = []): Wall[] {
  const result = new Map<string, Wall>(); const vertices = rooms.flatMap(r => r.polygon);
  for (const room of rooms) for (let i=0;i<room.polygon.length;i++) {
    const a=room.polygon[i], b=room.polygon[(i+1)%room.polygon.length];
    const points = [a,b,...vertices.filter(p => projectToSegment(p,a,b).distance<EPS)].sort((p,q)=>projectToSegment(p,a,b).t-projectToSegment(q,a,b).t).filter((p,j,all)=>j===0 || distance(p,all[j-1])>EPS);
    for (let j=0;j<points.length-1;j++) {
      const reversed=coordKey(points[j])>coordKey(points[j+1]); const start=reversed?points[j+1]:points[j], end=reversed?points[j]:points[j+1];
      const id=`wall:${coordKey(start)}:${coordKey(end)}`;
      let wall=result.get(id); if (!wall) { wall={id,a:start,b:end,thickness:previous.find(w=>w.id===id)?.thickness??.12,faces:[]}; result.set(id,wall); }
      wall.faces.push({roomId:room.id,reversed});
    }
  }
  return [...result.values()];
}
export function footprint(item: Pick<Item,'x'|'z'|'yaw'>, asset: AssetRecord, padding=0): Point[] {
  const [x0,,z0]=asset.bounds.min, [x1,,z1]=asset.bounds.max; const c=Math.cos(item.yaw),s=Math.sin(item.yaw);
  return [[x0-padding,z0-padding],[x1+padding,z0-padding],[x1+padding,z1+padding],[x0-padding,z1+padding]].map(([x,z])=>({x:item.x+x*c+z*s,z:item.z-x*s+z*c}));
}
export function overlaps(a: Point[], b: Point[], gap=0): boolean {
  for (const p of [a,b]) for (let i=0;i<p.length;i++) {
    const q=p[(i+1)%p.length], dx=q.x-p[i].x,dz=q.z-p[i].z,len=Math.hypot(dx,dz); const axis={x:-dz/len,z:dx/len};
    const pa=a.map(v=>v.x*axis.x+v.z*axis.z),pb=b.map(v=>v.x*axis.x+v.z*axis.z);
    if (Math.max(...pa)<=Math.min(...pb)-gap+EPS || Math.max(...pb)<=Math.min(...pa)-gap+EPS) return false;
  }
  return true;
}
export function canPlace(floor: Floor, room: Room, item: Item, asset: AssetRecord, assets: AssetRecord[]): string | null {
  const fp=footprint(item,asset), margin=room.trim.profile==='none'?0:room.trim.projection;
  if (!fp.every(p=>inside(p,room.polygon,margin))) return 'Keep the full furniture footprint inside the room and clear of trim.';
  // Concave outlines also need edge sampling; endpoints alone can cross an L-shape notch.
  if (fp.some((a,i)=>Array.from({length:9},(_,j)=>lerp(a,fp[(i+1)%4],(j+1)/10)).some(p=>!inside(p,room.polygon,margin)))) return 'The footprint crosses a wall.';
  if (asset.dimensionsMetres.height>(room.ceiling??floor.ceiling)-.02) return 'This item exceeds the room ceiling height.';
  for (const other of floor.items) { if(other.id===item.id || other.roomId!==room.id) continue; const model=assets.find(a=>a.id===other.assetId); if(model && overlaps(fp,footprint(other,model),.005)) return 'Furniture footprints overlap. Choose a clear position.'; }
  for (const opening of floor.openings) {
    const wall=floor.walls.find(w=>w.id===opening.wallId); if(!wall || !wall.faces.some(f=>f.roomId===room.id) || !['single','double'].includes(opening.type)) continue;
    const face=wall.faces.find(f=>f.roomId===room.id)!; const len=distance(wall.a,wall.b), ux=(wall.b.x-wall.a.x)/len, uz=(wall.b.z-wall.a.z)/len, sign=face.reversed?-1:1;
    const start=lerp(wall.a,wall.b,opening.offset/len),end=lerp(wall.a,wall.b,(opening.offset+opening.width)/len),reach=opening.type==='double'?opening.width/2:opening.width;
    const swing=[start,end,{x:end.x-uz*reach*sign,z:end.z+ux*reach*sign},{x:start.x-uz*reach*sign,z:start.z+ux*reach*sign}];
    if(overlaps(fp,swing)) return 'Keep the door swing area clear.';
  }
  return null;
}
export function openingError(floor: Floor, opening: Opening): string | null {
  const wall=floor.walls.find(w=>w.id===opening.wallId); if(!wall) return 'Choose an existing wall.';
  const len=distance(wall.a,wall.b); const ceiling=Math.min(...wall.faces.map(f=>floor.rooms.find(r=>r.id===f.roomId)?.ceiling??floor.ceiling));
  if (![opening.width,opening.height,opening.offset,opening.sill].every(Number.isFinite) || opening.width<.3 || opening.height<.3 || opening.sill<0 || opening.offset<.08 || opening.offset+opening.width>len-.08+EPS) return 'Opening needs at least 8 cm of wall at both corners.';
  if(opening.sill+opening.height>ceiling-.05) return 'Opening exceeds the lowest ceiling on this wall.';
  if(floor.openings.some(o=>o.id!==opening.id && o.wallId===opening.wallId && Math.max(o.offset,opening.offset)<Math.min(o.offset+o.width,opening.offset+opening.width)+.08)) return 'This opening overlaps another opening or its frame.';
  if (opening.type==='pocket' && (wall.thickness<.15 || (opening.hinge==='left'?opening.offset:len-opening.offset-opening.width)<opening.width+.08)) return 'Pocket doors need a ≥15 cm wall and an unobstructed full-width pocket beside the opening.';
  if(opening.type==='sliding' && (opening.hinge==='left'?opening.offset:len-opening.offset-opening.width)<opening.width) return 'A sliding door needs a full-width clear travel section beside it.';
  return null;
}
export function openingDimensions(floor: Floor, opening: Opening) {
  const wall=floor.walls.find(w=>w.id===opening.wallId); if(!wall) return [];
  const len=distance(wall.a,wall.b);
  return wall.faces.map(face=>({ roomId:face.roomId, name:floor.rooms.find(r=>r.id===face.roomId)?.name??'Room', before:face.reversed?len-opening.offset-opening.width:opening.offset, after:face.reversed?opening.offset:len-opening.offset-opening.width }));
}
export function shapePolygon(shape: string, width: number, depth: number, origin: Point={x:0,z:0}): Point[] {
  const p=shape==='l'?[{x:0,z:0},{x:width,z:0},{x:width,z:depth*.5},{x:width*.55,z:depth*.5},{x:width*.55,z:depth},{x:0,z:depth}]:[{x:0,z:0},{x:width,z:0},{x:width,z:depth},{x:0,z:depth}];
  return p.map(v=>({x:v.x+origin.x,z:v.z+origin.z}));
}
export const toDisplay=(metres:number,unit:'m'|'ft')=>unit==='ft'?metres/.3048:metres;
export const toMetres=(value:number,unit:'m'|'ft')=>unit==='ft'?value*.3048:value;
export function measure(value:number,unit:'m'|'ft') { if(unit==='m')return `${value.toFixed(2)} m`; const inches=Math.round(value/.0254);return `${Math.floor(inches/12)}′ ${inches%12}″`; }
