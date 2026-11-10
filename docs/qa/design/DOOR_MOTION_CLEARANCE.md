# QA-GEO11 — physical door leaf intersects accepted furniture

Confirmed at 04:42 UTC, November 10. This is independent of QA-GEO10's wall boundary mismatch. No production edits by this QA chat.

`door-leaf-clearance-audit.cjs` executes production `canPlace` and `execute(add-item)`, production `openingLeaves(..., true)`, and AST-extracted production Openings mesh position/box expressions. It intersects the resulting leaf box with the exact integrated floor-lamp GLB triangles using Three, shrinking the box by 1 micrometre to exclude mere touching. This is CPU geometry and command evidence, not a physical-phone or building-code assertion.

All ten near fixtures are accepted despite triangle intersections. All ten farther controls are accepted with zero intersections. Coverage: single and double swing, surface sliding, left/right hinge where applicable, both flip sides. Shared wall is 12 cm; doors are valid under `openingError`. The floor-lamp is `ois.calm-oak.floor-lamp@0.1.0`, SHA `01c4272d9b2f3ad4c0fa78a945b42da31a13fc27998042007f89bccf539b0a9a`.

- Single swing at wall offset 2 m, width .9 m, left hinge, positive side: full-open leaf extends to z=.92 because the physical hinge/panel is offset .02 from the logical wall line. Accepted lamp's conservative footprint begins at z=.905. Ten actual shade triangles intersect the leaf. The .945 control has zero intersections. Double swing reproduces on the first leaf; both flip sides reproduce.
- Surface slider at the same opening, left travel: full-open panel occupies z=.0775..1125. Accepted lamp begins at z=.08, outside the visible wall's .06 inner face, yet 65 actual triangles intersect the panel (58 shade, 7 metal). The .125 control has zero intersections. Both hinge directions and flip sides reproduce.

Current swing envelopes reserve a logical quarter circle but do not include the actual leaf offset/thickness. Sliding travel validation reserves wall length against other openings, while accepted room furniture can occupy the physical moving panel. Repair should share a conservative physical motion envelope with the renderer for the whole travel, retaining the swing-side policy, both leaves, both flips and supported wall thicknesses. Do not merely expand every door into a full disk or conflate this with the measured-room boundary decision.

Evidence: `door-leaf-clearance-audit.json` contains all 20 cases, exact poses, accepted-command results, triangle counts, actual box expressions and stable source hashes. Pre-repair source copies are retained under `door-motion-before-source/`. Future closure needs nearer rejected / farther accepted controls, both sides/hinges, unequal wall thicknesses, wall/sliding/pocket distinctions, opening insertion beside existing furniture, and saved-project/Undo semantics.
