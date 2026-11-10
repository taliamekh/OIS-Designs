import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SharedTextureBank} from '/furniture/review/shared-texture-bank.js';
import {createScenePlan,physicalWallPlan,boundsCorners} from '/dist/viewPlan.js';

const fixture=await fetch('/fixtures/six-room-house.json').then(r=>r.json());
const project=fixture.project,canonicalJSON=JSON.stringify(project);
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o)}return o};freeze(project);
const assets=new Map(fixture.assets.map(a=>[`${a.id}|${a.version}|${a.sha256}`,a]));
const resolve=i=>assets.get(`${i.assetId}|${i.assetVersion}|${i.assetHash}`);
const host=document.querySelector('#canvas'),scene=new THREE.Scene();scene.background=new THREE.Color('#e9ece5');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;host.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(43,1,.02,300),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=.2;controls.maxDistance=100;
scene.add(new THREE.HemisphereLight(0xffffff,0x909c87,2.2));
for(const [x,y,z,intensity] of [[-8,13,-6,2.3],[10,12,7,1.9]]){const l=new THREE.DirectionalLight(0xffffff,intensity);l.position.set(x,y,z);scene.add(l)}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#d9dfd3',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.20;scene.add(ground);
const bank=new SharedTextureBank(),loader=new GLTFLoader(),floorGroups=new Map(),wallGroups=new Map(),roomGroups=new Map(),itemRoots=new Map(),ceilingMeshes=new Map();
const state={activeFloorId:'ground',roomId:'living',scope:'room',shell:'cutaway',ceilings:false,separated:false,preset:'perspective',selected:null,interior:false};
const cameraDirection={perspective:[1.2,.95,1.65],top:[0,1,.001],front:[0,.23,1]};
let plan=null,priorWalls={},selectionHelper=null,disposed=false,frames=0,lastFrame=performance.now(),lastWallUpdate=0;const frameTimes=[];
const wallMaterial=new THREE.MeshStandardMaterial({color:'#e4e1d5',roughness:.83}),casingMaterial=new THREE.MeshStandardMaterial({color:'#f1eee4',roughness:.6});
const texture=await new THREE.TextureLoader().loadAsync('/furniture/materials/v1/wood-neutral-base.png');texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.5,1.5);
const floorColours={living:'#c8ac84',kitchen:'#b2b1a3',entry:'#c2a47c',bedroom:'#cfb58e',bathroom:'#8d9a95',office:'#baa17e'};

function roomGeometry(room,slab=false){
 const shape=new THREE.Shape();room.polygon.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
 return slab?new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false}).translate(0,0,-.16).rotateX(-Math.PI/2):new THREE.ShapeGeometry(shape).rotateX(-Math.PI/2);
}
function box(group,x,y,z,w,h,d,material){if(w<1e-6||h<1e-6||d<1e-6)return;const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);group.add(m);return m}
function makeWall(floor,wall){
 const group=new THREE.Group(),len=Math.hypot(wall.b.x-wall.a.x,wall.b.z-wall.a.z);group.position.set(wall.a.x,0,wall.a.z);group.rotation.y=-Math.atan2(wall.b.z-wall.a.z,wall.b.x-wall.a.x);
 const h=Math.max(...wall.faces.map(f=>floor.rooms.find(r=>r.id===f.roomId)?.ceiling??floor.ceiling));
 const holes=floor.openings.filter(o=>o.wallId===wall.id).sort((a,b)=>a.offset-b.offset);let cursor=0;
 for(const o of holes){
  box(group,(cursor+o.offset)/2,h/2,0,o.offset-cursor,h,wall.thickness,wallMaterial);
  box(group,o.offset+o.width/2,(o.sill+o.height+h)/2,0,o.width,h-o.sill-o.height,wall.thickness,wallMaterial);
  box(group,o.offset+o.width/2,o.sill/2,0,o.width,o.sill,wall.thickness,wallMaterial);
  for(const x of [o.offset-.025,o.offset+o.width+.025])box(group,x,(o.sill+o.height)/2,0,.05,o.sill+o.height,wall.thickness+.035,casingMaterial);
  box(group,o.offset+o.width/2,o.sill+o.height+.025,0,o.width+.1,.05,wall.thickness+.035,casingMaterial);
  cursor=o.offset+o.width;
 }
 box(group,(cursor+len)/2,h/2,0,len-cursor,h,wall.thickness,wallMaterial);
 group.userData.wallKey=`${floor.id}:${wall.id}`;return group;
}
for(const floor of project.floors){
 const group=new THREE.Group();scene.add(group);floorGroups.set(floor.id,group);
 for(const room of floor.rooms){
  const rg=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:floorColours[room.kind],map:room.kind==='bathroom'?null:texture,roughness:.8});rg.add(new THREE.Mesh(roomGeometry(room,true),material));group.add(rg);roomGroups.set(`${floor.id}:${room.id}`,rg);
  const ceil=new THREE.Mesh(roomGeometry(room),new THREE.MeshStandardMaterial({color:'#ecebe1',side:THREE.DoubleSide,roughness:1}));ceil.position.y=room.ceiling??floor.ceiling;group.add(ceil);ceilingMeshes.set(`${floor.id}:${room.id}`,ceil);
 }
 for(const wall of floor.walls){const wg=makeWall(floor,wall);group.add(wg);wallGroups.set(`${floor.id}:${wall.id}`,wg)}
}
let loaded=0;
for(const floor of project.floors)for(const item of floor.items){
 const asset=resolve(item),gltf=await loader.loadAsync('/furniture/'+asset.file);await bank.bind(gltf);const root=gltf.scene;root.position.set(item.x,0,item.z);root.rotation.y=item.yaw;root.userData.itemId=item.id;
 root.traverse(o=>{if(o.isMesh)o.userData.itemId=item.id});floorGroups.get(floor.id).add(root);itemRoots.set(item.id,root);loaded++;document.querySelector('#status').textContent=`Loading furniture · ${loaded}/40`;
}
function request(){return {activeFloorId:state.activeFloorId,scope:state.scope==='room'?{kind:'room',roomId:state.roomId}:{kind:state.scope},mode:state.interior?'walk':'3d',shell:state.shell,camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z},showCeilings:state.ceilings,separatedFloorGap:state.separated?2.8:0,selectedItemId:state.selected,previousWallVisibility:priorWalls}}
function updateWalls(){
 if(!plan)return;const req=request();for(const fp of plan.floors){const f=project.floors.find(f=>f.id===fp.id),rooms=new Set(fp.roomIds);
  for(const w of f.walls){const decision=physicalWallPlan(f,w,rooms,fp.displayOffset,req),group=wallGroups.get(`${f.id}:${w.id}`);group.visible=decision?.visible??false;if(decision)priorWalls[decision.key]=decision.visible}
 }
}
function rebuild(fit=true){
 plan=createScenePlan(project,resolve,request());
 for(const f of project.floors){const fp=plan.floors.find(p=>p.id===f.id),group=floorGroups.get(f.id);group.visible=!!fp;if(!fp)continue;group.position.set(fp.displayOffset.x,fp.displayOffset.y,fp.displayOffset.z);
  for(const r of f.rooms){const shown=fp.roomIds.includes(r.id);roomGroups.get(`${f.id}:${r.id}`).visible=shown;ceilingMeshes.get(`${f.id}:${r.id}`).visible=shown&&fp.ceilingsVisible}
  for(const item of f.items)itemRoots.get(item.id).visible=fp.itemIds.includes(item.id);
 }
 controls.enabled=!state.interior;updateWalls();if(fit)fitView();syncUI();renderer.render(scene,camera);return plan;
}
function fitView(){
 if(!plan?.displayBounds)return;
 if(state.interior){const f=project.floors.find(f=>f.id===state.activeFloorId),r=f.rooms.find(r=>r.id===state.roomId),off=plan.floors.find(p=>p.id===f.id).displayOffset;
  const minX=Math.min(...r.polygon.map(p=>p.x)),maxX=Math.max(...r.polygon.map(p=>p.x)),minZ=Math.min(...r.polygon.map(p=>p.z)),maxZ=Math.max(...r.polygon.map(p=>p.z));camera.position.set(off.x+(minX+maxX)/2,off.y+1.6,off.z+maxZ-.65);controls.target.set(off.x+(minX+maxX)/2,off.y+1.5,off.z+minZ);camera.lookAt(controls.target);camera.near=.04;camera.far=150;camera.updateProjectionMatrix();return}
 const b=plan.displayBounds,center=new THREE.Vector3((b.min.x+b.max.x)/2,(b.min.y+b.max.y)/2,(b.min.z+b.max.z)/2),dir=new THREE.Vector3(...cameraDirection[state.preset]).normalize();
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right).normalize();const tanY=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanX=tanY*camera.aspect;let distance=.5;
 for(const p of boundsCorners(b)){const delta=new THREE.Vector3(p.x,p.y,p.z).sub(center),depth=delta.dot(dir);distance=Math.max(distance,depth+Math.abs(delta.dot(right))/(tanX*.83),depth+Math.abs(delta.dot(up))/(tanY*.80))}
 camera.position.copy(center).addScaledVector(dir,distance+.2);controls.target.copy(center);camera.near=Math.max(.01,distance/3000);camera.far=Math.max(100,distance*5);camera.updateProjectionMatrix();controls.update();updateWalls();
}
function resize(){renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();if(plan)fitView()}new ResizeObserver(resize).observe(host);resize();
function update(patch={},fit=true){Object.assign(state,patch);populateRooms();if(state.scope!=='house')state.separated=false;if(state.interior){state.scope='floor';state.separated=false}return rebuild(fit)}
function populateRooms(){const select=document.querySelector('#room'),f=project.floors.find(f=>f.id===state.activeFloorId);select.replaceChildren();for(const r of f.rooms){const o=new Option(r.name,r.id);select.add(o)}if(!f.rooms.some(r=>r.id===state.roomId))state.roomId=f.rooms[0].id;select.value=state.roomId}
function syncUI(){
 document.querySelector('#floor').value=state.activeFloorId;document.querySelector('#room').value=state.roomId;
 for(const b of document.querySelectorAll('[data-scope]'))b.setAttribute('aria-pressed',String(b.dataset.scope===state.scope));for(const b of document.querySelectorAll('[data-shell]'))b.setAttribute('aria-pressed',String(b.dataset.shell===state.shell));for(const b of document.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(b.dataset.preset===state.preset));
 document.querySelector('#separate').checked=state.separated;document.querySelector('#separate').disabled=state.scope!=='house'||state.interior;document.querySelector('#ceilings').checked=state.ceilings;document.querySelector('#inspect').setAttribute('aria-pressed',String(state.interior));document.querySelector('#inspect').textContent=state.interior?'Exit interior':'Interior';
 const label=state.interior?'Interior · read-only':state.scope==='house'?'House overview · read-only':state.scope==='floor'?'Whole floor':'Current room';document.querySelector('#status').textContent=label+(state.separated?' · floors separated':'');
 if(state.selected){const item=project.floors.flatMap(f=>f.items).find(i=>i.id===state.selected),a=resolve(item);document.querySelector('#selection').textContent=a.name+(item.locked?' · locked':'')}else document.querySelector('#selection').textContent='';
}
function toggleSheet(open){document.querySelector('#sheet').hidden=!open;document.querySelector('#views').setAttribute('aria-expanded',String(open))}
document.querySelector('#views').onclick=()=>toggleSheet(document.querySelector('#sheet').hidden);document.querySelector('#close').onclick=()=>toggleSheet(false);
document.querySelector('#fit').onclick=fitView;document.querySelector('#inspect').onclick=()=>update({interior:!state.interior,selected:null});
for(const f of project.floors)document.querySelector('#floor').add(new Option(f.name,f.id));populateRooms();document.querySelector('#floor').onchange=e=>{state.activeFloorId=e.target.value;populateRooms();update({selected:null,scope:"floor",interior:false})};document.querySelector('#room').onchange=e=>update({roomId:e.target.value,scope:'room',selected:null,interior:false});
for(const b of document.querySelectorAll('[data-scope]'))b.onclick=()=>update({scope:b.dataset.scope,interior:false});for(const b of document.querySelectorAll('[data-shell]'))b.onclick=()=>update({shell:b.dataset.shell,interior:false});for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>update({preset:b.dataset.preset,interior:false});
document.querySelector('#ceilings').onchange=e=>update({ceilings:e.target.checked},false);document.querySelector('#separate').onchange=e=>update({separated:e.target.checked});document.querySelector('#large').onchange=e=>{document.body.classList.toggle('large',e.target.checked);resize()};
let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});renderer.domElement.addEventListener('pointerup',e=>{
 if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const rect=renderer.domElement.getBoundingClientRect(),ndc=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),ray=new THREE.Raycaster();ray.setFromCamera(ndc,camera);let selected=null;
 for(const hit of ray.intersectObjects(scene.children,true)){let visible=true;for(let o=hit.object;o;o=o.parent)if(!o.visible)visible=false;if(!visible||!hit.object.isMesh)continue;if(hit.object.userData.itemId){selected=hit.object.userData.itemId;break}const m=Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material;if(!m.transparent||m.opacity>.99)break}
 if(selectionHelper){selectionHelper.geometry.dispose();selectionHelper.material.dispose();scene.remove(selectionHelper);selectionHelper=null}state.selected=selected;if(selected){selectionHelper=new THREE.BoxHelper(itemRoots.get(selected),0x4c835c);selectionHelper.material.depthTest=false;scene.add(selectionHelper)}rebuild(false);
});
controls.addEventListener('change',()=>updateWalls());
function disposeAll(){if(disposed)return;disposed=true;controls.dispose();const textures=new Set(),materials=new Set(),geometries=new Set(),managed=new Set();for(const root of itemRoots.values())for(const t of bank.releaseTree(root))managed.add(t);scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t)}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)if(!managed.has(t)){t.dispose();if(t.source?.data?.close)t.source.data.close()}scene.clear();renderer.render(scene,camera)}
function snapshot(){return {state:{...state},plan,canonicalProjectJSON:JSON.stringify(project),projectUnchanged:JSON.stringify(project)===canonicalJSON,loadedModels:loaded,visibleModels:[...itemRoots.values()].filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true}).length,memory:{...renderer.info.memory},render:{...renderer.info.render},bank:bank.snapshot(),camera:{position:camera.position.toArray(),target:controls.target.toArray(),aspect:camera.aspect,near:camera.near,far:camera.far},frameTimes:frameTimes.slice(-180),scope:'Browser-only authored fixture; prototype controls, not integrated Expo/native evidence'}}
window.spatialReview={ready:true,fixture,project,state,scene,camera,controls,renderer,update,fitView,snapshot,disposeAll};rebuild();
function frame(now){if(disposed)return;frames++;frameTimes.push(now-lastFrame);if(frameTimes.length>240)frameTimes.shift();lastFrame=now;controls.update();if(now-lastWallUpdate>40){updateWalls();lastWallUpdate=now}if(selectionHelper)selectionHelper.update();renderer.render(scene,camera);requestAnimationFrame(frame)}requestAnimationFrame(frame);
