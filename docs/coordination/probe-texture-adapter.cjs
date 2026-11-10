/* Actual surface-clone callback with installed Three; no device/EXGL execution. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const mobile=path.resolve(__dirname,'../../mobile'),req=createRequire(path.join(mobile,'package.json')),ts=req('typescript'),THREE=req('three');
const filename=path.join(mobile,'src/scene/RoomScene.tsx'),before=fs.readFileSync(filename),source=before.toString(),ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(ast)==='raw'&&node.expression.name.text==='map')callback=node.arguments[0].getText(ast);ts.forEachChild(node,visit);}visit(ast);
if(!callback)throw Error('Inspect changed surface callback before adapting this probe.');
const code=ts.transpileModule('module.exports=('+callback+');',{fileName:'fixture.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const checks=[];
for(const native of [true,false]){
 const module={exports:null};new Function('THREE','repeatX','repeatY','angle','offsetX','offsetY','nativeRenderer','module',code)(THREE,2,3,.7,.2,.4,native,module);
 for(const index of [0,1,2]){
  const raw=new THREE.Texture();raw.image=native?{data:{localUri:'file:///synthetic-test.png'},width:4,height:4}:{width:4,height:4};
  if(native)raw.isDataTexture=true;
  const clone=module.exports(raw,index),prefix=(native?'native':'web')+'-map'+index;
  checks.push({id:prefix+'-upload-adapter',pass:native?clone.isDataTexture===true:clone.isDataTexture!==true});
  checks.push({id:prefix+'-independent-uv',pass:clone!==raw&&clone.repeat.x===2&&clone.repeat.y===3&&clone.offset.x===.2&&clone.offset.y===.4&&clone.rotation===.7&&raw.repeat.x===1&&raw.offset.x===0&&raw.rotation===0});
  checks.push({id:prefix+'-correct-colour-space',pass:clone.colorSpace===(index===0?THREE.SRGBColorSpace:THREE.NoColorSpace)});
  checks.push({id:prefix+'-preserved-image',pass:clone.image===raw.image&&(!native||clone.image.data.localUri==='file:///synthetic-test.png')});
  clone.dispose();raw.dispose();
 }
}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),stable=sha(before)===sha(fs.readFileSync(filename));
const result={checkedAtUtc:new Date().toISOString(),sourceSha256:sha(before),stableSource:stable,three:THREE.REVISION,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks,limits:'Actual production clone callback with installed Three and native-loader-shaped synthetic texture. No real native image decode/upload, filesystem or phone run. Browser GPU rendering is a separate QA gate.'};
const out=path.join(__dirname,'texture-adapter');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=stable&&result.failed===0?0:1;
