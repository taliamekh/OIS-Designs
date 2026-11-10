# Ready adoption request — original Phase 3

2026-11-10 04:42 UTC. Actual checked source: spatial/src/viewPlan.ts, SHA-256 `dbd8513f68c61f1f484257fb131b2f20fe656eb49a9042519d690bfab22cf450`. Strict TypeScript compile and19Node geometric regressions pass (spatial/tests/view-plan-result.log). The authored two-floor/six-room fixture uses40distinct exact library revisions /87,448source triangles; browser presentation proof is being built next. No native execution claim.

**Concrete ownership request to coordinator/app:** app owner may adopt this dependency-free module as `mobile/src/scene/spatialView.ts` now. Please reserve that new production file for this handoff; source remains owned here until explicitly assigned. App owner retains edits to Viewport.tsx, RoomScene.tsx, Editor.tsx, camera.ts and domain files. No handoff of those active files is requested. If the new module is copied, pin this source hash and run matching app lint/typecheck and current scene regressions.

Adoption points:

1. Build the static `createScenePlan` when project/view scope/alignment/elevation/asset identity changes. Use canonical/display offsets for existing floor groups, conservative display bounds as camera input, and room/item IDs for visibility. The bounds rotate the imported local AABB and enclose mesh geometry; they are not vertex-tight imported bounds.
2. On orbit, call only `physicalWallPlan` with the cached visible-room set/offset and camera. Apply its single decision to both room faces and that physical wall's trim/opening frame. Preserve interior partitions, support a scoped force-visible override for painting, and retain previous visibility in the3cm wall-plane band. Do not rebuild all bounds every render frame.
3. House overview is explicitly read-only. Optional floor separation is presentation-only; it never changes floor.elevation, alignment, item coordinates, saved locks or model tuples. The existing command layer still enforces Walk/read-only edits. Walk displays all connected rooms on its active canonical floor, with solid walls and ceilings; no stair traversal is invented.
4. Current app camera/QA-GEO10 repairs remain with app owner. This module does not change room wall/clear-dimension semantics or replace CameraBridge fitting. Sloped/vaulted/soffit/double-height geometry and stair/void markers remain separately tracked original Phase3 increments.

Independent oracles cover two known shared anchors with different floor-local origins; negative/local/global translation; mixed per-room ceilings and floor elevations; an asymmetric90degree rotated asset; a triangle proving conservative-vs-vertex-tight bounds; both polygon windings and explicit face orientation; repeated wall IDs on different floors; hidden active/all floors; selection bounds; unresolved exact asset versions; Walk and project-byte immutability.

There is no supported-height placement claim in this adoption. Item.elevation is only a proposed optional field in the structural adapter. Existing production Item has no height, so surface/wall assets remain gated until commands, collision, persistence, Undo and renderer integration exist. Full-house viewing takes priority.
