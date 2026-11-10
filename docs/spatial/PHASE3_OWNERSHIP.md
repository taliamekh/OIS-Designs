# Original Phase 3 — spatial work ownership

Furniture milestone cleared: docs/furniture/LIBRARY_HANDOFF.md and the immutable release audit pass with346distinct/311core designs. Overall work continues through06:53UTC.

This chat owns spatial/ and docs/spatial/. At 05:01 UTC it created exactly two coordinator-reserved new mobile files, spatialView.ts and HouseViews.tsx. Both returned to app ownership at 05:17 UTC; no mobile writes have occurred here since. App owner retains camera, inside dimensions, renderer, commands and persistence integration.

Completed policy handoff: pure dependency-free spatial/src/viewPlan.ts and the controlled spatial/adoption/HouseViews.tsx panel, with Node geometric regressions and a furnished two-floor/six-room browser fixture. App owner has adopted them as mobile/src/scene/spatialView.ts and mobile/src/screens/HouseViews.tsx. Support placement/family, level/void, ceiling and batching modules remain outside production. App owner retains Viewport.tsx, camera.ts, RoomScene.tsx, Editor.tsx, domain/types.ts, project commands/persistence and production tests. Those integration edits remain coordinated through the existing owner.

viewPlan covers visible room/floor/house scope, shared-origin floor transforms, optional presentation-only floor separation, conservative rotated furniture cages for framing, physical-wall visibility shared by trim/openings, ceiling policy and a forced read-only house/Walk policy. It does not replace CameraBridge fitting or change wall dimensions. Vertex-tight import measurements are a separate check.

supportPlacement covers pure support-plane intersection and canonical local coordinates/grab offset. Current Item has no vertical position, so placing a table lamp or microwave on a true support surface requires an explicitly reviewed optional elevation field and command/persistence integration; we will not claim current production supports it. Initial module returns a proposal only. Locks and Walk remain enforced by app commands.

Controls and any exploded-floor view are OIS proposals to evaluate, not user styling approval or claims about Home Planner controls. Product reference refresh and exact source links are recorded separately. Physical phone validation remains separate.
