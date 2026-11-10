const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),tag=process.argv[2]||'r1',out=path.join(root,'evidence/batch-browser-'+tag);if(fs.existsSync(out))throw Error('Use new evidence revision');fs.mkdirSync(out,{recursive:true});const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');let browser;
(async()=>{browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:8772');await page.waitForFunction(()=>window.spatialReview?.ready,{timeout:90000});
 await page.evaluate(()=>window.spatialReview.update({scope:'house',shell:'cutaway',ceilings:false}));await page.waitForTimeout(180);await page.screenshot({path:path.join(out,'original.png')});
 const result=await page.evaluate(async()=>{
  const THREE=await import('three'),{buildStaticItemBatches,itemForBatchHit}=await import('/review/static-batches.js'),qa=window.spatialReview;qa.renderer.render(qa.scene,qa.camera);
  const pixels=()=>{const gl=qa.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,data=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,data);return data},before=pixels(),baseline=qa.snapshot(),project=JSON.stringify(qa.project),start=performance.now(),batch=buildStaticItemBatches(qa.scene),buildMilliseconds=performance.now()-start;
  qa.renderer.render(qa.scene,qa.camera);const after=pixels(),batched=qa.snapshot();let changed=0,maxChannel=0,sum2=0;for(let i=0;i<before.length;i++){const d=Math.abs(before[i]-after[i]);if(d)changed++;maxChannel=Math.max(maxChannel,d);sum2+=d*d;}
  const rays=[];qa.scene.updateMatrixWorld(true);const eligibleSources=new Set(batch.group.children.flatMap(m=>m.userData.itemFaceRanges.map(r=>r.sourceMeshUuid)));
  const unique=hits=>hits.sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id)).filter((h,i,all)=>!all.slice(0,i).some(p=>p.id===h.id&&Math.abs(p.y-h.y)<.00001));
  for(const f of qa.fixture.project.floors)for(const item of f.items){
   const asset=qa.fixture.assets.find(a=>a.id===item.assetId&&a.version===item.assetVersion&&a.sha256===item.assetHash),x=item.x+f.alignment.x,z=item.z+f.alignment.z;
   // A vertical ray through the item centre may hit a cavity; compare full sorted
   // hit identities at a grid of actual points, retaining overlapping surfaces.
   for(const [dx,dz]of [[0,0],[.08,0],[-.08,0],[0,.08],[0,-.08]]){
    const ray=new THREE.Raycaster(new THREE.Vector3(x+dx,f.elevation+asset.bounds.max[1]+.5,z+dz),new THREE.Vector3(0,-1,0));
    const merged=ray.intersectObject(batch.group,true).map(h=>({id:itemForBatchHit(h),y:h.point.y}));
    const old=[];qa.scene.traverse(o=>{if(o.isMesh&&eligibleSources.has(o.uuid)){for(const hit of ray.intersectObject(o,false))old.push({id:o.userData.itemId,y:hit.point.y})}});
    rays.push({itemId:item.id,rawCounts:{old:old.length,merged:merged.length},old:unique(old),merged:unique(merged)});
   }
  }
  const cameraRays=[],originalMeshes=[];qa.scene.traverse(o=>{if(eligibleSources.has(o.uuid))originalMeshes.push(o)});
  for(let z=0;z<12;z++)for(let x=0;x<12;x++){
   const ndc={x:-.9+x*1.8/11,y:-.9+z*1.8/11},ray=new THREE.Raycaster();ray.setFromCamera(ndc,qa.camera);const old=ray.intersectObjects(originalMeshes,false)[0],merged=ray.intersectObject(batch.group,true)[0];
   cameraRays.push({ndc,old:old?{id:old.object.userData.itemId,distance:old.distance}:null,merged:merged?{id:itemForBatchHit(merged),distance:merged.distance}:null});
  }
  window.batchExperiment={batch};return {baseline:{render:baseline.render,memory:baseline.memory},batched:{render:batched.render,memory:batched.memory},metrics:batch.metrics,buildMilliseconds,pixelDifference:{changedChannels:changed,totalChannels:before.length,maxChannel,rmse:Math.sqrt(sum2/before.length)},rays,cameraRays,projectUnchanged:JSON.stringify(qa.project)===project};
 });
 await page.screenshot({path:path.join(out,'batched.png')});fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(result,null,2));
 assert.equal(result.projectUnchanged,true);assert.ok(result.batched.render.calls<result.baseline.render.calls);assert.equal(result.batched.render.triangles,result.baseline.render.triangles);
 // Picking needs the frontmost physical surface, not a numerically identical
 // multiplicity at back-facing/internal seams hit by exactly grazing rays.
 for(const probe of result.rays){assert.equal(!!probe.old.length,!!probe.merged.length,'Ray presence '+probe.itemId);if(probe.old.length){assert.equal(probe.old[0].id,probe.merged[0].id);assert.ok(Math.abs(probe.old[0].y-probe.merged[0].y)<.00001,'Front surface '+probe.itemId);}}
 assert.ok(result.cameraRays.filter(p=>p.old).length>10,'Camera ray coverage is non-vacuous');for(const probe of result.cameraRays){assert.equal(!!probe.old,!!probe.merged);if(probe.old){assert.equal(probe.old.id,probe.merged.id);assert.ok(Math.abs(probe.old.distance-probe.merged.distance)<.00001);}}
 assert.ok(result.pixelDifference.rmse<.25);assert.ok(result.pixelDifference.changedChannels/result.pixelDifference.totalChannels<.001);
 const cleanup=await page.evaluate(async()=>{const qa=window.spatialReview,api=await import('/review/static-batches.js');window.batchExperiment.batch.dispose();qa.renderer.render(qa.scene,qa.camera);const restored=qa.snapshot();const iterations=[];for(let i=0;i<20;i++){qa.update({scope:'house',separated:i%2===1});const b=api.buildStaticItemBatches(qa.scene);qa.renderer.render(qa.scene,qa.camera);b.dispose();qa.renderer.render(qa.scene,qa.camera);iterations.push({...qa.renderer.info.memory});}qa.update({scope:'house',separated:false});qa.disposeAll();return {restored:{render:restored.render,memory:restored.memory},iterations,disposed:qa.snapshot()}});
 assert.deepEqual(cleanup.restored.memory,result.baseline.memory);for(const k of ['calls','triangles','points','lines'])assert.equal(cleanup.restored.render[k],result.baseline.render[k]);for(const i of cleanup.iterations)assert.deepEqual(i,result.baseline.memory);assert.equal(cleanup.disposed.memory.geometries,0);assert.equal(cleanup.disposed.memory.textures,0);assert.equal(cleanup.disposed.bank.rootLeases,0);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({timeUtc:new Date().toISOString(),sourceSha256:{batch:sha(path.join(root,'review/static-batches.js')),viewer:sha(path.join(root,'review/viewer.js')),fixture:sha(path.join(root,'fixtures/six-room-house.json')),harness:sha(__filename)},result,cleanup:{restored:cleanup.restored,iterations:cleanup.iterations,disposed:{memory:cleanup.disposed.memory,bank:cleanup.disposed.bank}},errors,scope:'Browser-only frozen read-only batching experiment. Additional CPU/GPU attributes retained alongside original editable assets. No native performance or dynamic selection integration acceptance.'},null,2));console.log(JSON.stringify({...result,rays:result.rays.length,cameraRays:{total:result.cameraRays.length,hits:result.cameraRays.filter(p=>p.old).length},cleanup:{restored:cleanup.restored,disposed:cleanup.disposed.memory}},null,2));await browser.close();})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
