/* Execute the actual consumer contract after normalization, with no writes outside QA. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load,root,mobile}=require('./probe-domain.cjs');
const {searchAssets,initialFilters}=load('src/catalogue/search.ts');
const {resolveItemAsset,assetConflict,revisions}=load('src/catalogue/resolve.ts');
const consumer=JSON.parse(fs.readFileSync(path.join(mobile,'src/catalogue/assets.json')));
const producer=JSON.parse(fs.readFileSync(path.join(root,'furniture/manifest.json'))).assets;
const refs=require('./bundle-references.cjs')(path.join(mobile,'src/catalogue/bundled.ts'));
const checks=[];
for(const [tag,room] of [['entry-hall','entry'],['laundry-utility','utility']]){
 const source=producer.find(a=>a.roomTags?.includes(tag)),asset=consumer.find(a=>a.id===source?.id);
 const found=asset?searchAssets([asset],{...initialFilters,room},[],[]):[];
 checks.push({id:'ADAPTED-ROOM-'+room,pass:!!asset&&found.length===1,fixture:source?.id,sourceTags:source?.roomTags,consumerTags:asset?.roomTags,results:found.length});
}
const item=a=>({id:'runtime-qa-item',roomId:'runtime-qa-room',assetId:a.id,assetVersion:a.version,assetHash:a.sha256,x:1,z:2,yaw:.7,locked:true,materialOverrides:{}});
const unresolved=consumer.filter(a=>!resolveItemAsset(item(a))).map(a=>a.id);
checks.push({id:'ALL-CURRENT-REVISIONS-RESOLVE',pass:unresolved.length===0,unresolved});
const missingBundle=revisions.filter(a=>!refs.has(a.sha256)).map(a=>({id:a.id,sha256:a.sha256}));
checks.push({id:'ARCHIVED-REVISIONS-BUNDLED-BY-HASH',pass:missingBundle.length===0,missingBundle});
const a=consumer[0],mismatch={...item(a),assetHash:'runtime-qa-missing-hash'},before=JSON.stringify(mismatch);
checks.push({id:'MISSING-REVISION-IS-EXPLICIT',pass:!resolveItemAsset(mismatch)&&typeof assetConflict(mismatch)==='string'&&assetConflict(mismatch).includes(a.id),message:assetConflict(mismatch)});
checks.push({id:'MISSING-REVISION-PRESERVES-PLACEMENT-AND-LOCK',pass:JSON.stringify(mismatch)===before});
const files=['src/catalogue/assets.json','src/catalogue/revisions.json','src/catalogue/resolve.ts','src/catalogue/search.ts','src/catalogue/bundled.ts'];
const sources=Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,f))).digest('hex')]));
const result={at:new Date().toISOString(),consumerRecords:consumer.length,producerRecords:producer.length,revisionRecords:revisions.length,sources,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks,scope:'Actual normalized consumer metadata and production resolver/search; pure module check, not rendered UI.'};
const run=path.join(__dirname,'runs',result.at.replaceAll(/[:.]/g,'-')+'-adapter-probe');fs.mkdirSync(run,{recursive:true});fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));
process.stdout.write(JSON.stringify({...result,checks:result.checks.map(c=>({...c,missingBundle:c.missingBundle?.slice(0,5),missingBundleCount:c.missingBundle?.length}))})+'\n');process.exitCode=result.failed?1:0;
