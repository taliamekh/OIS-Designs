# Wall mounting hints require functional-height review

November 10, 2026. The seven wall-anchored models remain unavailable in the production floor-only placement path. This finding concerns a future mounting hint; it does not invalidate their reviewed geometry or increase the accepted distinct count.

The frozen r1 record for `ois.design.wall-fold-breakfast@0.7.0`, GLB SHA-256 `8a870fba7a46c11f853ad950f23763d2915421c6756c3850d8b5923b5cfcacc2`, inherits `defaultElevationMetres: 1.4` from wall-cupboard generation. Actual optimized GLB triangles identify a 0.472056m² upward folding surface at local Y=0.318619m; an independent centre ray agrees. Applying the hint places the working top at 1.718619m above the floor. Treating this hint as a usable dining/table default would be wrong.

`spatial/next-wall/evidence/mount-profile-r2/result.json` records the exact geometry measurements and the complete seven-model mesh/plane inventory. Its 0.75m target is an authored comparison fixture, not an ergonomic or building-code recommendation, user approval or a new catalogue default.

The future publisher now omits a generic base-elevation hint for folding-wall tables and suspended rope shelves, marks explicit functional height as required and consistently declares wall attachment required. Existing release metadata/model bytes and app catalogue have not been rewritten. A successor metadata release and matching app integration must deliberately review functional height anchors before enabling wall mounting. The immutable r1 snapshot remains historical evidence with this documented limitation; current production correctly keeps these models gated.

The publisher change is source-only and syntax-checked. No replacement model, manifest regeneration, default-height rollout or new visual acceptance is claimed.
