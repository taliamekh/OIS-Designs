# Supported-height placement — bounded proposal

Updated November 10, 2026, 05:56 UTC. Source: spatial/src/supportPlacement.ts; current exact source hash is pinned by spatial/evidence/support-browser-r2/result.json. Strict TypeScript compile and 16 geometry tests pass. This module remains under spatial/; **production surface/wall placement is not enabled**.

The proposal intersects a downward world ray with a canonical floor-relative horizontal region, preserves grab offset, applies optional grid snapping in the common floor frame, and puts the model's actual bottom bound at the support height. It rejects read-only/Walk, locks, wrong room/floor, stale or wrong support-owner model/pose, self/cyclic parenting, missing collision evidence, concave overhangs, holes, ceiling and conservative3D obstacle overlap. Topmost authored support surfaces may ignore the owner's cage at contact; a lower region under a hutch or faucet requires a more precise owner collision provider and remains blocked.

Authored mesh regions are explicit data. The top of an AABB is not proof of a usable tabletop. The browser experiment authored a conservative inner region of the actual writing desk and checked 15 points against imported top triangles and upward normals. A real banker lamp rests on that surface with zero measured contact error before and after parent translation/rotation. Exact two-model hashes, checks, images and disposal proof: spatial/evidence/support-browser-r2/result.json. Complete disposal returns zero geometries, textures and leases.

Collision evidence must cover every other current item in the active room, with matching pose and exact asset identity. Missing/stale entries, duplicate IDs, nonfinite/inverted metadata and raw support regions above or outside the owner cage fail explicitly. These checks close proposal-level fail-open paths; callers still need reviewed mesh regions and command-level revalidation before committing anything.

The relative attachment proposal retains the exact parent id/version/hash and local pose, allowing recomputation when the parent moves. JSON roundtrip of that proposal is tested; it is **not** proof of the app's persistence or Undo integration. Parent identity failure remains unresolved rather than silently substituting a new model. No project objects are written by these functions.

## Required production work before availability

App owner must deliberately extend Item/attachment schema and validation, renderer elevation, all relevant creation/drag/rotation/delete/duplicate commands, support discovery/region provenance, wall and obstacle collision, atomic attached-family movement, parent deletion/replacement policy, backup/save/reload and Undo/Redo. Legacy Item has zero elevation and must retain its existing exact pose and locks. House/Walk and locked-item guards must remain at the command layer. Moving a support cannot strand or silently detach children. Table/shelf/wall assets stay gated until the complete path exists and source-matched app/physical checks pass.

The two production house-view files were returned to the app owner for integration; this chat has stopped writing them. This support module requests no implicit transfer of types/project/persistence or geometry QA's current files.
