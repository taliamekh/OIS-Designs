/* Immutable app-source snapshot for long UI sequences while the production owner keeps editing. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const qa=__dirname,root=path.resolve(qa,'../../..'),mobile=path.join(root,'mobile');
const node='C:\\Users\\talia\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const platformOption=process.argv.indexOf('--platform'),platform=platformOption<0?'web':process.argv[platformOption+1];
if(!['web','ios','android'].includes(platform))throw Error('A supported export platform is required.');
const id=new Date().toISOString().replaceAll(/[:.]/g,'-')+'-frozen-'+platform,run=path.join(qa,'runs',id),frozen=path.join(run,'project'),out=path.join(run,'export');
const sources={};fs.mkdirSync(frozen,{recursive:true});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function copy(relative){const from=path.join(mobile,relative),to=path.join(frozen,relative);if(!fs.existsSync(from))return;const stat=fs.statSync(from);if(stat.isDirectory()){fs.mkdirSync(to,{recursive:true});for(const n of fs.readdirSync(from).sort())copy(path.join(relative,n));}else{const bytes=fs.readFileSync(from);fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,bytes);sources[relative.replaceAll('\\','/')]={sha256:sha(bytes),bytes:bytes.length};}}
const startedAt=new Date().toISOString();
for(const r of ['src','assets','package.json','package-lock.json','app.json','metro.config.js','babel.config.js','tsconfig.json','expo-env.d.ts'])copy(r);
const changedDuringCopy=Object.entries(sources).filter(([r,record])=>{try{return sha(fs.readFileSync(path.join(mobile,r)))!==record.sha256;}catch{return true;}}).map(([r])=>r);
fs.symlinkSync(path.join(mobile,'node_modules'),path.join(frozen,'node_modules'),'junction');
const metro=path.join(frozen,'metro.config.js');
fs.appendFileSync(metro,`\n// QA snapshot only: unchanged installed dependencies and an isolated transform cache.\nmodule.exports.watchFolders=[...(module.exports.watchFolders||[]),${JSON.stringify(path.join(mobile,'node_modules'))}];\nmodule.exports.cacheVersion=${JSON.stringify('ois-runtime-qa-'+id)};\nmodule.exports.cacheStores=[new(require('metro-cache').FileStore)({root:${JSON.stringify(path.join(run,'metro-cache'))}})];\n`);
const metadata={id,startedAt,sourceRoot:mobile,frozenRoot:frozen,exportRoot:out,sourceHash:sha(JSON.stringify(sources)),stableDuringCopy:changedDuringCopy.length===0,changedDuringCopy,sources,configDifference:'QA-only Metro watchFolders adds the existing shared node_modules. No production code/configuration changed.',scope:'Frozen source browser artifact, not a native build or current live dev-server state.'};
metadata.platform=platform;metadata.scope='Frozen source JavaScript export for '+platform+'; not a native build, device execution or current live dev-server state.';
if(process.argv.includes('--diagnostics')){
  const relative='src/scene/Viewport.tsx',filename=path.join(frozen,relative),original=fs.readFileSync(filename,'utf8');
  const guard='if (!__DEV__) return;';
  if(original.split(guard).length!==2)throw Error('Expected exactly one existing development-diagnostics guard. No instrumentation applied.');
  const replacement='// QA snapshot only: expose the existing read-only scene diagnostics in this local export.';
  const instrumented=original.replace(guard,replacement);fs.writeFileSync(filename,instrumented);
  metadata.instrumentation={relative,originalSha256:sha(original),instrumentedSha256:sha(instrumented),removed:guard,added:replacement,purpose:'Enable only the existing read-only __oisSceneProbe for resource counters in this isolated QA export. Business logic and production source are unchanged.'};
  metadata.scope+=' Existing scene diagnostics are enabled in this QA copy only; this is not an unmodified production bundle.';
}
fs.writeFileSync(path.join(run,'freeze-manifest.json'),JSON.stringify(metadata,null,2));
const log=fs.createWriteStream(path.join(run,'output.log'));let logBytes=0;
metadata.configDifference='QA-only Metro watchFolders adds the unchanged existing dependencies; cacheVersion and cacheStores isolate QA transforms. No production code/configuration changed.';
fs.writeFileSync(path.join(run,'freeze-manifest.json'),JSON.stringify(metadata,null,2));
const exportArgs=[path.join(mobile,'node_modules/expo/bin/cli'),'export','--platform',platform,'--source-maps','--output-dir',out,'--max-workers','2','--dump-assetmap'];if(platform!=='web')exportArgs.push('--no-bytecode');
const child=spawn(node,exportArgs,{cwd:frozen,windowsHide:true,env:{...process.env,CI:'1',EXPO_NO_TELEMETRY:'1',PATH:path.dirname(node)+path.delimiter+(process.env.PATH||'')},stdio:['ignore','pipe','pipe']});
for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{if(logBytes<2*1024*1024){log.write(data);logBytes+=data.length;}});
child.on('error',error=>log.write(String(error)));
child.on('close',(exitCode,signal)=>{const result={id,startedAt,finishedAt:new Date().toISOString(),exitCode,signal,stableDuringCopy:metadata.stableDuringCopy,sourceHash:metadata.sourceHash,exportRoot:out,logBytes};fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));log.end();process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=exitCode||(!metadata.stableDuringCopy?1:0);});
