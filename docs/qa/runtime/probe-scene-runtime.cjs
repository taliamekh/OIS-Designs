/* Portable tests of production cache/touch/camera functions. No renderer, browser or native-capability claim. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const qa=__dirname,root=path.resolve(qa,'../../..'),mobile=path.join(root,'mobile');
const ts=require(path.join(mobile,'node_modules/typescript')),THREE=require(path.join(mobile,'node_modules/three'));
const sources={},checks=[];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function load(relative,mocks={},globals={}){const file=path.join(mobile,relative),bytes=fs.readFileSync(file);sources[relative]=sha(bytes);const module={exports:{}};const code=ts.transpileModule(bytes.toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports',...Object.keys(globals),code)(name=>{if(name in mocks)return mocks[name];if(name==='three')return THREE;throw Error('Unmocked runtime dependency '+name);},module,module.exports,...Object.values(globals));return module.exports;}
function check(id,fn){try{const observed=fn();checks.push({id,pass:true,observed});}catch(error){checks.push({id,pass:false,error:String(error),observed:error.observed});}}
function cacheEnv(){let now=1;const timers=[],microtasks=[],clears=[];class Loader{};const useLoader={clear:(loader,key)=>clears.push({loader:loader===THREE.TextureLoader?'texture':'model',key})};const bank=load('src/scene/textureBank.ts');const api=load('src/scene/resources.ts',{'three/examples/jsm/loaders/GLTFLoader.js':{GLTFLoader:Loader},'./fiber':{useLoader},'./textureBank':bank},{setTimeout:(cb,delay)=>timers.push({cb,at:now+delay}),Date:{now:()=>now},Promise:{resolve:()=>({then:cb=>microtasks.push(cb)})}});const tick=(ms=300)=>{now+=ms;let pending;do{while(microtasks.length)microtasks.shift()();pending=timers.filter(t=>t.at<=now);for(const timer of pending){timers.splice(timers.indexOf(timer),1);timer.cb();}}while(pending.length||microtasks.length);};return {api,bank:bank.modelTextureBank,clears,tick,advance:()=>now++};}
function model(){const scene=new THREE.Group(),geometry=new THREE.BoxGeometry(1,1,1),texture=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map:texture});const disposed={geometry:0,material:0,texture:0};geometry.addEventListener('dispose',()=>disposed.geometry++);material.addEventListener('dispose',()=>disposed.material++);texture.addEventListener('dispose',()=>disposed.texture++);scene.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));return {gltf:{scene},disposed};}
check('MODEL-CACHE-REFCOUNTS',()=>{const e=cacheEnv(),m=model(),a=e.api.retainModel('shared',1,m.gltf,100),b=e.api.retainModel('shared',1,m.gltf,100);a();e.tick();assert.equal(e.api.modelCacheStats().active,1);assert.equal(m.disposed.geometry,0);b();e.tick();assert.equal(e.api.modelCacheStats().idle,1);return e.api.modelCacheStats();});
check('MODEL-CACHE-IDLE-COUNT-AND-ACTIVE-RETENTION',()=>{const e=cacheEnv(),active=model();e.api.retainModel('active',0,active.gltf,100);const models=[];for(let i=0;i<12;i++){e.advance();const m=model();models.push(m);e.api.retainModel('idle'+i,i+1,m.gltf,100)();}e.tick();const stats=e.api.modelCacheStats();assert.equal(stats.active,1);assert.equal(stats.idle,8);assert.equal(e.clears.length,4);assert.deepEqual(active.disposed,{geometry:0,material:0,texture:0});for(const m of models.slice(0,4))assert.deepEqual(m.disposed,{geometry:1,material:1,texture:1});return {stats,evicted:e.clears.length};});
check('MODEL-CACHE-IDLE-BYTE-BUDGET',()=>{const e=cacheEnv();for(let i=0;i<4;i++){e.advance();e.api.retainModel('large'+i,i,model().gltf,8*1024*1024)();}e.tick();const stats=e.api.modelCacheStats();assert.equal(stats.idle,2);assert.equal(stats.sourceBytes,16*1024*1024);return stats;});
check('MODEL-CACHE-REACQUIRE-BEFORE-DELAY',()=>{const e=cacheEnv(),target=model();const release=e.api.retainModel('target','target',target.gltf,100);release();const retained=e.api.retainModel('target','target',target.gltf,100);for(let i=0;i<10;i++){e.advance();e.api.retainModel('other'+i,i,model().gltf,100)();}e.tick();assert.equal(e.api.modelCacheStats().active,1);assert.equal(target.disposed.geometry,0);retained();return e.api.modelCacheStats();});
check('TEXTURE-CACHE-BOUNDED-IDLE-SETS',()=>{const e=cacheEnv(),entries=[];const active=[new THREE.Texture(),new THREE.Texture(),new THREE.Texture()];let activeDisposed=0;active.forEach(t=>t.addEventListener('dispose',()=>activeDisposed++));e.api.retainTextureSet('active',[90,91,92],active);for(let i=0;i<7;i++){e.advance();const textures=[new THREE.Texture(),new THREE.Texture(),new THREE.Texture()];const record={disposed:0};textures.forEach(t=>t.addEventListener('dispose',()=>record.disposed++));entries.push(record);e.api.retainTextureSet('texture'+i,[i*3,i*3+1,i*3+2],textures)();}e.tick();assert.equal(e.api.modelCacheStats().textureSets,5);assert.equal(activeDisposed,0);assert.deepEqual(entries.map(r=>r.disposed),[3,3,3,0,0,0,0]);return {stats:e.api.modelCacheStats(),evictedSets:e.clears.length};});
const touches=load('src/scene/touches.ts');
check('SHARED-BANK-DELAYED-COMMIT-RETAINS-LEASE',()=>{
  const e=cacheEnv(),models=[],releases=[],trace=[],imageHash={0:{sha256:'b'.repeat(64),mimeType:'image/png'}};
  const releaseIntent=e.api.retainWantedModels?.(Array.from({length:14},(_,i)=>'pending'+i));
  trace.push({event:'viewport-intent-before-async-children',supported:!!releaseIntent});
  // Loaded siblings may wait in Suspense longer than the 250ms cache timer.
  for(let i=0;i<14;i++){
    e.advance();const m=model(),texture=m.gltf.scene.children[0].material.map;
    texture.image={width:256,height:256};
    m.gltf.parser={json:{textures:[{source:0}]},associations:new Map([[texture,{textures:0}]])};
    texture.addEventListener('dispose',()=>trace.push({event:'texture-dispose',model:i}));
    m.gltf.scene.children[0].geometry.addEventListener('dispose',()=>trace.push({event:'geometry-dispose',model:i}));
    e.bank.bind(m.gltf,imageHash);trace.push({event:'bank-bind',model:i,bank:e.bank.snapshot()});
    e.api.registerLoadedModel('pending'+i,'pending'+i,m.gltf,100,()=>trace.push({event:'clear-loader-cache',model:i}));models.push(m);
  }
  trace.push({event:'advance-beyond-250ms-before-any-layout-effect'});
  e.tick(); // Evicts six loaded roots before useLayoutEffect has retained them.
  for(let i=0;i<14;i++){trace.push({event:'layout-effect-retain',model:i});releases.push(e.api.retainModel('pending'+i,'pending'+i,models[i].gltf,100));}
  const afterCommit={cache:e.api.modelCacheStats(),canonicalDisposed:models[0].disposed.texture};
  for(let i=6;i<14;i++){trace.push({event:'layout-effect-release',model:i});releases[i]();}
  e.api.retainWantedModels?.(Array.from({length:6},(_,i)=>'pending'+i));releaseIntent?.();
  for(let i=0;i<9;i++){e.advance();const m=model();e.api.registerLoadedModel('pressure'+i,'pressure'+i,m.gltf,2*1024*1024,()=>{});}
  e.tick();const afterPressure={cache:e.api.modelCacheStats(),canonicalDisposed:models[0].disposed.texture};
  const observed={afterCommit,afterPressure,trace};
  assert.equal(afterPressure.cache.active,6);
  if(afterPressure.cache.sharedTextures.textures!==1){const error=Error('Six active delayed-commit scenes lost their canonical texture; inspect recorded clear/dispose/retain trace.');error.observed=observed;throw error;}
  assert.equal(afterPressure.canonicalDisposed,0);
  return observed;
});
check('PENDING-SCOPE-HANDOFF-AND-LATE-ABANDONED-LOADS',()=>{
  const e=cacheEnv();assert.ok(e.api.retainWantedModels,'Explicit scope ownership is required');
  const hashes=Array.from({length:14},(_,i)=>'late'+i),old=e.api.retainWantedModels(hashes);
  const held=model();e.api.registerLoadedModel('late0','late0',held.gltf,100,()=>e.clears.push({key:'late0'}));
  old();const replacement=e.api.retainWantedModels(['late0']);
  for(let i=1;i<14;i++){e.advance();e.api.registerLoadedModel('late'+i,'late'+i,model().gltf,100,()=>e.clears.push({key:'late'+i}));}
  e.tick(10000);let stats=e.api.modelCacheStats();assert.equal(stats.pending,1);assert.equal(stats.wanted,1);assert.equal(stats.idle,8);assert.equal(held.disposed.geometry,0);assert.equal(e.clears.length,5);
  replacement();e.tick();stats=e.api.modelCacheStats();assert.equal(stats.pending,0);assert.equal(stats.wanted,0);assert.equal(stats.idle,8);assert.equal(e.clears.length,6);
  return {stats,clears:e.clears};
});
check('SHARED-BANK-CACHE-EVICTION-AND-NATIVE-IDENTITY',()=>{
  const e=cacheEnv(),leases=[],models=[],imageHash={0:{sha256:'a'.repeat(64),mimeType:'image/png'}};
  for(let i=0;i<14;i++){
    e.advance();const m=model(),texture=m.gltf.scene.children[0].material.map;
    texture.image={data:{localUri:'file:///qa-'+i+'.png'},width:256,height:256};texture.isDataTexture=true;
    m.gltf.parser={json:{textures:[{source:0}]},associations:new Map([[texture,{textures:0}]])};
    e.bank.bind(m.gltf,imageHash);
    e.api.registerLoadedModel('hash'+i,'url'+i,m.gltf,100,()=>e.clears.push({loader:'shared',key:'url'+i}));
    if(i<3)leases.push(e.api.retainModel('hash'+i,'url'+i,m.gltf,100));
    models.push(m);
  }
  const canonical=models[0].gltf.scene.children[0].material.map;
  assert.equal(canonical.isDataTexture,true);assert.equal(canonical.image.data.localUri,'file:///qa-0.png');
  assert.ok(models.every(m=>m.gltf.scene.children[0].material.map===canonical));
  assert.deepEqual(e.bank.snapshot(),{textures:1,leases:14,duplicates:13});
  e.tick();assert.equal(e.api.modelCacheStats().active,3);assert.equal(e.api.modelCacheStats().idle,8);
  assert.equal(e.bank.snapshot().leases,11);assert.equal(models[0].disposed.texture,0);
  assert.equal(e.clears.length,3);assert.ok(e.clears.every(c=>c.loader==='shared'));
  leases.forEach(release=>release());e.tick();assert.equal(e.api.modelCacheStats().idle,8);
  assert.equal(e.bank.snapshot().leases,8);assert.equal(models[0].disposed.texture,0);
  // New untextured oversized abandoned loads evict all previous idle source scenes.
  for(let i=0;i<2;i++){e.advance();const m=model();e.api.registerLoadedModel('pressure'+i,'pressure'+i,m.gltf,16*1024*1024,()=>{});}
  e.tick();assert.equal(e.bank.snapshot().textures,0);assert.equal(e.bank.snapshot().leases,0);
  assert.equal(models[0].disposed.texture,1);
  return {final:e.api.modelCacheStats(),canonicalNativeUploadPreserved:true,clearedSharedLoaderKeys:e.clears.length};
});
check('TOUCH-LOCAL-OFFSETS',()=>{const result=touches.touchPoints({nativeEvent:{pageX:100,pageY:200,locationX:20,locationY:30,touches:[{pageX:90,pageY:190},{pageX:150,pageY:230}]}});assert.deepEqual(result,[{x:10,y:20},{x:70,y:60}]);return result;});
check('PINCH-METRICS-AND-DEGENERATE-TOUCHES',()=>{assert.equal(touches.pinchMetrics([{x:1,y:1}]),null);const same=touches.pinchMetrics([{x:2,y:3},{x:2,y:3}]);assert.equal(same.distance,1);const p=touches.pinchMetrics([{x:0,y:0},{x:6,y:8}]);assert.deepEqual(p,{distance:10,x:3,y:4});return p;});
const {fitCamera,clippingRange}=load('src/scene/camera.ts');
function projection(width,depth,aspect){const points=[{x:0,z:0},{x:width,z:0},{x:width,z:depth},{x:0,z:depth}],ceiling=2.7,fit=fitCamera(points,ceiling,aspect),clipping=clippingRange?clippingRange(fit.radius,fit.extent,false):{near:.05,far:150},camera=new THREE.PerspectiveCamera(43,aspect,clipping.near,clipping.far);camera.position.set(fit.target.x+fit.radius*Math.sin(.88)*Math.sin(.75),fit.target.y+fit.radius*Math.cos(.88),fit.target.z+fit.radius*Math.sin(.88)*Math.cos(.75));camera.lookAt(fit.target.x,fit.target.y,fit.target.z);camera.updateMatrixWorld();const projected=points.flatMap(p=>[0,ceiling].map(y=>new THREE.Vector3(p.x,y,p.z).project(camera)));return {radius:fit.radius,near:clipping.near,far:clipping.far,maxX:Math.max(...projected.map(p=>Math.abs(p.x))),maxY:Math.max(...projected.map(p=>Math.abs(p.y))),maxDepth:Math.max(...projected.map(p=>p.z)),minDepth:Math.min(...projected.map(p=>p.z))};}
for(const aspect of [320/844,390/844,1,16/9])check('ROOM-FIT-'+aspect.toFixed(3),()=>{const result=projection(4.8,3.8,aspect);assert.ok(result.maxX<=.901&&result.maxY<=.721);assert.ok(result.maxDepth<=1&&result.minDepth>=-1);return result;});
check('LARGE-FLOOR-FAR-PLANE',()=>{const result=projection(40,30,320/844);assert.ok(result.maxDepth<=1,'Projected far corner exceeds the Viewport fixed150m far plane: '+JSON.stringify(result));return result;});
const changedSources=Object.entries(sources).filter(([file,hash])=>sha(fs.readFileSync(path.join(mobile,file)))!==hash).map(([file])=>file);
const result={at:new Date().toISOString(),sources,stableSources:!changedSources.length,changedSources,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks,scope:'Production pure touch/camera and cache logic with fake time and GPU-free Three objects. Native localUri textures are fixture objects. Not actual native responder negotiation, GPU residency, physical gestures, or thermal performance.'};
const run=path.join(qa,'runs',result.at.replaceAll(/[:.]/g,'-')+'-scene-runtime');fs.mkdirSync(run,{recursive:true});fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));process.stdout.write(JSON.stringify({...result,checks:checks.filter(c=>!c.pass).map(({id,error})=>({id,error})),artifact:path.join(run,'result.json')})+'\n');process.exitCode=result.failed?1:0;
