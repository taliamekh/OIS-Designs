/* Independent read-only acceptance-provenance checks. Does not accept/reject models. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),source=path.join(root,'furniture');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=relative=>{const p=path.resolve(source,relative),r=path.relative(source,p);if(r.startsWith('..')||path.isAbsolute(r))throw Error('Escaping review source');return fs.readFileSync(p);};
const manifestBytes=read('manifest.json'),manifest=JSON.parse(manifestBytes);
const ledgerBytes=read('catalogue-v2/visual-decisions.json'),ledger=JSON.parse(ledgerBytes);
const index=JSON.parse(read('catalogue-v2/review/index.json'));
const decisions=ledger.decisions||{};
const problems=[],warnings=[],accepted=manifest.assets.filter(a=>a.qualityStatus==='internally-accepted');
const groups={},counts={};
for(const a of accepted){
 const d=decisions[a.id];
 if(!a.countEligible)problems.push({id:a.id,problem:'Accepted row is not count-eligible'});
 if(!d||d.sha256!==a.sha256||d.status!=='pass'){problems.push({id:a.id,problem:'No current passing GLB-hash decision'});continue;}
 if(!d.notes||!d.reviewedAtUtc)problems.push({id:a.id,problem:'Missing review notes/time'});
 try{if(!d.sheetArchive||!d.sheetSha256||sha(read(d.sheetArchive))!==d.sheetSha256)problems.push({id:a.id,problem:'Immutable reviewed sheet is missing or changed'});}catch(e){problems.push({id:a.id,problem:String(e)});}
 try{if(sha(read(a.file))!==a.sha256)problems.push({id:a.id,problem:'Current GLB bytes do not match accepted record'});}catch(e){problems.push({id:a.id,problem:String(e)});}
 for(const key of ['thumbnail','backThumbnail'])try{if(!d.imageSha256?.[a[key]]||sha(read(a[key]))!==d.imageSha256[a[key]])problems.push({id:a.id,problem:'Reviewed '+key+' bytes changed or are not bound'});}catch(e){problems.push({id:a.id,problem:String(e)});}
 const member=d.memberBinding;
 if(!member||member.id!==a.id)problems.push({id:a.id,problem:'Archived decision does not bind this member to current GLB/images'});
 else{
  if((member.sha256||member.assetSha256)!==a.sha256||member.version!==a.version)problems.push({id:a.id,problem:'Sheet member version/hash differs from accepted GLB'});
  for(const [key,hashKey,alias,hashAlias] of [['thumbnail','thumbnailSha256','front','frontSha256'],['backThumbnail','backThumbnailSha256','back','backSha256']])if((member[key]||member[alias])!==a[key]||(member[hashKey]||member[hashAlias])!==d.imageSha256?.[a[key]])problems.push({id:a.id,problem:'Sheet member '+key+' binding differs from decision'});
 }
 const family=a.familyId||a.designId||a.id;(groups[family]||=[]).push(a.id);
 counts[a.roomTags[0]+' / '+a.theme]=(counts[a.roomTags[0]+' / '+a.theme]||0)+1;
}
for(const [family,ids]of Object.entries(groups))if(ids.length>1)problems.push({family,ids,problem:'Multiple accepted rows share one canonical family'});
const currentMatches=manifest.assets.filter(a=>decisions[a.id]?.sha256===a.sha256).length;
const staleDecisions=Object.keys(decisions).filter(id=>{const a=manifest.assets.find(a=>a.id===id);return a&&decisions[id].sha256!==a.sha256;}).length;
const boundSheetMembers=index.sheets.reduce((n,s)=>n+(s.members||s.assets||[]).length,0);
if(!boundSheetMembers)warnings.push('Legacy current-sheet index has no member hashes. Accepted rows above are checked using their own immutable decision bindings and archived sheets. Regenerate this index before using it for new reviews.');
const after=read('manifest.json');
const result={checkedAtUtc:new Date().toISOString(),manifestSha256:sha(manifestBytes),reviewLedgerSha256:sha(ledgerBytes),stableManifest:sha(after)===sha(manifestBytes),acceptedRows:accepted.length,countMeets300:accepted.length>=300,currentMatchingDecisions:currentMatches,historicalOrStaleCurrentDecisions:staleDecisions,sheetCount:index.sheets.length,boundSheetMembers,acceptedRoomThemeCounts:counts,problems,warnings,limitations:'Provenance and counting consistency only. A matching review record is not independent proof that a model is visually good or a distinct construction. No native or device claim.'};
fs.writeFileSync(path.join(__dirname,'review-ledger.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.stableManifest&&problems.length?1:0;
