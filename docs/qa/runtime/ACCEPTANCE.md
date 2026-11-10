# Runtime QA checkpoint

Updated November10 at03:59UTC. Overnight work continues through at least06:53UTC; this is not overall project signoff. This chat edits only `docs/qa/runtime/`.

Open: **RUNTIME-013**, structural dimension edits/Undo do not refit the camera; **RUNTIME-014**, whole-floor framing ignores a taller adjacent room unless that room is active. Actual saved room geometry is correct in both cases. See exact reproductions and screenshots in STATUS.md.

| Area | Evidence and result | Limit |
| --- | --- | --- |
| Forty distinct textured model revisions | Frozen browser source `ba7ea013...`,41placements,40active models,309bank leases;312→12renderer textures with pixel-identical scene crop. Four Walk/3D cycles retain every lease with no reload churn. | Chromium/WebGL counters, not measured GPU bytes or native performance. Five fixture reviews were later withdrawn;35/40 remain current exact passes. |
| Separate current40 pass set | Frozen browser `4d8d0e3d...` loads40exact internal passes audited03:51UTC /41placements,315bank leases,12total textures. Walk cycles,independent0.7.0sofa tints,Undo/Redo,exact canonical save/cold restore and eight-idle cleanup pass. | Approval applies only to pinned review/model bytes at that snapshot. No user approval,300-design or native completion claim. |
| Pending/abandoned model ownership |15/15 source-contract/cache/camera/touch tests. Actual30GLB requests complete after navigation away; resulting empty scene has0active/0wanted/0pending/eight idle models. | Fake scheduling in portable tests; browser network test uses a temporary tab-only latency override that was restored. |
| Tint/history/save | Independent mapped fabric/wood edits,Undo×2/Redo×2,exact canonical floor comparison,locked duplicate unchanged. Cold restoration loads all40 models and both intended tints. | No physical native GL validation. |
| Large saves/backups |7,575,865-byte300-placement/50-Undo library downloads and file imports byte-exactly. IndexedDB cold hydration passes. Future/corrupt imports preserve original protected bytes; explicit restore archives them. | OS chooser cancellation and receiving native share targets remain unverified. |
| Native payload storage |25/25 injected adapter tests using real desktop files: tiny pointers,readback verification,ambiguous index commits,pinned recovery archives and restart reconstruction. Native export6/6/import4/4 SDK-boundary checks. | Expo filesystem/OS calls are mocked; physical interruption,storage exhaustion and power-loss behavior remain unverified. |
| Web import cleanup |6/6 exact-adapter checks on repaired `cf282c24...`; unused Blob URLs released after success and failures. | No measured heap-byte claim. |
| Native bundle |Unmodified frozen source `354cc35e...` exports iOS and Android JavaScript successfully;54/54 compiled app modules source-map match on each platform. | `--no-bytecode`; no native linking,Hermes/device launch or cloud signing claim. |

The repaired runtime findings are RUNTIME-006 (large-room camera clipping),007 (cold Settings navigation),008 (open-form history/precision),009/010 (large native payload storage and ambiguous commits),011 (web Blob URL lifetime) and012 (pending model/cache ownership). Historical failures and exact source hashes remain in [STATUS.md](STATUS.md) and `runs/`.

Physical iOS/Android gestures,large system text,GL upload,frame rate,thermals,OS interruption and share-sheet behavior require later device evidence. The user’s phone is not needed for the continuing source,bundle and browser work.

Primary current artifacts: `artifacts/reviewed-40-repaired-lifecycle-results.json`, `reviewed-40-abandoned-network.json`, `reviewed-40-repaired-pixel-comparison.json`, `reviewed-40-shared-tint-results.json`, `reviewed-40-review-status-delta.json`, `backup-file-picker-roundtrip-results.json`.
