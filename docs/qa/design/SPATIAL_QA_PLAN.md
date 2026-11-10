# Spatial-phase independent QA

Acknowledged2026-11-10 03:49UTC. Direction and start gate are in `docs/coordination/NEXT_SPATIAL_PHASE.md`; user preferences/decisions were reread. The furniture owner finishes at least300 accepted distinct constructions before leading its next spatial phase. This QA chat keeps writing only `docs/qa/design/`; it does not take mobile or asset ownership.

The current app already supplies2D/3D, direct transforms, locks, read-only Walk, room/floor navigation, cutaway and initial all-floor overview. Exact new camera presets/visibility controls are proposals, not user approvals or verified Home Planner copies. Read the saved correct-product reference first and research only a new unresolved interaction.

Use the original phase IDs in `docs/planning/PHONE_APP_PLAN.md`: Phase2 is the usable single-floor house; Phase3 is multi-floor house refinement, including cutaway/room jump/camera presets. The overnight handoff's numbered implementation steps are a checklist, not replacements for those product phases. Physical Phase1 validation and later provider/tablet/cross-device gates remain distinct.

Use furnished irregular multi-room/multi-floor fixtures with nonzero alignment/elevation, unequal room ceilings and exact retained model revisions. Keep one immutable runtime fixture for before/after resource comparisons; use a separately current review-bound fixture for acceptance/coverage. Reused models and withdrawn reviews do not count toward300 distinct accepted designs.

Verify:

- Room/floor/whole-house bounds remain visible on390px and320px screens, with negative offsets, overhangs and differing ceilings. Preserve the canonical house transform and scale.
- View and visibility changes preserve exact project data, history, locks, finishes and saved asset tuples; camera/view state stays distinct from model edits.
- Direct placement selects the intended visible item, respects opaque occluders and explicit visibility modes, and distinguishes camera orbit/pinch/cancel from object transforms. Unsupported attachments remain honest.
- Current-room and whole-house selection/context remain coherent after changing floors, opening sheets or returning from Walk. Contextual tools should not consume the renderer or duplicate actions.
- Both wall faces, trim and furniture remain coherent when walls/ceilings/floors are hidden or cut away. No unsupported stair traversal or sloped geometry claim.
- Shared textures/material overrides remain isolated; representative distinct-model scenes release abandoned/idle resources correctly. Renderer allocation counts are not native memory bytes or thermal validation.
- Native integration needs matching lint/type/export checks and independent UI regression. Browser prototypes and export bundles remain separate from physical iPhone/Android touch/GL/files/sharing evidence.

Current foundational follow-ups can be audited before the queued phase begins; doing so does not declare the library gate satisfied or choose new presets on the user's behalf.
