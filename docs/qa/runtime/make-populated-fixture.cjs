/* Disposable, command-validated scene for a separate QA browser origin. No production writes. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load,mobile,sources}=require('./probe-domain.cjs');
const D=load('src/domain/project.ts'),P=load('src/domain/persistence.ts');
const raw=fs.readFileSync(path.join(mobile,'src/catalogue/assets.json'));
const assets=JSON.parse(raw),candidates=assets.filter(a=>a.placement?.anchor!=='wall'&&a.dimensionsMetres.width<=2.6&&a.dimensionsMetres.depth<=2.6&&a.dimensionsMetres.height<=2.5);
let project=D.makeProject('living',16,12.8);project.id='runtime-qa-populated-scene';project.name='Runtime QA populated scene';
const floorId=project.floors[0].id,roomId=project.floors[0].rooms[0].id;
const selected=[],rejected=[],families=new Set();
for(const a of candidates){
  if(selected.length>=20)break;
  const family=a.geometryFamily||a.id;if(families.has(family))continue;
  const i=selected.length,item={id:'runtime-qa-item-'+i,roomId,assetId:a.id,assetVersion:a.version,assetHash:a.sha256,x:1.6+(i%5)*3.2,z:1.6+Math.floor(i/5)*3.2,yaw:0,locked:i%3===0,materialOverrides:{}};
  const result=D.execute({past:[],present:project,future:[]},{type:'add-item',floorId,item},'3d',assets);
  if(result.error){rejected.push({id:a.id,error:result.error});continue;}
  project=result.history.present;families.add(family);selected.push({id:a.id,version:a.version,sha256:a.sha256,family,dimensions:a.dimensionsMetres,item});
}
if(selected.length!==20)throw Error('Could not build twenty valid distinct-family placements.');
const library={version:1,projects:[{past:[],present:project,future:[]}],activeId:project.id,favourites:[],recent:[],settings:{unit:'m',grid:true,quickMove:true,appearance:'dark'},lastDoor:{type:'single',width:.9,height:2.1,hinge:'left',flip:false,repeat:true}};
const encoded=P.encode(library);P.decode(encoded);
const out=path.join(__dirname,'artifacts');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'populated-scene-fixture.json'),encoded);
const summary={at:new Date().toISOString(),id:project.id,scope:'Disposable QA-only scene; twenty command-validated placements. No native/GPU claim from fixture validation.',catalogueSha256:crypto.createHash('sha256').update(raw).digest('hex'),fixtureSha256:crypto.createHash('sha256').update(encoded).digest('hex'),selected,rejected,sources};
fs.writeFileSync(path.join(out,'populated-scene-fixture-summary.json'),JSON.stringify(summary,null,2));
process.stdout.write(JSON.stringify({id:project.id,items:selected.length,bytes:Buffer.byteLength(encoded),catalogueSha256:summary.catalogueSha256,fixtureSha256:summary.fixtureSha256,rejected})+'\n');
