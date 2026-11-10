# RUNTIME-015 — neutral floor settings on old placements

Recorded November10 at05:57UTC; actual UI confirmed at06:05UTC. Production remains app-owned and runtime QA made no production changes.

The exact2,100-byte synthetic backup `artifacts/legacy-floor-settings-fixture.json` (SHA256a0ac83ea6c8464488af0fd18628b5139ad80c3a1e194ca1a3c2560b19af0697e) contains a5×4m legacy reference-line kitchen and one real integrated kitchen-base0.1.0, hash50feb5b77773185282de5a3694f6e764d5f2e87b323f906aa394c6187669928a. Its x0.3300000023841858,z2,yaw0 placement was accepted by oldgeometryd39a47ba… . Current physical geometry0c3a9928… correctly rejects a new placement there because its footprint enters the wall.

On currentproject9bcc998a… , all four floor-settings commands reject with `Kitchen base cabinet: Keep the furniture clear of the physical wall.`:

- Apply exactly the existing name/elevation/ceiling/alignment.
- Change only the name.
- Change only alignment to(+1,−2)m.
- Change only elevation to3.2m.

None changes local room/wall/furniture relationships. The whole-floor post-command `canPlace` loop detects the existing overlap. Rejection preserves the original history object exactly. Moving the cabinet clear tox1 before the alignment command succeeds. Current persistence also decodes the old fixture unchanged. This is a recoverable editing limitation, with no observed corruption or native failure.

The owner should evaluate a no-op path and validation scoped to changes that can introduce a new local collision. Preserve stricter acceptance of new placements, ceiling reductions and actual physical geometry edits. Do not resolve it by moving old furniture, resizing saved rooms, disabling physical validation globally or discarding model identities/history.

Evidence: `legacy-floor-settings-observation.json` pins all old/new source hashes, four paired commands and the safe-position control. `legacy-floor-settings-first-observation.json` preserves the exploratory run; the supplied fixture was then generated and verified on a second stable run. `probe-legacy-floor-settings.cjs` refuses to overwrite the immutable repro fixture.

Actual UI on immutable97ff607c… matches all59compiled app sources. The imported backup opens and renders the cabinet; unchanged Apply and separate alignment(+1,−2)m/elevation3.2m attempts all show the collision error. The complete2,100-byte public export remains byte-identical to the fixture after all three rejections. No console warnings/errors. `legacy-floor-settings-runtime-results.json`, `legacy-floor-unchanged-rejected390.png` and `legacy-floor-settings-after-failures-backup.json` preserve the evidence. Name-only is a command-layer case; the current panel does not expose a floor rename field.

After the owner repair, run `retest-legacy-floor-settings.cjs` against the same immutable fixture. It checks exact no-op history, neutral name/alignment/elevation history and unchanged local geometry, plus negative controls for new physical overlap and a new ceiling conflict. Repeat the actual UI steps and export comparison on a source-matched successor. Do not overwrite the failed evidence.

At06:14UTC the ownerproject7a302663… passes all six prepared source groups on stablegeometry40924a03… . At06:17UTC the sameproject withlatergeometrya25eee6d… passes five additional save/recovery/ordinary-path groups, including original raw bytes, backup/cold history, exact corrupt-primary recovery archives, numeric guards and unavailable saved tuples. Actual persistence functions run with a controlled in-memory adapter; native/IndexedDB fault claims are unchanged. Actual successor UI retest remains pending, so this is source-repaired rather than fully closed. Runtime QA is using the existing QA origin and will not start/restart servers; a current owner-provided immutable UI route is needed for closure.

Final closure at06:52UTC supersedes that pending state. Six latest source groups pass on project12211660…/geometryb163f0fe… . Actual existing-preview UI passes exact no-op, separate alignment/elevation, local-data preservation and Undo/Redo. An initial SSR unknown-module3962 failure required an owner preview refresh; after refresh,cold Editor fields and open-panel Undo×2/Redo×2 pass and the complete5,521-byte export is byte-identical before/after reload. The original6,149-byte preview library was restored through Settings and verified byte-exact immediately and after another hard Settings reload. The live tab is closed and viewport reset. One Metro development-socket disconnect warning is preserved; no blanket clean-console or physical-device claim is made. See checkpoints/2026-11-10T06-52-16-760Z-floor-repair-complete for the final synthetic-only evidence and verifier. Per-test source scopes remain explicit; no server or Git mutation by runtime QA.
