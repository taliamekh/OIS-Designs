import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Asset, nativeRenderer, useLoader } from "./fiber";
import { revisionModels } from "../catalogue/bundled";
import revisions from "../catalogue/revisions.json";
import imageIndex from "../catalogue/texture-images.json";
import { ImageHashes, modelTextureBank } from "./textureBank";
import { registerLoadedModel } from "./resources";
const sizes = new Map(revisions.map((a) => [a.sha256, a.bytes]));
const sourceFor = (id: number) =>
  nativeRenderer ? id : Asset.fromModule(id).uri;
const sources = new Map(
  Object.entries(revisionModels).map(([hash, id]) => [
    String(sourceFor(id)),
    { hash, bytes: sizes.get(hash) ?? 0 },
  ]),
);
const images = imageIndex as Record<string, ImageHashes>;
/** Pool before instances clone their materials; preserve native Texture objects. */
export class SharedGLTFLoader extends GLTFLoader {
  load(...args: Parameters<GLTFLoader["load"]>) {
    const [url, onLoad, onProgress, onError] = args;
    super.load(
      url,
      (gltf) => {
        try {
          const record = sources.get(String(url));
          if (record) {
            modelTextureBank.bind(gltf, images[record.hash] ?? {});
            registerLoadedModel(record.hash, url, gltf, record.bytes, () =>
              useLoader.clear(SharedGLTFLoader, url),
            );
          }
          onLoad(gltf);
        } catch (error) {
          onError?.(error);
        }
      },
      onProgress,
      onError,
    );
  }
}
