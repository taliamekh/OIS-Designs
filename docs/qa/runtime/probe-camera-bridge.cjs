/* Execute the actual CameraBridge with deterministic hook commits and real Three cameras. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {load,mobile,sources}=require('./probe-domain.cjs'),ts=require(path.join(mobile,'node_modules/typescript')),THREE=require(path.join(mobile,'node_modules/three'));
const D=load('src/domain/project.ts'),G=load('src/domain/geometry.ts'),W=load('src/scene/walk.ts'),T=load('src/scene/touches.ts'),C=load('src/scene/camera.ts');
const viewportFile=path.join(mobile,'src/scene/Viewport.tsx'),viewport=fs.readFileSync(viewportFile,'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
sources['mobile/src/scene/Viewport.tsx']=sha(viewport);
const ast=ts.createSourceFile(viewportFile,viewport,ts.ScriptTarget.Latest,true),node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='CameraBridge');assert.ok(node,'Actual CameraBridge declaration required');
const compiled=ts.transpileModule(node.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const picking=fs.existsSync(path.join(mobile,'src/scene/picking.ts'))?load('src/scene/picking.ts'):{};
function harness(width,height){
 const slots=[],queue=[],controller={current:null},camera=new THREE.PerspectiveCamera(43,width/height,.05,150),scene=new THREE.Scene(),gl={},invalidations={count:0};let cursor=0;
 const invalidate=()=>invalidations.count++;
 function same(a,b){return !!a&&!!b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));}
 function ref(value){const i=cursor++;return slots[i]??(slots[i]={current:value});}
 function memo(fn,deps){const i=cursor++,old=slots[i];if(!old||!same(old.deps,deps))slots[i]={deps,value:fn()};return slots[i].value;}
 function effect(fn,deps,layout){const i=cursor++,old=slots[i];if(!old||!same(old.deps,deps)){slots[i]={deps,cleanup:old?.cleanup};queue.push({i,fn,layout});}}
 const bindings={THREE,useThree:()=>({camera,scene,gl,invalidate}),useRef:ref,useMemo:memo,useLayoutEffect:(fn,deps)=>effect(fn,deps,true),useEffect:(fn,deps)=>effect(fn,deps,false),inside:G.inside,projectToSegment:G.projectToSegment,walkMove:D.walkMove,placementAssets:[],walkSpawn:W.walkSpawn,fitCamera:C.fitCamera,clippingRange:C.clippingRange,pinchMetrics:T.pinchMetrics,pickItem:picking.pickItem,sceneSnapshot:()=>null,__DEV__:false,globalThis:{}};
 const bridge=new Function(...Object.keys(bindings),compiled+'\nreturn CameraBridge;')(...Object.values(bindings));
 return {camera,controller,render(props){cursor=0;queue.length=0;camera.aspect=width/height;camera.updateProjectionMatrix();bridge({props,width,height,controller,setDraft:()=>{}});for(const layout of [true,false])for(const e of queue.filter(e=>e.layout===layout)){slots[e.i].cleanup?.();slots[e.i].cleanup=e.fn();}return camera.position.toArray();}};
}
const interaction=(project,overrides={})=>({floor:project.floors[0],room:project.floors[0].rooms[0],mode:'3d',selected:null,quickMove:true,grid:true,allRooms:false,onCommit:()=>{throw Error('Unexpected geometry commit');},onSelect:()=>{},...overrides});
function containment(camera,props){camera.updateMatrixWorld();const floors=props.allFloors||[props.floor],corners=[];for(const f of floors){const rooms=props.allFloors||props.allRooms?f.rooms:[props.room];for(const r of rooms)for(const p of r.polygon)for(const y of [0,r.ceiling??f.ceiling])corners.push(new THREE.Vector3(p.x+(props.allFloors?f.alignment.x:0),y+(props.allFloors?f.elevation:0),p.z+(props.allFloors?f.alignment.z:0)).project(camera));}return {maxX:Math.max(...corners.map(p=>Math.abs(p.x))),maxY:Math.max(...corners.map(p=>Math.abs(p.y))),maxDepth:Math.max(...corners.map(p=>p.z)),minDepth:Math.min(...corners.map(p=>p.z))};}
function fits(value){return value.maxX<=.901&&value.maxY<=.721&&value.maxDepth<=1&&value.minDepth>=-1;}
const checks=[];function check(id,fn){try{checks.push({id,pass:true,observed:fn()});}catch(error){checks.push({id,pass:false,error:String(error),observed:error.observed});}}
function requireFit(observed){if(observed.some(v=>!fits(v.containment))){const error=Error('Actual CameraBridge leaves committed visible bounds outside its fit margin');error.observed=observed;throw error;}}
check('STRUCTURAL-RESIZE-UNDO-REDO',()=>{
 const p=D.makeProject('living',4.8,3.8,2.7),f=p.floors[0],h={past:[],present:p,future:[]},changed=D.execute(h,{type:'room-dimensions',floorId:f.id,roomId:f.rooms[0].id,width:40,depth:30,ceiling:null},'3d',[]);assert.equal(changed.error,null);
 const undone=D.travelHistory(changed.history,'undo','3d'),redone=D.travelHistory(undone.history,'redo','3d'),e=harness(390,773),observed=[];
 for(const [step,history] of [['initial',h],['apply',changed.history],['undo',undone.history],['redo',redone.history]]){const props=interaction(history.present);const camera=e.render(props);observed.push({step,camera,containment:containment(e.camera,props)});}requireFit(observed);return observed;
});
check('WHOLE-FLOOR-MIXED-HEIGHT',()=>{
 const p=D.makeProject('living',4,4,2.7),f=p.floors[0],r=D.makeRoom('bedroom','Tall room',G.shapePolygon('rectangle',4,4,{x:4,z:0}));r.ceiling=8;f.rooms.push(r);f.walls=G.rebuildWalls(f.rooms);
 const e=harness(844,325),observed=[];for(const room of f.rooms){const props=interaction(p,{allRooms:true,room});const camera=e.render(props);observed.push({activeCeiling:room.ceiling??f.ceiling,camera,containment:containment(e.camera,props)});}requireFit(observed);return observed;
});
check('ALL-FLOOR-ALIGNMENT-UPDATE',()=>{
 const p=D.makeProject('living',4,4,2.7),upper=D.makeFloor('Upper',3.2);upper.alignment={x:10,z:-5};upper.ceiling=4.6;upper.rooms=[D.makeRoom('bedroom','Upper room',G.shapePolygon('rectangle',4,4))];upper.walls=G.rebuildWalls(upper.rooms);p.floors.push(upper);
 const h={past:[],present:p,future:[]},changed=D.execute(h,{type:'floor-settings',floorId:upper.id,name:upper.name,elevation:upper.elevation,ceiling:upper.ceiling,alignment:{x:35,z:-15}},'3d',[]);assert.equal(changed.error,null);
 const e=harness(390,773),observed=[];for(const [step,project] of [['initial',p],['alignment-edit',changed.history.present]]){const props=interaction(project,{allFloors:project.floors});const camera=e.render(props);observed.push({step,camera,containment:containment(e.camera,props)});}requireFit(observed);return observed;
});
check('ORDINARY-FINISH-SELECTION-DOES-NOT-RESET-ORBIT',()=>{
 const p=D.makeProject('living',4.8,3.8,2.7),e=harness(390,773);e.render(interaction(p));e.controller.current.down(10,10);e.controller.current.move(70,30,[{x:70,y:30}]);e.controller.current.up();const orbited=e.camera.position.toArray();
 const next=JSON.parse(JSON.stringify(p));next.floors[0].rooms[0].floorFinish={id:'slate',repeat:1.4,angle:30};const after=e.render(interaction(next,{selected:'qa-selection'}));assert.deepEqual(after,orbited);return {orbited,after};
});
const changedSources=Object.entries(sources).filter(([relative,h])=>sha(fs.readFileSync(path.join(mobile,'..',relative)))!==h).map(([r])=>r);
const at=new Date().toISOString(),run=path.join(__dirname,'runs',at.replaceAll(/[:.]/g,'-')+'-camera-bridge');fs.mkdirSync(run,{recursive:true});const result={at,sources,stableSources:!changedSources.length,changedSources,checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,scope:'Actual extracted production CameraBridge and helpers with deterministic React-like hook dependency commits and real Three projection. No Canvas/GL renderer,native touch or physical-device claim.'};fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,checks:checks.map(({id,pass,error})=>({id,pass,error})),artifact:path.join(run,'result.json')}));process.exitCode=result.failed||changedSources.length?1:0;
