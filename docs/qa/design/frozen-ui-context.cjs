const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const runs=path.resolve(__dirname,'../runtime/runs');
async function latestFrozenUI(){
 const folders=fs.readdirSync(runs,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name.endsWith('-frozen-web')).map(e=>e.name).sort().reverse();
 const skipped=[];
 for(const id of folders.slice(0,4)){
  const directory=path.join(runs,id),serverFile=path.join(directory,'server.json'),manifestFile=path.join(directory,'freeze-manifest.json'),provenanceFile=path.join(directory,'bundle-provenance.json');
  if(![serverFile,manifestFile,provenanceFile].every(f=>fs.existsSync(f)))continue;
  const server=JSON.parse(fs.readFileSync(serverFile)),manifest=JSON.parse(fs.readFileSync(manifestFile)),provenance=JSON.parse(fs.readFileSync(provenanceFile));
  if(!manifest.stableDuringCopy||!provenance.pass||provenance.sourceHash!==manifest.sourceHash||!/^http:\/\/127\.0\.0\.1:\d+$/.test(server.url))continue;
  try{const response=await fetch(server.url,{method:'HEAD',signal:AbortSignal.timeout(3000)});if(response.status!==200){skipped.push({id,status:response.status});continue;}}
  catch(e){skipped.push({id,error:String(e)});continue;}
  return{url:server.url,id,directory,project:path.join(directory,'project'),sourceHash:manifest.sourceHash,sourceMapPass:provenance.pass,compiledSourceMatchCount:provenance.uniqueAppSources,sources:manifest.sources,skipped};
 }
 throw Error('No currently served, source-verified frozen UI: '+JSON.stringify(skipped));
}
function liveSources(){const mobile=path.resolve(__dirname,'../../../mobile');return Object.fromEntries(['src/scene/Viewport.tsx','src/scene/Plan.tsx','src/scene/picking.ts','src/screens/Catalogue.tsx','src/screens/Editor.tsx','src/screens/Build.tsx','src/domain/geometry.ts','src/storage/indexedStore.ts'].filter(f=>fs.existsSync(path.join(mobile,f))).map(f=>[f,{sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,f))).digest('hex')}]));}
async function chosenUI(){
 if(!process.env.OIS_QA_URL)return{kind:'frozen',...await latestFrozenUI()};
 const url=process.env.OIS_QA_URL;if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(url))throw Error('Only the known local QA previews are supported');
 return{kind:'live',url,id:'live-preview',project:path.resolve(__dirname,'../../../mobile'),sourceHash:null,sourceMapPass:false,compiledSourceMatchCount:null,sources:liveSources()};
}
module.exports={latestFrozenUI,chosenUI,liveSources};
