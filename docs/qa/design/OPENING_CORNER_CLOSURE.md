# QA-GEO14 and QA-UNIT02 — bounded repair closure

Recorded 2026-11-10 06:45 UTC. App owns production; independent QA has made no mobile edits since the authorized two-file return at 05:11. Root is the sole Git publisher.

The original physical failure accepted a .90m opening at .10m offset beside a 30/60cm perpendicular wall, leaving .05/.20m of its configured clear aperture occupied by the actual rendered wall. Preserve `opening-corner-before-repair.json` and `OPENING_CORNER_HANDOFF.md` as the before case. The repair separates strict new/edited physical validation from structural legacy decoding. Old readable apertures remain inspectable and unchanged Apply is a no-op; an explicit changed offset must be safe. Neutral floor settings preserve old item placements while genuine geometry/ceiling changes remain strict.

| Independent check | Result | Bound source |
| --- | --- | --- |
| Paired insertion/edit versus actual perpendicular wall boxes: four sides, both ends/windings, shared/standalone faces, 12/30/60cm walls and meaningful door/window modes | 2,304 scenarios passed; 768 safe insertions + 768 safe edits accepted; 1,536 unsafe insertions and edits each refused; zero accepted obstructed apertures | geometry a25eee6d…, project 7a302663…, RoomScene 7b055eab…, meshes bd616ec1… |
| Legacy openings, neutral edits, explicit correction, history, wall thickening and lower-ceiling guards | 7 compound cases passed | Same geometry/project; persistence ac166d41… |
| Actual Open doorway/Window legacy workflow: load, warning, no-op, units, unsafe edit, correction, one Undo/Redo and exact cold reload | 26 UI checks passed | Final 06:39 snapshot; geometry b163f0fe…, project 12211660…, Build 6839d507… |
| Actual near-corner quick stamp, clamp feedback, repeat without picker, one Undo per stamp and exact reload | 9 UI checks passed | Same final snapshot; Editor 7a742a0b… |
| Signed imperial display: hand-calculated negative/positive examples, half-inch ties, foot carry, zero, metres and numeric conversion | 36 CPU checks passed | geometry b163f0fe… |

The final browser export is `qa-web-2026-11-10T06-39-35-555Z`, with **59/59 compiled modules matching** and provenance SHA256 `821dc99e584fc9b4a1e31bd2864ce765e7fec135b4fd0ddd8e09c1f1fad69b0d`. Its complete provenance is pinned at `frozen-evidence/app-821dc99e584fc9b4/provenance.json`; result JSON includes exact complete critical hashes. All final UI runs completed without captured page/console errors. QA inspected `legacy-opening-open-feet.png` and `quick-corner-first-stamp.png`.

QA-UNIT02 originally displayed -.05m as -1′ -2″. The corrected inspector shows -0′ 2″ on both old opening types. Original 24-pass/2-failure JSON and screenshots remain under `frozen-evidence/signed-ft-0633`; the successful run does not overwrite that history. The initial quick-corner attempt ran no feature assertions because the then-current 06:33 export was unstable/unaccepted. A pinned accepted 06:22 snapshot subsequently passed 9/9, followed by the final export's independent 9/9 run. An export precondition failure is not an app regression.

These are CPU geometry and real isolated browser interactions, not physical native GL/touch evidence, a building-code claim, human usability acceptance or completion of every original plan phase. No shared Expo server was changed. Every temporary QA loopback server and browser was closed by its harness.
