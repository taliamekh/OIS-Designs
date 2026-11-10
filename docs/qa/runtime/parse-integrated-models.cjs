/* Exercise the app's installed GLTFLoader on app-integrated bytes, without a GPU or production writes. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const qa = __dirname, root = path.resolve(qa, '../../..'), mobile = path.join(root, 'mobile');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
async function main() {
  const { GLTFLoader } = await import(pathToFileURL(path.join(mobile, 'node_modules/three/examples/jsm/loaders/GLTFLoader.js')).href);
  const THREE = await import(pathToFileURL(path.join(mobile, 'node_modules/three/build/three.module.js')).href);
  const assetPath = path.join(mobile, 'src/catalogue/assets.json'), bundledPath = path.join(mobile, 'src/catalogue/bundled.ts');
  const assetsBytes = fs.readFileSync(assetPath), bundledBytes = fs.readFileSync(bundledPath);
  const assets = JSON.parse(assetsBytes);
  const requires = require('./bundle-references.cjs')(bundledPath, bundledBytes);
  const startedAt = new Date().toISOString(), results = [];
  const loader = new GLTFLoader();
  let totalMeshes=0,totalTriangles=0,totalVertices=0;
  for (const asset of assets) {
    const start = performance.now();
    try {
      const file = path.resolve(path.dirname(bundledPath), requires.get(asset.id));
      const bytes = fs.readFileSync(file);
      if (sha(bytes)!==asset.sha256) throw Error('Byte hash changed from metadata');
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset+bytes.byteLength);
      const gltf = await loader.parseAsync(buffer, '');
      gltf.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(gltf.scene, true), size=box.getSize(new THREE.Vector3());
      const geometries=new Set(),materials=new Set();
      let meshes=0,vertices=0,triangles=0;
      gltf.scene.traverse(object=>{
        if(!object.isMesh)return;
        meshes++;geometries.add(object.geometry);
        for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);
        const position=object.geometry.getAttribute('position');
        vertices+=position?.count||0;triangles+=(object.geometry.index?.count||position?.count||0)/3;
        if(!position||Array.from(position.array).some(v=>!Number.isFinite(v)))throw Error('Missing or non-finite mesh positions');
        if(object.matrixWorld.elements.some(v=>!Number.isFinite(v)))throw Error('Non-finite node transform');
      });
      const maxDelta=Math.max(Math.abs(box.min.x-asset.bounds.min[0]),Math.abs(box.min.y-asset.bounds.min[1]),Math.abs(box.min.z-asset.bounds.min[2]),Math.abs(box.max.x-asset.bounds.max[0]),Math.abs(box.max.y-asset.bounds.max[1]),Math.abs(box.max.z-asset.bounds.max[2]));
      if(!meshes||![size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>0))throw Error('No renderable nonzero volume');
      let geometryDisposeEvents=0,materialDisposeEvents=0;
      for(const g of geometries){g.addEventListener('dispose',()=>geometryDisposeEvents++);g.dispose();}
      for(const m of materials){m.addEventListener('dispose',()=>materialDisposeEvents++);m.dispose();}
      totalMeshes+=meshes;totalVertices+=vertices;totalTriangles+=triangles;
      results.push({id:asset.id,ok:true,meshes,vertices,triangles,boundsMaxDelta:maxDelta,size:[size.x,size.y,size.z],parseMs:+(performance.now()-start).toFixed(3),geometryDisposeEvents,geometries:geometries.size,materialDisposeEvents,materials:materials.size});
    }catch(error){results.push({id:asset.id,ok:false,error:String(error),parseMs:+(performance.now()-start).toFixed(3)});}
  }
  const stableInputs=sha(fs.readFileSync(assetPath))===sha(assetsBytes)&&sha(fs.readFileSync(bundledPath))===sha(bundledBytes);
  const failed=results.filter(r=>!r.ok),outOfBounds=results.filter(r=>r.boundsMaxDelta>.002);
  const durations=results.map(r=>r.parseMs).sort((a,b)=>a-b);
  const result={startedAt,finishedAt:new Date().toISOString(),catalogueHash:sha(assetsBytes),bundledHash:sha(bundledBytes),stableInputs,records:assets.length,failed,outOfBounds:outOfBounds.map(r=>({id:r.id,delta:r.boundsMaxDelta})),totalMeshes,totalTriangles,totalVertices,parseP95Ms:durations[Math.floor(durations.length*.95)],parseMaxMs:durations.at(-1),scope:'Desktop Node GLTF parse and CPU resource-dispose events only; not browser/native GPU memory, mobile timing, native file loading or model design distinctness.',results};
  const run=path.join(qa,'runs',startedAt.replaceAll(/[:.]/g,'-')+'-gltf-parse');fs.mkdirSync(run,{recursive:true});fs.writeFileSync(path.join(run,'result.json'),JSON.stringify(result,null,2));
  process.stdout.write(JSON.stringify({...result,failed:failed.slice(0,10),failedCount:failed.length,outOfBounds:result.outOfBounds.slice(0,10),outOfBoundsCount:result.outOfBounds.length,results:undefined,artifact:path.join(run,'result.json')})+'\n');
  process.exitCode=failed.length||outOfBounds.length||!stableInputs?1:0;
}
main().catch(error=>{process.stderr.write(String(error)+'\n');process.exitCode=1;});
