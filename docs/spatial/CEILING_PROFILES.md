# Separate Phase 3 ceiling-profile increment

Prepared November 10, 2026. This geometry experiment is outside production `mobile/` ownership. It implements explicit floor-relative flat, sloped, vaulted and dropped soffit facets. It does not change existing saved flat room heights, floor-to-floor elevations or house-view separation.

## Geometry and clearance

`spatial/src/ceilingProfiles.ts` models version-1 profiles as convex planar facets that partition the entire room. Each plane is `y = xSlope*x + zSlope*z + intercept`, in the room's floor-local metres. Validation rejects invalid boundaries, gaps, overlaps, repeated IDs, nonfinite or nonpositive heights and crossing drop edges that need additional subdivision. The 30m height guard is a prototype data bound, not a building-code rule.

The triangle builder emits downward-facing interior ceiling faces, ridge creases and actual vertical soffit/drop faces. Collinear boundaries and drops tapering to zero create no zero-area triangles. Wall top queries split at every relevant facet boundary; a soffit remains a step rather than becoming an invented ramp. Opening clearance checks the lowest part across the full opening interval.

Furniture clearance clips the entire convex footprint against every ceiling facet and evaluates each affine plane at intersection vertices. This catches an interior low soffit even when all four furniture corners are below a higher surrounding ceiling. It is a conservative footprint-versus-height query; it does not replace precise collision geometry or production placement commands.

## Evidence

- Thirteen regressions pass in `spatial/tests/ceilingProfiles.test.mjs`; log: `spatial/tests/ceiling-profiles-result.log`.
- Actual Three browser meshes and upward ray intersections: `spatial/scripts/ceiling_browser.cjs`, fixtures `spatial/fixtures/ceiling-profiles.json` and `ceiling-asymmetric.json`. Frozen source/dependency hashes, measured areas, triangle normals, ray heights and disposal are recorded in `spatial/evidence/ceiling-browser-r4/result.json`.
- Independent area expectations for the 4m × 3m room are 12m² flat, `12*sqrt(1.1)` sloped, `12*sqrt(1.25)` vaulted, and 15m² including four 0.75m soffit risers. The negative-origin L-room has a 16m² footprint and an off-centre unequal-slope vault with area `5*sqrt(1.16)+11*sqrt(1.04)`. Actual mesh areas match within 0.00001m². Twenty upward rays match declared heights within 0.000001m; an extra notch ray finds no invented ceiling. No zero-area triangles, browser errors or retained geometries/textures after disposal.
- Screenshots include all four profiles and a 2.30m-high furniture cage crossing the 2.05m soffit. The first capture revision exposed tight framing of the sloped ceiling; revision 2 increases framing and underside fill light. Earlier evidence is retained.

## Production adoption still required

The app owner must add a versioned optional profile schema with existing flat-room fallback, validation and explicit edit commands; preserve legacy saves; wire geometry, wall/trim top profiles, openings and whole-footprint placement clearance; and verify atomic Undo/Redo and persistence. Profile editing must retain lock/read-only Walk policies and use canonical floor-relative metres. Renderer meshes and shared geometry need normal ownership/disposal checks in the actual Expo app.

Double-height space is a separate connectivity increment. Omitting facets to imitate a hole is rejected. A real double-height space needs an explicit upper-floor void, matching lower-ceiling cutout, upper roof/ceiling and wall connectivity. The related slab/ceiling hole experiment is documented in `LEVEL_CONNECTIONS.md`; combining these pieces into production remains app-owned. No structural roof, native performance or physical-phone acceptance is claimed by these browser artifacts.
