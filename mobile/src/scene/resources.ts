import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useLoader } from "./fiber";
import { modelTextureBank } from "./textureBank";
type Cached = {
  hash: string;
  key: string | number;
  gltf: GLTF;
  refs: number;
  bytes: number;
  last: number;
  clear: () => void;
};
const cache = new Map<string, Cached>();
const wanted = new Map<string, number>();
const MAX_IDLE = 8,
  MAX_IDLE_BYTES = 16 * 1024 * 1024;
const textureCache = new Map<
  string,
  {
    keys: (string | number)[];
    textures: THREE.Texture[];
    refs: number;
    last: number;
  }
>();
export function retainTextureSet(
  id: string,
  keys: (string | number)[],
  textures: THREE.Texture[],
) {
  const entry = textureCache.get(id) ?? {
    keys,
    textures,
    refs: 0,
    last: Date.now(),
  };
  entry.refs++;
  entry.last = Date.now();
  textureCache.set(id, entry);
  return () => {
    entry.refs = Math.max(0, entry.refs - 1);
    entry.last = Date.now();
    setTimeout(() => {
      const idle = [...textureCache]
        .filter(([, v]) => !v.refs)
        .sort((a, b) => a[1].last - b[1].last);
      while (idle.length > 4) {
        const [key, value] = idle.shift()!;
        textureCache.delete(key);
        useLoader.clear(THREE.TextureLoader, value.keys as string[]);
        value.textures.forEach((t) => t.dispose());
      }
    }, 250);
  };
}
function dispose(gltf: GLTF) {
  const managed = modelTextureBank.release(gltf.scene);
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  gltf.scene.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      geometries.add(node.geometry);
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(
        (m) => materials.add(m),
      );
    }
  });
  for (const m of materials) {
    for (const value of Object.values(m))
      if (value instanceof THREE.Texture) textures.add(value);
    m.dispose();
  }
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => {
    if (!managed.has(t)) t.dispose();
  });
}
function trim() {
  const idle = [...cache.entries()]
    .filter(([, v]) => !v.refs && !wanted.has(v.hash))
    .sort((a, b) => a[1].last - b[1].last);
  let bytes = idle.reduce((sum, [, v]) => sum + v.bytes, 0);
  while (idle.length > MAX_IDLE || bytes > MAX_IDLE_BYTES) {
    const [hash, v] = idle.shift()!;
    bytes -= v.bytes;
    cache.delete(hash);
    v.clear();
    dispose(v.gltf);
  }
}
export function retainModel(
  hash: string,
  key: string | number,
  gltf: GLTF,
  bytes: number,
) {
  const token = hash + "@" + gltf.scene.uuid;
  const v = cache.get(token) ?? {
    hash,
    key,
    gltf,
    refs: 0,
    bytes,
    last: Date.now(),
    clear: () => useLoader.clear(GLTFLoader, key as string),
  };
  v.refs++;
  v.last = Date.now();
  cache.set(token, v);
  return () => {
    v.refs = Math.max(0, v.refs - 1);
    v.last = Date.now();
    void Promise.resolve().then(trim);
  };
}
export function modelCacheStats() {
  const v = [...cache.values()];
  return {
    entries: v.length,
    active: v.filter((a) => a.refs > 0).length,
    pending: v.filter((a) => !a.refs && wanted.has(a.hash)).length,
    wanted: wanted.size,
    idle: v.filter((a) => !a.refs && !wanted.has(a.hash)).length,
    sourceBytes: v.reduce((s, a) => s + a.bytes, 0),
    textureSets: textureCache.size,
    sharedTextures: modelTextureBank.snapshot(),
  };
}
/** Also bound loads abandoned before commit; they join the same bounded idle LRU. */
export function registerLoadedModel(
  hash: string,
  key: string | number,
  gltf: GLTF,
  bytes: number,
  clear: () => void,
) {
  const token = hash + "@" + gltf.scene.uuid;
  if (!cache.has(token))
    cache.set(token, {
      hash,
      key,
      gltf,
      refs: 0,
      bytes,
      last: Date.now(),
      clear,
    });
  void Promise.resolve().then(trim);
}
/** RN viewport intent exists before its asynchronous R3F children resolve. A
 * model that is still wanted cannot be evicted while waiting for React commit.
 * Releasing intent schedules cleanup after the complete layout-effect commit,
 * so changing a scope never exposes a transient zero count between cleanup/setup. */
export function retainWantedModels(hashes: string[]) {
  const unique = [...new Set(hashes)];
  for (const hash of unique) wanted.set(hash, (wanted.get(hash) ?? 0) + 1);
  return () => {
    for (const hash of unique) {
      const count = (wanted.get(hash) ?? 1) - 1;
      if (count) wanted.set(hash, count);
      else wanted.delete(hash);
    }
    void Promise.resolve().then(trim);
  };
}
