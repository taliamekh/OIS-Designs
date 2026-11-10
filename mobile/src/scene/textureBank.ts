import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
export type ImageHashes = Record<string, { sha256: string; mimeType: string }>;
type Entry = { texture: THREE.Texture; users: number };
/** Canonical textures share pixels/sampling only. Colours and normal strength
 * remain properties of each cloned material. No browser crypto or DOM dependency. */
export class SharedTextureBank {
  private entries = new Map<string, Entry>();
  private roots = new WeakMap<THREE.Object3D, Set<string>>();
  private closed = new WeakSet<object>();
  private duplicates = 0;
  bind(gltf: GLTF, hashes: ImageHashes) {
    if (this.roots.has(gltf.scene)) return;
    const textures = new Set<THREE.Texture>(),
      replacements = new Map<THREE.Texture, THREE.Texture>(),
      leases = new Set<string>(),
      discarded = new Set<object>();
    gltf.scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      for (const m of Array.isArray(node.material)
        ? node.material
        : [node.material])
        for (const value of Object.values(m))
          if (value instanceof THREE.Texture) textures.add(value);
    });
    for (const t of textures) {
      if (
        ("isCompressedTexture" in t && t.isCompressedTexture) ||
        t.mipmaps.length
      )
        continue;
      const association = gltf.parser.associations.get(t),
        textureIndex = association?.textures;
      if (textureIndex === undefined) continue;
      const imageIndex = gltf.parser.json.textures?.[textureIndex]?.source,
        hash = hashes[String(imageIndex)];
      if (!hash) continue;
      if (t.matrixAutoUpdate) t.updateMatrix();
      const key = JSON.stringify({
        image: hash.sha256,
        mime: hash.mimeType,
        colorSpace: t.colorSpace,
        format: t.format,
        mapping: t.mapping,
        type: t.type,
        internalFormat: t.internalFormat,
        wrapS: t.wrapS,
        wrapT: t.wrapT,
        magFilter: t.magFilter,
        minFilter: t.minFilter,
        flipY: t.flipY,
        generateMipmaps: t.generateMipmaps,
        channel: t.channel,
        matrix: t.matrix.elements,
        matrixAutoUpdate: t.matrixAutoUpdate,
        offset: t.offset.toArray(),
        repeat: t.repeat.toArray(),
        center: t.center.toArray(),
        rotation: t.rotation,
        anisotropy: t.anisotropy,
        premultiplyAlpha: t.premultiplyAlpha,
        unpackAlignment: t.unpackAlignment,
        nativeData: "isDataTexture" in t && t.isDataTexture === true,
        width: t.image?.width ?? null,
        height: t.image?.height ?? null,
      });
      let entry = this.entries.get(key);
      if (!entry) {
        entry = { texture: t, users: 0 };
        this.entries.set(key, entry);
      } else if (entry.texture !== t) {
        replacements.set(t, entry.texture);
        t.dispose();
        if (
          t.source.data !== entry.texture.source.data &&
          t.source.data &&
          typeof t.source.data === "object"
        )
          discarded.add(t.source.data);
        this.duplicates++;
      }
      if (!leases.has(key)) {
        entry.users++;
        leases.add(key);
      }
    }
    gltf.scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(node.material)
        ? node.material
        : [node.material]) {
        const m = material as unknown as Record<string, unknown>;
        for (const [slot, value] of Object.entries(m))
          if (value instanceof THREE.Texture && replacements.has(value))
            m[slot] = replacements.get(value);
      }
    });
    const retained = new Set(
      [...this.entries.values()].map((e) => e.texture.source.data),
    );
    for (const image of discarded) if (!retained.has(image)) this.close(image);
    this.roots.set(gltf.scene, leases);
  }
  release(root: THREE.Object3D) {
    const leases = this.roots.get(root),
      managed = new Set<THREE.Texture>(),
      closing = new Set<object>();
    if (!leases) return managed;
    for (const key of leases) {
      const entry = this.entries.get(key);
      if (!entry) continue;
      managed.add(entry.texture);
      entry.users--;
      if (!entry.users) {
        entry.texture.dispose();
        if (
          entry.texture.source.data &&
          typeof entry.texture.source.data === "object"
        )
          closing.add(entry.texture.source.data);
        this.entries.delete(key);
      }
    }
    this.roots.delete(root);
    const retained = new Set(
      [...this.entries.values()].map((e) => e.texture.source.data),
    );
    for (const image of closing) if (!retained.has(image)) this.close(image);
    return managed;
  }
  private close(image: object) {
    const bitmap = image as { close?: () => void };
    if (typeof bitmap.close === "function" && !this.closed.has(image)) {
      bitmap.close();
      this.closed.add(image);
    }
  }
  snapshot() {
    return {
      textures: this.entries.size,
      leases: [...this.entries.values()].reduce((n, e) => n + e.users, 0),
      duplicates: this.duplicates,
    };
  }
}
export const modelTextureBank = new SharedTextureBank();
