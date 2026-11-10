const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const mobile=path.resolve(__dirname,'../../../mobile'),req=createRequire(path.join(mobile,'package.json')),ts=req('typescript'),THREE=req('three');
const sceneFile=path.join(mobile,'src/scene/RoomScene.tsx'),scene=fs.readFileSync(sceneFile,'utf8'),ast=ts.createSourceFile(sceneFile,scene,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(ast)==='raw'&&node.expression.name.text==='map')callback=node.arguments[0].getText(ast);ts.forEachChild(node,visit);}visit(ast);
if(!callback)throw Error('The production raw.map texture-clone callback changed; inspect before adapting this probe.');
const moduleFixture={exports:null},code=ts.transpileModule('module.exports=('+callback+');',{fileName:'clone.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('THREE','repeatX','repeatY','angle','offsetX','offsetY','nativeRenderer','module',code)(THREE,2,1,.3,.2,.1,true,moduleFixture);
// Exact output shape of the installed R3F/native TextureLoader polyfill. No real
// filesystem/native image or EXGL calls are made by this source-path fixture.
const texture=new THREE.Texture();texture.image={data:{localUri:'file:///qa-only-image.png'},width:4,height:4};texture.flipY=true;texture.isDataTexture=true;
const cloned=moduleFixture.exports(texture,0),material=new THREE.MeshStandardMaterial({map:texture}),materialClone=material.clone();
const checks=[
 {id:'native-loader-shape-retained-through-production-clone',pass:cloned.isDataTexture===true,observed:{sourceConstructor:texture.constructor.name,sourceIsDataTexture:texture.isDataTexture,cloneConstructor:cloned.constructor.name,cloneIsDataTexture:cloned.isDataTexture??null,cloneImage:cloned.image}},
 {id:'native-model-material-clone-retains-texture-adapter',pass:materialClone.map===texture&&materialClone.map.isDataTexture===true},
 {id:'repeat-and-offset-are-independent',pass:cloned.repeat.x===2&&cloned.offset.x===.2&&texture.repeat.x===1&&texture.offset.x===0}
];
const files=['src/scene/RoomScene.tsx','src/scene/fiber.native.ts','node_modules/@react-three/fiber/native/dist/react-three-fiber-native.cjs.dev.js','node_modules/three/src/textures/Texture.js','node_modules/three/src/renderers/webgl/WebGLTextures.js'];
const hashes=Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,f))).digest('hex')]));
const report={timestamp:new Date().toISOString(),evidence:'Installed source path plus real Three texture and actual production clone callback. This is NOT a physical EXGL/native execution or observed phone crash.',versions:{expo:req('expo/package.json').version,expoGL:req('expo-gl/package.json').version,fiber:req('@react-three/fiber/package.json').version,three:THREE.REVISION},sourceHashes:hashes,productionCallback:callback,checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length};
fs.writeFileSync(path.join(__dirname,'native-texture-source-probe.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify(report,null,2)+'\n');
texture.dispose();cloned.dispose();material.dispose();materialClone.dispose();
