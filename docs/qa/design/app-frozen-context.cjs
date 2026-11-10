/* Own a short-lived, loopback-only QA server; never alter the shared Expo server. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const workspace=path.resolve(__dirname,'../../..'),mobile=path.join(workspace,'mobile'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function appFrozenUI(){
 const file=path.join(workspace,'docs/build/frozen-web-export.json'),raw=fs.readFileSync(file),record=JSON.parse(raw);
 if(record.exit!==0||!record.stable||!record.accepted||!record.compiledSources?.length||!record.compiledSources.every(s=>s.matches)||record.compiledMatches!==record.compiledSources.length)throw Error('Completed matching app export required');
 const project=path.resolve(record.directory),allowed=path.resolve(mobile,'.tools');if(!project.startsWith(allowed+path.sep))throw Error('Unexpected app snapshot location');
 const patches=new Map(record.patches.map(p=>[p.file,p]));
 for(const p of patches.values())if(!['src/state/Studio.tsx','src/scene/Plan.tsx','src/scene/Viewport.tsx','metro.config.js'].includes(p.file))throw Error('Unreviewed snapshot patch '+p.file);
 for(const source of record.sourceFiles){const expected=patches.get(source.file)?.sha256??source.sha256;if(sha(fs.readFileSync(path.join(project,source.file)))!==expected)throw Error('Snapshot source mismatch '+source.file);}
 const evidence=path.join(__dirname,'frozen-evidence','app-'+sha(raw).slice(0,16));fs.mkdirSync(evidence,{recursive:true});const pinned=path.join(evidence,'provenance.json');if(fs.existsSync(pinned)&&!raw.equals(fs.readFileSync(pinned)))throw Error('Conflicting pinned provenance');fs.writeFileSync(pinned,raw);
 const {createFrozenServer}=require(path.join(mobile,'scripts/serve-frozen.cjs')),server=createFrozenServer(record);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return{kind:'app-frozen',id:path.basename(project),url:'http://127.0.0.1:'+server.address().port,project,sourceHash:sha(raw),sourceMapPass:true,compiledSourceMatchCount:record.compiledMatches,sources:Object.fromEntries(record.sourceFiles.map(s=>[s.file,{sha256:s.sha256}])),patches:record.patches,provenanceFile:file,provenanceSha256:sha(raw),close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
module.exports={appFrozenUI};
