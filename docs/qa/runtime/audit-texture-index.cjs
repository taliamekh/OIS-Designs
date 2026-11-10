/* Independent byte audit of runtime image identities across all retained revisions. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const project=path.resolve(process.argv[2]||path.join(__dirname,'../../../mobile'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),sources={},errors=[],models=[];
const read=r=>{const b=fs.readFileSync(path.join(project,r));sources[r]=hash(b);return b;};
const revisions=JSON.parse(read('src/catalogue/revisions.json')),index=JSON.parse(read('src/catalogue/texture-images.json'));
const bundleFile=path.join(project,'src/catalogue/bundled.ts'),requires=require('./bundle-references.cjs')(bundleFile,read('src/catalogue/bundled.ts'));
const seen=new Set(),uniqueImages=new Set();let imageOccurrences=0,totalBytes=0;
for(const record of revisions){try{
  const key=record.sha256;if(seen.has(key))continue;seen.add(key);
  const relative=requires.get(key);assert.ok(relative,'Missing exact-revision static require');
  const file=path.resolve(path.dirname(bundleFile),relative);assert.ok(file.startsWith(path.join(project,'assets/furniture')+path.sep));
  const raw=fs.readFileSync(file);assert.equal(hash(raw),key);assert.equal(raw.length,record.bytes);totalBytes+=raw.length;
  assert.equal(raw.toString('ascii',0,4),'glTF');assert.equal(raw.readUInt32LE(4),2);assert.equal(raw.readUInt32LE(8),raw.length);
  let json,bin,cursor=12;
  while(cursor<raw.length){assert.ok(cursor+8<=raw.length);const size=raw.readUInt32LE(cursor),type=raw.readUInt32LE(cursor+4);assert.equal(size%4,0);assert.ok(cursor+8+size<=raw.length);const chunk=raw.subarray(cursor+8,cursor+8+size);if(type===0x4e4f534a)json=JSON.parse(chunk.toString('utf8'));if(type===0x004e4942)bin=chunk;cursor+=8+size;}
  const actual={};
  for(const [i,image] of (json.images||[]).entries()){
    let bytes,mime=image.mimeType;
    if(image.bufferView!==undefined){const view=json.bufferViews[image.bufferView];assert.equal(view.buffer,0);assert.ok(Number.isInteger(view.byteLength)&&view.byteLength>0);const start=view.byteOffset||0;assert.ok(start>=0&&start+view.byteLength<=bin.length);bytes=bin.subarray(start,start+view.byteLength);}
    else {const match=/^data:([^;]+);base64,([\s\S]+)$/.exec(image.uri||'');assert.ok(match,'Unsupported external image');mime=match[1];bytes=Buffer.from(match[2],'base64');}
    if(mime==='image/png')assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
    else if(mime==='image/jpeg')assert.equal(bytes.toString('hex',0,2),'ffd8');
    else throw Error('Unsupported MIME '+mime);
    actual[i]={sha256:hash(bytes),mimeType:mime};uniqueImages.add(actual[i].sha256);imageOccurrences++;
  }
  assert.deepEqual(index[key],actual);models.push({id:record.id,version:record.version,sha256:key,images:Object.keys(actual).length});
}catch(error){errors.push({id:record.id,sha256:record.sha256,error:String(error)});}}
for(const key of Object.keys(index))if(!seen.has(key))errors.push({sha256:key,error:'Orphan runtime image-index record'});
const changedSources=Object.entries(sources).filter(([r,h])=>hash(fs.readFileSync(path.join(project,r)))!==h).map(([r])=>r);
const at=new Date().toISOString(),run=path.join(__dirname,'runs',at.replaceAll(/[:.]/g,'-')+'-texture-index');fs.mkdirSync(run,{recursive:true});
const result={at,project,sources,stableSources:!changedSources.length,changedSources,revisionRecords:revisions.length,uniqueRevisions:seen.size,indexRecords:Object.keys(index).length,imageOccurrences,uniqueImages:uniqueImages.size,totalBytes,models,errors,scope:'Exact immutable GLB/image/static-require bindings only; no decoding, GPU or visual/native claim.'};
fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,models:undefined,errors:errors.slice(0,5),errorCount:errors.length,artifact:path.join(run,'result.json')}));process.exitCode=errors.length||changedSources.length?1:0;
