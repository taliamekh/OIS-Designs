# Original Phase 3 — production adoption ready

2026-11-10T05:01:08Z. The coordinator released the exact two-file reservation after43b53e6d. Both new files are now created; **full mobile TypeScript check and targeted ESLint pass**. The pure policy has19geometric regressions and independent coordinator oracles. No other mobile files were edited.

| File | SHA-256 |
| --- | --- |
| mobile/src/scene/spatialView.ts | `dbd8513f68c61f1f484257fb131b2f20fe656eb49a9042519d690bfab22cf450` |
| mobile/src/screens/HouseViews.tsx | `38cd7ff7cb97283899bc19639db631f6df5347bc68633b3d9039f0d142da3b2e` |

Policy bytes exactly match spatial/src/viewPlan.ts. Checks/authority hashes: spatial/adoption/production-checkpoint.json. Current SDK58/RN0.88 documentation was read before the RN component work.

## API and integration points for app owner

`createScenePlan(project, resolveItemAsset, request)` takes structural Project/Floor/Room/Item/AssetRecord-compatible values and returns floor/room/item scope, canonical and display transforms, conservative framing bounds, selection bounds, wall/ceiling visibility, unresolved-model warnings and read-only policy. Request requires activeFloorId, scope(kindroom+roomId, floor or house), mode(3d/walk), shell(solid/cutaway) and a finite camera position. Optional presentation gap defaults0; wall-plane hysteresis defaults3cm; ceilings defaultvisible in solid and hidden in cutaway, always visible in Walk. House overview always returns canEditfalse. Walk forces its canonical active floor/all connected rooms, solid walls/ceilings, zero presentation gap and no edits.

1. Use the same returned displayOffset for each rendered floor group and camera geometry input. canonicalOffset is alignment.x/elevation/alignment.z. Separated floors add only rank×gap to displayY. Never write that offset to Project, move saved items, change locks, or invent stair traversal.
2. Recompute static scope/transforms/bounds when their dependencies change; call cheap `physicalWallPlan` separately during orbit using cached room set and floor offset. Its key is floorId:wallId. A physical boundary wall shares one visible flag across both faces, trim, casing and leaf. Internal displayed-room partitions stay visible. A scoped forceVisibleWallKeys override can keep an inspected/painted face available. PreviousWallVisibility prevents wall-plane flicker.
3. Bounds include slabs, wall thickness, mixed room ceilings/taller shared physical walls and exact saved model revision cages. Rotated local AABB corners are conservative framing bounds, **not** vertex-tight mesh bounds. Keep existing structural framing invalidation: ordinary selection, tint and item drags must not auto-refit/orbit-reset. Explicit Fit can use the latest full visible bounds; app owner retains CameraBridge fitting.
4. Keep existing wanted-model resource leases in Viewport. Build the wanted tuple/hash set from actually rendered items and retain/release through the existing resource API; this module creates no loader/cache. Missing tuples remain unresolved warnings and existing missing markers, never substituted newest models.
5. Apply the read-only scope to all editing paths, not merely Quick move or hidden buttons. Existing command guards still enforce Walk and per-item locks. View state belongs outside persisted Project/history. A house view change must preserve every project byte.

`HouseViews` is a controlled panel using existing Sheet/Button/Txt. Required props: scope/onScopeChange, cutaway/onCutawayChange, onFit/onClose. Optional preset/onPresetChange, showCeilings/onCeilingsChange and separatedFloors/onSeparatedFloorsChange render only when their actual callbacks exist. availableHeight/expanded/onExpand reuse existing compact/expanded sheet behavior. It adds no picker duplicates, store, router, unit selector or surface-attachment control. Room/floor navigation remains in existing contextual controls. Do not mount it as a permanent second toolbar.

App owner retains Editor, Viewport, RoomScene, camera, domain/types, commands and persistence. The two new files are ready to consume now; please wire the real callbacks and run integrated lint/typecheck/exports plus source-matched geometry/UI/resource checks. This handoff is not an Expo/native execution or user styling approval. Existing QA-GEO10 wall/interior repair remains separately owned.

## Evidence and remaining boundaries

spatial/fixtures/six-room-house.json is an authored two-floor/six-room/40-model fixture with two independently known alignment anchors. Browser review checks room/floor/house/separation, upstairs-bedroom→kitchen navigation, interior read-only, conservative framing containment against real imported vertices,40view-switch resource stability and390/320px large-text layouts. Exact browser source/fixture hashes are under spatial/evidence/. Module regression and coordinator oracles are policy evidence; the standalone viewer does not establish production adoption.

House/exploded controls and exact styling remain OIS proposals. Surface/wall placement remains gated: current Item has no height or attachment persistence; optional elevation in the structural adapter is only a proposed future field and is not enabled by this handoff. Stairs/void markers and sloped/vaulted/soffit/double-height geometry remain separate original Phase3 increments.


The source-matched authored app backup is now ready at spatial/evidence/production-fixture-r2/six-room-house.backup.json (SHA-256 6784e78bf4af5dc95cf2365221ba31d3ecfa0085d97d6feee252a1b934d24b41). Production topology/validation and backup roundtrip accept all40exact tuples. Use a disposable QA library/session to test integrated views; this chat did not import it into an existing user library. Current rendered browser evidence is r6; its fixture clearance and camera checks pass.
