/* Read-only TypeScript module execution against a selected immutable app copy. */
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const mobile=path.resolve(__dirname,'../../../mobile'),local=createRequire(path.join(mobile,'package.json')),ts=local('typescript');
function createLoader(sourceRoot,options={}){
 const cache=new Map();
 function load(file){
  const absolute=path.resolve(sourceRoot,file);
  if(cache.has(absolute))return cache.get(absolute).exports;
  if(absolute.endsWith('.json'))return JSON.parse(fs.readFileSync(absolute,'utf8'));
  const raw=fs.readFileSync(absolute,'utf8'),text=options.transform?options.transform(absolute,raw):raw,module={exports:{}};cache.set(absolute,module);
  const compiled=ts.transpileModule(text,{fileName:absolute,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  function requireSource(id){if(!id.startsWith('.'))return local(id);const candidate=path.resolve(path.dirname(absolute),id);for(const suffix of['','.ts','.tsx','.json'])if(fs.existsSync(candidate+suffix)&&fs.statSync(candidate+suffix).isFile())return load(candidate+suffix);throw Error(`Cannot resolve ${id} from ${absolute}`);}
  new Function('require','module','exports','__filename','__dirname',compiled)(requireSource,module,module.exports,absolute,path.dirname(absolute));return module.exports;
 }
 return{load};
}
module.exports={createLoader};
