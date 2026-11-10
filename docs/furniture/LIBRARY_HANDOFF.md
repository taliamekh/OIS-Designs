# Furniture library integration handoff

Library milestone passed at 2026-11-10T04:32:31Z. **346 internally accepted distinct designs**, including **311 excluding appliances and bathroom fixtures**; **93 reviewed variants**; **439 new usable GLBs**. The 39 legacy GLBs remain compatible and excluded from the new-design target. All 439 new files have current visual decisions; no current rework or unreviewed rows remain.

The overall overnight effort remains active through 06:53 UTC / 01:53 Toronto. This milestone advances the already authorized **Phase 3 — Multi-floor house refinement**, with placement polish supporting original Phase 2. It is not an overall completion declaration.

## Immutable release

`furniture/releases/library-2026-11-10-r1/manifest.json` is the frozen consumer manifest. Paths inside it remain relative to `furniture/`. Its completion audit contains every exact accepted/variant ID, version, GLB SHA-256, source SHA-256, visual sheet/archive hash, formal/contact report path, triangle/byte budget and dependency digest. Do not substitute another revision by ID alone.

- Manifest SHA-256: `edde7f8f2ba36c7757f555afdeed3f8da5715e886e8ae90952f40c1b20509fa0`.
- Current visual ledger SHA-256: `8fcf9dbe2b53d9307c26942efc3e6adede5b7a2605416c1805629b9e6bbcc3fc`.
- Completion audit SHA-256: `e84e082a1e0b8c4aa9915ebe11d5abd112f7ed707b3a971914c0a03b2f645165`.
- Geometry audit SHA-256: `41591836f53a5be77cf3e73f07669a9c4937e8e0b8cd61794604305a15f60b32`.
- Pair review SHA-256: `d467f44b6f2e7645c8d153cb6f73cb3a8a86456ba9ba66dffbc686536965546a`.

`milestone.json` binds all frozen reports. `catalogue-v2/accepted-assets.json` remains a live convenience list; the release manifest and audit are the immutable handoff. The legacy field `newCandidates` counts all new model rows, including accepted ones; use `qualityStatus` and `countEligible` for selection.

## Gates and evidence

- Exact file/source/render/archive/member bindings: completion audit **pass**, all 439 new files. Source snapshots and all support script/parameter digests verified; originals and prior revisions preserved.
- Khronos formal validation: every current new GLB has matching hash-bound report with **0 errors / 0 warnings**. Structural inspection also checks finite geometry, positive transforms, embedded bounded textures, unit tangents on normal-mapped materials and floor pivot.
- Budgets: maximum **13,716 triangles** and **1,946,364 bytes**; each model is under 15,000 triangles and 2 MiB.
- Contact graphs: 431 single connected assemblies; eight explicitly reviewed intentional multi-assembly sets (two nesting sets, removable boot tray, four trundle sizes and deployed third bunk). Every separate floor-supported assembly rests at source z=0. Exact model/source/sheet hashes and reasons bind each exception. This is visual support screening, not structural certification.
- Duplicates: **0 exact groups**, **0 normalized scale/mirror groups**; **369 silhouette flags resolved** with current hash/sheet-bound construction notes. Counts do not increase for colour, material, dimensions, mirrors, drawer/door configuration or mattress size alone.
- Bureau correction: fold-down-dressing-case is retained as a non-counting sibling of writing-bureau-cabinet after direct render comparison. Decorative tuft/channel headboard patterns, banded trunk, hat ring and other identified configuration relatives likewise do not inflate counts.
- Actual Edge WebGL import/render: **439/439 pass**, 0 console/page errors, exact transformed-vertex dimensions within 1 mm, matching triangle counts, finite positions/normals and floor alignment. After disposal: two persistent QA grid/floor geometries, zero textures and zero bank leases. Frozen proof `browser-import.json` SHA-256 `71260a8b7e6632e4067007a1d6d4269b8b7128fc04d2ad36afe45a0e72214fe8`.
- The first browser test used loose rotated bounding boxes and reported misleading dimension failures. Its report is preserved under browser-current-import-r1 with measurement-correction.json. r2 uses actual transformed vertices with the original tolerance; model files were unchanged.
- Texture sharing: frozen 40-item mixture, **72,932 source triangles**, identical 88 geometry objects; renderer textures **138 → 9**. Full screenshots differ at eight pixels (RMSE 0.02890/255, maximum 20/255), not pixel-identical. Forty swaps and disposal return textures/leases to zero. Proofs `texture-bank.json` and `appearance-comparison.json`.
- Distance LODs: eight hash-bound levels delivered on five current parents. Four candidates withheld for silhouette/bounds failures (iron bed LOD2, curved sofa LOD2, both string-hoop levels). Full detail remains available; variants/LODs add zero design counts.
- Native/physical phone validation: **0**. User approvals: **0**. These browser/Blender results establish asset readiness and interchange evidence, not Expo/device performance, app integration, licensing of third-party items or safety certification.

## Coverage

| Primary room | Accepted distinct |
| --- | ---: |
| bathroom | 24 |
| bedroom | 41 |
| children | 31 |
| dining | 40 |
| entry-hall | 29 |
| kitchen | 30 |
| laundry-utility | 20 |
| living | 70 |
| office | 38 |
| storage | 23 |

| Coordinated theme | Accepted distinct |
| --- | ---: |
| calm-oak | 80 |
| city-loft | 77 |
| coastal-linen | 62 |
| soft-japandi | 58 |
| walnut-form | 69 |

Twelve adult bed model groups each include queen, full/double, king and twin with actual regenerated frame/mattress geometry: cane-head, captain-storage, channel-upholstered, draped-canopy, floating-platform, open-four-poster, pullout-trundle, slatted-low, sleigh-panel, spindle-head, tufted-headboard and wing-headboard. Channel/tuft face styling shares one design count. The audit separately lists seven child/loft/bunk groups in their appropriate twin or toddler sizes. No king-sized toddler/loft bed is implied.

The four previously remaining reviews are resolved: dense small-parts drawer grid v0.7.12 (non-counting variant), wall-supported rope shelving v0.7.12, fitted and mounted shaped drawers v0.7.13, and independently settled deployed third bunk v0.7.14. Earlier failed versions remain historical.

## Consumer contract and ownership

- See INTEGRATION.md for coordinates (metres, RH Y-up, +X right, furniture front -Z), stable id/version/hash, room aliases, tint slots, placement anchors and conservative footprint/clearance semantics. Mattress dimensions describe sleeping surface; overall dimensions include headboards, frames and deployed pieces.
- Keep material overrides on per-item materials; shared texture-bank entries may share texture data, never another item’s tint/normal-scale state. Release resources via reference-counted leases and keep the bounded asset cache.
- GLBs embed their images. Editable .blend sources refer to relative materials/v1 maps; retain that folder when handing off source models. Original geometry and generated textures have no third-party asset provenance. A separate public-asset licence has not been granted.
- Preserve saved projects’ exact revision identity and older assets. Do not silently migrate current placements to a newer hash. Favourites/search/filter metadata remain compatible.
- Coordinator owns Git/LFS publication. This chat made no git mutations. App owner retains mobile/. Spatial follow-on starts under spatial/ and docs/spatial/; production Expo changes require an exact coordinated handoff and matching app checks.

## Next work

Continue original Phase 3 with coherent room/floor/whole-house framing, occlusion and wall/ceiling/floor visibility, true-scale furnishing and selection, preserving locks, Undo/Redo, saved model identity and read-only Walk. Read docs/coordination/NEXT_SPATIAL_PHASE.md and existing app contracts first. App owner is already fixing CameraBridge framing; avoid duplicate mobile edits.

Supplement: the release now also contains the byte-exact visual-decisions.json ledger referenced by its completion audit, with digest 8fcf9dbe2b53d9307c26942efc3e6adede5b7a2605416c1805629b9e6bbcc3fc. visual-ledger-supplement.json records this addition; earlier frozen proof files were preserved.
