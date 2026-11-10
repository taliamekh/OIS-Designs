# Runtime QA checkpoint

Updated November10 at04:41UTC. Overnight work continues through at least06:53UTC; this is not overall project signoff. This chat edits only `docs/qa/runtime/`.

Using the original `PHONE_APP_PLAN.md` IDs, this evidence supports **Phase2** implementation/validation and bounded parts of **Phase3**. **Phase1** physical iPhone/Android acceptance remains open. `docs/planning/PHASE_STATUS.md` is the coordinator's phase reconciliation.

**RUNTIME-013/014 are repaired** at frozen browser source `e384e657...`: the original resize/history and mixed-ceiling fixtures now frame correctly and preserve exact saved geometry. The4/4 source bridge checks also cover alignment updates and preserving a manual orbit across ordinary finish/selection edits. Overall Phase2 acceptance still includes the coordinator/design QA's other open findings and physical-device gates.

| Area | Evidence and result | Limit |
| --- | --- | --- |
| Forty distinct textured model revisions | Frozen browser source `ba7ea013...`,41placements,40active models,309bank leases;312→12renderer textures with pixel-identical scene crop. Four Walk/3D cycles retain every lease with no reload churn. | Chromium/WebGL counters, not measured GPU bytes or native performance. Five fixture reviews were later withdrawn;35/40 remain current exact passes. |
| Separate current40 pass set | Frozen browser `4d8d0e3d...` loads40exact internal passes audited03:51UTC /41placements,315bank leases,12total textures. Walk cycles,independent0.7.0sofa tints,Undo/Redo,exact canonical save/cold restore and eight-idle cleanup pass. | Approval applies only to pinned review/model bytes at that snapshot. No user approval,300-design or native completion claim. |
| Pending/abandoned model ownership |15/15 source-contract/cache/camera/touch tests. Actual30GLB requests complete after navigation away; resulting empty scene has0active/0wanted/0pending/eight idle models. | Fake scheduling in portable tests; browser network test uses a temporary tab-only latency override that was restored. |
| Tint/history/save | Independent mapped fabric/wood edits,Undo×2/Redo×2,exact canonical floor comparison,locked duplicate unchanged. Cold restoration loads all40 models and both intended tints. | No physical native GL validation. |
| Large saves/backups |7,575,865-byte300-placement/50-Undo library downloads and file imports byte-exactly. IndexedDB cold hydration passes. Future/corrupt imports preserve original protected bytes; explicit restore archives them. | OS chooser cancellation and receiving native share targets remain unverified. |
| Browser transaction interruption |6/6 actual IndexedDB/domain checks cover atomic markers,failed writes/read protection,cold reconstruction and original recovery archives. | Deliberate transaction aborts; quota emulation was unavailable. No disk-full,app import UI or native interruption claim. |
| Native payload storage |25/25 injected adapter tests using real desktop files: tiny pointers,readback verification,ambiguous index commits,pinned recovery archives and restart reconstruction. Native export6/6/import4/4 SDK-boundary checks. | Expo filesystem/OS calls are mocked; physical interruption,storage exhaustion and power-loss behavior remain unverified. |
| Web import cleanup |6/6 exact-adapter checks on repaired `cf282c24...`; unused Blob URLs released after success and failures. | No measured heap-byte claim. |
| Native bundle |Unmodified frozen source `742a6c94...` compiles actual iOS/Android Hermes bytecode,v99,6,707,504/6,920,620bytes.51/51 JS/TS modules map exactly;three JSON input hashes separately bound.825/825 GLB revisions export byte-exactly on both platforms. | Actual compiler/export pass; native linking,VM/device launch,EXGL and cloud signing remain unverified. |
| Native trim photo reference |12/12 SDK-boundary tests cover bounded resize,context/image release on failures,and safe reference lookup. | SDK objects are mocks;actual picker,EXIF/decode,JPEG bytes and native display remain unverified. |

The repaired runtime findings are RUNTIME-006 (large-room camera clipping),007 (cold Settings navigation),008 (open-form history/precision),009/010 (large native payload storage and ambiguous commits),011 (web Blob URL lifetime),012 (pending model/cache ownership),and013/014 (structural/mixed-ceiling camera framing). Historical failures and exact source hashes remain in [STATUS.md](STATUS.md) and `runs/`.

Physical iOS/Android gestures,large system text,GL upload,frame rate,thermals,OS interruption and share-sheet behavior require later device evidence. The user’s phone is not needed for the continuing source,bundle and browser work.

Primary current artifacts: `artifacts/reviewed-40-repaired-lifecycle-results.json`, `reviewed-40-abandoned-network.json`, `reviewed-40-repaired-pixel-comparison.json`, `reviewed-40-shared-tint-results.json`, `reviewed-40-review-status-delta.json`, `backup-file-picker-roundtrip-results.json`.
