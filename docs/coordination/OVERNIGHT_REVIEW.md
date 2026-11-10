# Overnight build review — in progress

Updated November 10, 2026, 01:50 Toronto / 06:50 UTC. The minimum work gate is 01:53 Toronto / 06:53 UTC. Final preview, export and publication checks remain active; this report does not declare the whole product complete.

## Where the build stands

The original [PHONE_APP_PLAN.md](../planning/PHONE_APP_PLAN.md) remains authoritative. [PHASE_STATUS.md](../planning/PHASE_STATUS.md) maps its original numbered phases to evidence.

- **Phase 1:** core editor and explicit inside-room measurements have bounded source/browser passes. Physical iPhone/Android acceptance is pending.
- **Phase 2:** principal integration and validation work. Connected room movement, shared walls, furniture, openings, finishes, locks, history and recovery are implemented. Final follow-up checks are listed below.
- **Phase 3:** room/floor/house views, solid/cutaway, ceilings, Perspective/Top/Front, Fit and visual floor separation are integrated. The furniture chat moved to this work after library readiness. Surface/wall attachments, persisted stairs/voids, advanced ceilings, double-height connections and batching remain unadopted experiments.
- **Phases 4A/4B, 5A/5B, 6 and 7A/7B:** tracing/recognition, scanning/capture, tablet and connected account/sync/computer editing retain their original gates. Backup import and browser QA do not establish these products.

## Code and publication

Local repository: `C:\Users\talia\OneDrive\Documents\ChatGPT\OIS Designs`; production app: `mobile/`. Published repository: [taliamekh/OIS-Designs](https://github.com/taliamekh/OIS-Designs).

Root is the sole Git writer while the four workers share one checkout. GitHub independently confirms both author and committer as `taliamekh`, using the account's noreply identity. Ready verified increments are published regularly; active incomplete source is excluded.

Integrated app checkpoint [3152a85b](https://github.com/taliamekh/OIS-Designs/commit/3152a85b5691231155aa59829540028e8dbb1314) contains house views, inside-room creation and connected room movement. [Full CI passed](https://github.com/taliamekh/OIS-Designs/actions/runs/42766373109): locked install, TypeScript, full ESLint, 51/51 tests and committed provenance audit.

Current repository checkpoint [a3226d07](https://github.com/taliamekh/OIS-Designs/commit/a3226d07182b7415c314996a533a4f87c5ab0e5d) publishes the 119-file frozen spatial review package and efficient archive checkout. [Full CI passed](https://github.com/taliamekh/OIS-Designs/actions/runs/42768274333). Root additionally verifies 72 explicitly selected app checkpoint hashes, 3,175 release dependency digests and 2,200 static references: 4,982 checked paths, zero issues, remote main matches.

Models and images use Git LFS. An earlier CRLF provenance defect was corrected separately in `70585c46` without rewriting active working files. CI reads LFS pointers; it does not redownload or render remote media bodies. Later app repairs require a new coherent checkpoint and exports.

## Accepted evidence and limits

| Area | Evidence | Boundary |
| --- | --- | --- |
| Furniture | Frozen library: 346 internally accepted distinct constructions plus 93 reviewed variants across ten rooms/five themes; twelve adult bed groups each have four mattress sizes. All 478 published GLBs pass independent formal validation with zero errors/warnings. | Internal screening is not user visual approval or product safety certification. Seven wall-mounted designs remain unavailable for production placement. |
| Catalogue/revisions | Default search matches all 439 reviewed new tuples. All 1,187 retained exact revisions resolve; 60 wrong-version/hash probes refuse fallback. | New attachments/elevation require schema, command, collision, renderer and persistence adoption. Old saves retain their exact geometry. |
| Dimensions/clearance | Independent inside-creation UI: 45 cases; legacy units/resize: 19. Original wall/door helper reruns and actual concave trim mesh controls pass. Legacy reference coordinates are not migrated. | New thick-corner opening repair has CPU passes; final UI closure remains below. Finite geometry matrices do not prove every possible room shape. |
| Room movement | Seven root command groups and eleven independent UI cases cover connected contents, locks, finishes/openings, one-command Undo/Redo and reload. Revised 320px preview passes 19 UI checks; root inspected its screenshot. | Physical native gestures remain pending. |
| House views | Actual integrated house/movement/reload suite passes six cases; independent read-only history guard passes nineteen. Root inspected the furnished separated-house screenshot. | Browser evidence is not physical-phone rendering or completion of every Phase 3 increment. |
| Native exports | Published checkpoint matches 76 source/config inputs and 56 compiled sources per platform. Actual Hermes v99: iOS 7,478,460 bytes; Android 7,704,424 bytes. Each includes 1,187 exact GLBs / 294,090,088 bytes. | Compilation/export proof only: no native linking, device launch, EXGL upload, physical gestures or thermals. Active fixes need new exports. |
| Resource lifecycle | Controlled 40-model browser comparison reduces texture objects 312→12 with identical pixels. Current-release scene and scope cycles plateau. All 34 late requests finish after abandonment with no active/wanted/pending sources left. | Object counters are not GPU bytes, FPS or thermal measurements. |
| Saves/recovery | Large history, chosen-file export/import, protected future/corrupt originals and cold recovery have bounded browser evidence. Six real IndexedDB transaction-abort cases pass. | Disk-full UI, OS power loss and physical native picker/share/interruption remain unverified. |
| Spatial experiments | Frozen initial package has owner 77 geometry regressions and root strict TypeScript. Ready wall draft: root verifies 36 files / 1,163,483 bytes, strict TypeScript, 21 existing regressions and Python syntax for a future publisher correction. | Wall/support/stair/ceiling/batching drafts remain unadopted. Owner browser triangle/face/motion results are separate from root reruns and native acceptance. |

Each result belongs to its recorded source snapshot. See [parity review](PARITY_REVIEW.md), [design QA](../qa/design/STATUS.md), [runtime QA](../qa/runtime/MORNING_HANDOFF.md), [library handoff](../furniture/LIBRARY_HANDOFF.md) and [publication record](PUBLISHING.md).

## Remaining overnight acceptance

1. **QA-GEO14 / QA-UNIT02 candidate closure:** independent final source-matched UI passes all26legacy-opening checks and all9quick/repeated-door checks, including signed imperial output, correction and exact history/reload. Root's12literal formatter,12sign-symmetry and5metric-display controls also pass. Preserve the evidence in the final app checkpoint.
2. **RUNTIME-015 candidate closure:** independent cold UI restores fields and open-panel Undo/Redo; its5,521-byte export matches the pre-reload backup. Original6,149-byte QA-origin library is restored and independently verified byte-for-byte. The separate served-route error is undergoing the app owner's client-rendered preview correction and launch checks.
3. **Spatial follow-up:** root verifies both pinned packages:36wall files/1,163,483bytes and22drag files/258,949bytes; strict TypeScript and21+7existing geometry regressions pass. These are unadopted experiments. The combined62-path follow-up also contains its component manifests and review handoff.
4. Freeze the coherent repair source. Run final source checks, matching web/iOS/Android exports, bounded independent retests and served-route verification. Publish exact ready source/evidence, verify remote author/committer/main and CI, then reconcile this report.

Phone pairing remains deferred while the user sleeps. Physical iPhone 13/Android execution, touch/GL/system text, OS interruption and sustained performance remain explicitly pending. No missing provider, user approval or device result is fabricated.
