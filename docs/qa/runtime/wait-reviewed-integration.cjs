/* Bounded current-task readiness wait; no scheduling, writes to production, or tests. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),minutes=Math.min(10,Math.max(1,Number(process.argv[2]||5))),deadline=Date.now()+minutes*60000;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');let previous='',done=false;
function inspect(){
  const files=['furniture/manifest.json','furniture/catalogue-v2/visual-decisions.json','furniture/catalogue-v2/accepted-assets.json','furniture/catalogue-v2/batch-ready.json','mobile/src/catalogue/assets.json','mobile/src/catalogue/bundled.ts'];
  const bytes=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(root,f))])),hashes=Object.fromEntries(files.map(f=>[f,sha(bytes[f])])),accepted=JSON.parse(bytes[files[2]]),ready=JSON.parse(bytes[files[3]]),app=JSON.parse(bytes[files[4]]);
  const stable=accepted.manifestSha256===hashes[files[0]]&&ready.manifestSha256===hashes[files[0]]&&accepted.reviewLedgerSha256===hashes[files[1]]&&ready.reviewLedgerSha256===hashes[files[1]]&&files.every(f=>sha(fs.readFileSync(path.join(root,f)))===hashes[f]);
  const eligible=accepted.assets.filter(a=>a.countEligible&&!a.variantOf&&a.qualityStatus==='internally-accepted'&&a.textures?.count>0&&(!a.placement?.anchor||a.placement.anchor==='floor')&&a.dimensionsMetres.width<=3.2&&a.dimensionsMetres.depth<=3.2&&a.dimensionsMetres.height<=3.8&&app.some(b=>b.id===a.id&&b.version===a.version&&b.sha256===a.sha256));
  const count=new Set(eligible.map(a=>a.designId)).size;
  return {at:new Date().toISOString(),stableMetadata:stable,currentExactEligible:count,producerAcceptedRows:accepted.assets.length,appRecords:app.length,appCatalogueSHA256:hashes[files[4]],ready:stable&&count>=40,scope:'Readiness only. Fixture creation must still verify exact GLB/image/review bytes; no acceptance/native-render claim.'};
}
function poll(){if(done)return;try{const state=inspect(),key=JSON.stringify([state.stableMetadata,state.currentExactEligible,state.producerAcceptedRows,state.appCatalogueSHA256]);if(key!==previous){console.log(JSON.stringify(state));previous=key;}fs.writeFileSync(path.join(__dirname,'reviewed-integration-wait-state.json'),JSON.stringify(state,null,2));if(state.ready||Date.now()>=deadline){done=true;clearInterval(timer);console.log(JSON.stringify({type:state.ready?'fixture-ready':'bounded-wait-ended',...state}));}}catch(error){const key=String(error);if(key!==previous){console.log(JSON.stringify({at:new Date().toISOString(),type:'metadata-in-flight',error:key}));previous=key;}if(Date.now()>=deadline){done=true;clearInterval(timer);}}}
const timer=setInterval(poll,15000);poll();
