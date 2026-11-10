# Batch 0.1.0 verification and review notes

November 8, 2026. See machine-readable [validation](../../furniture/validation.json) for each asset, [manifest](../../furniture/manifest.json) for measured metadata and [test scene](../../furniture/test-scene.json) for imported dimensions/hashes.

| Measure | Delivered result |
|---|---|
| GLBs | 39 |
| Distinct geometry families | 19 |
| Detailed candidates / prototypes / material studies | 5 / 14 / 20 |
| Per-item GLB bytes | 25,784–332,052; all below 2,000,000 |
| Triangles per item | 620–7,136 |
| Material draw primitives per item | 1–4 |
| Five-piece Calm Oak fixture | 13,264 triangles, 12 furniture draw primitives; studio excluded |
| Image textures | zero; zero texture bytes |
| Authoring `.blend` files | 19 individual models + one re-imported test scene |
| Preview files | 39 item PNGs, two labelled contact sheets, one imported-scene PNG |
| Formal Khronos / Expo / physical-device validation | not run |
| LODs delivered | LOD0 only |
| User-approved / release-ready assets | zero / zero |

Independent binary checks passed for all 39 files. Each of the five living GLBs was separately imported into Blender and its measured W/D/H compared to the manifest within 0.00002 m; min floor height was checked with the same tolerance. The test scene records the exact asset hashes. The authoring renderer is not the Expo renderer.

## Render inspection

Inspected the first sofa image, both contact sheets, the imported living-room render and corrected bunk/loft images. Sofa cushions/arms/welts and tapered legs are visibly modelled, the oval table has actual depth, the cabinet has relief and handles, and the lamp shade has an open top/inner wall. The imported set preserves those forms and the asymmetric axis marker. Cabinet orientation in the review scene exposes its front for review; the scene is an asset display, not a proposed finished room layout.

Corrections during QA: normalize splayed-leg geometry to actual floor; batch exported mesh parts by material; use node materials for coloured review markers; remove overlapping bunk end/side guards and offset posts from coplanar platform faces. Prototype bed dimensions therefore come from the final manifest, not rounded early concept dimensions.

The five living pieces have enough geometry detail for a concrete visual review. Plain surface factors and soft studio lighting do not establish finished fabric/wood appearance on phones. Beds, cabinets, appliances and storage remain prototypes even where their thumbnails look clean. Bunk/loft geometry needs a separate design/safety review before any finished catalogue claim.

## Difference from earlier concept envelopes

The actual sofa is approximately 2.100 × 0.875 × 0.810 m; chair 0.780 × 0.795 × 0.806 m; coffee table 1.100 × 0.550 × 0.383 m; media unit 1.600 × 0.455 × 0.555 m; lamp 0.400 × 0.400 × 1.600 m. Relief/handles and leg geometry change actual extents. These do not exactly match the earlier common concept envelopes, and have not been silently rescaled to fit them. The integration lead should consume measured dimensions and review any catalogue label changes.

The expansion matrix covers all practical requested rooms, five coordinated theme directions and 54 families. Remaining 35 families and distinct non-Calm-Oak theme shapes are planned work. Existing palette studies must not be counted as complete new theme designs.
