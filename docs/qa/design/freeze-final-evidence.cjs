/* Own only docs/qa/design; exact publication manifest, never git operations. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,relative=f=>'docs/qa/design/'+f,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const reports=['opening-physical-matrix.json','opening-legacy-compat.json','opening-legacy-web.json','quick-corner-web.json','signed-imperial.json','room-move-320-web.json','inside-door-chain-matrix.json','draft-current-web.json','draw-inside-retest-web.json'];
const json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
for(const f of reports){const r=json(f);if(r.failure||r.preconditionFailure||r.failed||r.runs?.some(v=>v.failure||v.errors?.length||v.consoleErrors?.length)||r.errors?.length||r.consoleErrors?.length)throw Error('Not ready: '+f);}
for(const f of['opening-legacy-web.json','quick-corner-web.json']){const r=json(f);if(r.ui.provenanceSha256!=='821dc99e584fc9b4a1e31bd2864ce765e7fec135b4fd0ddd8e09c1f1fad69b0d'||r.ui.compiledSourceMatchCount!==59)throw Error('Wrong final snapshot: '+f);}
const images=['legacy-opening-open-feet.png','legacy-opening-window-feet.png','quick-corner-first-stamp.png','room-move-320-preview-before-apply.png'];
const frozen='frozen-evidence/final-0645',frozenDir=path.join(root,frozen);fs.mkdirSync(frozenDir,{recursive:true});
for(const f of[...reports,...images]){const bytes=fs.readFileSync(path.join(root,f)),dest=path.join(frozenDir,f);if(fs.existsSync(dest)&&!bytes.equals(fs.readFileSync(dest)))throw Error('Refuse to overwrite different frozen bytes: '+f);if(!fs.existsSync(dest))fs.writeFileSync(dest,bytes);}
const sources=['frozen-evidence/app-821dc99e584fc9b4/provenance.json','frozen-evidence/app-3bfd3abb6a198332/provenance.json'];
const historical=['frozen-evidence/signed-ft-0633/index.json','frozen-evidence/signed-ft-0633/opening-legacy-web.json','frozen-evidence/signed-ft-0633/legacy-opening-open-feet.png','frozen-evidence/signed-ft-0633/legacy-opening-window-feet.png','inside-door-chain-before-caption-oracle.json','room-move-320-before-target-oracle.json'];
const helpers=['app-frozen-context.cjs','source-loader.cjs','web-storage.cjs','door-dimension-matrix.cjs','correct-inside-chain-caption-oracle.cjs','freeze-final-evidence.cjs','live-cold-reload.cjs','live-cold-reload.json','live-cold-reload-before-selector-correction.json'];
const harnesses=reports.map(f=>f.replace(/\.json$/,'.cjs')).filter(f=>fs.existsSync(path.join(root,f)));
const docs=['STATUS.md','FINDINGS.md','PUBLISH_CHECKPOINT.md','FINAL_CHECKPOINT.md','OPENING_CORNER_CLOSURE.md','SIGNED_IMPERIAL_HANDOFF.md','FINDINGS_BOARD_BEFORE_0643.md','LIVE_PREVIEW_CLOSURE.md'];
const describe=f=>{const bytes=fs.readFileSync(path.join(root,f));return{file:relative(f),bytes:bytes.length,sha256:sha(bytes)};};
const frozenFiles=[...reports,...images].map(f=>describe(frozen+'/'+f));
const index={recordedAt:'2026-11-10T06:45:00Z',scope:'Bounded source-matched CPU/browser QA. No physical native acceptance.',provenance:sources.map(describe),files:frozenFiles};
const indexBytes=Buffer.from(JSON.stringify(index,null,2)+'\n'),indexFile=path.join(frozenDir,'index.json');if(fs.existsSync(indexFile)&&!indexBytes.equals(fs.readFileSync(indexFile)))throw Error('Conflicting frozen index');fs.writeFileSync(indexFile,indexBytes);
const list=[...new Set([...docs,...helpers,...harnesses,...reports,...images,...sources,...historical,...frozenFiles.map(f=>f.file.slice('docs/qa/design/'.length)),frozen+'/index.json'])].sort();
const publication={generatedAt:new Date().toISOString(),publisher:'Coordinator only; this script performs no Git operations.',exactPaths:true,includeManifestItself:'docs/qa/design/final-publication.json',excluded:'No furniture review/library tree, node_modules, raw temporary exports, logs or unaccepted/unfinished output. Prior historical failures listed explicitly stay historical.',files:list.map(describe)};
fs.writeFileSync(path.join(root,'final-publication.json'),JSON.stringify(publication,null,2)+'\n');process.stdout.write(JSON.stringify({readyFiles:list.length,manifest:'docs/qa/design/final-publication.json',frozenReports:reports.length,frozenImages:images.length,bytes:publication.files.reduce((n,f)=>n+f.bytes,0)},null,2)+'\n');
