/* Run byte-identical design-owned fixtures in this QA directory so their reports stay in runtime ownership. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const qa=__dirname,root=path.resolve(qa,'../../..'),source=path.join(root,'docs/qa/design');
const mode=process.argv[2]||'all';
const jobs=mode==='catalogue'?['catalogue']:mode==='domain'?['domain']:['domain','catalogue'];
if(jobs.includes('domain')&&!fs.existsSync(path.join(source,'DOMAIN_RETURN.md')))throw Error('Domain repair has not returned ownership; independent integration retest is deferred.');
const node='C:\\Users\\talia\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const id=new Date().toISOString().replaceAll(/[:.]/g,'-')+'-design-probes',run=path.join(qa,'runs',id);fs.mkdirSync(run,{recursive:true});
const fixtures={};
for(const file of ['probe-domain.cjs','probe-catalogue.cjs']){const bytes=fs.readFileSync(path.join(source,file));fixtures[file]=sha(bytes);fs.writeFileSync(path.join(qa,file),bytes);}
const results=[];
for(const job of jobs){
 const startedAt=new Date().toISOString();
 const proc=spawnSync(node,[path.join(qa,'probe-'+job+'.cjs')],{cwd:root,windowsHide:true,encoding:'utf8',maxBuffer:4*1024*1024});
 fs.writeFileSync(path.join(run,job+'.log'),(proc.stdout||'')+(proc.stderr||''));
 const reportFile=path.join(qa,job+'-results.json');let report=null;
 if(fs.existsSync(reportFile)){const bytes=fs.readFileSync(reportFile);fs.writeFileSync(path.join(run,job+'-results.json'),bytes);report=JSON.parse(bytes);}
 const fixtureStable=sha(fs.readFileSync(path.join(source,'probe-'+job+'.cjs')))===fixtures['probe-'+job+'.cjs'];
 results.push({job,startedAt,finishedAt:new Date().toISOString(),commandExitCode:proc.status,signal:proc.signal,error:proc.error?String(proc.error):null,fixtureStable,assertionsPassed:report?.passed??null,assertionsFailed:report?.failed??null,failures:report?.checks?.filter(x=>!x.pass).map(x=>({id:x.id,observed:x.observed,harnessError:x.harnessError})),reportFile:path.join(run,job+'-results.json')});
}
const summary={id,fixtures,results};fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(summary,null,2));process.stdout.write(JSON.stringify(summary)+'\n');
process.exitCode=results.some(r=>r.commandExitCode!==0||r.assertionsFailed!==0||!r.fixtureStable)?1:0;
