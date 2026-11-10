# Overnight integration and verification

User instruction received November 9, 2026: this chat coordinates the ongoing overnight build, connects the phases, and ensures proper testing. No participating chat should declare the overall work finished before six hours; useful work continues from the plan or concrete improvements after each milestone.

Shared minimum-work gate: **November 10, 2026, 01:53 America/Toronto (06:53 UTC)**, six hours from the coordination request. This is a minimum work window, not evidence that features are complete. Individual milestones may pass sooner. Continue unmet requirements, fixes and verification rather than adding arbitrary product scope. Runtime/usage interruptions must be recorded honestly.

## Ownership

| Existing chat | Responsibility | Writable files |
| --- | --- | --- |
| Coordinate overnight build phases — `01a1c2ef-37e4-7b43-8a3c-8774e51f2454` | Phase coordination, handoffs, independent review, sole Git publication | `docs/coordination/`, live `PHASE_STATUS.md`, repository index/workflow records; confirmed feedback |
| OIS Expo app — overnight build — `01a1c2dc-5032-7e11-9d15-3f28723baf3c` | Production app and integration, tests, fixes | `mobile/` except the active exact handoffs below; `docs/build/`, implementation/parity documentation |
| OIS furniture library — real 3D assets — `01a1bd3f-562d-73d2-8ea3-8a5344049c49` | Completed library readiness milestone; now original Phase 3 house-view work | `furniture/`, `docs/furniture/`, `spatial/`, `docs/spatial/`; active reserved new mobile files below |
| OIS app plan and phone mockups — `01a1bcd1-1d0e-73d2-9d70-4b706a2121c7` | Independent design/behavior audit, plus assigned physical-boundary repair | `docs/qa/design/`; active exact domain pair below |
| Troubleshoot Expo overnight build — `01a1c2e5-832f-7b50-aae2-ae53d7446f99` | Independent build/runtime/export checks | `docs/qa/runtime/` |

All chats share this checkout. The user's later explicit instruction authorizes regular GitHub publication under `taliamekh`, superseding the initial no-push rule. Root alone stages, commits and pushes meaningful checked increments; workers must not mutate Git concurrently. No branch switches, resets, cleaning or blanket staging. Do not change dependencies or start/stop another owner's servers without an explicit handoff. Report through owned status files; the coordinator reads and relays them.

**Active exact handoffs, 04:58 UTC:** after source-stable checkpoint `43b53e6d` was committed and its brief freeze released, the spatial lead may create `mobile/src/scene/spatialView.ts` and `mobile/src/screens/HouseViews.tsx`. The app retains their screen/renderer integration. Design QA owns only `mobile/src/domain/geometry.ts` and `mobile/src/domain/project.ts` for QA-GEO10/11 physical clearance and inside-dimension helpers; app keeps those files unchanged until explicit return. App consent, requirements and baseline hashes are in `docs/build/SPATIAL_HANDOFF.md` and `geometry-handoff-baseline.json`. Other production ownership is unchanged. Source stability for a Git checkpoint is a brief handoff, not permission to finish the overnight effort.

**User update at approximately03:43UTC:** once the furniture library is genuinely complete, that same chat advances to full 3D placement in spaces and complete-house viewing options inspired by Home Planner. This queued successor phase is recorded in `NEXT_SPATIAL_PHASE.md`; its initial owned paths are `spatial/` and `docs/spatial/`, with mobile production still app-owned until an exact handoff. Existing 3D placement/Walk/overview is the foundation. This does not relax the library's 300-distinct/current-review gate or the minimum overnight work window.

## Integration order and acceptance gates

1. Stabilize the actual SDK58 dependency tree and a working editor vertical slice. The handoff described SDK57; the app chat has since migrated. Verify actual installed versions, not the historical document.
2. Exercise canonical geometry, shared walls, independent wall faces, units, persistent locks, command-layer Walk guards, undo/redo and durable recovery. Meaningful tests must cover invalid and round-trip behavior.
3. Consume completed, validated furniture batches through the mobile adapter, with stable IDs/versions/hashes and actual bounds. Do not sync partially written batches or load the entire catalogue into memory.
4. Complete native UI, 2D and 3D placement/rotation and gesture arbitration; catalogue filters, favourites and recents; per-face/whole-room materials; true trim; quick doors and multi-room/floor behaviors. Follow every parity row and the latest phone corrections.
5. Run actual lint/typecheck, dependency diagnostics, iOS/web JS exports and supported browser/runtime smoke. Attach snapshot times/hashes and precise command results. Web/export success does not establish native renderer, phone gestures or physical performance.
6. Retest fixes, resource lifecycle and representative populated scenes, verify phone-sized layout and accessibility, and reconcile every parity row with evidence. Keep unavailable physical iPhone/Android/thermal testing explicitly pending.

## Starting evidence

- App and furniture chats were active when inspected. App has new domain, catalogue, state, scene and screen modules; its status report has not yet caught up with all changes.
- Initial furniture integration is **39 GLB records / 19 geometry families**. New production is underway. These are separate counts; recolours/size-only variants do not increase distinct designs.
- Initial SDK57 lint/typecheck passed in the app chat. Current SDK58 checks and exports require fresh results.
- Physical phone pairing was deferred by the user. It does not block independent work.
- All four worker chats received their role, file boundaries, six-hour gate and evidence requirements. QA activation is asynchronous; dispatch alone does not prove they have started.

## Current triage

First independent QA ledgers are available. Prioritize reproducible correctness failures, build/runtime blockers, integration defects and missing required behaviors, then visual/performance improvements. Do not close findings merely because a control exists.

At 01:00 UTC: design QA reproduced 9 domain defects/gaps, including invalid new floors, lost wall-face state after resize and orphaned doors after shared-wall splitting. The app wrote `docs/build/DOMAIN_HANDOFF.md` confirming no in-flight edits. The coordinator observed it and explicitly transferred **exactly `mobile/src/domain/geometry.ts`, `project.ts`, and `persistence.ts`** to the design QA chat for repair. UI/state/scene/types stay app-owned. Design QA will write `DOMAIN_RETURN.md` before ownership returns; runtime QA and the coordinator independently verify repairs. No other production ownership changed.

Current verification: TypeScript and SDK dependency checks pass; first lint run had 12 errors, and independent retest now exits0 with warnings remaining. Dependency-tree validation also exits0. First iOS JavaScript export and15 app-owned domain tests pass. Independent probes identify additional cases that those tests missed. Browser smoke renders real furniture but has phone-width camera and top-control layout findings. Physical/native behavior remains unverified.

Independent headless parsing with the actual installed Three180 GLTFLoader passed all **245 records** at 00:59:35 UTC, checking world bounds, triangle counts and named material-slot matching. See `model-loader.json`; this is interoperability evidence, not a GPU/device or visual-quality result.

Formal Khronos glTF-Validator2.0.0-dev.3.10 checked **409 published GLBs** at01:10 UTC:0 assets with errors,0 with warnings,0 truncated reports,0 execution failures;819 `UNUSED_OBJECT` informational notices. See `gltf-validation/summary.json` and content-hash reports. The validator is isolated in coordinator tools and has not changed app dependencies. Formal format validation does not establish visual uniqueness, native loading or phone performance.

The furniture reviewer reported72 internally accepted designs at an earlier checkpoint. Current0.2.1 regeneration has reset hash-bound acceptance to0 while revised content awaits review; the earlier72 is historical, not the current accepted count. The coordinator asked the asset owner to reconcile declining counts and ensure no stale publisher overwrites review decisions. Production row totals remain separate from acceptance. All four worker chats are still active; the persistent coordination goal remains active through the minimum window and required integration work.

At01:24 UTC, the delegated domain repair returned the exact three source files through `docs/qa/design/DOMAIN_RETURN.md`, confirming no edit in flight. At01:26:59 the coordinator independently reran the returned hashes: **22/22 focused probes,4,453/4,453 bounded assertions,15/15 app tests, full actual TypeScript and scoped domain ESLint pass**. The domain hashes stayed unchanged throughout. Evidence: `domain-acceptance/summary.json`. Ownership has now returned to the app chat; design QA resumes read-only production audit. This is a module integration milestone, not overall parity or native validation.

## Material improvement handoff

The coordinator independently reproduced identical normal maps for three wood species and a square-checker herringbone pattern. It authored corrected candidates only under `docs/coordination/material-candidates/`: ten original512px PBR triplets at2m repeat,1,937,167 bytes total, separate grain fields and true interlocking4:1 herringbone. Image-data checks and isolated Three180 PBR rendering pass.

An analytic displaced-geometry calibration also proved a normal-green orientation error for the app's default Three TextureLoader convention. Corrected positive image-dY gives mean channel error0.0615/255 versus4.8525/255 for negative image-dY. See the candidate README and render-review artifacts. The app owner integrated the30-map/generator handoff; the coordinator independently verified **30/30 production PNG hashes match**. Actual room-level QA remains pending. Wall maps need the same sign review. No production materials were edited by the coordinator, and no user visual approval or phone validation is inferred.

## Later checkpoint —01:53 UTC

The coordinator's full parity assessment is in `PARITY_REVIEW.md`. Current412 GLBs pass formal validation with0 errors/warnings. The revised catalogue remains at0 currently accepted designs;97 old decisions are invalidated by new hashes. A review-provenance gap was found before acceptance: sheets need member GLB/image hashes and the publisher must enforce the same bindings. The furniture owner is repairing that gate and preparing textured revisions separately in staging.

Independent frozen spot-checks of six0.2.1 models show improvements to curved cushions,canopy fabric,wine-divider clipping and headboard support, but obvious detached supports remain on the barrel chair and triangular coffee table. Exact images/hashes and findings are in `asset-spotcheck/`.

Browser workflow/save tests continue passing at their recorded snapshots. New repair work includes inward trim winding,casing overlap,empty-string View warnings,large-text home readability,meaningful whole-floor-plan creation and capability handling for wall-mounted models. Dynamic camera clipping and connected-Walk scene rendering have source changes awaiting fresh independent runtime verification. All chats continue the sustained window; no overall completion is claimed.

## Checkpoint —02:18 UTC

Independent retests now pass the trim/casing33-case geometry audit,12-case runtime/camera probe,fresh console-clean Create/Settings flows,responsive2×/320px entry layout and actual connected-room Walk/room tracking with unchanged project/lock bytes. Further UI findings concern stale wall paint after cross-tab selection,missing-model visibility/selection in2D,and stale door inspector text after Undo.

The frozen five-model textured0.3.2 fixture passes independent browser embedded-image decoding,precise bounds,base-colour factor/space checks,one visible per-instance tint override per model,all declared-slot binding checks and explicit renderer disposal. This is staged interoperability evidence,not promotion/native acceptance. See `textured-fixture-0.3.2/`. The broader stage has formal tangent errors on five files,which remain outside acceptance.

Independent current-catalogue review sheets freeze373 candidates and exact member image/model identities. All66 living-room candidates were visually screened; additional detached lamp shade,spindle-to-bow and curved-chair support defects were relayed with source diagnoses. No acceptance is assigned by omission. See `independent-review/c5577be6a8ab7aab/LIVING_REVIEW.md`.

A new P1 persistence compatibility finding is being addressed: monolithic50-snapshot histories exceed installed Android storage-entry limits at100 items,and default database capacity at300. This is a measured serialized-size/source finding,not a reproduced device failure. The app owner has the exact audit and has been asked to preserve legacy saves,backups,original bytes,future-schema protection and failed-read/write recovery while replacing the limiting strategy. The minimum-work gate remains06:53UTC/01:53Toronto.

At02:22 UTC the app owner is implementing verified native file-backed saves. Its floor-plan recovery test reports two adjoining rooms sharing one wall and an unfinished second-room draft surviving reopen; independent full-flow review is still needed. Runtime QA has verified room jumps,upper-floor creation,unit-converted alignment and all-floor overview in its frozen snapshot. Floor settings exhibit the same stale local inputs after Undo as the door inspector,so both are in the hydration repair scope. None of these milestones ends the six-hour work window.

At02:37 UTC, the coordinator independently closed the bounded INT-019 recovery reproduction: both missing/unreadable primary payloads recover explicitly to a verified backup while retaining original unreadable bytes. Runtime QA is extending archive/pin failure/reconstruction tests. File-based native sharing and browser Blob export have replaced large text-message sharing, with independent transport tests underway. Browser IndexedDB handles the real7.58MB populated history and cold startup; actual native OS durability remains unverified.

At02:42 UTC, all four workers remain active. Design QA found a real installed-source native texture adapter loss when cloning surface maps; app repair and web regression are prioritized. The coordinator reviewed60 staged bedroom/dining models and handed detached valet/mirror/screen and seat-construction defects to the furniture owner. A separate isolated synthetic review-guard test passes20/23 cases and identifies three fail-open byte/digest gaps; no actual asset was accepted by this test. Furniture work must repair models and pass hash-bound review, rather than treating catalogue row counts as300accepted distinct designs. Minimum gate remains06:53UTC.

At03:03 UTC, review guards pass25/25 negative/positive fixtures and the native texture callback passes24/24 source-contract cases. The new unequal-thickness trim finding was repaired and independently passes144/144 actual world-space endpoint cases across square/trapezoid/L,both windings,four profiles,three wall thicknesses and projection overrides. Original failures remain archived. Physical appearance/EXGL is still separate.

Furniture has76current internally accepted distinct rows at02:59; coordinator byte/image/member/archive checks pass for all76,with6additional reviewed variants excluded from that count. The0.5.x reviewed textured increment is handed to the app for integration,retaining existing314immutable app revisions. Latest independent formal snapshot is440published GLBs/0errors/0warnings at02:56. Producer counts grow during work; these are bounded snapshots,not300design completion.

Fresh QA verifies the blank-house/draft flow in15checks and real door dimension chains/pocket-thickness action/repeat/Undo/Redo. One obsolete pocket warning remains to clear. Large backup download is byte-exact; rejected imports preserve protected originals and explicit restore archives them. Remaining priorities are new chosen-file roundtrip,combined catalogue filters/scroll,reviewed textured40distinct-model resources and settled build/docs reconciliation. All four worker chats were confirmed active at03:00; the06:53UTC minimum gate remains in force.

At03:25 UTC, the first textured integration is confirmed: 444 app catalogue records and 719 retained revisions pass the coordinator's byte/metadata/static-require audit with zero errors. Runtime QA's actual 40-distinct-model baseline has 41 placements and 312 browser texture allocations. The app's smaller, separate fixture improves from 102 to 12 with pixel-identical output; independent comparison of the larger exact fixture is underway. The new bank uses manifest image identities and preserves platform texture objects; producer/browser results alone are not native proof.

The deeper furniture contact audit withdrew 34 prior passes. All 34 exact hashes are now rework, their original bytes remain, and contact reports match the withdrawal bindings in the independent `withdrawal-audit.json`. Current producer acceptance is 69 distinct designs. At this snapshot, 22 withdrawn hashes still carry older accepted labels in the app catalogue; the app owner has been asked to refresh metadata without deleting saved placements or substituting geometry. Repairs and fresh reviews continue. The 300-design target remains incomplete.

Current UI priorities: QA-CAT01 scroll restoration; QA-DOOR01 measured outer-chain clipping; QA-DOOR05 wrong per-room corner distances on partially shared walls. The short-screen doubled-text draft layout and obsolete pocket warning now pass fresh QA. The coordinator reopened visual door closure after inspecting a screenshot; fresh source-verified measurements confirm clipping rather than relying on DOM text presence. All work remains subject to the06:53UTC minimum gate.

At03:30 UTC, independent runtime comparison confirms the exact 40-model fixture drops from 312 to 12 browser textures with pixel-identical scene output. Resource acceptance remains open: RUNTIME-012 reproduces premature zero-ref eviction before React commit, leaving later active scenes without their texture-bank leases. The owner has the ordered clear/dispose/mount trace and is asked to prioritize lifecycle correctness. A proposed two-file repair handoff is conditional on the app confirming no edit in flight; no production ownership has changed yet.

The coordinator separately audited all 719 retained app GLB revisions and all 462 embedded image identities against the shared bank's generated index: nine unique image hashes, correct MIME/decodability and zero binding errors on stable inputs. Runtime independently has matching byte-contract evidence. This does not close native upload, renderer lifetime or physical performance gates. RUNTIME-011 web file-choice Blob URL revocation remains a separate small repair.

## Checkpoint — 04:30 UTC

The original numbered phase map is restored in PHASE_STATUS.md: Phase 2 implementation/validation with partial Phase 3; Phase 1 physical acceptance remains deferred. User explicitly authorized regular GitHub publication under their identity. Three checkpoints are now on origin/main, latest 5adfef4835eea6706bf6c2721f9e5d4a0430a0b0; GitHub confirms both author/committer associate with taliamekh. Runtime assets and the immutable furniture archive are included via LFS. Root remains the sole Git writer; all four workers remain active.

Producer final snapshot reports 346 internally accepted distinct constructions and 93 reviewed variants, with full room/theme coverage. Independent coordinator audit verified 345 then-current accepted provenance/contact bindings and 478 formal GLBs with zero errors/warnings. Final bed-family/size coverage audit is still open, so Phase 3 handoff is conditional. Six repaired current risk models were independently inspected; exact successor evidence is in asset-spotcheck/CURRENT_RISK_REVIEW.md. Runtime QA has reproduced camera refresh/mixed-ceiling framing defects; app is fixing them. No physical-native or overall completion claim.

At04:35 UTC, coordinator accepts the frozen library-r1 readiness milestone after independently verifying all3,175dependency hashes,439new rows,346accepted distinct/93reviewed non-counting variants and12adultbed groups×4declared mattress sizes. No issues. Producer browser439-model evidence is hash-verified, not independently reexecuted by this audit; native/phone acceptance remains0. OriginalPhase3 handoff is cleared to the same furniture chat under spatial/+docs/spatial, with exact mobile file handoff required. Final app integration remains with app owner. New design QA-GEO10 actual furniture/wall intersections and clear-interior measurement mismatch is a P1 repair; Phase2 is not complete.

## Checkpoint — 04:50 UTC

Final library transfer independently passes: 478 current app rows, 1,187 exact retained revisions and zero file/hash/static-binding errors. Actual production default search equals all 439 reviewed frozen-release identities; 346 distinct and 93 variants, with no experimental/rework/prototype leakage. Entry/utility aliases, favourites/recents and 60 missing-version/hash negatives pass. Of those records, 432 models/339 distinct support floor placement; seven wall-mounted records remain explicitly unavailable.

Independent runtime QA closes the original browser camera resize/history and mixed-height framing reproductions at the recorded 55-source snapshot. Coordinator inspected both corrected screenshots. New spatial policy passes eight independent groups, including 64 actual production-wall-builder side cases and ten independent Three-matrix bound comparisons; no mobile house-view integration is inferred from those tests. App retains production integration and P1 QA-GEO10; root requested explicit new-file reservations for the spatial lead.

GitHub source CI for published 5d1c9612 passes locked install, TypeScript, ESLint and domain/storage/scene tests. Later camera/curation edits await their own source checkpoint. All four chats remain active; minimum work gate remains 06:53 UTC.

## Checkpoint — 04:58 UTC

Published 43b53e6d to origin/main under verified GitHub author and committer taliamekh. The source-stable camera/curation/occlusion/scroll/annotation checkpoint has 45 app tests, TypeScript and full lint passing. Root independently matches the 72-input fingerprint, 52 compiled native sources, Hermes v99 headers and 1,187 exact exported GLBs/294,090,088 bytes on each platform. The first root fingerprint comparison used Windows case-folded Path ordering; correcting only the verifier ordering to match Node yields the exact recorded 074ef2fe... fingerprint. No production source changed for that harness correction.

Fixed a real publication omission: the old Unity Build ignore rule excluded docs/build. Targeted source-document exceptions now publish build/acceptance/ownership records while logs and PIDs remain ignored. The staged snapshot was checked file-by-file, 966 paths/zero mismatches, and production/docs whitespace check passes. Remote source CI run 42759090732 is in progress; it is not yet called passed.

Released the brief freeze and activated the two exact disjoint handoffs above. All four chats remain active. Domain repair must address both real wall intersections and newly verified moving-door-leaf intersections, with clear interior input/readout helpers and unchanged legacy coordinates. App continues Phase 3 integration while design QA owns that pair.

## Checkpoint — 05:10 UTC

Root found and repaired a published-byte provenance mismatch: 542 frozen current dependency files were normalized in the initial text snapshot even though local raw digests passed. The original publication used -text attributes but trusted unchanged stat entries; this did not force existing normalized index blobs to refresh. Restored original bytes for 5,753 content-equivalent text files in a separate commit, 70585c46, without touching working files or including active semantic edits. The new committed-tree audit verifies actual static revision bindings, all 3,175 release dependencies, seven frozen release proofs and 68 source checkpoint digests, plus all static asset references. 4,978 paths, zero issues; remote main matches. An initial verifier incorrectly treated producer-relative file metadata as mobile paths; corrected it to use revisionModels, without claiming missing app models.

The integrated app checkpoint 43b53e6d has actual GitHub CI success, 45 tests/45 pass/0 fail plus typecheck/lint/locked install. The large archive correction did not create a filtered run. GitHub documents a 300-path filter limit; removed path filters so every main push requests CI. That config correction is being published separately with the evidence. The release visual ledger is also preserved byte-exactly in the coordinator-owned archive, rather than relying only on a mutable convenience path.

Spatial production files are created and passed targeted lint/full TypeScript; app integration continues. Design QA first actual wall/door reproductions now reject intersections and accept safe controls, while aperture/inside-dimension/history matrices continue before handback. No full geometry or measured-room closure is claimed yet.
