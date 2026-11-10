# Current phase status

Updated November 10, 2026, 02:05 a.m. Toronto / 07:05 UTC. Use the original phase IDs from [PHONE_APP_PLAN.md](PHONE_APP_PLAN.md). Overnight work packages do not replace those phase numbers.

**Current position: Phase 2 implementation and validation, with parts of Phase 3 implemented in parallel. Phase 1's physical-device acceptance gate is still open.** The user authorized implementation November 9 and deferred phone pairing; that allows independent build work without claiming device acceptance.

| Original phase | Current position | Evidence / outstanding gate |
| --- | --- | --- |
| 0 — Visual review | Requirements and corrections recorded; implementation authorized. | [Design specification](APP_DESIGN_SPEC.md), [preferences](../../design-feedback/preferences.md), [decisions](../../design-feedback/decisions.md). Exact new visual details are not automatically user-approved. |
| 1 — Measured room vertical slice | Core implementation and explicit inside measurements pass bounded source/browser checks. | New templates/drawings, physical inside faces, inspector, units, save/reload and exact unchanged Apply have independent evidence. Legacy coordinates remain unchanged. iPhone 13 and physical Android launch/graphics/touch/interruption acceptance remain pending. |
| 2 — Usable single-floor house | Broad manual implementation verified in the overnight checkpoint; acceptance remains open. | Connected room movement, shared walls/openings/finishes, real furniture, locks/Walk and history/recovery have source/browser evidence. Final app d3cb08fb passes 56 tests and full CI. Three fresh human usability sessions and physical-phone checks remain unperformed. |
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

- **App owner:** final app checkpoint d3cb08fb is published, with 56/56 tests, full TypeScript/ESLint/CI, one matching client web export passing eight UI scripts, both door matrices, and current iOS/Android Hermes exports. Physical opening corners, neutral legacy floor edits, signed units, short annotations and 320px movement captions are repaired. Source/config remains matched to the final milestone.
- **Furniture/spatial owner:** library gate accepted, then adopted production house-view policy/panel. Frozen library has 346 internally accepted distinct designs plus 93 reviewed variants, with 3,175 dependency hashes independently verified. All 478 published GLBs pass formal validation; 1,187 exact retained revisions preserve old saves. Published wall/support/stair/ceiling/drag drafts remain unadopted. [Library handoff](../furniture/LIBRARY_HANDOFF.md), [spatial handoff](../spatial/OVERNIGHT_HANDOFF.md).
- **Runtime QA:** independent current-source native/export/resource and save/recovery checks pass in their recorded scopes. Legacy neutral-floor cold UI/export passes; original 6,149-byte preview library restored byte-for-byte. Thirty-two final publication paths are hash-verified and published. Physical OS/graphics/performance remains separate.
- **Design QA:** read-only final audit publishes 60 exact paths. Opening/imperial UI passes 26 legacy and nine quick/repeat cases; new/edit physical matrix passes 2,304 paired scenarios with no accepted obstructed aperture. Movement preview passes 19 narrow-layout/gesture cases. Measured creation, old inside units, read-only house/history and refreshed live preview have their own source-bound passes.
- **Coordinator:** all four worker chats stayed active through the six-hour gate; later handoffs are recorded honestly. Final app d3cb08fb is on main under GitHub-verified author/committer taliamekh; full remote CI succeeds. Root independently verifies native/source/model bytes, local/public native launch routes and 4,982 committed paths including all 72 final checkpoint sources. [Overnight review](../coordination/OVERNIGHT_REVIEW.md).

## Records and publication

**Final overnight checkpoint:** all required available repairs, exports, independent regressions, preview checks and app publication are verified. Phone/human/provider gates below remain explicit. The app uses client-rendered preview output to resolve the observed SSR cold-reload failure.

The six-hour minimum was met at 01:53 Toronto / 06:53 UTC; integration continued afterward. This checkpoint does not mark Phase 2 human/device acceptance, all of Phase 3 or later product phases complete.

- [Full behavior parity checklist](BUILD_PARITY_CHECKLIST.md): every required interaction remains in scope.
- [Current build status](../build/STATUS.md), [design findings](../qa/design/FINDINGS.md), [runtime evidence](../qa/runtime/STATUS.md).
- [Furniture status](../furniture/STATUS.md), [queued spatial phase](../coordination/NEXT_SPATIAL_PHASE.md), [coordination log](../coordination/OVERNIGHT.md).
- Code and records live in this repository. GitHub checkpoints use the verified `taliamekh` identity. The coordinator is the single Git writer for the shared checkout; workers report coherent milestones for publication, avoiding index/branch races.

The minimum overnight work window ends at 01:53 Toronto / 06:53 UTC. That is a minimum work gate, not a claim that every original product phase will be complete then.
