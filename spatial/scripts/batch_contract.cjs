const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),tag=process.argv[2]||'r1',out=path.join(root,'evidence/batch-contract-'+tag);if(fs.existsSync(out))throw Error('Use new evidence revision');fs.mkdirSync(out,{recursive:true});const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');let browser;
(async()=>{browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:8772/review/ceiling-harness.html');const result=await page.evaluate(async()=>{
 const THREE=await import('three'),{buildStaticItemBatches,itemForBatchHit}=await import('/review/static-batches.js'),cases=[];
 function probe(name,alter,expected){const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial({color:'#779955',roughness:.6}),a=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material),b=new THREE.Mesh(a.geometry.clone(),material.clone());a.userData.itemId='a';b.userData.itemId='b';b.position.x=2;scene.add(a,b);alter(a,b);scene.updateMatrixWorld(true);let materialDisposals=0,originalDisposals=0;for(const mesh of [a,b]){for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])mat.addEventListener('dispose',()=>materialDisposals++);mesh.geometry.addEventListener('dispose',()=>originalDisposals++);}const batch=buildStaticItemBatches(scene),metrics=batch.metrics;
  const rays=[-.1,2.1].map(x=>{const hit=new THREE.Raycaster(new THREE.Vector3(x,4,.08),new THREE.Vector3(0,-1,0)).intersectObject(batch.group,true)[0];return hit?{id:itemForBatchHit(hit),y:hit.point.y}:null;});batch.dispose();batch.dispose();const restored=[a.visible,b.visible],ownedBeforeCleanup={materialDisposals,originalDisposals};
  for(const mesh of [a,b]){mesh.geometry.dispose();for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){for(const v of Object.values(mat))if(v?.isTexture)v.dispose();mat.dispose();}}
  cases.push({name,expected,actual:{batches:metrics.batches,originalMeshes:metrics.originalMeshes,skipped:metrics.skipped.length},rays,restored,ownedBeforeCleanup});
 }
 const standard={batches:1,originalMeshes:2,skipped:0},separate={batches:2,originalMeshes:2,skipped:0},skipOne={batches:1,originalMeshes:1,skipped:1};
 probe('identical factors merge while nearest hits retain both item IDs',()=>{},standard);
 probe('different per-instance colour stays separate',(a,b)=>b.material.color.set('#cc2244'),separate);
 probe('different roughness stays separate',(a,b)=>b.material.roughness=.2,separate);
 probe('different metalness stays separate',(a,b)=>b.material.metalness=.8,separate);
 probe('normal-map coordinate conventions stay separate',(a,b)=>{const t=new THREE.Texture();a.material.normalMap=t;b.material.normalMap=t;b.material.normalMapType=THREE.ObjectSpaceNormalMap},separate);
 probe('distinct live maps stay separate despite a shared source',(a,b)=>{const t=new THREE.Texture();a.material.map=t;b.material.map=t.clone()},separate);
 probe('same live map preserves one material batch',(a,b)=>{const t=new THREE.Texture();a.material.map=t;b.material.map=t},standard);
 probe('alpha-test threshold stays separate',(a,b)=>b.material.alphaTest=.5,separate);
 probe('transparent material keeps original rendering path',(a,b)=>{b.material.transparent=true;b.material.opacity=.5},skipOne);
 probe('negative determinant is kept in original winding path',(a,b)=>b.scale.x=-1,skipOne);
 probe('custom shader callback is retained outside batches',(a,b)=>b.material.onBeforeCompile=()=>{},skipOne);
 probe('local clipping remains outside batches',(a,b)=>b.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),0)],skipOne);
 probe('multi-material geometry remains outside batches',(a,b)=>b.material=[b.material],skipOne);
 probe('partial draw remains outside batches',(a,b)=>b.geometry.setDrawRange(0,6),skipOne);
 probe('custom render order remains outside batches',(a,b)=>b.renderOrder=1,skipOne);
 probe('custom layers remain outside batches',(a,b)=>b.layers.set(2),skipOne);
 probe('hidden originals stay hidden after restoration',(a,b)=>{b.visible=false},{batches:1,originalMeshes:1,skipped:0});
 return cases;
 });for(const c of result){assert.deepEqual(c.actual,c.expected,c.name);assert.deepEqual(c.ownedBeforeCleanup,{materialDisposals:0,originalDisposals:0},c.name+' ownership');assert.equal(c.restored[0],true);assert.equal(c.restored[1],!c.name.startsWith('hidden'));}assert.equal(result[0].rays[0].id,'a');assert.equal(result[0].rays[1].id,'b');assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({timeUtc:new Date().toISOString(),sourceSha256:{module:sha(path.join(root,'review/static-batches.js')),harness:sha(__filename)},cases:result,errors,scope:'Actual installed Three geometry/material identity and ownership probes in browser; synthetic inputs, no native performance claim.'},null,2));console.log(JSON.stringify({pass:true,cases:result.length,errors}));await browser.close();})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
