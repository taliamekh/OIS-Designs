# Original Phase 3 — level markers, voids and slabs

Updated2026-11-10 05:30 UTC. This is reusable geometry/validation work under spatial/, not enabled native floor/ceiling editing. Source spatial/src/levelConnections.ts, SHA-256 `9f21327711cedbee3a465a87f5861261eaef3cdbdaa4b94b8dccc615ad9069d9`.13Node regressions pass. Renderer adapter: spatial/review/level-geometry.js.

## Observed production gap

Current Floor/Project types have elevation/alignment, rooms,walls,openings and furniture, but no typed persisted stair markers, slab voids or ceiling profiles. FloorMesh/CeilingMesh render full room polygons; flat per-room ceilings are supported, but a marker or stair-looking model alone cannot cut an upper slab or lower ceiling. Existing Walk is not a validated automatic stair-traversal system. No foreign mobile types, commands, geometry or persistence files were edited here.

## Concrete proposal

`LevelVoid` identifies a valid room-contained opening in one floor's localXZ. `StairMarker` declares lower/upper floor+room IDs, run endpoints in the lower frame, width, step count, upper landing in the upper frame and its actual upper void. All world geometry uses canonical floor alignment/elevation. The module flags mismatched frames, wrong/missing levels, non-positive rises, invalid dimensions, wall intersections, malformed/overlapping holes, incomplete lower-ceiling cutouts and a declared viewer-height envelope outside the opening.

The conceptual run must reach the opening edge and a solid upper-floor landing beyond it. Ending halfway inside an oversized hole is explicitly rejected. A small measured alignment residual is reported without moving/snap-registering any source coordinate. `translationFromAnchors` verifies at least two distinct anchor pairs; rotated/disagreeing pairs return needs-rotation-or-review rather than inventing a floor rotation.

`slabOutlines` returns reviewed outer/hole loops and explicit slab top/bottomY (authored default16cm, configurable). The same upper opening is transformed into the lower room's ceiling frame. `level-geometry.js` uses actual Shape holes and ExtrudeGeometry, not a painted rectangle. Conceptual step boxes and the landing envelope are returned as generated geometry; step count/incline are declarations, not engineering/code approval. Connection markers hide in separated-floor presentation rather than stretching between display-only elevations.

## Evidence

Authored fixture: spatial/fixtures/level-connection.json. It uses different negative/local origins,3.1m rise,3.5m run,18declared steps and an explicit1.6m viewing envelope. All source bytes remain unchanged.13regressions cover both windings, frame mismatch, unsupported landing, missing/wrong-level voids, ceiling blockage, wall volume, malformed/overlapping holes, invalid sizes, copied loops and two-anchor translation.

Actual Edge/Three geometry proof: spatial/evidence/level-browser-r3/result.json, now including exact transitive source/compiled/Three dependency hashes. Rays pass through both real cutouts and hit closed comparison surfaces / adjacent solid landing. Independent upward-triangle area is27.25m² versus30m² closed (2.75m²void), including reversed loop winding. Disposal returns0geometries/0textures. Images include the actual opening, closed comparison and conceptual marker inspection; no native/provider/Walk-traversal claim. Earlier immutable revisions remain available.

## Integration sequence for the app owner

1. Explicit optional marker/void schema, validation, stable IDs and add/edit/remove commands; preserve oldv1coordinates/poses and no implicit room resize. Persist compound changes in one Undo transaction and test save/reload.
2. Adapt the pure functions to existing domain geometry. Rewrite the viewPlan type/math import to the adopted spatialView module; shared polygon predicates can reuse validated domain helpers. No experimental support-placement availability is implied by reusing pure polygon math.
3. Render generated slab holes and projected lower-ceiling holes through app-owned meshes/RoomScene, with correct normals, material/trim boundaries, disposal and canonical group transforms. Show a clear marker label until actual stair geometry/traversal is separately proven.
4. Validate source-matched two-floor fixture in room/floor/house/cutaway/solid modes and record actual app bytes before/after view changes. Automatic Walk transitions require a separate physically connected collision/path gate and must not teleport between floors.

Sloped/vaulted ceilings, soffits and double-height profiles remain separately scoped original Phase3 increments. A flat override or this marker proposal does not complete them.
