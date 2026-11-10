/* Produce disposable QA backup bytes for import through the app's public validation UI. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load,root,mobile}=require('./probe-domain.cjs');
const D=load('src/domain/project.ts'),P=load('src/domain/persistence.ts');
const assets=JSON.parse(fs.readFileSync(path.join(mobile,'src/catalogue/assets.json')));
const p=D.sampleProject(assets);p.id='runtime-qa-connected-rooms';p.name='Runtime QA connected rooms';p.floors=p.floors.slice(0,1);p.floors[0].items=[];
const l={version:1,projects:[{past:[],present:p,future:[]}],activeId:p.id,favourites:[],recent:[],settings:{unit:'m',grid:true,quickMove:true,appearance:'dark'},lastDoor:{type:'single',width:.9,height:2.1,hinge:'left',flip:false,repeat:true}};
const raw=P.encode(l);P.decode(raw);
const out=path.join(__dirname,'artifacts');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'connected-rooms-fixture.json'),raw);
const summary={at:new Date().toISOString(),id:p.id,scope:'Disposable fixture for a separate QA browser origin only. No shared user project is edited.',sha256:crypto.createHash('sha256').update(raw).digest('hex'),rooms:p.floors[0].rooms.map(r=>({id:r.id,name:r.name,polygon:r.polygon,floorFinish:r.floorFinish})),walls:p.floors[0].walls,openings:p.floors[0].openings};
fs.writeFileSync(path.join(out,'connected-rooms-fixture-summary.json'),JSON.stringify(summary,null,2));process.stdout.write(JSON.stringify({at:summary.at,id:p.id,bytes:Buffer.byteLength(raw),sha256:summary.sha256,rooms:summary.rooms,openings:summary.openings})+'\n');
