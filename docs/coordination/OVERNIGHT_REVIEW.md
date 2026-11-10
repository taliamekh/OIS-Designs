# Overnight build review — verified checkpoint

Updated November 10, 2026, 02:04 Toronto / 07:04 UTC. All four worker chats remained active through the six-hour minimum at 01:53 Toronto / 06:53 UTC. Integration continued afterward to close the final preview/export/publication checks. This is the verified overnight checkpoint, not completion of every product phase.

## Where the build stands

The original [PHONE_APP_PLAN.md](../planning/PHONE_APP_PLAN.md) remains authoritative. [PHASE_STATUS.md](../planning/PHASE_STATUS.md) maps its original numbered phases to evidence.

- **Phase 1:** core editor and explicit inside-room measurements have bounded source/browser passes. Physical iPhone/Android acceptance is pending.
- **Phase 2:** principal integration and validation work. Connected room movement, shared walls, furniture, openings, finishes, locks, history and recovery are implemented. Final follow-up checks are listed below.
- **Phase 3:** room/floor/house views, solid/cutaway, ceilings, Perspective/Top/Front, Fit and visual floor separation are integrated. The furniture chat moved to this work after library readiness. Surface/wall attachments, persisted stairs/voids, advanced ceilings, double-height connections and batching remain unadopted experiments.
- **Phases 4A/4B, 5A/5B, 6 and 7A/7B:** tracing/recognition, scanning/capture, tablet and connected account/sync/computer editing retain their original gates. Backup import and browser QA do not establish these products.

## Code and publication

Local repository: `C:\Users\talia\OneDrive\Documents\ChatGPT\OIS Designs`; production app: `mobile/`. Published repository: [taliamekh/OIS-Designs](https://github.com/taliamekh/OIS-Designs).

Root is the sole Git writer while the four workers share one checkout. GitHub independently confirms both author and committer as `taliamekh`, using the account's noreply identity. Ready verified increments are published regularly; active incomplete source is excluded.

Final app checkpoint [d3cb08fb](https://github.com/taliamekh/OIS-Designs/commit/d3cb08fb7a46692e191bca4a44a8259b7d4a3dc0) includes house views, inside-room creation, connected room movement, physical corner/legacy editing repairs, readable signed dimensions and the client-rendered preview correction. [Full CI passed](https://github.com/taliamekh/OIS-Designs/actions/runs/42772473560): locked install, TypeScript, full ESLint, 56/56 tests and committed provenance audit. GitHub confirms author and committer taliamekh; remote main matched the pushed source checkpoint. All production source and build evidence are committed.

Spatial base [a3226d07](https://github.com/taliamekh/OIS-Designs/commit/a3226d07182b7415c314996a533a4f87c5ab0e5d) publishes the 119-file frozen review package; [eba98b80](https://github.com/taliamekh/OIS-Designs/commit/eba98b8033666e67359e8b07823002b9b1e7b3d2) adds the wall/drag follow-up. Both passed full CI. Root's final committed-tree audit verifies all 72 selected d3cb08fb source/config hashes, 3,175 release dependency digests and 2,200 static references: 4,982 checked paths, zero issues. Remote main identity/ref verification is recorded separately from the local pre-push tree audit.

Models and images use Git LFS. An earlier CRLF provenance defect was corrected separately in `70585c46` without rewriting active working files. CI reads LFS pointers; it does not redownload or render remote media bodies. Any later production change needs its own coherent checkpoint and matching evidence.

## Accepted evidence and limits

| Area | Evidence | Boundary |
| --- | --- | --- |
| Furniture | Frozen library: 346 internally accepted distinct constructions plus 93 reviewed variants across ten rooms/five themes; twelve adult bed groups each have four mattress sizes. All 478 published GLBs pass independent formal validation with zero errors/warnings. | Internal screening is not user visual approval or product safety certification. Seven wall-mounted designs remain unavailable for production placement. |
| Catalogue/revisions | Default search matches all 439 reviewed new tuples. All 1,187 retained exact revisions resolve; 60 wrong-version/hash probes refuse fallback. | New attachments/elevation require schema, command, collision, renderer and persistence adoption. Old saves retain their exact geometry. |
| Dimensions/clearance | Independent inside-creation UI: 45 cases; legacy units/resize: 19. Original wall/door helper reruns and actual concave trim mesh controls pass. Legacy reference coordinates are not migrated. | New thick-corner opening repair has CPU passes; final UI closure remains below. Finite geometry matrices do not prove every possible room shape. |
| Room movement | Seven root command groups and eleven independent UI cases cover connected contents, locks, finishes/openings, one-command Undo/Redo and reload. Revised 320px preview passes 19 UI checks; root inspected its screenshot. | Physical native gestures remain pending. |
| House views | Actual integrated house/movement/reload suite passes six cases; independent read-only history guard passes nineteen. Root inspected the furnished separated-house screenshot. | Browser evidence is not physical-phone rendering or completion of every Phase 3 increment. |
| Native exports | Final b9096fca fingerprint matches 76 source/config inputs and 56 compiled sources per platform. Actual Hermes v99: iOS 7,484,064 bytes; Android 7,705,776 bytes. Each includes 1,187 exact GLBs / 294,090,088 bytes. | Compilation/export proof only: no native linking, device launch, EXGL upload, physical gestures or thermals. |
| Resource lifecycle | Controlled 40-model browser comparison reduces texture objects 312→12 with identical pixels. Current-release scene and scope cycles plateau. All 34 late requests finish after abandonment with no active/wanted/pending sources left. | Object counters are not GPU bytes, FPS or thermal measurements. |
| Saves/recovery | Large history, chosen-file export/import, protected future/corrupt originals and cold recovery have bounded browser evidence. Six real IndexedDB transaction-abort cases pass. | Disk-full UI, OS power loss and physical native picker/share/interruption remain unverified. |
| Spatial experiments | Frozen initial package has owner 77 geometry regressions and root strict TypeScript. Ready wall draft: root verifies 36 files / 1,163,483 bytes, strict TypeScript, 21 existing regressions and Python syntax for a future publisher correction. | Wall/support/stair/ceiling/batching drafts remain unadopted. Owner browser triangle/face/motion results are separate from root reruns and native acceptance. |

Each result belongs to its recorded source snapshot. See [parity review](PARITY_REVIEW.md), [design QA](../qa/design/STATUS.md), [runtime QA](../qa/runtime/MORNING_HANDOFF.md), [library handoff](../furniture/LIBRARY_HANDOFF.md) and [publication record](PUBLISHING.md).

## Closed follow-ups and next gates

1. **QA-GEO14 / QA-UNIT02 closed in the recorded scope:** independent final source-matched UI passes all 26 legacy-opening and nine quick/repeated-door checks, including signed imperial output and exact history/reload. Root's 12 literal formatter, 12 sign-symmetry and five metric controls pass. The current client export passes all eight owner UI scripts and both normal/near-corner 128-assertion matrices.
2. **RUNTIME-015 / preview closure:** independent cold UI restores fields and open-panel Undo/Redo; its 5,521-byte export matches the pre-reload backup. Original 6,149-byte QA-origin library is restored byte-for-byte. The corrected client-rendered preview passes owner cold reloads and three independent fresh-context loads/reloads without page/console errors. Root separately verifies current local/public SDK58 manifests, advertised full native bundles and exact GLB bytes, all HTTP200. These checks retain their distinct source/configuration scopes.
3. **Spatial follow-up published:** root verifies 36 wall files / 1,163,483 bytes and 22 drag files / 258,949 bytes; strict TypeScript and 21+7 existing regressions pass. These remain unadopted experiments. The combined 62-path follow-up includes component manifests and a review handoff.
4. **Publication verified:** d3cb08fb is on main under taliamekh with successful full remote CI. Final independent QA manifests publish 60 design paths / 3,191,845 bytes and 32 runtime paths / 433,731 bytes. Historical failures remain preserved; original live-library bytes and transient connection links are excluded. Generated scratch reports outside those ready lists are not a claim of additional product capability.

Next acceptance is physical iPhone 13/Android execution, touch/GL/system text, OS interruption and sustained performance, plus Phase 2's three fresh human usability sessions. Phone pairing remains deferred. Phase 3's attachment/stair/advanced-ceiling increments and all later plan/scan/tablet/sync phases retain their original gates. No missing provider, user approval or device result is fabricated.
