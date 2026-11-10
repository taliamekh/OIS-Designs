/* Native trim-reference adapter lifecycle; Expo image/filesystem objects are mocks. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const mobile=path.resolve(__dirname,'../../../mobile'),ts=require(path.join(mobile,'node_modules/typescript'));
const file=path.join(mobile,'src/storage/reference.native.ts'),raw=fs.readFileSync(file),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const code=ts.transpileModule(raw.toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,checks=[];
function environment(mode){
 const calls=[],counts={contextRelease:0,imageRelease:0},context={resize(value){calls.push({event:'resize',value});if(mode==='resize-reject')throw Error('QA resize failure');return context;},async renderAsync(){calls.push({event:'render'});if(mode==='render-reject')throw Error('QA render failure');return {async saveAsync(options){calls.push({event:'save',options});if(mode==='save-reject')throw Error('QA save failure');return {uri:'file:///qa/cache/reference.jpg'};},release(){counts.imageRelease++;calls.push({event:'image-release'});}};},release(){counts.contextRelease++;calls.push({event:'context-release'});}};
 class Directory {constructor(base,name){this.uri=base+'/'+name;calls.push({event:'directory',base,name});}create(options){calls.push({event:'mkdir',options});if(mode==='folder-reject')throw Error('QA mkdir failure');}}
 class File {constructor(...parts){this.uri=parts.map(p=>typeof p==='string'?p:p.uri).join('/');calls.push({event:'file',uri:this.uri});}copy(target){calls.push({event:'copy',source:this.uri,target:target.uri});if(mode==='copy-reject')throw Error('QA copy failure');}get exists(){calls.push({event:'exists',uri:this.uri});return mode!=='missing';}}
 const mocks={'expo-file-system':{Directory,File,Paths:{document:'file:///qa/documents'}},'expo-image-manipulator':{ImageManipulator:{manipulate(uri){calls.push({event:'manipulate',uri});if(mode==='manipulate-reject')throw Error('QA manipulate failure');return context;}},SaveFormat:{JPEG:'jpeg'}},'../domain/types':{newId:prefix=>prefix+'-qa-123'}};
 const module={exports:{}};new Function('require','module','exports',code)(name=>{if(!(name in mocks))throw Error('Unexpected dependency '+name);return mocks[name];},module,module.exports);
 return {api:module.exports,calls,counts};
}
(async()=>{
 for(const [mode,width,height,expectedResize] of [['landscape',4096,2048,{width:1024,height:null}],['portrait',2000,4000,{height:1024,width:null}],['small',800,600,null],...['manipulate-reject','resize-reject','render-reject','save-reject','folder-reject','copy-reject'].map(m=>[m,4096,2048,{width:1024,height:null}])]){
  const e=environment(mode);try{let result,error;try{result=await e.api.storeReference('file:///qa/original.jpg',width,height);}catch(err){error=String(err);}
   if(mode.endsWith('reject'))assert.ok(error);else{assert.equal(error,undefined);assert.equal(result,'reference-qa-123');const copy=e.calls.find(c=>c.event==='copy');assert.equal(copy.target,'file:///qa/documents/trim-references/reference-qa-123.jpg');}
   assert.equal(e.counts.contextRelease,mode==='manipulate-reject'?0:1);
   assert.equal(e.counts.imageRelease,['manipulate-reject','resize-reject','render-reject'].includes(mode)?0:1);
   if(!mode.endsWith('reject'))assert.deepEqual(e.calls.find(c=>c.event==='resize')?.value??null,expectedResize);
   const save=e.calls.find(c=>c.event==='save');if(save)assert.deepEqual(save.options,{format:'jpeg',compress:.65});
   if(mode==='save-reject'||mode==='render-reject')assert.equal(e.calls.some(c=>c.event==='copy'),false);
   checks.push({mode,pass:true,calls:e.calls,counts:e.counts,adapterError:error});
  }catch(error){checks.push({mode,pass:false,error:String(error),calls:e.calls,counts:e.counts});}
 }
 for(const mode of ['invalid-id','existing','missing']){const e=environment(mode);try{const result=await e.api.referenceUri(mode==='invalid-id'?'reference-../../outside':'reference-qa-123');if(mode==='invalid-id'){assert.equal(result,null);assert.equal(e.calls.length,0);}else assert.equal(result,mode==='existing'?'file:///qa/documents/trim-references/reference-qa-123.jpg':null);checks.push({mode,pass:true,calls:e.calls,result});}catch(error){checks.push({mode,pass:false,error:String(error)});}}
 const at=new Date().toISOString(),run=path.join(__dirname,'runs',at.replaceAll(/[:.]/g,'-')+'-native-reference');fs.mkdirSync(run,{recursive:true});
 const versions=Object.fromEntries(['expo-image-manipulator','expo-file-system'].map(n=>[n,JSON.parse(fs.readFileSync(path.join(mobile,'node_modules',n,'package.json'))).version]));
 const result={at,sourceSha256:sha(raw),stableSource:sha(fs.readFileSync(file))===sha(raw),versions,checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,scope:'Exact native reference adapter control flow with Expo image/filesystem mocks. Physical picker permissions,actual decode/JPEG output,EXIF handling,native file persistence and image display remain unverified.'};
 fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,checks:checks.filter(c=>!c.pass),artifact:path.join(run,'result.json')}));process.exitCode=result.failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
