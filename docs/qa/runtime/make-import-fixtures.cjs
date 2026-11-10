/* Explicit synthetic invalid/future files; verified originals remain unchanged. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const out=path.join(__dirname,'artifacts'),original=fs.readFileSync(path.join(__dirname,'runs/2026-11-10T02-16-02-194Z-save-size/house-40-primary.json'),'utf8');
const wrapper=JSON.parse(original);wrapper.checksum=wrapper.checksum[0]==='0'?'1'+wrapper.checksum.slice(1):'0'+wrapper.checksum.slice(1);
const fixtures={'qa-corrupt-checksum.json':JSON.stringify(wrapper),'qa-future-schema.json':JSON.stringify({schema:2,checksum:'future-qa-fixture',payload:'Future schema QA bytes; preserve exactly.'})};
const rows=[];for(const [name,raw] of Object.entries(fixtures)){const file=path.join(out,name);if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')!==raw)throw Error('Different QA fixture already exists: '+name);fs.writeFileSync(file,raw);rows.push({name,bytes:Buffer.byteLength(raw),sha256:crypto.createHash('sha256').update(raw).digest('hex')});}
fs.writeFileSync(path.join(out,'import-fixtures-manifest.json'),JSON.stringify({at:new Date().toISOString(),scope:'Fresh QA-only validation fixtures, not actual newer user data.',rows},null,2));console.log(JSON.stringify(rows));
