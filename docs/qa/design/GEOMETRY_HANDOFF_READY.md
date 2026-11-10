# Focused geometry repair — active

Coordinator activated ownership at04:59UTC after commit43b53e6d. QA acknowledges ONLY geometry.ts/project.ts; exact offered baseline hashes independently match before edits. All other production ownership stays with app/spatial leads. No Git/server/dependency mutations.

Read at 04:54 UTC: app SPATIAL_HANDOFF.md, geometry-handoff-baseline.json, mobile/AGENTS.md and current preferences/decisions. Ready to accept ONLY mobile/src/domain/geometry.ts and mobile/src/domain/project.ts after the coordinator releases publication. Neither production file is edited by QA yet. No Git/server/dependency changes.

Prepared evidence: QA-GEO10 actual wall-volume/GLB intersections (24 near/control cases plus actual browser drag) and QA-GEO11 actual full-open door-leaf/GLB intersections (20 near/control cases). Exact pre-repair production copies and reports are preserved under wall-clearance-before-source/ and door-motion-before-source/.

Implementation convention: retain v1 polygon coordinates as wall reference lines. Loading/Undo/recovery must not rewrite polygons, item poses, revisions or histories. New acceptance must account for physical wall halves, trim height/projection, real apertures and moving leaves. Existing collision does not invalidate otherwise recoverable serialized data.

Proposed integration API: pure inside-boundary/inside-dimension helpers, reference-dimension conversion for a requested clear width/depth, and room-face inside corner spans for opening chains. App owns creation/dimension/plan readout adoption. Do not silently change makeProject or room-dimensions internal reference-coordinate semantics underneath existing callers/tests; the app can explicitly convert clear UI input at its boundary. Measured-room closure requires that adoption and actual inside-face tests, not only collision padding.

The renderer's geometric hole-cutting helper currently lives in meshes.ts and imports geometry.ts. Domain cannot import it without a cycle/Three dependency. A pure wall-solid-section helper may be returned from geometry.ts for app-owned meshes.ts to reuse, retaining the exact existing hole/pocket interpretation. The same physical door-leaf constants/pose policy should be adopted by app-owned openingPose.ts rather than independently drifting.

Fresh independent UI closure already available: source-verified e384e657…/55 compiled sources passes occlusion4, catalogue11, door matrix128 and transparent-window2; archived exact reports/images. Final-library integration edits and forthcoming geometry changes still require current integration checks. Web root500 now names breakfast-overhang-island-d46cc8be7673 rather than the earlier gaslift model. This web-root result alone does not establish failure of the separately served native manifest/bundle route.
