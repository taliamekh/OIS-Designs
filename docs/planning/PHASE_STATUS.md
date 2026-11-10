# Current phase status

Updated November 9, 2026, approximately 11 p.m. Toronto. Use the phase IDs from [PHONE_APP_PLAN.md](PHONE_APP_PLAN.md). Overnight execution steps and parallel asset batches are subordinate work packages, not replacement phase numbers.

**Current position: Phase 2 implementation and validation, with parts of Phase 3 implemented in parallel. Phase 1's physical-device acceptance gate is still open.** The user authorized implementation November 9 and deferred phone pairing; that allows independent build work without claiming device acceptance.

| Original phase | Current position | Evidence / outstanding gate |
| --- | --- | --- |
| 0 — Visual review | Requirements and corrections recorded; implementation authorized. | [Design specification](APP_DESIGN_SPEC.md), [preferences](../../design-feedback/preferences.md), [decisions](../../design-feedback/decisions.md). Exact new visual details are not automatically user-approved. |
| 1 — Measured room vertical slice | Core implementation works in bounded browser tests. | Parametric room/door, real GLBs, direct transforms, per-face finish, Undo, save/reopen. iPhone 13 and physical Android launch/graphics/touch/interruption acceptance remain pending. |
| 2 — Usable single-floor house | Main active implementation/validation phase. | Shared-wall rooms/doors, separate faces, room navigation, catalogue, collisions, locks/Walk, history and large-library export/recovery exist. Remaining UI regressions and final integrated checks are tracked below. The furniture target was expanded by the user to at least 300 genuinely distinct designs. |
| 3 — Multi-floor house refinement | Partially implemented; active successor work. | Multiple levels, alignment/elevation, room jumps, initial all-floor overview/cutaway and room ceiling overrides exist. Full camera/view presets, complete house presentation, stair/void markers and advanced ceiling geometries are not complete. After its library gate, the furniture chat leads the user's requested full 3D placement/whole-house view work. |
| 4A — Upload and trace actual house plan | Not implemented; honestly unavailable. | Backup JSON import is not plan/PDF tracing. Actual source overlay, scale calibration and tracing require their own acceptance. |
| 4B — Plan automatically creates editable setting | Not implemented. | Requires a real recognition provider and reviewed editable structural output, not an image or canned scene. |
| 5A — Structured scan import | Not implemented. | Requires real permitted LiDAR/camera exports and metric/structure review through the agreed contract. |
| 5B — Native capture integration | Not implemented. | Preserve the original plan's separate capture-provider/device gates; no fake scan or desktop substitute. |
| 6 — Tablet adaptations | Not implemented as the planned tablet increment. | Requires tablet/landscape/keyboard/pointer usability and responsive side inspectors; desktop browser testing is not tablet acceptance. |
| 7A — Account and reliable sync | Not implemented. | Auth, ownership, storage/outbox/revisions/conflicts and a connected viewing companion remain separate deliverables. |
| 7B — Computer editing | Not implemented as the planned connected product. | Current browser QA builds do not establish synchronized computer editing or a released web companion. |

The exact remaining phase titles/scopes in PHONE_APP_PLAN remain authoritative; this page reports evidence and does not silently reduce them.

## Active work packages

- **App owner:** repair and independently retest catalogue scroll restoration, door annotation fit/partial-shared-wall distances and inherited ceiling editing; integrate promoted furniture revisions; keep setup/build notes current.
- **Furniture owner:** complete and review at least 300 distinct current designs. At the latest coordinator audit, 112 rows have current internal acceptance; this is a bounded snapshot, not user approval or completion. Rework and size/material variants do not count. The corrected v0.7 batch continues exporting/reviewing.
- **Runtime QA:** exact-source builds, save/recovery and realistic populated-scene checks. The controlled 40-model scene reduced browser texture allocations from 312 to 12 while preserving pixels; the pre-commit eviction race was repaired and independently retested. Physical native behavior remains separate.
- **Design QA:** actual UI workflows, narrow/large-text layouts, materials, dimension correctness and regression checks.
- **Coordinator:** dependency handoffs, phase/evidence reconciliation and GitHub publication checkpoints.

## Records and publication

- [Full behavior parity checklist](BUILD_PARITY_CHECKLIST.md): every required interaction remains in scope.
- [Current build status](../build/STATUS.md), [design findings](../qa/design/FINDINGS.md), [runtime evidence](../qa/runtime/STATUS.md).
- [Furniture status](../furniture/STATUS.md), [queued spatial phase](../coordination/NEXT_SPATIAL_PHASE.md), [coordination log](../coordination/OVERNIGHT.md).
- Code and records live in this repository. GitHub checkpoints use the verified `taliamekh` identity. The coordinator is the single Git writer for the shared checkout; workers report coherent milestones for publication, avoiding index/branch races.

The minimum overnight work window ends at 01:53 Toronto / 06:53 UTC. That is a minimum work gate, not a claim that every original product phase will be complete then.
