/* Export another platform from an already verified QA snapshot without copying/changing production. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const run=path.resolve(process.argv[2]),platform=process.argv[3];
if(!run.startsWith(path.join(__dirname,'runs')+path.sep)||!['web','ios','android'].includes(platform))throw Error('QA snapshot and supported platform required.');
const hermes=process.argv.includes('--hermes');if(hermes&&platform==='web')throw Error('Hermes requires a native platform.');const label=platform+(hermes?'-hermes':'');
const manifest=JSON.parse(fs.readFileSync(path.join(run,'freeze-manifest.json'))),node='C:\\Users\\talia\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe',out=path.join(run,'export-'+label),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(fs.existsSync(out))throw Error('Existing platform artifact is preserved; choose a fresh snapshot.');
function mismatches(){return Object.entries(manifest.sources).filter(([r,v])=>{if(r==='metro.config.js')return false;const expected=manifest.instrumentation?.relative===r?manifest.instrumentation.instrumentedSha256:v.sha256;return sha(fs.readFileSync(path.join(manifest.frozenRoot,r)))!==expected;}).map(([r])=>r);}
const before=mismatches();if(before.length)throw Error('Frozen source mismatch: '+before.join(','));
const startedAt=new Date().toISOString(),args=[path.join(manifest.sourceRoot,'node_modules/expo/bin/cli'),'export','--platform',platform,'--source-maps','--output-dir',out,'--max-workers','2','--dump-assetmap'];if(platform!=='web'&&!hermes)args.push('--no-bytecode');
const log=fs.createWriteStream(path.join(run,label+'-export.log'));let logBytes=0;
const child=spawn(node,args,{cwd:manifest.frozenRoot,windowsHide:true,env:{...process.env,CI:'1',EXPO_NO_TELEMETRY:'1',PATH:path.dirname(node)+path.delimiter+(process.env.PATH||'')},stdio:['ignore','pipe','pipe']});
for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{if(logBytes<2*1024*1024){log.write(data);logBytes+=data.length;}});
child.on('error',error=>log.write(String(error)));child.on('close',(exitCode,signal)=>{const changed=mismatches(),result={startedAt,finishedAt:new Date().toISOString(),platform,compilation:hermes?'Hermes requested':'JavaScript',sourceHash:manifest.sourceHash,exitCode,signal,changedSourceFiles:changed,stableFrozenSources:changed.length===0,output:out,scope:'Export only; native linking/physical behavior unverified.'};fs.writeFileSync(path.join(run,label+'-export-result.json'),JSON.stringify(result,null,2));log.end();process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=exitCode||changed.length?1:0;});
