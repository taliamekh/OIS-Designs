/* Exercise exact production web chooser control flow with mocked SDK/URL boundary. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const mobile=path.resolve(__dirname,'../../../mobile'),ts=require(path.join(mobile,'node_modules/typescript'));
const file=path.join(mobile,'src/storage/import.ts'),source=fs.readFileSync(file),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const compiled=ts.transpileModule(source.toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const raw=fs.readFileSync(path.join(__dirname,'artifacts/downloaded-300-item-backup.json'),'utf8'),checks=[];
(async()=>{for(const mode of ['success','read-reject','missing-file','cancel','picker-reject','non-blob-uri']){
  const calls=[],uri=mode==='non-blob-uri'?'https://qa.invalid/backup.json':'blob:http://127.0.0.1/qa-backup';let returned,error;
  try{
    const picker={async getDocumentAsync(options){calls.push({event:'picker',options});assert.equal(options.multiple,false);assert.equal(options.base64,false);if(mode==='picker-reject')throw Error('QA picker rejection');if(mode==='cancel')return {canceled:true,assets:null};return {canceled:false,assets:[{name:'qa300.json',uri,file:mode==='missing-file'?undefined:{async text(){calls.push({event:'read'});if(mode==='read-reject')throw Error('QA read rejection');return raw;}}}]};}};
    const URL={revokeObjectURL(value){calls.push({event:'revoke',uri:value});}},module={exports:{}};
    new Function('require','module','exports','URL',compiled)(name=>name==='expo-document-picker'?picker:(()=>{throw Error('Unexpected dependency '+name);})(),module,module.exports,URL);
    try{returned=await module.exports.chooseBackup();}catch(e){error=String(e);}
    if(mode==='success'||mode==='non-blob-uri'){assert.equal(returned.raw,raw);assert.equal(returned.name,'qa300.json');assert.equal(error,undefined);}
    else if(mode==='cancel'){assert.equal(returned,null);assert.equal(error,undefined);}
    else {assert.ok(error);assert.equal(returned,undefined);}
    const revokes=calls.filter(c=>c.event==='revoke'),shouldRevoke=['success','read-reject','missing-file'].includes(mode);
    assert.equal(revokes.length,shouldRevoke?1:0,'Unused Blob URL must be revoked once, including file-read failures');if(shouldRevoke)assert.equal(revokes[0].uri,uri);
    checks.push({mode,pass:true,calls,error});
  }catch(e){checks.push({mode,pass:false,error:String(e),calls,adapterError:error});}
}
const at=new Date().toISOString(),run=path.join(__dirname,'runs',at.replaceAll(/[:.]/g,'-')+'-web-import');fs.mkdirSync(run,{recursive:true});
const result={at,sourceSha256:hash(source),stableSource:hash(fs.readFileSync(file))===hash(source),fixtureBytes:Buffer.byteLength(raw),fixtureSHA256:hash(raw),versions:{expoDocumentPicker:JSON.parse(fs.readFileSync(path.join(mobile,'node_modules/expo-document-picker/package.json'))).version},checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,scope:'Exact web adapter control flow with SDK/URL mocks. No measured browser heap bytes or actual chooser cancellation claim.'};
fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,checks:checks.filter(c=>!c.pass),artifact:path.join(run,'result.json')}));process.exitCode=result.failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
