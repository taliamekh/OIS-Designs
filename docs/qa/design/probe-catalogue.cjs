const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const {load,root,mobile}=require('./probe-domain.cjs'),ts=createRequire(path.join(mobile,'package.json'))('typescript');
const {searchAssets,initialFilters}=load('src/catalogue/search.ts'),resolver=load('src/catalogue/resolve.ts');
const consumer=load('src/catalogue/assets.json'),revisions=resolver.revisions;
const raw=fs.readFileSync(path.join(root,'furniture/manifest.json'),'utf8'),producerJSON=JSON.parse(raw),producer=Array.isArray(producerJSON)?producerJSON:producerJSON.assets??producerJSON.models??producerJSON.items;
const checks=[],check=(id,pass,observed)=>checks.push({id,pass:!!pass,observed});
for(const [room,sourceTag]of[['entry','entry-hall'],['utility','laundry-utility']]){
 const source=producer.find(a=>a.roomTags.includes(sourceTag)),fixture=source&&consumer.find(a=>a.id===source.id);
 check('CONSUMER-ROOM-'+room,!!fixture&&searchAssets([fixture],{...initialFilters,room},[],[]).some(a=>a.id===fixture.id),{sourceId:source?.id,sourceRoomTags:source?.roomTags,consumerRoomTags:fixture?.roomTags});
}
const sofa=consumer.find(a=>/sofa/i.test(a.name+a.subtype));
if(sofa){
 check('QUERY-SYNONYM',searchAssets([sofa],{...initialFilters,query:'couch'},[],[]).length===1,sofa.id);
 check('FAVOURITE',searchAssets([sofa],{...initialFilters,favourites:true},[sofa.id],[]).length===1&&searchAssets([sofa],{...initialFilters,favourites:true},[],[]).length===0,sofa.id);
 check('FIT-DIMENSION',searchAssets([sofa],{...initialFilters,width:String(sofa.dimensionsMetres.width-.01)},[],[]).length===0&&searchAssets([sofa],{...initialFilters,width:String(sofa.dimensionsMetres.width+.01)},[],[]).length===1,sofa.id);
}
for(const bed of['twin','full','queen','king','bunk','loft']){
 const fixtures=consumer.filter(a=>a.bedSize===bed);check('CONSUMER-BED-'+bed,fixtures.length>0&&searchAssets(fixtures,{...initialFilters,bed},[],[]).length===fixtures.length,{consumerFixtures:fixtures.length});
}
const makeItem=a=>({id:'qa-saved-item',roomId:'qa-room',assetId:a.id,assetVersion:a.version,assetHash:a.sha256,x:1,z:1,yaw:0,locked:true,materialOverrides:{}});
for(const fixture of revisions){
 const resolved=resolver.resolveItemAsset(makeItem(fixture));
 check('RESOLVE-EXACT-'+fixture.id+'@'+fixture.version+':'+fixture.sha256,!!resolved&&resolved.id===fixture.id&&resolved.version===fixture.version&&resolved.sha256===fixture.sha256);
}
const fixture=revisions[0],missing={...makeItem(fixture),assetHash:'0'.repeat(64)};
check('MISSING-REVISION-ACTIONABLE',!resolver.resolveItemAsset(missing)&&typeof resolver.assetConflict(missing)==='string',resolver.assetConflict(missing));
// Evaluate the actual exported pure registry initializer, without importing RN/state hooks.
const studio=fs.readFileSync(path.join(mobile,'src/state/Studio.tsx'),'utf8'),ast=ts.createSourceFile('Studio.tsx',studio,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let expression;
for(const statement of ast.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(declaration.name.getText(ast)==='placementAssets')expression=declaration.initializer?.getText(ast);
if(!expression)throw Error('placementAssets initializer not found');
const code=ts.transpileModule('module.exports=('+expression+');',{fileName:'registry.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,registryModule={exports:null};
new Function('assets','revisions','module',code)(consumer,revisions,registryModule);
const registry=registryModule.exports;
const omitted=revisions.filter(r=>!registry.some(a=>a.id===r.id&&a.version===r.version&&a.sha256===r.sha256));
check('PLACEMENT-REGISTRY-COVERS-RETAINED-TUPLES',omitted.length===0,{registryRows:registry.length,retainedRows:revisions.length,omitted:omitted.map(a=>({id:a.id,version:a.version,sha256:a.sha256}))});
const bundledText=fs.readFileSync(path.join(mobile,'src/catalogue/bundled.ts'),'utf8'),bundleAST=ts.createSourceFile('bundled.ts',bundledText,ts.ScriptTarget.Latest,true),bindings=new Map();
for(const statement of bundleAST.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations){
 if(declaration.name.getText(bundleAST)!=='revisionModels')continue;
 for(const property of declaration.initializer.properties){
  const key=property.name.text,call=property.initializer;
  if(ts.isCallExpression(call)&&call.expression.getText(bundleAST)==='require'&&ts.isStringLiteral(call.arguments[0]))bindings.set(key,path.resolve(mobile,'src/catalogue',call.arguments[0].text));
 }
}
for(const a of revisions){const file=bindings.get(a.sha256);check('RETAINED-BINARY-'+a.id+'@'+a.version,!!file&&fs.existsSync(file)&&crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')===a.sha256,{bound:!!file});}
const result={timestamp:new Date().toISOString(),evidence:'Actual consumer catalogue/search and immutable revision resolver/registry/bindings; not raw-producer bypass or renderer regex',producerSha256:crypto.createHash('sha256').update(raw).digest('hex'),consumerSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,'src/catalogue/assets.json'))).digest('hex'),resolverSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,'src/catalogue/resolve.ts'))).digest('hex'),studioSha256:crypto.createHash('sha256').update(studio).digest('hex'),producerRecords:producer.length,consumerRecords:consumer.length,retainedRevisions:revisions.length,unimportedRecords:producer.filter(a=>!consumer.some(b=>b.id===a.id)).length,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks};
fs.writeFileSync(path.join(__dirname,'catalogue-results.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify({...result,checks:checks.filter(c=>!c.pass)},null,2)+'\n');
