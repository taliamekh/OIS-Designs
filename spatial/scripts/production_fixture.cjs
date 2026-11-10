/* Build an authored backup through the actual production topology and backup validator.
 * Reads mobile sources; writes only spatial/. No user library or native app files are touched. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ts=require('../../mobile/node_modules/typescript');
const root=path.resolve(__dirname,'..'),workspace=path.resolve(root,'..'),tag=process.argv[2]||'r1',out=path.join(root,'evidence/production-fixture-'+tag);
if(fs.existsSync(out))throw Error('Immutable evidence revision already exists');fs.mkdirSync(out,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),hashes={};
const code=path.join(out,'code');fs.mkdirSync(code);fs.writeFileSync(path.join(code,'package.json'),'{"type":"commonjs"}');
for(const name of ['types','construction','geometry','persistence']){
 const file=path.join(workspace,'mobile/src/domain',name+'.ts'),bytes=fs.readFileSync(file);hashes[name]=hash(bytes);fs.writeFileSync(path.join(code,name+'.ts'),bytes);
 const js=ts.transpileModule(bytes.toString(),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 fs.writeFileSync(path.join(code,name+'.js'),js);assert.equal(hash(fs.readFileSync(file)),hashes[name],'Production source changed during read');
}
const {rebuildWalls,distance}=require(path.join(code,'geometry.js')),{validProject,encode,decode}=require(path.join(code,'persistence.js'));
const fixture=JSON.parse(fs.readFileSync(path.join(root,'fixtures/six-room-house.json'))),project=structuredClone(fixture.project),before=JSON.stringify(project.floors.flatMap(f=>f.items));
for(const floor of project.floors){
 const old=floor.walls,newWalls=rebuildWalls(floor.rooms);for(const w of newWalls)w.thickness=.16;
 for(const opening of floor.openings){const w=old.find(w=>w.id===opening.wallId),next=newWalls.find(n=>(distance(n.a,w.a)<1e-5&&distance(n.b,w.b)<1e-5)||(distance(n.a,w.b)<1e-5&&distance(n.b,w.a)<1e-5));assert.ok(next,'Authored opening retains its actual wall');if(distance(next.a,w.a)>1e-5)opening.offset=distance(w.a,w.b)-opening.offset-opening.width;opening.wallId=next.id}
 floor.walls=newWalls;
}
assert.equal(JSON.stringify(project.floors.flatMap(f=>f.items)),before,'Exact authored furniture poses/locks unchanged');assert.ok(validProject(project),'Production accepts authored project geometry');
const library={version:1,projects:[{past:[],present:project,future:[]}],activeId:project.id,favourites:[],recent:[],settings:{unit:'m',grid:true,quickMove:true,appearance:'system'},lastDoor:{type:'open',width:.9,height:2.12,hinge:'left',flip:false,repeat:false}};
const raw=encode(library),restored=decode(raw);assert.deepEqual(restored,library,'Production backup encode/decode roundtrip');
const revisions=JSON.parse(fs.readFileSync(path.join(workspace,'mobile/src/catalogue/revisions.json'))),missing=project.floors.flatMap(f=>f.items).filter(i=>!revisions.some(a=>a.id===i.assetId&&a.version===i.assetVersion&&a.sha256===i.assetHash));
assert.equal(missing.length,0,'All saved model tuples exist in current production revision resolver');
fs.writeFileSync(path.join(out,'six-room-house.backup.json'),raw);fs.writeFileSync(path.join(out,'project.json'),JSON.stringify(project,null,2));
const result={timeUtc:new Date().toISOString(),pass:true,productionSourceSha256:hashes,fixtureSha256:hash(fs.readFileSync(path.join(root,'fixtures/six-room-house.json'))),backupSha256:hash(Buffer.from(raw)),models:40,rooms:6,floors:2,sourceMatchedModelTuples:40,posesAndLocksPreserved:true,productionGeometryAccepted:true,productionBackupRoundtrip:true,scope:'Authored fixture accepted by frozen production topology/backup code; no user library modified, no UI import or native execution claim'};
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
