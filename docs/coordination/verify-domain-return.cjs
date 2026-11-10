/* Coordinator acceptance of the explicitly returned, single-writer repair increment. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),mobile=path.join(root,'mobile'),out=path.join(__dirname,'domain-acceptance');
const node='C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';
fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const returned=fs.readFileSync(path.join(root,'docs/qa/design/DOMAIN_RETURN.md'),'utf8');
const expected=Object.fromEntries([...returned.matchAll(/`mobile\/src\/domain\/([^`]+)`\s*\|\s*`([a-f0-9]{64})`/g)].map(m=>[m[1],m[2]]));
const snapshot=()=>Object.fromEntries(['geometry.ts','project.ts','persistence.ts'].map(n=>[n,sha(fs.readFileSync(path.join(mobile,'src/domain',n)))]));
const before=snapshot();
if(Object.keys(expected).length!==3||Object.keys(before).some(n=>before[n]!==expected[n]))throw Error('Current domain files do not match acknowledged return hashes');
const harnesses={};
for(const name of ['probe-domain.cjs','stress-domain.cjs']){const source=path.join(root,'docs/qa/design',name),target=path.join(out,name);fs.copyFileSync(source,target);harnesses[name]=sha(fs.readFileSync(source));}
const commands=[
 ['focused',[path.join(out,'probe-domain.cjs'),'focused-results.json']],
 ['stress',[path.join(out,'stress-domain.cjs')]],
 ['app-domain',['scripts/test-domain.cjs']],
 ['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],
 ['domain-lint',['node_modules/eslint/bin/eslint.js','src/domain/geometry.ts','src/domain/project.ts','src/domain/persistence.ts']]
];
const results=[];
for(const [kind,args] of commands){const start=Date.now();const r=spawnSync(node,args,{cwd:mobile,windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024,env:{...process.env,PATH:path.dirname(node)+path.delimiter+(process.env.PATH||''),CI:'1'}});fs.writeFileSync(path.join(out,kind+'.log'),(r.stdout||'')+(r.stderr||''));results.push({kind,exitCode:r.status,signal:r.signal,error:r.error?String(r.error):null,durationMs:Date.now()-start,command:[node,...args]});}
const focused=JSON.parse(fs.readFileSync(path.join(out,'focused-results.json'))),stress=JSON.parse(fs.readFileSync(path.join(out,'stress-domain-results.json'))),after=snapshot();
const result={checkedAtUtc:new Date().toISOString(),returnDocumentSha256:sha(Buffer.from(returned)),before,after,stableDomain:Object.keys(before).every(n=>before[n]===after[n]),harnesses,results,focused:{passed:focused.passed,failed:focused.failed},stress:{passed:stress.passed,failed:stress.failed},limitations:'Independent rerun of copied repair-owner fixtures plus app tests, full TypeScript and scoped domain lint. Domain hashes pin the repaired increment. This does not establish UI/native/device or thermal behavior.'};
result.pass=result.stableDomain&&results.every(r=>r.exitCode===0)&&focused.failed===0&&stress.failed===0;
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.pass?0:1;
