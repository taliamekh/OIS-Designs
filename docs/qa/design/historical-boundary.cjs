/* Reproduce the documented pre-miter collision using retained exact source bytes. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const mobile=path.resolve(__dirname,'../../../mobile'),workspace=path.dirname(mobile),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function historical(){
 const geometry=fs.readFileSync(path.join(__dirname,'geometry-return-0511/mobile__src__domain__geometry.ts'),'utf8'),project=fs.readFileSync(path.join(__dirname,'geometry-return-0511/mobile__src__domain__project.ts'),'utf8');
 const meshes=execFileSync('git',['show','43b53e6d:mobile/src/scene/meshes.ts'],{cwd:workspace,encoding:'utf8',maxBuffer:2e6});
 if(sha(geometry)!=='0b029dd1ee4d1070fc8dfaffd96b5baded62ce8d1ec4d5556fd5c27fdcf57364')throw Error('Retained original geometry differs');
 const entries={'src/domain/geometry.ts':geometry,'src/domain/project.ts':project,'src/scene/meshes.ts':meshes};
 const metadata={kind:'Historical pre-miter reproduction, not current production',sourceOverrides:Object.fromEntries(Object.entries(entries).map(([f,text])=>[f,sha(text)])),meshCommit:'43b53e6d',retainedGeometrySource:'geometry-return-0511/'};
 return{metadata,options:{transform:(file,text)=>entries[path.relative(mobile,file).replaceAll('\\','/')]??text}};
}
module.exports={historical};
