// Browser integration experiment. Asset files remain portable embedded GLBs.
// Keys preserve rendering semantics; material tint/normal strength remain per material.
export class SharedTextureBank {
 constructor(){this.entries=new Map();this.roots=new WeakMap();this.closed=new WeakSet();this.decodedDuplicates=0;this.releases=0}
 async bind(gltf){
  const textures=new Set();gltf.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)for(const v of Object.values(m))if(v?.isTexture)textures.add(v)});
  const replacements=new Map(),leases=new Set(),discardedImages=new Set();
  for(const texture of textures){
   const association=gltf.parser.associations.get(texture),index=association?.textures;
   const definition=gltf.parser.json.textures?.[index],source=gltf.parser.json.images?.[definition?.source];
   if(source?.bufferView===undefined)throw new Error('Texture bank requires an embedded image with an exact bufferView');
   const bytes=await gltf.parser.getDependency('bufferView',source.bufferView),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
   texture.updateMatrix();
   const semantics={imageSha256:digest,mimeType:source.mimeType,colorSpace:texture.colorSpace,wrapS:texture.wrapS,wrapT:texture.wrapT,magFilter:texture.magFilter,minFilter:texture.minFilter,flipY:texture.flipY,generateMipmaps:texture.generateMipmaps,channel:texture.channel,matrix:texture.matrix.elements,anisotropy:texture.anisotropy,premultiplyAlpha:texture.premultiplyAlpha,unpackAlignment:texture.unpackAlignment};
   const key=JSON.stringify(semantics);let entry=this.entries.get(key);
   if(!entry){entry={texture,users:0,semantics};this.entries.set(key,entry)}
   else if(entry.texture!==texture){replacements.set(texture,entry.texture);texture.dispose();if(texture.source.data!==entry.texture.source.data)discardedImages.add(texture.source.data);this.decodedDuplicates++}
   if(!leases.has(key)){entry.users++;leases.add(key)}
  }
  gltf.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)for(const [key,value] of Object.entries(m))if(replacements.has(value))m[key]=replacements.get(value)});
  // Close redundant decodes only after all properties have been rebound.
  const retained=new Set([...this.entries.values()].map(e=>e.texture.source.data));
  for(const bitmap of discardedImages)if(!retained.has(bitmap))this.close(bitmap);
  this.roots.set(gltf.scene,leases);return gltf;
 }
 close(bitmap){if(bitmap?.close&&!this.closed.has(bitmap)){bitmap.close();this.closed.add(bitmap)}}
 releaseTree(root){
  const managed=new Set(),closing=new Set();root.traverse(o=>{const leases=this.roots.get(o);if(!leases)return;for(const key of leases){const entry=this.entries.get(key);if(!entry)throw new Error('Texture lease underflow');managed.add(entry.texture);entry.users--;if(!entry.users){entry.texture.dispose();closing.add(entry.texture.source.data);this.entries.delete(key);this.releases++}}this.roots.delete(o)});
  const retained=new Set([...this.entries.values()].map(e=>e.texture.source.data));for(const bitmap of closing)if(!retained.has(bitmap))this.close(bitmap);return managed;
 }
 snapshot(){return {uniqueTextures:this.entries.size,rootLeases:[...this.entries.values()].reduce((n,e)=>n+e.users,0),decodedDuplicates:this.decodedDuplicates,releases:this.releases,entries:[...this.entries.values()].map(e=>({...e.semantics,users:e.users}))}}
}
