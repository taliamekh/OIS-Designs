# Asset integration contract

## Current handoff

Read `furniture/catalogue-v2/batch-ready.json` for the exact current manifest and review-ledger digests/counts. `catalogue-v2/accepted-assets.json` contains the same pinned snapshot's internally accepted distinct designs. `furniture/manifest.json` remains additive schema1, including candidates, reviewed variants, all39 preserved legacy assets, and immutable historical revisions. Use `qualityStatus == "internally-accepted"` for the curated collection. Internal review is separate from user approval and phone validation.

The producer owns only `furniture/` and `docs/furniture/`. App-owned copies/loading/native validation belong to the app owner. Authorized implementation is underway elsewhere; these exports and browser helpers alone do not establish Expo adoption or phone performance.

Each new asset has a real GLB, editable original `.blend`, source/parameter snapshots, provenance, exact SHA/bytes, measured triangles/vertices/draw primitives, dimensions/bounds, material slots and front/back previews. Accepted revisions require explicit GLB/image/sheet hash-bound visual evidence, independent geometry screening and clean official Khronos validation. Regeneration invalidates old acceptance pending new review. Current maps and geometry are original; no restricted external asset is included.

## Coordinates, identity and placement

Metres, right-handed Y-up, +X right, furniture front **-Z**. Blender uses +Y front/Z-up; export maps `(x,y,z)` to `(x,z,-y)`. Do not repeat that conversion, auto-centre or fit to a generic UI envelope. Apply room position/yaw to a parent transform and preserve internal nodes. Floor normalization uses the lowest actual vertex. XZ origin is the primary body centre, so accessories, ladders and chaises can make asymmetric bounds.

Persist `{assetId, version, sha256, file, roomId, positionMetres, yawRadians, materialOverrides}`. Resolve old placements against exact current or historical revisions; never silently substitute newly shaped geometry. Old GLBs remain preserved in `historicalAssets` / `catalogue-v2/history.json`. Geometry caches include the content hash.

Footprints are measured conservative XZ rectangles, not contact polygons or navigation/service clearance. Placement metadata distinguishes floor and wall anchoring. Floating vanities, wall cupboards/range hoods and wall tables have `defaultElevationMetres`; their GLB base is Y0, so apply mounting elevation explicitly. Check ceiling height for tall/bunk pieces. Open/deployed poses use their actual measured bounds and do not imply runtime animation support. Keep drawer, door, ladder and walking clearances separate.

## Rooms, themes and beds

Normalize `entry-hall` to app `entry` and `laundry-utility` to `utility` on both selected-room and asset tags; preserve original tags in stored data. Other primary tags: living, bedroom, dining, kitchen, bathroom, office, children, storage. Primary room is organization, not a placement restriction.

Five themes: calm-oak, walnut-form, soft-japandi, city-loft, coastal-linen. Distinct constructions span rooms/themes; recolours and dimensions do not multiply counts. Filter actual dimensions, room, category/subtype, theme, `bedSize`, materials, colour tags and search aliases. Favourites are per-user stable-ID sets. Size/configuration variants retain `variantOf`, shared design/family IDs and `countEligible:false`.

Nominal North American mattress W×L in metres: twin0.9652×1.905, full/double1.3716×1.905, queen1.524×2.032, king1.9304×2.032. Read each row's mattress/secondary-mattress dimensions and actual bounds; thickness/platform heights vary. Standard-size exports regenerate frame/bedding and remain non-counting variants. Bunks/lofts are separate constructions. Planning assets are not fabrication plans or certified children's products.

## Materials and shared texture experiment

Current textured revisions embed bounded256px neutral base-colour, roughness and tangent-normal PNGs. Normal-mapped primitives have UVs and explicit valid tangents. PBR tint stays a separate linear `baseColorFactor`; sRGB HEX is not an already-linear factor. Clone named-slot materials for per-item overrides; preserve maps/roughness/metallic/alpha. Mirror metals need an appropriate renderer reflection/environment treatment. No Draco, KTX2 or KHR_materials_variants dependency is required.

Browser helper: `furniture/review/shared-texture-bank.js`, class `SharedTextureBank`. Call `await bank.bind(gltf)` after import; call `bank.releaseTree(root)` during disposal, and skip separate disposal of the managed textures returned by that method. Keys include embedded-image SHA-256 plus MIME type, colour space, sampler filtering/wrapping, UV channel/matrix, flipY, mipmaps, alpha unpacking, alignment and anisotropy. Image hash alone is insufficient. Material tint/normal strength stay independent. Root reference counts preserve another loaded item's texture and release unreferenced textures/decoded bitmaps. A native adapter must reproduce those semantics using its actual decoder/API; this browser helper does not establish such an adapter exists.

Frozen40-model fixture: `catalogue-v2/browser-texture-bank-v0.5.0/fixture.json`, SHA `b37d34ce7c06d6aef9731c72ea26d50db81b2b9ba85c1afa4384fd5b54096390`. Installed Edge WebGL rendered87,432 triangles with231 ordinary texture allocations versus9 bank allocations and pixel-identical screenshots. Forty swaps/disposal returned to0 textures. Twenty-one browser guards passed for semantic keys, independent tint/normal factors and leases. See [TEXTURE-BANK-EXPERIMENT.md](TEXTURE-BANK-EXPERIMENT.md). Counters are not GPU byte/device measurements.

Older five-model interoperability fixture remains frozen: `catalogue-v2/fixtures/textured-v0.3.2.json`, SHA `ad94017d8ad89a7082aedfb0a7c69312d1f1b4fe99337dd92fb97f08e53b9d03`. It does not accept later successors.

## LOD and renderer validation

Read actual `lod.delivered` / `lod.levels`; planned ratios are not delivered levels. Eight reduced GLBs currently attach to five exact parent hashes. Each passed front/back review, clean format validation, three-view silhouette overlap≥0.965 and measured bounds deviation≤5mm. Four trials were withheld. Parent revisions invalidate mismatched LOD links; levels never increase design counts. Exact source/evidence: `catalogue-v2/lod-delivery.json` and `lod-comparison-v0.5.0-lod2.json`.

App validation still needs exact imports, scale/facing, independent transforms and recolouring, texture colour spaces, alpha/mirror treatment, disposal/cache and persistence, then physical iPhone/Android evidence. Test a measured40-item mixture on the chosen renderer. Desktop Blender/WebGL results remain separate.
