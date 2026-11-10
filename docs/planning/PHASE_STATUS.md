# Current phase status

Updated November 10, 2026, 01:27 a.m. Toronto / 06:27 UTC. Use the phase IDs from [PHONE_APP_PLAN.md](PHONE_APP_PLAN.md). Overnight execution steps and parallel asset batches are subordinate work packages, not replacement phase numbers.

**Current position: Phase 2 implementation and validation, with parts of Phase 3 implemented in parallel. Phase 1's physical-device acceptance gate is still open.** The user authorized implementation November 9 and deferred phone pairing; that allows independent build work without claiming device acceptance.

| Original phase | Current position | Evidence / outstanding gate |
| --- | --- | --- |
| 0 — Visual review | Requirements and corrections recorded; implementation authorized. | [Design specification](APP_DESIGN_SPEC.md), [preferences](../../design-feedback/preferences.md), [decisions](../../design-feedback/decisions.md). Exact new visual details are not automatically user-approved. |
| 1 — Measured room vertical slice | Core implementation and explicit inside measurements pass bounded source/browser checks. | New templates/drawings, physical inside faces, inspector, units, save/reload and exact unchanged Apply have independent evidence. Legacy coordinates remain unchanged. iPhone 13 and physical Android launch/graphics/touch/interruption acceptance remain pending. |
| 2 — Usable single-floor house | Main active implementation/validation phase. | Shared-wall rooms/doors, separate faces, room navigation, catalogue, collisions, locks/Walk, history and large-library export/recovery exist. Remaining UI regressions and final integrated checks are tracked below. The furniture target was expanded by the user to at least 300 genuinely distinct designs. |
| 3 — Multi-floor house refinement | Partially implemented; active successor work. | Production room/floor/house views now include solid/cutaway, ceilings, Perspective/Top/Front, Fit and visual floor separation; house overview is read-only. Multiple levels, alignment/elevation and room jumps exist. Supported surface/wall placement, persisted stairs/voids, advanced ceiling geometries and double-height connections remain separate unadopted experiments. The furniture chat leads this successor work after its library gate. |
| 4A — Upload and trace actual house plan | Not implemented; honestly unavailable. | Backup JSON import is not plan/PDF tracing. Actual source overlay, scale calibration and tracing require their own acceptance. |
| 4B — Plan automatically creates editable setting | Not implemented. | Requires a real recognition provider and reviewed editable structural output, not an image or canned scene. |
| 5A — Structured scan import | Not implemented. | Requires real permitted LiDAR/camera exports and metric/structure review through the agreed contract. |
| 5B — Native capture integration | Not implemented. | Preserve the original plan's separate capture-provider/device gates; no fake scan or desktop substitute. |
| 6 — Tablet adaptations | Not implemented as the planned tablet increment. | Requires tablet/landscape/keyboard/pointer usability and responsive side inspectors; desktop browser testing is not tablet acceptance. |
| 7A — Account and reliable sync | Not implemented. | Auth, ownership, storage/outbox/revisions/conflicts and a connected viewing companion remain separate deliverables. |
| 7B — Computer editing | Not implemented as the planned connected product. | Current browser QA builds do not establish synchronized computer editing or a released web companion. |

The exact remaining phase titles/scopes in PHONE_APP_PLAN remain authoritative; this page reports evidence and does not silently reduce them.

## Active work packages

- **App owner:** integrated house views, new-room inside sizing and connected existing-room movement are published in `3152a85b`, with 51/51 tests and matching web/iOS/Android evidence. Movement rejects locked contents, preserves walls/openings/finishes and uses one Undo command; independent movement UI passes 11 cases. Concave trim correction and inside creation/legacy UI pass their bounded retests. Current follow-up: QA-GEO14 thick-corner opening clearance, RUNTIME-015 neutral floor edits in legacy colliding projects, and dense movement-preview captions. CPU repair checks pass; final UI/export closure is still pending.
- **Furniture/spatial owner:** library readiness accepted at 04:35 UTC; house-view policy/panel subsequently adopted by the app. Frozen library-r1 has 346 internally accepted distinct designs and 93 reviewed variants across ten rooms/five themes; 311 distinct designs exclude appliances/bath fixtures. Root verifies 3,175 dependency hashes and 12 adult bed groups with four mattress sizes; all 478 published GLBs pass separate formal validation with zero errors/warnings. Final catalogue/static sync and source-bound renderer/native-export checks pass. See [library handoff](../furniture/LIBRARY_HANDOFF.md), [release audit](../coordination/library-release-audit.json) and [spatial experiments](../../spatial/README.md). Continued support/attachment, stair/void, ceiling and batching work remains experimental and unadopted; no phone validation or user visual approval is claimed.
- **Runtime QA:** exact-source builds, save/recovery and realistic populated-scene checks. Published checkpoint Hermes exports match 56 compiled sources and all 1,187 exact GLBs per platform; this does not establish native linking or phone execution. Current-release populated-scene/resource and late-abandonment checks pass; controlled texture allocations reduced from 312 to 12 with identical pixels. Independently retesting the legacy floor-edit repair in actual UI.
- **Design QA:** read-only production audit. Independent tests close inside drawing (45 UI cases), room movement (11 UI cases), legacy dimensions/units (19 UI cases) and concave trim reproduction at their recorded sources. The new thick-corner opening repair passes 2,304 renderer-volume scenarios: 768 safe controls accepted, 1,536 near-corner cases rejected, no accepted obstructed aperture. Legacy decode/edit/Undo controls pass. Final quick-door/edited-opening UI retest is pending.
- **Coordinator:** dependency handoffs, phase/evidence reconciliation and sole GitHub publication. Latest `a3226d07` publishes the frozen spatial review package and efficient archive CI checkout; GitHub confirms author/committer `taliamekh`. Both this run and integrated app checkpoint `3152a85b` pass full remote source/provenance CI. The committed-tree audit verifies frozen dependencies/static bindings; a separate native audit verifies the app checkpoint. Active repair source is excluded until coherent and tested.

## Records and publication

**06:50 UTC:** independent final candidate UI closes opening/imperial checks (26legacy+9quick/repeat) and legacy neutral-floor cold restoration, with the original preview library restored byte-exact. App is finishing its preview-server correction and matching-source checks/exports before the next coherent publication. This does not change the original phase numbering or close physical-device gates.

**06:55 UTC:** six-hour minimum met with all four workers active through the gate. Furniture/spatial has now handed off its frozen library/adopted policy/unadopted drafts. App and independent QA continue final serving/export/publication checks. Phase2's three fresh human usability sessions, along with physical-phone gates, remain unperformed; automated checks do not substitute for them.

- [Full behavior parity checklist](BUILD_PARITY_CHECKLIST.md): every required interaction remains in scope.
- [Current build status](../build/STATUS.md), [design findings](../qa/design/FINDINGS.md), [runtime evidence](../qa/runtime/STATUS.md).
- [Furniture status](../furniture/STATUS.md), [queued spatial phase](../coordination/NEXT_SPATIAL_PHASE.md), [coordination log](../coordination/OVERNIGHT.md).
- Code and records live in this repository. GitHub checkpoints use the verified `taliamekh` identity. The coordinator is the single Git writer for the shared checkout; workers report coherent milestones for publication, avoiding index/branch races.

The minimum overnight work window ends at 01:53 Toronto / 06:53 UTC. That is a minimum work gate, not a claim that every original product phase will be complete then.
