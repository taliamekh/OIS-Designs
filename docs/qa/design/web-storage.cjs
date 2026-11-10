// Read the actual production web adapter in an isolated QA browser context.
// No app source is changed. Only this reader's own IDB connection is closed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const mobile=path.resolve(__dirname,'../../../mobile'),ts=createRequire(path.join(mobile,'package.json'))('typescript'),file=path.join(mobile,'src/storage/indexedStore.ts'),source=fs.readFileSync(file,'utf8');
const compiled=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const oracleInfo={kind:'Production IndexedStorage.getItem, with its read-only legacy fallback',file:'mobile/src/storage/indexedStore.ts',sha256:crypto.createHash('sha256').update(source).digest('hex')};
async function readStored(page,key='ois.library.v1'){
 return page.evaluate(async({compiled,key})=>{
  const module={exports:{}};new Function('exports','module',compiled)(module.exports,module);
  const adapter=new module.exports.IndexedStorage({getItem:async key=>localStorage.getItem(key),setItem:async()=>{throw Error('QA reader is read-only');}});
  try{return await adapter.getItem(key);}finally{if(adapter.opening)await adapter.opening.then(db=>db.close()).catch(()=>{});}
 },{compiled,key});
}
async function readLibrary(page){const raw=await readStored(page);return raw?JSON.parse(JSON.parse(raw).payload):null;}
async function waitForLibrary(page,predicate,timeout=8000){
 const started=Date.now();let latest;
 do{latest=await readLibrary(page);if(latest&&predicate(latest))return latest;await new Promise(resolve=>setTimeout(resolve,100));}while(Date.now()-started<timeout);
 throw Error('Durable library condition not reached: '+JSON.stringify(latest?{activeId:latest.activeId,projects:latest.projects.map(h=>({name:h.present.name,rooms:h.present.floors.map(f=>f.rooms.length),openings:h.present.floors.map(f=>f.openings.length)}))}:null));
}
module.exports={readStored,readLibrary,waitForLibrary,oracleInfo};
