# Active production notebook

## Latest handoff checkpoint (02:15 UTC, November 10)

- Gate remains **06:53 UTC**. Current main catalogue is still candidate-only after deliberate hash invalidation; do not claim 300 accepted yet. `publish_catalogue()` now preserves a non-decreasing catalogue version rather than reverting to default 0.2.0.
- Initial raw production: 373 complete original candidates +39 preserved legacy files. Conservative family policy now leaves **318 eligible** before further visual screening. Inventory additionally has 36 real mattress-size variants (409 total briefs), not counted as designs. The active old 0.3.2 build was launched before those variants existed and is producing only the original373.
- Live owned jobs: `build-011-full-tangent-stage.log`, exec session86524, running Blender0.3.2 staged; HTTP asset-review server on127.0.0.1:8768, exec session97921. Other old build sessions have finished or were interrupted. Do not touch other chats' processes.
- New guarded review system is implemented: sheet index schema2 binds GLB/version/front/back image hashes, immutable sheet history archives; recorder AND publisher validate them and reset inherited acceptance. Nine stale-evidence tests pass. No current old hash-only decisions can promote assets. See REVIEW-PROVENANCE.md.
- 0.3.0 texture test dropped tint with legacy MixRGB; fixed to ShaderNodeMix RGBA, verified exported editable factors. 0.3.0 lacked tangents. 0.3.1 tangent export could not handle ngons. 0.3.2 triangulates first and passes the frozen five-model fixture with zero formal errors/warnings; **independent coordinator browser fixture passed image decoding, sRGB/non-colour maps, tint isolation, bounds and disposal**. Frozen fixture hash/paths are in INTEGRATION.md and generated STATUS.md.
- Larger0.3.2 formal sweep found zero TANGENT vectors in untextured glass/mirror and one wood wardrobe. Root fixes: remove UNUSED tangent attributes on non-normal-mapped materials (`finalize_glb.py`); separate UV projection charts using integer repeat offsets (no visible phase change) so MikkTSpace does not cancel tangents. `inspect()` now rejects zero/nonunit tangents for normal-mapped materials. Do not invent fallback tangent directions.
- Dense louvre cabinets exceeded2MB with tangents. Box bevels now use1 segment for parts thinner than4cm; 0.4.0 proof reduced vented-bath-locker to625KB/3112 triangles. **All four0.4.0 proof assets passed formal validation with0 errors/0 warnings**: wardrobe, vented locker, glass shower and mirror. They are still staged/unreviewed.
- Latest shared geometry fixes not yet broadly regenerated: spindle endpoints meet bowed crest; `lathe()` now builds local vertices and sets object position (fixes task shade rotating about room origin); drying-rack wire frames connect to their supports; mirror pivot rods/base alignment; umbrella staves meet tray; guitar cradle/base join; continuous magazine sling replaces floating panels. Curved chair structural pans and inset legs are fixed in0.3.0+ and independently seen by coordinator. Triangle hairpins now use three properly placed legs; triangular panel/cantilever supports fit the top.
- New source material maps are original256px neutral base/roughness/normal images under materials/v1. Tangent-exported GLBs embed them, retain separately editable tint factors and satisfy byte/texture stats. Do not regenerate v1 maps in place now they are referenced.
- Next: inspect remaining source-room sheets for physical defects; finish file/flatfile and laundry-bag constructions; consider adding ~30 clearly new core-furniture designs so the ≥300 count is robust even excluding appliances/sanitary fixtures/small equipment. Do not count scaled shelving grids or tiny detail additions: many such variants already excluded. Then freeze a final broad generation version, review every current sheet, run all geometry/family/formal checks and promote only actual passes. Promotion also requires clean formal validation and geometry hashes.
- `promote_staged_catalogue.py --stage VERSION [--include-variants]` retains previous current files/history and only copies reviewed/current-image-bound passes. `audit_catalogue_v2.py --stage VERSION [--reviewed-only]`, `validate_staged_gltf.cjs VERSION [--reviewed-only]`, `review_sheets_v2.py --stage VERSION`, `record_visual_review.py --stage VERSION SHEETS...` are available. Do not replay historical review-first-batch.py; it deliberately refuses changed sheet indices.
- Formal validator is already installed by coordinator at docs/coordination/validator-tools/node_modules/gltf-validator. Read/use it, do not modify that folder. All our reports stay under furniture/. Playwright is bundled; installed Edge is used headlessly (no browser install). Local `review/` utility uses installed Three read-only from mobile/node_modules; this is NOT an app feature.
- 40-candidate plain-material browser fixture measured about89,925 source triangles/88 draw calls; 40 swaps returned resource counters to2 floor/grid geometries and0 textures. One favicon404 was isolated; server now returns204. Browser-only, not native/device or GPU-byte evidence.

The persistent goal is active: ≥300 **distinct** designs, with visual and structural review. Authorized sustained work must continue until at least **2026-11-10 06:53 UTC / 01:53 Toronto**, even if quantity is reached earlier. Useful remaining work includes material finish, LOD, geometry defects, metadata, interoperability and performance. Do not mark complete before that gate or without the quality outcome. Work ONLY in `furniture/` and `docs/furniture/`; no commits, branch changes, paid assets/services or app edits.

## Current pipeline

- `catalogue_inventory.py`: 373 individually described briefs. About 332 eligible after conservative construction-family exclusions; exact count is generated. Variants remain usable and do not count. Previous 39 legacy GLBs are wholly excluded from the new 300 count.
- `design_geometry.py`: original construction builders, including curved seating, tubing, hollow fixtures, arch shelves, novel tables and functional furniture. `.blend` sources retain named parts; GLBs batch by named material.
- `build_catalogue_v2.py`: Blender runner, independent structural `inspect`, two renders per model, atomic records/manifest. Run `--force --asset-version 0.2.1` to regenerate corrected content without overwriting 0.2.0. It skips an already-produced target-version record. A failed GLB can remain on disk but never enters the manifest; choose a new version path for retry rather than overwriting published geometry.
- `catalogue_manifest.py`: canonical publication and hash-bound visual acceptance. `publish_catalogue()` is used by the latest runner. Earlier running processes had the old in-memory publisher; wait until they finish before relying on final acceptance counts.
- `audit_catalogue_v2.py`: binary checks, colour-independent triangle hash, normalized scale/mirror fingerprints, three-view software silhouette screening. Geometry uniqueness is not quality acceptance.
- `review_sheets_v2.py`: front/back sheets by room, 12 per sheet, with IDs/briefs/dimensions. `record_visual_review.py` records actual inspected sheets and explicit rework/reject exceptions, bound to GLB/image/sheet hashes. Never record unviewed sheets as inspected.
- `visual-decisions.json`: first 97 inspected models, 72 accepted distinct at that checkpoint, 5 reviewed variants and 20 rework. New geometry invalidates an old acceptance automatically by hash.

## Batches

0.2.0: 370 complete new candidates from 373 briefs. Three failures: steel-mesh-locker-bank over 15k triangles; paper-rib-floor and paper-table-light hit a complex-number radius from negative sine power. Both builder issues have been corrected. No failed row was published. All 0.2.0 files remain immutable for app saved-hash resolution.

0.2.1 repair run started for first 20 briefs using `build-005-repairs.log`; new source snapshots and per-item `.parameters.json` are retained. After checking these, continue the full run with `--force --asset-version 0.2.1` (same-version records skip). Old records get archived in `catalogue-v2/history/`, and `historicalAssets` is published. All 39 initial 0.1.0 IDs/versions/files stay unchanged.

## Identified/coded repairs, requiring fresh render review

- Crescent sofa: true radial decks, cushions and backs, avoiding intersecting modules.
- Barrel/shell/egg/petal: fit oval seat pad inside lower curved shell.
- Shaped tables: inset support arrangements under hex/triangle/oval tops; avoid floating hairpins/panel corners. Tube frames use parallel transport to avoid dark twisting artifacts.
- Wine lattice: clip every diagonal board to the cabinet interior.
- Woven bed head: add actual upright supports. Captain bed: add enclosed storage base/end walls/partition.
- Draped canopy: visibly broad gathered mesh curtains; previous narrow strips looked like bare posts. Coordinator independently flagged this. Verify new GLB and both previews visibly differ from four-poster.
- Screens: rotate complete panel members around the same panel pivot, not each member at its own centre.
- Mirror: proper metallic mirror material. Glass: alpha glazing rather than opaque blue planes; requires shader/interoperability review.
- Elliptical stools: inset legs so they meet the seat.
- Gable dollhouse: reverse roof angles to make a pitched roof, not an open V.
- Bath stool: real separated drain planks rather than painted dark gap lines.
- High-cistern toilet: remove the unintended second low cistern.
- Appliance builders: hollow enclosure, circular washer-front opening/drum, proper oven window frame/racks, consistent French-fridge finish. These were coded after initial 0.2.0 and need regeneration.
- Weave geometry reduced to eight-sided strands to keep nine-cell furniture below budget without silently relaxing the threshold.

## Still to address

- Floating vanity currently normalizes its raised offset away and retains plinth: make it an actual wall-mount body (no feet/plinth), declare wall attachment/default elevation, keep geometric pivot convention explicit.
- Fix metadata colour tags to reflect slots actually present; current initial theme triplets can over-tag appliances with wood colours.
- Collapse oval-soaking-tub vs oval-floor-tub if only dimensions differ; consider further strict near-duplicate exclusions from construction/visual review rather than counting every grid size.
- Refresh/review all remaining bathroom, kitchen, office, children, entry, utility and storage sheets. Many are generated but not inspected/accepted yet. Use explicit exceptions for glass/appliance/roof defects until fixed.
- Recheck shaped-table supports in every combination, particularly triangular tops. Original support insets are a starting repair, not proof of fit.
- Materials are still flat factors in candidates. Add real generated/licensed wood/fabric maps with UV scale and bounded embedded payload; retain procedural originals/provenance. No fabricated phone compatibility.
- Produce actual reviewed LODs and 40-item renderer/performance fixture. Source meshes are real and under individual budget, but a full scene budget must be measured.
- Record future full glTF validator and Windows Three/WebGL tests separately from native/device validation.

## Coordination

Coordinator `01a1c2ef-37e4-7b43-8a3c-8774e51f2454` reads these files. App owner `01a1c2dc-5032-7e11-9d15-3f28723baf3c` owns all mobile copies and integration. Producer room aliases: `entry-hall→entry`, `laundry-utility→utility`; documented in INTEGRATION.md. App rejects mismatched saved asset hash/version: preserve old files and history, never silently overwrite shape.

Coordinator has independently passed headless Three GLTFLoader parsing/bounds/material matching on early snapshots (see read-only `docs/coordination/model-loader.json`). Runtime QA has browser/Metro findings under `docs/qa/runtime/`; these do not establish native GPU/device operation. Read new asset findings where present, but do not edit other chats' files.

Original asset research: Poly Haven primary pages/licence checked; API download returned HTTP403, no models claimed acquired. Specific candidates/creators are in SOURCES-LICENCES.md. Do not retry a blocked download repeatedly or invent imported provenance.

## 2026-11-10 02:47 UTC successor build checkpoint

Active goal and minimum06:53UTC gate remain. v0.5.0 now stages the corrected all-room originals and30 new core furniture constructions. Inventory439 briefs /348 eligible construction families, not accepted counts. New size exports remain variants. Signature prototypes are not yet reviewed. No frozen older assets overwritten.

Coordinator findings incorporated before all-room freeze: valet joined crossmember and trouser brackets; cheval uprights directly over new sleds and full frame pivots; screen panels chained from exact shared edge axes with visible hinge pins; upholstered saddle stool uses actual fabric padding; tractor stool gets concave carved surface. Bow spindle and rotating shade origin fixes remain. File/flatfile upper drawers now expose drawer walls and file rails. Hamper/sorter bodies are hollow rather than solid blocks.

Review negative guards now require a real64hex SHA, actual current GLB bytes matching metadata, nonmissing front/back images, and a nonmissing immutable sheet archive SHA. Recorder verifies GLB bytes too. Twelve meaningful producer regression cases pass, including unchanged metadata over altered GLB bytes and missing-file/None-digest cases. Promotion shares this guard. Still no blanket acceptance or phone evidence.

## 03:19 UTC deeper connection review and handoff correction

Exact-asset source contact audit uncovered small assemblies that contact-sheet review had missed.34 matching current review passes were immediately withdrawn (31 distinct designs +3 variants); current accepted distinct count is69. No unrelated successor hash was invalidated. Machine affected-ID/version/hash list: `furniture/catalogue-v2/contact-review-withdrawals.json`. Per-model contact graphs include exact original source-model hashes, component names/bounds and contacts at4mm screening tolerance. Example cane-bedside0.5.0 had separated front/pull groups; tractor-counter-stool0.5.0 had5groups, separately confirmed by render. Original pass decisions were retained historically, not erased.

This is a deliberate quality correction, not a completion claim. Current source repairs add real drawer boxes/runners/partitions, hinge mounting stiles, handle standoffs and escutcheons, chair pans, sofa back frames and trestle cross ties. A current-source preflight screens those repairs before the next immutable full export; live-source reports are never presented as exported-asset evidence. Promotion now requires matching source contact evidence or an explicit hash-bound reason for intentional loose parts, as well as existing visual/duplicate/format gates.

Integration readers should use `batch-ready.json` and `accepted-assets.json` exact hashes/counts, withdraw reviewed labels for the affected old hashes, and preserve their old placement identity. INTEGRATION.md now reflects textures, actual eight delivered LODs and the browser-only shared texture helper. No app edits/native claim were made by producer. Remaining active work runs through the06:53UTC minimum gate.

## 03:39 UTC full successor freeze

`furniture/catalogue-v2/production-freeze-v0.7.0.json` freezes439 briefs /347 potentially distinct construction families and exact geometry/material/export script hashes. Two independent disjoint export ranges are running for immutable v0.7.0. All accepted/rework decisions remain separate from new candidates. Final source preflight6226f7a53058 found435/439 single assemblies; the four multi-groups were removable tray/deployed trundle poses. Final freeze increases trundle clearance and gives the third pull-out bunk its own casters/lower mattress clearance; those exact exports still need contact and visual checks.

The tall shaker tangent defect was a real zero vector on a nondegenerate wood triangle (area0.0004367m², UV area0.003637), not an excuse to insert an arbitrary direction. After post-triangulation automatic-normal recalculation through Blender's zero-vector custom-normal reset, six proof assets including the tall shaker pass independent structural inspection and official Khronos validation with0errors/0warnings. Proof v0.6.6 dense jewellery bureau is9548triangles/~1.2MB. UV charts separate adjacent projections without changing repeat phase. Finalization now removes unreferenced accessors/buffer views after dropping tangent streams only on non-normal-mapped materials. Geometry/material appearance is not fabricated by finalization.

Compass desk now has actual crossing tapered side boards with low metal pivot pins and top beams. Wave bookcase metadata now truthfully describes five curved horizontal shelves on three masts; it does not claim a curved vertical partition. INTEGRATION.md and accepted-assets.json provide the current bounded handoff, with source/browser helper evidence kept separate from app adoption.


### 2026-11-10 04:06 UTC — UTF-8 publication repair

The live publisher now writes STATUS.md and COVERAGE.md explicitly as UTF-8, including the status append. Both regenerated files decode strictly as UTF-8; exact hashes are in furniture/catalogue-v2/publisher-utf8-check.json. Immutable source snapshots were preserved. These owned documents are ready for the coordinator’s next GitHub text checkpoint.
