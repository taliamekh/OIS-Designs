const fs=require('node:fs'),path=require('node:path');
const {load}=require('./probe-domain.cjs'),p=load('src/domain/project.ts'),s=load('src/domain/persistence.ts');
const project=p.makeProject('living'),base={version:1,projects:[{past:[],present:project,future:[]}],activeId:project.id,favourites:[],recent:[],settings:{unit:'m',grid:true,quickMove:true,appearance:'system'},lastDoor:{type:'single',width:.9,height:2.1,hinge:'left',flip:false,repeat:true}};
const cases=[];
for(const value of['not-an-array',[null],['not-a-hex'],['#abcdef']]){
 let accepted=false,error;try{s.decode(s.encode({...base,recentColours:value}));accepted=true;}catch(e){error=String(e);}
 cases.push({field:'recentColours',value,accepted,error,expectedAccepted:Array.isArray(value)&&value.every(v=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v))});
}
const report={timestamp:new Date().toISOString(),evidence:'Production decode/encode with the newly rendered optional recentColours field; not a UI/native crash reproduction',cases};
for(const c of cases)c.pass=c.accepted===c.expectedAccepted;
fs.writeFileSync(path.join(__dirname,'schema-extension-audit.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify(report,null,2)+'\n');
