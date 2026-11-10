/* Focused coordinator probe: can explicit recovery leave a protected read-I/O state? */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load,mobile}=require('./domain-acceptance/probe-domain.cjs');
const P=load('src/domain/persistence.ts'),D=load('src/domain/project.ts'),{FileBackedStorage,FILE_INDEX_PREFIX}=load('src/storage/fileStore.ts');
const output=path.join(__dirname,'protected-recovery');fs.mkdirSync(output,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const snapshot=()=>Object.fromEntries(['src/domain/persistence.ts','src/storage/fileStore.ts'].map(n=>[n,sha(fs.readFileSync(path.join(mobile,n)))]));
const before=snapshot();
const library=name=>{const p=D.makeProject('living');p.name=name;return{version:1,projects:[{past:[],present:p,future:[]}],activeId:p.id,favourites:[],recent:[],settings:{unit:'m',grid:true,quickMove:true,appearance:'system'},lastDoor:{type:'single',width:.9,height:2.1,hinge:'left',flip:false,repeat:true}};};
async function run(kind){
 const index=new Map(),files=new Map();let unreadable=null;
 const store=new FileBackedStorage({getItem:async k=>index.get(k)??null,setItem:async(k,v)=>{index.set(k,v);}},{write:async(n,v)=>{files.set(n,v);},read:async n=>{if(n===unreadable)throw Error('Injected payload read unavailable');if(!files.has(n))throw Error('Injected missing payload');return files.get(n);},remove:async n=>{files.delete(n);}});
 const backup=library('verified backup'),primary=library('protected primary');
 await P.saveLibrary(store,backup);await P.saveLibrary(store,primary);
 const originalPointer=index.get(FILE_INDEX_PREFIX+P.PRIMARY),originalBytes=files.get(originalPointer);
 if(kind==='missing-primary')files.delete(originalPointer);else unreadable=originalPointer;
 const loaded=await P.loadLibrary(store);let recoveryError=null;
 try{await P.recoverLibrary(store,loaded.library);}catch(e){recoveryError=String(e);}
 let after=null,afterError=null;
 try{after=await P.loadLibrary(store);}catch(e){afterError=String(e);}
 const originalPreserved=kind==='missing-primary'||[...files.values()].includes(originalBytes);
 return{kind,openedBackup:loaded.library?.projects[0].present.name==='verified backup',editingProtected:loaded.protected,recoveryError,afterError,reopenedName:after?.library?.projects[0].present.name,reopenedProtected:after?.protected,originalReadableBytesPreserved:originalPreserved,pointerAfter:index.get(FILE_INDEX_PREFIX+P.PRIMARY),originalPointer,payloadFiles:[...files.keys()],pass:!!loaded.library&&loaded.protected&&!recoveryError&&after?.library?.projects[0].present.name==='verified backup'&&!after.protected&&originalPreserved};
}
(async()=>{const rows=[await run('missing-primary'),await run('unreadable-primary')],after=snapshot(),result={checkedAtUtc:new Date().toISOString(),before,after,stableSource:JSON.stringify(before)===JSON.stringify(after),rows,limits:'Production recovery/file-store logic with synthetic Map payloads and explicitly injected missing/read errors; not native filesystem/device failure or user data.'};result.pass=result.stableSource&&rows.every(r=>r.pass);fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.pass?0:1;})().catch(e=>{console.error(e);process.exitCode=1;});
