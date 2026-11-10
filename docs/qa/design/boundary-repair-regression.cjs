const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const mobile=path.resolve(__dirname,'../../../mobile'),{createLoader}=require('./source-loader.cjs'),{load}=createLoader(mobile);
const g=load('src/domain/geometry.ts'),p=load('src/domain/project.ts'),s=load('src/domain/persistence.ts'),m=load('src/scene/meshes.ts'),{openingLeaves}=load('src/scene/openingPose.ts'),base=load('src/catalogue/assets.json')[0];
const sourceFiles=['src/domain/geometry.ts','src/domain/project.ts','src/domain/persistence.ts','src/scene/meshes.ts','src/scene/openingPose.ts'];
const hashes=()=>Object.fromEntries(sourceFiles.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,f))).digest('hex')]));
const report={timestamp:new Date().toISOString(),evidence:'Production domain execution with analytic synthetic box fixtures and installed renderer contracts. Real GLB triangle probes are separate. Not device/render acceptance.',before:hashes(),checks:[]};
function check(id,fn){try{const observed=fn();report.checks.push({id,pass:true,observed});}catch(e){report.checks.push({id,pass:false,error:e.stack});}}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`),history=present=>({past:[],present,future:[]});
function fixture(){const project=p.makeProject('living',6,5),floor=project.floors[0],room=floor.rooms[0];return{project,floor,room,wall:floor.walls.find(w=>w.a.z===0&&w.b.z===0)};}
function model(lo=0,hi=.5,width=.1){return{...base,id:'qa-physical-box',version:'qa1',sha256:'a'.repeat(64),stage:'accepted',placement:{anchor:'floor'},bounds:{min:[-width/2,lo,-.05],max:[width/2,hi,.05]},dimensionsMetres:{width,depth:.1,height:hi-lo}};}
function object(room,asset,x=1.5,z=.075){return{id:'qa-box',roomId:room.id,assetId:asset.id,assetVersion:asset.version,assetHash:asset.sha256,x,z,yaw:0,locked:false,materialOverrides:{}};}
const cases=[
 {id:'solid-wall-blocks',allowed:false},
 {id:'empty-doorway-remains-clear',type:'open',allowed:true},
 {id:'doorway-lintel-blocks-tall-box',type:'open',hi:2.2,allowed:false},
 {id:'low-window-sill-blocks-box',type:'window',sill:.9,height:1.1,allowed:false},
 {id:'box-within-recess-clears-sill-and-lintel',type:'window',sill:.9,height:1.1,lo:.95,hi:1.5,allowed:true},
 {id:'glazing-still-blocks',type:'window',sill:.9,height:1.1,lo:.95,hi:1.5,z:.055,allowed:false},
 {id:'low-box-blocked-by-projected-trim',z:.12,trim:.035,allowed:false},
 {id:'elevated-box-clears-low-trim',lo:.2,hi:.7,z:.12,trim:.035,allowed:true},
 {id:'no-trim-control',z:.12,profile:'none',allowed:true},
 {id:'jamb-projection-blocks',type:'open',x:.975,z:.12,width:.04,allowed:false},
 {id:'jamb-safe-control',type:'open',x:.975,z:.14,width:.04,allowed:true},
];
for(const c of cases)for(const reverse of[false,true])check(c.id+(reverse?'/reverse':''),()=>{
 const f=fixture();if(reverse){f.room.polygon.reverse();f.floor.walls=g.rebuildWalls(f.floor.rooms);f.wall=f.floor.walls.find(w=>w.a.z===0&&w.b.z===0);}
 f.room.trim.projection=c.trim??.016;f.room.trim.profile=c.profile??'flat';
 if(c.type)f.floor.openings.push({id:'qa-opening',wallId:f.wall.id,type:c.type,offset:1,width:1,height:c.height??2.1,sill:c.sill??0,hinge:'left',flip:false});
 const asset=model(c.lo??0,c.hi??.5,c.width??.1),item=object(f.room,asset,c.x??1.5,c.z??.075),error=g.canPlace(f.floor,f.room,item,asset,[asset]);
 assert.equal(!error,c.allowed,error);const old=history(f.project),before=JSON.stringify(old),result=p.execute(old,{type:'add-item',floorId:f.floor.id,item},'3d',[asset]);assert.equal(!result.error,c.allowed,result.error);assert.equal(JSON.stringify(old),before);if(!c.allowed)assert.strictEqual(result.history,old);return{allowed:!error,error};
});
for(const reverse of[false,true])check('inside-dimensions-unequal'+(reverse?'/reverse':''),()=>{
 const f=fixture();if(reverse){f.room.polygon.reverse();f.floor.walls=g.rebuildWalls(f.floor.rooms);}
 for(const w of f.floor.walls)w.thickness=w.a.x===6&&w.b.x===6?.3:w.a.z===0&&w.b.z===0?.15:.12;
 const d=g.roomInsideDimensions(f.floor,f.room);near(d.width,5.79);near(d.depth,4.865);return d;
});
check('new-inside-project-and-resize-history',()=>{
 const project=p.makeProject('living',5,4,2.7,'rectangle',undefined,'inside'),f=project.floors[0],r=f.rooms[0];let d=g.roomInsideDimensions(f,r);near(d.width,5);near(d.depth,4);near(g.bounds(r.polygon).maxX,5.12);
 const old=history(project),before=JSON.stringify(project),edited=p.execute(old,{type:'room-dimensions',floorId:f.id,roomId:r.id,width:6,depth:3,ceiling:null,dimensionMode:'inside'},'2d',[]);assert.equal(edited.error,null);const ef=edited.history.present.floors[0];d=g.roomInsideDimensions(ef,ef.rooms[0]);near(d.width,6);near(d.depth,3);const undone=p.travelHistory(edited.history,'undo','2d');assert.equal(JSON.stringify(undone.history.present),before);return d;
});
check('unchanged-clear-input-retains-exact-reference-polygon',()=>{const f=fixture(),d=g.roomInsideDimensions(f.floor,f.room),ref=g.referenceDimensionsForInside(f.floor,f.room,d.width,d.depth);assert.deepEqual(ref,{width:6,depth:5});const result=p.execute(history(f.project),{type:'room-dimensions',floorId:f.floor.id,roomId:f.room.id,width:d.width,depth:d.depth,ceiling:null,dimensionMode:'inside'},'2d',[]);assert.equal(result.error,null);assert.deepEqual(result.history.present.floors[0].rooms[0].polygon,f.room.polygon);});
check('slanted-outline-clear-resize-preserves-thickness',()=>{
 const f=fixture();f.room.polygon=[{x:0,z:0},{x:6,z:0},{x:5,z:5},{x:1,z:5}];f.floor.walls=g.rebuildWalls(f.floor.rooms);f.floor.walls.forEach((w,i)=>w.thickness=[.12,.3,.15,.12][i]);const current=g.roomInsideDimensions(f.floor,f.room),result=p.execute(history(f.project),{type:'room-dimensions',floorId:f.floor.id,roomId:f.room.id,width:current.width+1,depth:current.depth+.7,ceiling:null,dimensionMode:'inside'},'2d',[]);assert.equal(result.error,null);const ef=result.history.present.floors[0],actual=g.roomInsideDimensions(ef,ef.rooms[0]);near(actual.width,current.width+1);near(actual.depth,current.depth+.7);assert.deepEqual(ef.walls.map(w=>w.thickness).sort(),f.floor.walls.map(w=>w.thickness).sort());return actual;
});
check('inside-shared-face-corners-use-each-room-walls',()=>{
 const f=fixture(),k=p.makeRoom('kitchen','Kitchen',g.shapePolygon('rectangle',4,5,{x:6,z:0}));f.floor.rooms.push(k);f.floor.walls=g.rebuildWalls(f.floor.rooms);const shared=f.floor.walls.find(w=>w.faces.length===2);shared.thickness=.3;for(const w of f.floor.walls)if(w.a.z===0&&w.b.z===0)w.thickness=w.faces[0].roomId===k.id?.3:.15;
 const opening={id:'qa-door',wallId:shared.id,type:'open',offset:1.2,width:.9,height:2.1,sill:0,hinge:'left',flip:false};f.floor.openings.push(opening);const dims=g.openingInsideDimensions(f.floor,opening);for(const face of shared.faces){const span=g.wallFaceInsideSpan(f.floor,shared,face.roomId);near(span.low,face.roomId===k.id?.15:.075);near(span.high,4.94);const row=dims.find(x=>x.roomId===face.roomId),before=1.2-span.low,after=4.94-1.2-.9;near(row.before,face.reversed?after:before);near(row.after,face.reversed?before:after);}return dims;
});
check('legacy-overlap-load-is-byte-preserved-and-can-be-moved-out',()=>{
 const f=fixture(),asset=model(),item=object(f.room,asset);item.locked=true;f.floor.items.push(item);const h=history(f.project),library={version:1,projects:[h],activeId:f.project.id,favourites:[],recent:[],settings:{unit:'m',grid:true,quickMove:true,appearance:'system'},lastDoor:{type:'single',width:.9,height:2.1,hinge:'left',flip:false,repeat:true}},raw=s.encode(library),loaded=s.decode(raw);assert.equal(JSON.stringify(loaded),JSON.stringify(library));const before=JSON.stringify(h);assert.ok(p.execute(h,{type:'transform',floorId:f.floor.id,itemId:item.id,x:2,z:2,yaw:0},'3d',[asset]).error);assert.equal(JSON.stringify(h),before);const unlocked=p.execute(h,{type:'lock',floorId:f.floor.id,itemId:item.id,locked:false},'3d',[asset]);assert.equal(unlocked.error,null);const moved=p.execute(unlocked.history,{type:'transform',floorId:f.floor.id,itemId:item.id,x:2,z:2,yaw:0},'3d',[asset]);assert.equal(moved.error,null);const undone=p.travelHistory(moved.history,'undo','3d');assert.equal(undone.history.present.floors[0].items[0].z,item.z);assert.ok(p.travelHistory(moved.history,'undo','walk').error);return{bytes:raw.length};
});
check('mesh-hole-and-trim-interval-contract-identical',()=>{let count=0;for(const type of['open','window','single','sliding','pocket'])for(const hinge of['left','right']){const f=fixture();f.wall.thickness=.3;const o={id:'qa',wallId:f.wall.id,type,offset:2,width:.9,height:2.1,sill:type==='window'?.4:0,hinge,flip:false};f.floor.openings.push(o);assert.deepEqual(g.physicalWallPieces(f.wall,f.floor.openings,2.7),m.wallPieces(f.wall,f.floor.openings,2.7));assert.deepEqual(g.physicalTrimIntervals(f.wall,f.floor),m.trimIntervals(f.wall,f.floor));for(const walk of[false,true])assert.deepEqual(g.doorLeafPoses(o,f.wall.thickness,walk),openingLeaves(o,f.wall.thickness,walk));count++;}return{fixtures:count};});
check('full-motion-envelope-conservatively-encloses-actual-panel-corners',()=>{
 let count=0;for(const angle of[0,Math.PI/2,.62])for(const type of['single','double'])for(const hinge of['left','right'])for(const flip of[false,true]){
  const wall={id:'w',a:{x:1,z:-2},b:{x:1+6*Math.cos(angle),z:-2+6*Math.sin(angle)},thickness:.12,faces:[]},o={id:'o',wallId:'w',type,offset:2,width:type==='double'?1.6:.9,height:2.1,sill:0,hinge,flip};
  const envelopes=g.openingMotionEnvelopes(wall,o),side=flip?-1:1,leaves=type==='double'?[true,false]:[hinge==='left'];
  for(let step=0;step<=100;step++)for(let leaf=0;leaf<leaves.length;leaf++){const left=leaves[leaf],w=type==='double'?o.width/2:o.width,yaw=left?-side*step*Math.PI/200:Math.PI+side*step*Math.PI/200,pivot=o.offset+(left?0:o.width);for(const x of[0,w])for(const z of[-.0175,.0175]){const lx=pivot+x*Math.cos(yaw)+z*Math.sin(yaw),lz=side*.02-x*Math.sin(yaw)+z*Math.cos(yaw),point={x:wall.a.x+lx*Math.cos(angle)-lz*Math.sin(angle),z:wall.a.z+lx*Math.sin(angle)+lz*Math.cos(angle)};assert.ok(g.inside(point,envelopes[leaf]),JSON.stringify({angle,type,hinge,flip,step,leaf,point}));count++;}}
 }return{cornerSamples:count};
});
report.after=hashes();report.stableSource=JSON.stringify(report.before)===JSON.stringify(report.after);report.passed=report.checks.filter(c=>c.pass).length;report.failed=report.checks.filter(c=>!c.pass).length;fs.writeFileSync(path.join(__dirname,'boundary-repair-regression.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({...report,checks:report.checks.filter(c=>!c.pass)},null,2)+'\n');if(report.failed)process.exitCode=1;
