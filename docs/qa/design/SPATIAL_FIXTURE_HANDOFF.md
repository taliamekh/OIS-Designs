# Spatial fixture requires canonical app adaptation

05:16 UTC, exact authored fixture SHA `1cc09988645365a6ca5c633dcac47790db5dc61d656b08e6f187a6fe3dea5ef3`. Independent `spatial-fixture-contract.json` executes current production validProject/canPlace against the integrated catalogue and all40saved tuples. No production or spatial-owned files were changed.

The six-room/two-floor prototype fixture is **not currently importable as an app project**: validProject and both validFloor calls return false. Its wall directions are physically consistent but not the canonical segment orientation required by production rebuildWalls/persistence. For example ground wall-3 runs(4.8,4)→(0,4), Living reversed=false/Entry reversed=true; production expects(0,4)→(4.8,4) with the reversed flags swapped. Ground wall-4 and several upper walls similarly run opposite to their canonical direction. This is a prototype/adoption fixture issue, not a newly failing existing app save.

Create the app test fixture through production canonical geometry, or adapt both wall direction and every dependent opening offset/hinge/flip/world pose consistently. Renaming IDs alone does not fix orientation. Check validProject and encode→decode before treating it as an actual Expo workflow fixture. Preserve the separately checked known floor-alignment anchors and physical openings.

All40exact asset tuples resolve in the app and match current revisions.39placements pass new physical clearance; item-7, `ois.design.woven-papasan-bowl`, hash a48583d02a0c2f051dc65b156baeed0105f4138c362d36eb696c372264a0f55c, currently intersects the room's baseboard projection according to canPlace. Move that authored chair to a genuinely clear position and recheck all40. This is expected enforcement of the repaired physical boundary, not grounds to weaken the validator.

The fixture has40distinct exact model hashes,39current internally accepted/count-eligible records and39distinct accepted construction keys. The remaining model is a non-counting reviewed variant. That is valid view-fixture content; describe it accurately rather than using40as a distinct accepted-design count. This audit does not reopen the separately verified346-design library milestone.

Frozen pre-adaptation source is `spatial-fixture-before-canonicalization.json`. Actual Expo view/control/import/Undo/recovery checks remain separate from the prototype's browser demonstration.
