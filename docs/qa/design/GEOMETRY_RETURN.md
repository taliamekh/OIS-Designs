# QA-GEO10/11 focused production return — ready at 05:11 UTC

QA has finished edits to the exact two assigned production files and will make no further production changes without another scoped handoff. Coordinator may return them to app ownership now. All other production files remained app/spatial-owned throughout. No Git/server/dependency mutations.

| File | Returned SHA256 |
| --- | --- |
| mobile/src/domain/geometry.ts | 0b029dd1ee4d1070fc8dfaffd96b5baded62ce8d1ec4d5556fd5c27fdcf57364 |
| mobile/src/domain/project.ts | dbc3f9e67401b49a8a21b9d5035a32bc7240a351cc56cdc62bfc0c26aa4bd783 |

Exact offered baseline hashes were independently confirmed before edits. Original copies/reproductions remain under wall-clearance-before-source/ and door-motion-before-source/. The new two-file copies and proof reports are frozen under geometry-return-0511/.

## What changed

Placement now uses physical wall-solid sections with real hole/pocket/vertical extents, inside-half thickness, vertically relevant trim with actual aperture termination, opening jamb/header/glass volumes, and full physical hinged/surface-slider/pocket panel travel. Saved exact-model bounds remain the conservative furniture shape. Hinge sweeps include the actual2cm pivot offset and3.5cm leaf thickness; circumscribed arc chords cover all intermediate angles. No broad full-disk swing reservation.

V1 stored polygons remain wall reference lines. Loading/recovery/Undo do not inflate outlines or move items. Structural persistence validation was not tightened, so existing colliding placements still decode exactly and can be unlocked/moved out. Failed commands retain the exact original history; locks and Walk remain enforced.

New explicit input mode plus pure helpers implement inside wall-face dimensions. Legacy factories/commands retain reference semantics by default. A new5m inside room stores5.12m with12cm walls; an existing5m reference room honestly measures4.88m inside. No silent migration. Clear room width/depth are joined-face outline bounds; nonrectangular rooms remain nonrectangular, with trim measured separately.

## Required app-owned adoption (not yet completed by QA)

Use GEOMETRY_API_PREVIEW.md. Adopt the explicit `"inside"` factory/command mode in template creation and room dimensions; initialize inside readouts with roomInsideDimensions; convert Add-room orthogonal templates with newRoomReferenceDimensions. Explicit drawn polygons remain stored reference coordinates. Use wallFaceInsideSpan/openingInsideDimensions for **both numeric and graphic** door chains and plan readouts.

Delegate meshes wallPieces/trimIntervals to physicalWallPieces/physicalTrimIntervals, and openingPose openingLeaves to doorLeafPoses; use exported DOOR_LEAF_THICKNESS for the rendered box. Existing renderer-contract equivalence passes before these delegations. All app-owned UI/renderer changes remain with the app owner.

A physically collapsed inside span (e.g. a legacy tiny room with very thick walls) throws an explicit helper error. App inspectors must handle that as unavailable/needs correction, preserving the recoverable project; do not crash or replace its coordinates with fabricated dimensions. Reference-coordinate editing/recovery remains available.

## Checked evidence at the returned hashes

- Actual GLB/actual production wall boxes: **192/192**,12/15/30cm, no/flat trim, grid/free, both windings, both room-facing sides, standalone/shared walls.96near rejection/safe acceptance pairs. Original24cases had12failures before repair.
- Actual GLB/actual renderer door leaf boxes: **120/120**, single/double/surface slider, applicable hinges, both flips/windings and12/15/30cm.60near/safe pairs. Original20cases had10failures before repair.
- **31/31** new analytic/production checks: real apertures versus sill/lintel/glass/casing, trim height, both windings, unequal/shared corner spans, new5m inside room, explicit inside resize including slanted outline and preserved thickness, exact untouched reference polygon, legacy-overlap decode/locks/move-out/Undo/Walk, unchanged mesh/pose contract,14,544physical panel-corner samples throughout the full hinge motion.
- **22/22** prior independent focused domain assertions; **4,453/4,453** deterministic overlap/topology/recovery/history cases.300synthetic-box/12transform laptop CPU fixture median1.33ms,max4.28ms. This is not a phone/FPS benchmark or300design count.
- **19/19** existing app domain tests, actual TypeScript and scoped ESLint pass after final formatting. The new regression's initial2history failures used an unsupported execute(undo) test command; corrected to actual travelHistory. Archived initial report is a harness mistake, not an app defect.

Reports: wall-clearance-audit.json, door-leaf-clearance-audit.json, boundary-repair-regression.json, boundary-domain-results.json and stress-domain-results.json. New source-matching actual UI tests and app-owned delegation/input adoption remain necessary before full QA-GEO10/11 closure. Native/device acceptance remains separate. The current development iOS bundle500 also remains an app-owned blocker; its403,304-byte breakfast-island asset was independently opened and SHA-verified against the exact binding.
