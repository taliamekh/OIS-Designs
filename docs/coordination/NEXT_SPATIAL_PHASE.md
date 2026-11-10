# Queued Phase 3 work package: spatial placement and whole-house views

This continues **Phase 3 — Multi-floor house refinement** from `docs/planning/PHONE_APP_PLAN.md`, with placement polish supporting Phase 2. It is not a new numbering scheme. The broader original Phase 3 requirements, including camera presets, visibility, stair/void markers and separate advanced-ceiling increments, remain tracked in that plan and `docs/planning/PHASE_STATUS.md`.

User request, November9,2026 at approximately22:43Toronto: after the furniture library is done, have its chat work on the full3D placement experience and how the whole house appears through different options, using Home Planner as a reference.

## Owner and start gate

- Lead: existing furniture chat `01a1bd3f-562d-73d2-8ea3-8a5344049c49`, after its library completion gate. This is its next phase, not permission to stop the library early.
- The library gate remains at least300 accepted distinct constructions with coherent room/theme coverage, current hash-bound visual/format/contact review, duplicate screening and a usable immutable integration handoff. Recolours, size-only variants and known rework do not count.
- The app owner keeps `mobile/`. The spatial lead initially owns `spatial/` and `docs/spatial/`, may inspect the app, and coordinates exact file handoffs before any production mobile edit. Root coordinates; design/runtime QA verify independently.
- Minimum overnight work gate remains06:53UTC/01:53Toronto. Finishing the library advances this queued phase.

## Requested outcome and existing foundation

The current app already has real3D furniture, direct placement/rotation, persistent locks, connected read-only Walk, multi-room/floor navigation and an initial all-floor overview. Extend that integrated experience rather than building an unrelated replacement.

The next phase should evaluate a coherent room/floor/whole-house camera and visibility system: useful orbit/framing, furnishing a real space at true scale, clear selection and occlusion, whole-floor/whole-house presentation, and the wall/ceiling/floor visibility options needed to inspect interiors. Dollhouse/cutaway and interior views are candidates to evaluate; exact presets/control layout are not separately approved and are not asserted to match Home Planner without evidence.

Use `docs/planning/HOME_PLANNER_REFERENCE.md` and verify additional reference behavior from the correct Home Planner app (Room Planner Ltd, pink logo). Separate observed product behavior, documented capability, unknowns and OIS proposals. Official reference pages checked November9: [floor-plan editor](https://homeplannerapp.com/floor-plan-creator), [whole-home3D and walkthrough](https://share.homeplannerapp.com/floor-plan-to-3d). These pages do not by themselves prove every camera control.

## Integration and evidence

- Preserve canonical metres, actual wall/floor alignment and ceiling heights, saved asset id/version/hash, material overrides, locks, Undo/Redo and read-only Walk.
- Keep the phone renderer prominent and navigation contextual; no persistent clutter, duplicated actions or unrequested slogans.
- Test camera framing/occlusion and whole-house transforms on furnished multi-room/multi-floor fixtures, narrow screens and large text. View switching must not mutate project data.
- Test placement/raycast/gesture ownership, tint isolation, save/reload and resource disposal with representative distinct models. Reuse current bounded cache and texture-sharing infrastructure.
- Browser prototypes and screenshots are review artifacts. The app owner must integrate the accepted work into Expo and run matching lint/typecheck/exports/regressions; physical iPhone/Android behavior remains a distinct validation gate.

No new scan/import provider, automatic stair traversal or paid service is implied by this phase.
