# Wall-attachment geometry draft

This separate increment does not modify the 119-file spatial publication snapshot or any mobile source. It explores the seven wall-anchored library models that production correctly keeps unavailable for floor-only placement.

From the repository root, using installed Node and mobile dependencies:

```powershell
node mobile/node_modules/typescript/bin/tsc -p spatial/next-wall/tsconfig.json
node --test spatial/next-wall/tests/*.test.mjs
```

The 21 regressions cover explicit inside faces, six wall directions, reversed endpoints, canonical height/grid/grab offset, rear contact, wall endpoints, actual clear room shape, ceiling profiles, baseboard, openings/casing, full moving-panel envelopes, obstacle identity, locks/Walk and explicit wall-attachment remapping. Source and emitted modules are committed for reproduction; the copied pure dependency modules under this draft's `dist/src/` are the exact compiled source inputs, not a second production implementation.

The existing local review server also serves `/next-wall/review/index.html`. Browser harnesses use the same verified Windows Playwright/Edge location as the parent review package; adapt that dependency path for another machine. They refuse to overwrite an evidence revision.

## Evidence and limitations

- `evidence/browser-r4/result.json`: all seven actual GLBs, six wall directions and both endpoint orders (84 cases). Actual vertices contact the rear plane; 84,144 actual triangles produce zero intersections with the inset 16cm solid wall. Locks, Walk and opening rejection pass; disposal returns zero geometries/textures/leases. This checks geometry against a solid wall, not real mounting hardware or a building code.
- `evidence/production-face-r3/result.json`: read-only snapshots of actual production rebuildWalls/wallFaceInsideSpan/roomInsideOutline/openingMotionEnvelopes. Of 1,008 real-model cage cases across rectangular/L/skew/partially shared rooms, both windings and three thicknesses, 988 are accepted with no positive wall-volume overlap; 20 oversized placements reject at wall ends. Another 84 opening-motion cases include seven correct sliding-panel rejections beyond the nominal aperture. These are cage/helper checks, separate from browser GLB triangles and UI/native acceptance.
- `evidence/mount-profile-r2/result.json`: actual optimized folding-table top is local Y=0.318619m, with 0.472056m² upward area and matching centre ray. Its inherited 1.4m base hint produces a 1.718619m working top. An explicit authored comparison fixture sets the worktop to 0.75m; this is not an ergonomic/code recommendation, user approval or a new catalogue default. See `docs/furniture/MOUNTING_DEFAULTS.md` for the source-only future-publisher correction.

## Adapter contract before app adoption

Provide actual inside-face endpoints, normal, height and a structural revision token. Production `wallFaceInsideSpan` returns full room-edge corner spans; clamp its low/high to the selected physical segment before constructing attachment endpoints. Its signed normalOffset supplies the actual wall-face plane. Supply the actual `roomInsideOutline` for full footprint containment. Never substitute a generic half-thickness guess for these miter/partial-wall contracts.

Convert opening intervals from their physical wall origin into that same clamped face-along frame and account for casing. Also supply all moving-opening envelopes on the floor, including adjacent walls and sliding/pocket panels. A nominal doorway rectangle alone is insufficient. Explicit flat-height or whole-footprint profile queries govern ceiling clearance.

The structural token must bind face/room geometry, openings/motion, ceiling and trim geometry. Item poses and finish colours should not redefine a wall's physical identity. Canonical mounting height is floor-relative; floor alignment/elevation and separated presentation are not written into it.

Current production wall IDs derive from endpoint coordinates. Room movement changes them. `remapWallAttachment` requires explicit a-to-a or a-to-b correspondence and revalidates the destination. A split/resized wall or ambiguous interior side remains unresolved; nearest-wall guessing is rejected.

Production still needs versioned Item elevation/wall attachment fields, validation/legacy fallback, every relevant command and revalidation path, stable/remapped wall references, room/floor movement and geometry edits, guarded one-step Undo, save/reload/backup, actual picker/gesture ownership, renderer placement, forced selected-wall visibility and phone checks. None is enabled by this draft. Existing wall models and immutable release metadata remain gated and unchanged.
