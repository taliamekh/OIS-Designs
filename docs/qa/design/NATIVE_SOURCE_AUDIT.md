# Native renderer source audit — 2026-11-10 02:34UTC

**02:56UTC update:** owner repaired the conditional adapter flag preservation. The latest actual-callback fixture passes3/3, and coordinator texture-adapter/result.json independently passes24 cases. Real browser texture regression passes8 checks with visually inspected maps and no captured errors. The defect description below records the original cause; source-contract repair is accepted. Physical EXGL upload remains unverified.

Scope: installed Expo58.0.23, expo-gl58.0.4, Fiber9.8.2, Three r180 and the actual production RoomScene map-clone callback. This combines installed source and a real Three runtime-shaped fixture. It is **not a physical EXGL run, native device validation or observed phone crash**.

## QA-NATIVE01 — preserve the native texture upload adapter (P1 source-contract defect)

The installed R3F/native TextureLoader deliberately creates a base THREE.Texture whose image is `{data:{localUri},width,height}`, then sets its own `isDataTexture=true` flag to force non-DOM EXGL upload. The production `MappedMaterial` callback at RoomScene.tsx122 calls `t.clone()`. Three Texture.clone/copy do not copy that ad-hoc flag. The real callback, extracted and executed with that exact native-loader shape, returns a base Texture with `isDataTexture` absent.

Why it matters: installed Three WebGLTextures.js921 chooses the data-texture upload branch using that flag; the data branch passes `image.data`, whereas its normal-image branch passes `image`. Expo's installed EXGLImageUtils.cpp126 checks the pixel object's **top-level localUri**. The original native data path supplies `{localUri}`; the cloned regular-image path supplies the enclosing `{data:{localUri},width,height}`. Preserve the loader-specific adapter flag when cloning surface textures, while retaining independent repeat/offset and leaving ordinary web textures on their correct upload path. Do not solve it by setting every texture on every platform to data-texture mode.

Evidence: native-texture-source-probe.json pins the production callback and source hashes. Three checks: native adapter preservation fails; material cloning retains a model texture's adapter; repeat/offset remain independent. This implicates cloned floor/wall/trim maps, not a blanket failure of GLB material loading. Retest this fixture, web texture rendering and the actual iPhone/Android upload when a device is available.

## Positive source findings

- `fiber.native.ts` imports the native renderer, which is the supported entry point. Official R3F guidance pairs Fiber9 with React19 and uses expo-gl/expo-asset for native WebGL2. [R3F installation](https://r3f.docs.pmnd.rs/getting-started/installation#react-native).
- The SDK58 GLView reference lists expo-gl~58.0.4 as included in Expo Go and documents its WebGL2-like context and native localUri pixel source. The installed version matches that recommendation. [SDK58 GLView](https://docs.expo.dev/versions/v58.0.0/sdk/gl-view/).
- React Native's base BlobManager does reject ArrayBuffer parts, but the installed R3F/native module **already patches that path** and blob/data URLs before loading. Therefore the RN Blob throw alone is not evidence of a current embedded-image blocker. Do not report that false positive.
- R3F conditionally imports expo-file-system/legacy before its filesystem-backed FileLoader/TextureLoader bridge. Its TextureLoader sets localUri payloads and its GLTF/material path retains texture objects. No extra native package or paid build setup is required by this source review.

## Still not proven

Physical iOS/Android asset download/decode/upload, shader capabilities, touch ownership, context loss/recreation, GL memory bytes and thermals remain unverified. JS export and browser success cannot close them. Do not buy services, change security settings or ask the absent user to pair a device during this audit.
