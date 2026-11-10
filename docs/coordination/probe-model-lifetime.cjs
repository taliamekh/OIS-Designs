/* Independent production cache/bank acceptance; real Three, controlled commit/time. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const mobile=path.resolve(__dirname,'../../mobile'),req=createRequire(path.join(mobile,'package.json')),ts=req('typescript'),THREE=req('three');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),names=['src/scene/resources.ts','src/scene/textureBank.ts','src/scene/modelLoader.ts','src/scene/Viewport.tsx'];
const sources=Object.fromEntries(names.map(f=>[f,sha(fs.readFileSync(path.join(mobile,f)))])),checks=[];
const check=(id,pass,observed)=>checks.push({id,pass:!!pass,observed});
function environment(){
 let now=1,timerId=0;const timers=new Map(),mods=new Map(),cleared=[];
 class FakeDate extends Date{static now(){return now;}}
 class OriginalLoader{}
 function load(file){
  if(mods.has(file))return mods.get(file).exports;
  const module={exports:{}};mods.set(file,module);
  const filename=path.join(mobile,file),code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const custom=id=>id==='three'?THREE:id==='./fiber'?{useLoader:{clear:(loader,key)=>cleared.push({kind:'fallback',key})}}:id==='./textureBank'?load('src/scene/textureBank.ts'):id==='three/examples/jsm/loaders/GLTFLoader.js'?{GLTFLoader:OriginalLoader}:req(id);
  new Function('require','module','exports','Date','setTimeout','clearTimeout',code)(custom,module,module.exports,FakeDate,(fn,delay=0)=>{const id=++timerId;timers.set(id,{fn,due:now+delay});return id;},id=>timers.delete(id));
  return module.exports;
 }
 const R=load('src/scene/resources.ts'),B=load('src/scene/textureBank.ts').modelTextureBank;
 async function settle(ms=0){now+=ms;for(let loop=0;loop<6;loop++){await Promise.resolve();for(const[id,t]of [...timers])if(t.due<=now){timers.delete(id);t.fn();}}}
 function fixture(number,bytes=1024,imageHash='a'.repeat(64)){
  now++;
  const texture=new THREE.Texture();texture.image={data:{localUri:'file:///synthetic-'+number+'.png'},width:4,height:4};texture.isDataTexture=true;
  let textureDisposals=0,geometryDisposals=0;
  texture.addEventListener('dispose',()=>textureDisposals++);
  const geometry=new THREE.BoxGeometry(1,1,1);geometry.addEventListener('dispose',()=>geometryDisposals++);
  const material=new THREE.MeshStandardMaterial({map:texture}),scene=new THREE.Group();scene.add(new THREE.Mesh(geometry,material));
  const gltf={scene,parser:{associations:new Map([[texture,{textures:0}]]),json:{textures:[{source:0}]}}};
  B.bind(gltf,{'0':{sha256:imageHash,mimeType:'image/png'}});
  const hash='model-'+number,key='source-'+number;
  R.registerLoadedModel(hash,key,gltf,bytes,()=>cleared.push({kind:'registered',key}));
  return{hash,key,gltf,bytes,texture,material,geometryDisposals:()=>geometryDisposals,textureDisposals:()=>textureDisposals,mount:()=>R.retainModel(hash,key,gltf,bytes)};
 }
 return{R,B,fixture,settle,cleared};
}
(async()=>{
 {
  const e=environment(),intent=e.R.retainWantedModels(Array.from({length:14},(_,i)=>'model-'+i)),f=Array.from({length:14},(_,i)=>e.fixture(i));
  await e.settle(10000);let s=e.R.modelCacheStats();
  check('all-desired-delayed-commits-retain-leases',s.pending===14&&s.wanted===14&&s.sharedTextures.leases===14&&e.cleared.length===0,s);
  check('pending-native-canonical-texture-not-disposed',f[0].textureDisposals()===0&&f.every(a=>a.geometryDisposals()===0));
  const release=f.map(a=>a.mount());intent();await e.settle();s=e.R.modelCacheStats();
  check('intent-release-preserves-mounted-sources',s.active===14&&s.pending===0&&s.wanted===0&&s.sharedTextures.leases===14,s);
  release.slice(0,12).forEach(fn=>fn());await e.settle();s=e.R.modelCacheStats();
  check('ordinary-pressure-keeps-active-native-texture',s.active===2&&s.idle===8&&s.sharedTextures.leases===10&&f[0].textureDisposals()===0,s);
  release.slice(12).forEach(fn=>fn());await e.settle();
  for(let i=20;i<29;i++)e.fixture(i,1024,i.toString(16).padStart(64,'0'));
  await e.settle();s=e.R.modelCacheStats();
  check('last-old-source-eventually-disposes-native-texture-once',f[0].textureDisposals()===1&&s.active===0&&s.idle===8,s);
  check('registered-loader-clear-callback-is-preserved',e.cleared.length>0&&e.cleared.every(v=>v.kind==='registered'),e.cleared);
 }
 {
  const e=environment(),a=e.R.retainWantedModels(['model-0','model-1','model-1']),b=e.R.retainWantedModels(['model-1']);
  const zero=e.fixture(0),one=e.fixture(1);await e.settle();a();await e.settle();
  for(let i=2;i<15;i++)e.fixture(i);await e.settle(30000);let s=e.R.modelCacheStats();
  check('overlapping-viewport-intent-keeps-shared-pending-source',s.wanted===1&&s.pending===1&&one.geometryDisposals()===0,s);
  check('released-unwanted-source-is-evicted-under-pressure',zero.geometryDisposals()===1);
  b();await e.settle();s=e.R.modelCacheStats();
  check('final-intent-release-restores-eight-idle-bound',s.wanted===0&&s.pending===0&&s.idle===8&&s.entries===8,s);
 }
 {
  const e=environment();for(let i=0;i<30;i++){e.fixture(i,4*1024*1024);await e.settle();}
  const s=e.R.modelCacheStats();
  check('abandoned-completions-obey-byte-and-count-bounds',s.active===0&&s.pending===0&&s.idle<=8&&s.sourceBytes<=16*1024*1024,s);
  check('abandoned-source-leases-match-retained-cache',s.sharedTextures.leases===s.entries&&s.sharedTextures.textures===1,s);
 }
 const after=Object.fromEntries(names.map(f=>[f,sha(fs.readFileSync(path.join(mobile,f)))]));
 const result={checkedAtUtc:new Date().toISOString(),sources,after,stableSource:JSON.stringify(sources)===JSON.stringify(after),passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks,limits:'Actual production cache/texture-bank with installed Three, synthetic native-loader-shaped images and controlled intent/commit/time. Source bytes are declared fixture costs, not allocated buffers. No EXGL, physical device, browser GPU or OS execution.'};
 const out=path.join(__dirname,'model-lifetime');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,checks:checks.filter(c=>!c.pass)},null,2));process.exitCode=result.stableSource&&!result.failed?0:1;
})().catch(e=>{console.error(e);process.exitCode=1;});
