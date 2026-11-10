import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Browser experiment for frozen read-only whole-house views. Original objects,
// materials, texture leases and project records remain owned by their caller.
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])):value;
function materialKey(material,meta){
 // Identity-only key construction must not encode source images to PNG.
 // Equal UUIDs mean the exact same live texture object, including its transform.
 for(const value of Object.values(material))if(value?.isTexture)meta.textures[value.uuid]={uuid:value.uuid};
 const json=material.toJSON(meta);for(const key of ['uuid','name','metadata','userData'])delete json[key];
 // toJSON emits dependent map/image records. Shared maps retain exact identity;
 // no texture, colour, roughness, alpha or normal-map difference is discarded.
 return JSON.stringify(stable(json));
}
function signature(geometry){return (geometry.index?'indexed|':'nonindexed|')+Object.entries(geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([n,a])=>`${n}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).join('|');}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
export function buildStaticItemBatches(scene){
 scene.updateMatrixWorld(true);const groups=new Map(),originals=[],skipped=[],result=new THREE.Group(),meta={textures:{},images:{}},materialKeys=new Map();result.name='Read-only static item batches';let sourceBytes=0,indexBytes=0;
 scene.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.userData.itemId||!visible(mesh))return;
  if(mesh.isSkinnedMesh||mesh.isInstancedMesh||Object.keys(mesh.geometry.morphAttributes).length||Array.isArray(mesh.material)||mesh.material.transparent||!mesh.material.isMeshStandardMaterial||mesh.material.clippingPlanes||mesh.material.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile||mesh.matrixWorld.determinant()<=0||mesh.renderOrder!==0||mesh.layers.mask!==1||Object.values(mesh.geometry.attributes).some(a=>a.isInterleavedBufferAttribute)||mesh.geometry.drawRange.start!==0||Number.isFinite(mesh.geometry.drawRange.count)){
   skipped.push({itemId:mesh.userData.itemId,reason:'Unsupported animated, multi-material, transparent or partial-draw geometry'});return;
  }
  if(!materialKeys.has(mesh.material))materialKeys.set(mesh.material,materialKey(mesh.material,meta));
  const key=materialKeys.get(mesh.material)+'|'+signature(mesh.geometry);let group=groups.get(key);if(!group){group={material:mesh.material,parts:[],ranges:[],triangles:0};groups.set(key,group)}
  const geometry=mesh.geometry.clone();geometry.clearGroups();geometry.applyMatrix4(mesh.matrixWorld);
  const triangles=(geometry.index?.count??geometry.attributes.position.count)/3;group.ranges.push({firstFace:group.triangles,lastFace:group.triangles+triangles-1,itemId:mesh.userData.itemId,sourceMeshUuid:mesh.uuid});group.triangles+=triangles;group.parts.push(geometry);originals.push(mesh);
  for(const a of Object.values(geometry.attributes))sourceBytes+=a.array.byteLength;
 });
 try{
  for(const group of groups.values()){
   const geometry=mergeGeometries(group.parts,false);if(!geometry)throw Error('Exact-compatible static geometry merge failed');geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const mesh=new THREE.Mesh(geometry,group.material);mesh.userData.itemFaceRanges=group.ranges;mesh.userData.staticReadOnly=true;result.add(mesh);if(geometry.index)indexBytes+=geometry.index.array.byteLength;
  }
 }catch(error){for(const mesh of result.children)mesh.geometry.dispose();throw error;}
 finally{for(const group of groups.values())for(const g of group.parts)g.dispose();}
 const visibility=new Map(originals.map(m=>[m,m.visible]));for(const mesh of originals)mesh.visible=false;scene.add(result);
 let disposed=false;return {group:result,metrics:{originalMeshes:originals.length,batches:result.children.length,skipped,additionalAttributeBytes:sourceBytes,additionalIndexBytes:indexBytes,triangles:[...groups.values()].reduce((n,g)=>n+g.triangles,0)},dispose(){if(disposed)return;disposed=true;scene.remove(result);for(const m of result.children)m.geometry.dispose();for(const [mesh,value]of visibility)mesh.visible=value;result.clear();}};
}
export function itemForBatchHit(hit){
 if(!Number.isInteger(hit.faceIndex))return null;const ranges=hit.object.userData.itemFaceRanges;if(!ranges)return null;
 return ranges.find(r=>hit.faceIndex>=r.firstFace&&hit.faceIndex<=r.lastFace)?.itemId??null;
}
