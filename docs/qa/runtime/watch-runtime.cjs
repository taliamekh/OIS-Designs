/* Read-only QA monitor for the user-requested overnight build window. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const qa = __dirname, root = path.resolve(qa, '../../..'), mobile = path.join(root, 'mobile');
const node = 'C:\\Users\\talia\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';
const deadline = new Date('2026-11-10T06:53:00Z').getTime();
const journal = path.join(qa, 'watch-journal.jsonl');
const stateFile = path.join(qa, 'watch-state.json');
const events = [];
function emit(event) {
  const item = { at: new Date().toISOString(), ...event };
  fs.appendFileSync(journal, JSON.stringify(item) + '\n');
  events.push(item); if (events.length > 20) events.shift();
  fs.writeFileSync(stateFile, JSON.stringify({ deadline: new Date(deadline).toISOString(), pid: process.pid, events }, null, 2));
  process.stdout.write(JSON.stringify(item) + '\n');
}
function fingerprint() {
  const entries = [];
  function visit(relative) {
    const full = path.join(mobile, relative); if (!fs.existsSync(full)) return;
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) for (const n of fs.readdirSync(full).sort()) visit(path.join(relative,n));
      else entries.push([relative.replaceAll('\\','/'),stat.size,stat.mtimeMs]);
    } catch (error) { entries.push([relative,error.code]); }
  }
  for (const r of ['src','assets','package.json','package-lock.json','app.json','metro.config.js','babel.config.js','eslint.config.js','tsconfig.json']) visit(r);
  return crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}
function run(script, args) {
  return new Promise(resolve => {
    const child = spawn(node, [path.join(qa,script),...args], {cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output=''; for(const s of [child.stdout,child.stderr])s.on('data',d=>{if(output.length<65536)output+=d;});
    child.on('error',e=>{output+=String(e);});
    child.on('close',(exitCode,signal)=>resolve({exitCode,signal,output:output.trim().slice(-12000)}));
  });
}
let observed = fingerprint(), tested = observed, changedAt = Date.now(), lastExportAt = 0, exportHash = '';
let busy=false, lastHeartbeat=0;
emit({type:'monitor-started', fingerprint:observed, scope:'Read-only app checks; no installations, fixes, SDK changes or dev servers.'});
const timer=setInterval(async()=>{
  if(busy)return;
  const now=Date.now(), next=fingerprint();
  if(next!==observed){observed=next;changedAt=now;emit({type:'source-change-observed',fingerprint:next});}
  if(now>=deadline){clearInterval(timer);emit({type:'minimum-window-reached',fingerprint:observed,latestTestedFingerprint:tested});process.exit(0);return;}
  if(now-lastHeartbeat>300000){lastHeartbeat=now;emit({type:'monitor-heartbeat',fingerprint:observed,awaitingSettledChanges:observed!==tested});}
  if(observed===tested||now-changedAt<60000)return;
  busy=true;
  const checkpoint=observed;
  emit({type:'verification-started',fingerprint:checkpoint});
  for(const check of ['typecheck','lint']) emit({type:'check-result',check,...await run('run-check.cjs',[check])});
  emit({type:'asset-audit-result',...await run('audit-assets.cjs',[])});
  const after=fingerprint();
  if(after===checkpoint){
    tested=checkpoint;
    if(exportHash!==checkpoint && now-lastExportAt>=900000){
      for(const check of ['ios-export','web-export'])emit({type:'check-result',check,...await run('run-check.cjs',[check])});
      lastExportAt=Date.now();exportHash=checkpoint;
    }
  }else{observed=after;changedAt=Date.now();emit({type:'source-changed-during-verification',fingerprint:after});}
  busy=false;
},10000);
