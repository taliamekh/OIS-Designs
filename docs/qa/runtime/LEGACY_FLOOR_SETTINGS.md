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
