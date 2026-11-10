# QA-GEO12 — concave trim miter extends beyond collision strips

Confirmed05:22UTC after the05:17ownership return. Production remains APP-owned; QA made no further mobile edits. This extends the physical-boundary coverage and keeps full QA-GEO10closure open.

Actual new `concave-trim-real-model.json`: real integrated kitchen-base0.1.0/hash50feb5b7… atx2.9799999976,z2.6799999976,yaw0 in the6×6L-shape is accepted by canPlace/add-item. Its conservative footprint stays belowx3.3/z3, so it avoids both finite wall/trim strips. However real low leg vertices, e.g[3.2279999936,.0119999982,2.9599999876], are **strictly inside the actual closed trim mesh** at the reentrant corner. Upward DoubleSide ray parity remains odd for the point and four10-micrometre horizontal perturbations, excluding mere face contact. Default16mm and legal60mm projections both fail; two farther cabinet controls are accepted with zero interior vertices. This is real GLB/actual trim-solid CPU evidence, not only a hypothetical tiny box or native render claim.

New synthetic coverage independently found the same gap:64actual trim-mesh fixtures,208,896corner placements,9,764accepted. Rectangle/trapezoid/L/acute, both windings, four profiles, equal/unequal wall/projection values. The report stores the first30intersections, not the total failure count. These analytic test boxes are not furniture models. See trim-collision-coverage.json/.cjs.

## Focused repair recipe for app owner

Current finite strips end at the logical wall endpoints. Actual trimCornerMiter uses affine cut=offset+slope×profileDepth and can extend beyond them, especially at a concave corner. Share that pure miter calculation with geometry (or copy it into a pure domain helper and delegate meshes.ts), rather than importing Three/meshes into domain.

For each actual trimmed interval[a,b], conservatively include the miter extension only where that interval reaches a physical wall end:

1. For each own-oriented endpoint, minCut=min(0,miter.offset,miter.offset+miter.slope×trim.projection).
2. At canonical a=0: add start minCut for a nonreversed face; add end minCut for a reversed face.
3. At canonical b=wallLength: subtract end minCut for nonreversed; subtract start minCut for reversed.
4. Use these extended a/b limits with the same physical half-thickness→half-thickness+projection strip and vertical trim height.

This bounds every actual affine-cut profile vertex, including unequal wall thickness/projection. Keep interior doorway/jamb interval ends square; extending them would unnecessarily fill apertures. A conservative miter rectangle may reserve some empty triangle near the joint, consistent with existing conservative asset bounds, but must not reserve entire infinite walls or block safe opening centres.

Expected closure: real cabinet4cases pass (near rejected,far controls accepted), the64-fixture actual trim triangle audit has no accepted intersections, and the existing192wall/120door/aperture/history cases retain their passes. Reuse original negative evidence and preserve current app ownership unless coordinator grants another exact handoff.
