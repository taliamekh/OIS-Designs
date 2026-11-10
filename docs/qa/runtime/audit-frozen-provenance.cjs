/* Verify which application bytes were actually compiled into an isolated web export. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const run=path.resolve(process.argv[2]),folder=path.join(run,process.argv[3]||'export-clear');
const manifest=JSON.parse(fs.readFileSync(path.join(run,'freeze-manifest.json')));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=[],maps=[];
function inspect(map,file){
  if(map.sections){for(const section of map.sections)inspect(section.map,file);return;}
  for(let i=0;i<(map.sources||[]).length;i++){
    const source=map.sources[i].replaceAll('\\','/'),at=source.lastIndexOf('/src/');
    const relative=at>=0?source.slice(at+1):source.startsWith('src/')?source:null;
    if(!relative||!manifest.sources[relative])continue;
    const expected=manifest.instrumentation?.relative===relative?manifest.instrumentation.instrumentedSha256:manifest.sources[relative].sha256;
    const actual=typeof map.sourcesContent?.[i]==='string'?sha(map.sourcesContent[i]):null;
    rows.push({map:path.relative(folder,file).replaceAll('\\','/'),source,relative,expected,actual,pass:actual===expected});
  }
}
function visit(dir){for(const n of fs.readdirSync(dir)){const file=path.join(dir,n);if(fs.statSync(file).isDirectory())visit(file);else if(n.endsWith('.map')){maps.push(file);inspect(JSON.parse(fs.readFileSync(file,'utf8')),file);}}}
visit(folder);
const mismatches=rows.filter(r=>!r.pass),unique=[...new Set(rows.map(r=>r.relative))];
const result={at:new Date().toISOString(),sourceHash:manifest.sourceHash,folder,maps:maps.length,appSourceOccurrences:rows.length,uniqueAppSources:unique.length,viewportVerified:rows.some(r=>r.relative==='src/scene/Viewport.tsx'&&r.pass),pass:rows.length>0&&mismatches.length===0,mismatches,rows};
const reportName=process.argv[4]||'bundle-provenance.json';if(path.basename(reportName)!==reportName||!reportName.endsWith('.json'))throw Error('QA report filename required.');
fs.writeFileSync(path.join(run,reportName),JSON.stringify(result,null,2));
process.stdout.write(JSON.stringify({...result,rows:undefined})+'\n');process.exitCode=result.pass?0:1;
