# Active repair API — app integration may prepare now

05:05 UTC. Geometry/project remain QA-owned until the exact-hash return. TypeScript, scoped ESLint and all19 existing app domain tests already pass; original real-GLB probes pass24 wall and20 door cases. Broader vertical/shared-face/history checks are in progress. These exports are written and callable; no app UI/mesh file was edited by QA.

## Required app-owned adoption

- Template creation: `makeProject(kind, width, depth, height, shape, undefined, "inside")` explicitly treats width/depth as inside wall-face dimensions. Existing calls default to their original wall-reference semantics. Explicit supplied drawing polygons remain reference coordinates and are not silently inflated.
- Existing room inspector: initialize/read with `roomInsideDimensions(floor, room)` and send `room-dimensions` with `dimensionMode: "inside"`. Legacy command calls without this optional flag retain old reference semantics. `referenceDimensionsForInside(floor, room, width, depth)` is also exported for other adapters; unchanged inside dimensions return the exact original reference size.
- Add-room orthogonal templates: `newRoomReferenceDimensions(clearWidth, clearDepth, thickness = .12)` gives shapePolygon's reference width/depth. Origins remain reference-line origins; do not move existing rooms. `roomInsideOutline` provides joined face endpoints, including split-wall thickness steps. It is not a replacement floor mesh or a scanner calibration algorithm.
- Plan/door readouts: `wallFaceInsideSpan` returns low/high along the selected reference wall and its signed normalOffset; `openingInsideDimensions` provides each room-facing before/after distance to its inside corners. Existing `wallFaceSpan` / `openingDimensions` retain reference semantics so UI adoption is explicit. Plan chains must use the same new spans as their numeric labels.
- App-owned meshes.ts should delegate wallPieces to `physicalWallPieces` and trimIntervals to `physicalTrimIntervals`. These pure exports reproduce the current actual hole/pocket/trim interval contract; domain does not import Three/scene modules.
- App-owned openingPose.ts should delegate openingLeaves to `doorLeafPoses`. Signature is identical `(opening, wallThickness, walk = false)`. Leaf thickness is exported as `DOOR_LEAF_THICKNESS` for RoomScene's boxGeometry. Existing design angles/sliding travel and Walk poses are retained. This avoids renderer/collision drift.

## Preserved convention

Saved v1 polygon vertices are wall reference lines; the current renderer extends half the thickness into each room. Existing room polygons/items/locks/revisions/history are not rewritten on load. Therefore a legacy5m reference span is honestly4.88m inside with two12cm walls. A newly requested5m inside orthogonal room stores5.12m reference extent. Trim projects further into that clear wall-face span and is accounted for separately in placement, with vertical height and aperture termination.

Current collision uses conservative saved-asset bounds, actual wall-solid vertical intervals/cavity, physical trim projection, frame/glass volumes and full physical hinge/slider/pocket travel. Failed commands preserve original history. Existing serialized overlaps remain readable because persistence structural validation was not tightened. Measured-room/overall closure requires the app adopting the above APIs and source-matching UI/native checks; padding alone is not that closure.
