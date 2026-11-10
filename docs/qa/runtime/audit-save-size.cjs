/* Serialized-size compatibility audit only; no Android/device or real user storage access. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {load,mobile,sources}=require('./probe-domain.cjs');
const D=load('src/domain/project.ts'),G=load('src/domain/geometry.ts'),P=load('src/domain/persistence.ts'),T=load('src/domain/types.ts');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const assetsRaw=fs.readFileSync(path.join(mobile,'src/catalogue/assets.json'));
const assets=JSON.parse(assetsRaw),models=assets.filter(a=>(!a.placement?.anchor||a.placement.anchor==='floor')&&a.dimensionsMetres.width<=1.2&&a.dimensionsMetres.depth<=1.2&&a.dimensionsMetres.height<=2.5).slice(0,10);
if(models.length!==10)throw Error('Ten real bounded floor models are required.');
const id=new Date().toISOString().replaceAll(/[:.]/g,'-')+'-save-size',run=path.join(__dirname,'runs',id);fs.mkdirSync(run,{recursive:true});
const settings={unit:'m',grid:true,quickMove:true,appearance:'dark'},lastDoor={type:'single',width:.9,height:2.1,hinge:'left',flip:false,repeat:true};
const kinds=['living','bedroom','kitchen','office','dining','bathroom','entry','utility','children'];
function makeHouse(count){
  const p=D.makeProject('living',6,6);p.name=`QA house with ${count} items`;p.floors=[];
  const floorCount=count===300?3:2,roomCount=count/10,roomsPerFloor=roomCount/floorCount;
  for(let f=0;f<floorCount;f++){
    const floor=D.makeFloor(f===0?'Ground floor':`Floor ${f+1}`,f*3);
    for(let r=0;r<roomsPerFloor;r++){
      const kind=kinds[(f*roomsPerFloor+r)%kinds.length],ox=(r%5)*6,oz=Math.floor(r/5)*6;
      const room=D.makeRoom(kind,`${T.roomNames[kind]} ${f*roomsPerFloor+r+1}`,G.shapePolygon('rectangle',6,6,{x:ox,z:oz}));
      room.floorFinish={id:r%2?'slate':'white-oak',repeat:2,angle:r%2?Math.PI/2:0};
      floor.rooms.push(room);
      for(let i=0;i<10;i++){
        const a=models[i],item={id:T.newId('item'),roomId:room.id,assetId:a.id,assetVersion:a.version,assetHash:a.sha256,x:ox+.8+(i%3)*1.7,z:oz+.8+Math.floor(i/3)*1.5,yaw:i%2?Math.PI/2:0,locked:i%4===0,materialOverrides:i%2?{[a.variantSlots[0]||'wood']:'#94795f'}:{}};
        const placement=G.canPlace(floor,room,item,a,assets);
        if(placement)throw Error(`Invalid bounded item ${count}/${f}/${r}/${i}: ${placement}`);
        floor.items.push(item);
      }
    }
    floor.walls=G.rebuildWalls(floor.rooms);
    for(const room of floor.rooms){
      const walls=floor.walls.filter(w=>w.faces.some(face=>face.roomId===room.id));
      for(const wall of walls)room.wallFaces[wall.id]={colour:'#dedbd2',texture:'paint',sheen:'eggshell'};
      room.trimOverrides[walls[0].id]={...room.trim,profile:'ogee',colour:'#eeeae2'};
    }
    for(const wall of floor.walls.filter(w=>w.faces.length===2))floor.openings.push({id:T.newId('opening'),wallId:wall.id,type:'open',offset:2.5,width:1,height:2.1,sill:0,hinge:'left',flip:false});
    p.floors.push(floor);
  }
  if(!P.validProject(p))throw Error('Bounded house failed current production validProject.');
  // Check placements again against final shared walls and openings.
  for(const floor of p.floors)for(const item of floor.items){const error=G.canPlace(floor,floor.rooms.find(r=>r.id===item.roomId),item,assets.find(a=>a.id===item.assetId),assets);if(error)throw Error(`Final placement invalid: ${error}`);}
  return p;
}
const bytes=s=>Buffer.byteLength(s,'utf8');
function library(histories){return{version:1,projects:histories,activeId:histories[0].present.id,favourites:[],recent:[],settings,lastDoor};}
(async()=>{
  const cases=[],histories=new Map();
  for(const count of [40,100,300]){
    const started=performance.now(),project=makeHouse(count),fresh={past:[],present:project,future:[]};
    let history=fresh;
    for(let i=1;i<=50;i++){const r=D.execute(history,{type:'rename',name:`QA ${count}-item house revision ${i}`},'3d',assets);if(r.error)throw Error(r.error);history=r.history;}
    histories.set(count,history);
    const l=library([history]),encoded=P.encode(l),decoded=P.decode(encoded);
    const store=new Map(),calls=[],storage={async getItem(key){calls.push({method:'get',key});return store.get(key)??null;},async setItem(key,value){calls.push({method:'set',key,bytes:bytes(value)});store.set(key,value);}};
    // Previous adjacent actual history state becomes the verified backup on the next save.
    const previous=D.travelHistory(history,'undo','3d').history;
    await P.saveLibrary(storage,library([previous]));await P.saveLibrary(storage,l);
    const primary=store.get(P.PRIMARY),backup=store.get(P.BACKUP),payload=JSON.parse(encoded).payload;
    fs.writeFileSync(path.join(run,`house-${count}-primary.json`),primary);fs.writeFileSync(path.join(run,`house-${count}-backup.json`),backup);
    cases.push({count,rooms:project.floors.reduce((n,f)=>n+f.rooms.length,0),floors:project.floors.length,pastStates:history.past.length,presentStates:1,futureStates:history.future.length,decodedItems:decoded.projects[0].present.floors.reduce((n,f)=>n+f.items.length,0),freshBytes:bytes(P.encode(library([fresh]))),payloadBytes:bytes(payload),primaryBytes:bytes(primary),backupBytes:bytes(backup),primaryPlusBackupBytes:bytes(primary)+bytes(backup),primaryMiB:bytes(primary)/1048576,primaryPlusBackupMiB:(bytes(primary)+bytes(backup))/1048576,aboveApprox2MiBEntry:bytes(primary)>2*1048576,aboveDefault6MiBCombined:bytes(primary)+bytes(backup)>6*1048576,desktopEncodeDecodeAndMapSavePassed:true,primarySha256:sha(primary),backupSha256:sha(backup),durationMs:performance.now()-started,calls});
  }
  const multiProjectCases=[];
  for(const {count,projects} of [{count:40,projects:3},{count:100,projects:2}]){
    const hs=[histories.get(count)];
    for(let copy=1;copy<projects;copy++){
      let h={past:[],present:makeHouse(count),future:[]};
      for(let n=1;n<=50;n++){const r=D.execute(h,{type:'rename',name:`QA ${count}-item house ${copy+1} revision ${n}`},'3d',assets);if(r.error)throw Error(r.error);h=r.history;}
      hs.push(h);
    }
    const raw=P.encode(library(hs));P.decode(raw);
    const previous=P.encode(library(hs.map((h,i)=>i===0?D.travelHistory(h,'undo','3d').history:h)));P.decode(previous);
    fs.writeFileSync(path.join(run,`library-${projects}x${count}-primary.json`),raw);
    multiProjectCases.push({projectCount:projects,itemsPerProject:count,totalItems:count*projects,pastStatesPerProject:50,primaryBytes:bytes(raw),previousBackupBytes:bytes(previous),primaryPlusBackupBytes:bytes(raw)+bytes(previous),primaryMiB:bytes(raw)/1048576,primaryPlusBackupMiB:(bytes(raw)+bytes(previous))/1048576,aboveApprox2MiBEntry:bytes(raw)>2*1048576,aboveDefault6MiBCombined:bytes(raw)+bytes(previous)>6*1048576,encodeDecodePassed:true});
  }
  const faultCalls=[];let injectedPrimaryReadFailure;
  try{await P.loadLibrary({async getItem(key){faultCalls.push(key);if(key===P.PRIMARY)throw Error('QA injected primary read rejection (not an Android execution)');return fs.readFileSync(path.join(run,'house-40-backup.json'),'utf8');},async setItem(){throw Error('No write is expected in this read-only fault probe.');}});injectedPrimaryReadFailure={rejected:false,calls:faultCalls};}
  catch(e){injectedPrimaryReadFailure={rejected:true,error:String(e),calls:faultCalls,backupAttempted:faultCalls.includes(P.BACKUP),scope:'Injected adapter get rejection only. Does not reproduce Android CursorWindow behavior.'};}
  const asyncRoot=path.join(mobile,'node_modules/@react-native-async-storage/async-storage'),nativeFiles=['package.json','android/config.gradle','android/build.gradle','android/gradle.properties','android/src/main/java/com/reactnativecommunity/asyncstorage/ReactDatabaseSupplier.java','android/src/main/java/com/reactnativecommunity/asyncstorage/AsyncStorageModule.java','android/src/javaPackage/java/com/reactnativecommunity/asyncstorage/AsyncStoragePackage.java'];
  const nativeHashes=Object.fromEntries(nativeFiles.map(r=>[r,sha(fs.readFileSync(path.join(asyncRoot,r)))]));
  const afterHashes=Object.fromEntries(Object.keys(sources).map(r=>[r,sha(fs.readFileSync(path.resolve(mobile,'..',r)))]));
  const result={at:new Date().toISOString(),id,scope:'Real model identity bytes, bounded valid layouts, actual production full-snapshot history/encode/decode/saveLibrary against an in-memory Map. No installed device backend, SQLite CursorWindow, Android failure, disk fullness or physical performance was executed.',assumptions:{undoStates:50,totalSnapshotsPerProject:51,backup:'previous adjacent complete saved library',otherStoredKeysExcluded:true,cursorThreshold:'Official approximately2MB per entry; actual device CursorWindow configuration is unknown.',databaseThreshold:'Installed legacy supplier default6*1024*1024 bytes, unless overridden; database/page overhead and recovery archives excluded.'},installedAsyncStorage:JSON.parse(fs.readFileSync(path.join(asyncRoot,'package.json'))).version,sourceHashes:sources,stableSourceFiles:Object.entries(sources).every(([r,h])=>afterHashes[r]===h),catalogueSha256:sha(assetsRaw),nativeHashes,models:models.map(a=>({id:a.id,version:a.version,sha256:a.sha256,dimensions:a.dimensionsMetres})),cases,officialSources:['https://react-native-async-storage.github.io/2.0/advanced/Limits/','https://react-native-async-storage.github.io/2.0/advanced/IncreaseDbSize/','https://react-native-async-storage.github.io/2.0/advanced/Next/']};
  result.multiProjectCases=multiProjectCases;result.injectedPrimaryReadFailure=injectedPrimaryReadFailure;
  fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));process.stdout.write(JSON.stringify({id,stableSourceFiles:result.stableSourceFiles,cases:cases.map(({calls,...c})=>c),multiProjectCases,injectedPrimaryReadFailure,artifact:path.join(run,'result.json')})+'\n');
})().catch(e=>{fs.writeFileSync(path.join(run,'harness-error.txt'),e.stack);console.error(e);process.exitCode=1;});
