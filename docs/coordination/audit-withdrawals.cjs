/* Independently verify that withdrawn review decisions cannot remain curated. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'../../furniture'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>fs.readFileSync(path.join(base,f));
const inputs=['manifest.json','catalogue-v2/visual-decisions.json','catalogue-v2/contact-review-withdrawals.json'];
const bytes=Object.fromEntries(inputs.map(f=>[f,read(f)])),m=JSON.parse(bytes['manifest.json']),ledger=JSON.parse(bytes['catalogue-v2/visual-decisions.json']),withdrawals=JSON.parse(bytes['catalogue-v2/contact-review-withdrawals.json']);
const consumerPath=path.resolve(__dirname,'../../mobile/src/catalogue/assets.json'),consumerBytes=fs.readFileSync(consumerPath),consumer=JSON.parse(consumerBytes);
const exceptionPath='catalogue-v2/contact-review-exceptions.json',exceptions=fs.existsSync(path.join(base,exceptionPath))?JSON.parse(read(exceptionPath)).assets??{}:{};
const findings=[],rows=[];
for(const old of withdrawals.affectedCurrentReviews){
 const current=m.assets.find(a=>a.id===old.id),asset=[...m.assets,...(m.historicalAssets??[])].find(a=>a.id===old.id&&a.version===old.version&&a.sha256===old.sha256);
 const same=current?.sha256===old.sha256,d=same?ledger.decisions[old.id]:ledger.historicalDecisions?.[old.id+'@'+old.sha256];
 let contact=null;try{contact=JSON.parse(read(old.evidence));}catch(e){findings.push({id:old.id,problem:'Missing withdrawal evidence',error:String(e)});}
 if(!asset)findings.push({id:old.id,problem:'Original withdrawn revision not retained in manifest/history'});
 else if(sha(read(asset.file))!==old.sha256)findings.push({id:old.id,problem:'Withdrawn original bytes changed'});
 if(contact?.sha256!==old.sha256||contact.componentCount!==old.componentCount)findings.push({id:old.id,problem:'Contact evidence differs from withdrawn revision'});
 const exception=exceptions[old.sha256],explicitException=!!exception?.acceptedReason;
 if(same&&current.qualityStatus==='internally-accepted'&&!explicitException)findings.push({id:old.id,problem:'Known withdrawn hash remains accepted without explicit contact review'});
 if(d?.status!=='rework'&&!(d?.status==='pass'&&explicitException))findings.push({id:old.id,problem:'Withdrawn decision not retained as rework or explicitly reviewed exception',status:d?.status??null});
 const app=consumer.find(a=>a.id===old.id);
 rows.push({id:old.id,withdrawnVersion:old.version,sha256:old.sha256,currentVersion:current?.version,currentSameHash:same,currentQuality:current?.qualityStatus,consumerSameWithdrawnHash:app?.sha256===old.sha256,consumerQuality:app?.qualityStatus,withdrawnDecision:d?.status??null,explicitContactException:explicitException,componentCount:contact?.componentCount});
}
const result={checkedAtUtc:new Date().toISOString(),inputSha256:Object.fromEntries(inputs.map(f=>[f,sha(bytes[f])])),consumerSha256:sha(consumerBytes),stableInputs:inputs.every(f=>sha(read(f))===sha(bytes[f]))&&sha(fs.readFileSync(consumerPath))===sha(consumerBytes),withdrawnReviews:rows.length,stillCurrent:rows.filter(r=>r.currentSameHash).length,replacedBySuccessor:rows.filter(r=>!r.currentSameHash).length,consumerWithdrawnStillLabelledAccepted:rows.filter(r=>r.consumerSameWithdrawnHash&&r.consumerQuality==='internally-accepted'&&!r.explicitContactException).length,findings,rows,limits:'Review-state, retained bytes and exact contact-report bindings only. Does not independently certify contact geometry, visual quality, physical safety or native rendering. Consumer status lag is reported separately for integration.'};
fs.writeFileSync(path.join(__dirname,'withdrawal-audit.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,rows:rows.filter(r=>r.currentQuality==='internally-accepted'&&!r.explicitContactException)},null,2));process.exitCode=result.stableInputs&&!findings.length?0:1;
