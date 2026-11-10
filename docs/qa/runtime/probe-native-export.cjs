/* Native-export call sequence with real desktop QA files and mocked Expo/OS boundary. */
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{pathToFileURL,fileURLToPath}=require('node:url');
const {createRequire}=require('node:module'),{load,mobile,sources}=require('./probe-domain.cjs');
const local=createRequire(path.join(mobile,'package.json')),ts=local('typescript'),relative='src/storage/export.native.ts',source=fs.readFileSync(path.join(mobile,relative),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const compiled=ts.transpileModule(source,{fileName:relative,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const id=new Date().toISOString().replaceAll(/[:.]/g,'-')+'-native-export',run=path.join(__dirname,'runs',id);fs.mkdirSync(run,{recursive:true});
const raw=fs.readFileSync(path.join(__dirname,'runs/2026-11-10T02-16-02-194Z-save-size/house-300-primary.json'),'utf8'),checks=[];
async function test(mode){
  const cache=path.join(run,mode);fs.mkdirSync(cache,{recursive:true});const calls=[],written=[];
  class File{
    constructor(folder,name){assert.equal(folder,cache);assert.match(name,/^ois-backup-[a-z0-9-]+\.json$/);this.filename=path.resolve(folder,name);assert.equal(path.dirname(this.filename),cache);this.uri=pathToFileURL(this.filename).href;calls.push({method:'File',uri:this.uri});}
    create(){calls.push({method:'create'});if(mode==='create-fail')throw Error('QA create denied');fs.writeFileSync(this.filename,'',{flag:'wx'});written.push(this.filename);}
    async write(value){calls.push({method:'write',bytes:Buffer.byteLength(value)});if(mode==='write-fail'){await fsp.writeFile(this.filename,value.slice(0,100));throw Error('QA write failed');}await fsp.writeFile(this.filename,value,'utf8');}
    async text(){calls.push({method:'text'});const value=await fsp.readFile(this.filename,'utf8');return mode==='readback-mismatch'?value.slice(0,-1):value;}
  }
  const Sharing={async isAvailableAsync(){calls.push({method:'isAvailableAsync'});return mode!=='unavailable';},async shareAsync(uri,options){calls.push({method:'shareAsync',uri,options});assert.equal(await fsp.readFile(fileURLToPath(uri),'utf8'),raw);assert.equal(options.mimeType,'application/json');assert.equal(options.UTI,'public.json');if(mode==='share-reject')throw Error('QA OS share rejected');}};
  const mod={exports:{}};new Function('require','module','exports',compiled)(name=>name==='expo-file-system'?{File,Paths:{cache}}:name==='expo-sharing'?Sharing:name==='../domain/types'?load('src/domain/types.ts'):(()=>{throw Error('Unexpected native dependency '+name);})(),mod,mod.exports);
  let error;try{await mod.exports.exportBackup(raw);}catch(e){error=String(e);}
  const shares=calls.filter(c=>c.method==='shareAsync');
  if(mode==='success'){assert.equal(error,undefined);assert.equal(shares.length,1);assert.equal(fs.readFileSync(written[0],'utf8'),raw);}
  else{assert.ok(error);assert.equal(shares.length,mode==='share-reject'?1:0);}
  if(mode==='unavailable')assert.equal(written.length,0);
  if(mode==='share-reject')assert.ok(fs.existsSync(written[0]),'Verified cache file remains available for delayed share targets');
  return{mode,pass:true,error,calls,files:written.map(file=>({relative:path.relative(run,file),bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file))}))};
}
(async()=>{for(const mode of ['unavailable','create-fail','write-fail','readback-mismatch','share-reject','success'])try{checks.push(await test(mode));}catch(e){checks.push({mode,pass:false,error:String(e),stack:e.stack});}
const versions=Object.fromEntries(['expo','expo-file-system','expo-sharing'].map(n=>[n,local(n+'/package.json').version])),changed=sha(fs.readFileSync(path.join(mobile,relative)))!==sha(source),result={id,at:new Date().toISOString(),scope:'Actual export.native.ts control flow with real desktop QA cache files. Expo File/Paths and Sharing are mocks, not a native share sheet, permission grant, receiving app or OS lifecycle execution.',versions,sourceHash:sha(source),stableSource:!changed,fixtureBytes:Buffer.byteLength(raw),fixtureSha256:sha(raw),checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,officialSources:['https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/','https://docs.expo.dev/versions/v58.0.0/sdk/sharing/']};fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));process.stdout.write(JSON.stringify({id,versions,stableSource:!changed,passed:result.passed,failed:result.failed,fixtureBytes:result.fixtureBytes,artifact:path.join(run,'result.json')})+'\n');process.exitCode=result.failed?1:0;})().catch(e=>{console.error(e);process.exitCode=1;});
