# Round 3 verification

November 8, 2026. Current design sources, preview and requirements are listed in README. Older VERIFICATION.md/screens refer to previous rounds.

## Evidence

- Actual Blender model sources/exports exist under `furniture/`. The user-requested **OIS furniture library — real 3D assets** chat delivered 39 GLBs: 19 distinct model families, comprising 5 detailed living-room review candidates, 14 cross-room geometry prototypes and 20 palette studies. Full distinct themed catalogue, licence finalisation, additional LODs/texturing and phone tests remain unfinished; consult `docs/furniture/QUALITY.md` and the manifest stages.
- The inline review embeds compressed/hash-verified geometry from the 19 base families plus 39 searchable catalogue records. It renders real GLB meshes with Three.js, rather than substituting SVG furniture. Thumbnail images are actual model renders. See `review-asset-proof.json` for exact source hashes and stage labels.
- Ten original procedural floor appearance studies are embedded. The browser renderer visibly changes grain/pattern/joints when changing floor, and exposes wall colour/texture/roughness controls and actual trim profile meshes. These are review studies, not a completed production PBR texture library or paint specification.
- The browser interaction checks use installed Edge and bundled Node without installing tools. They check creation/shape/dimensions flow, unit-preserving conversion, real-model rendering, direct 2D/3D drag, lock protection, icon Undo/Redo, unchanged furniture after Walk interaction, floor visual differences, wall HEX/textures/sheens, baseboard choices, visual door selection → plan/repeat/Undo, search/bed filters/no-results, and grid/free settings.
- Layout checks cover fourteen review screens at 320, 390 and 736 px, light/dark, including control clipping checks. Result is written to `round3-checks.json`; screenshots are in `screens-v3/`. Selected editor, material, door, catalogue and dimension screenshots were inspected visually. The floor navigation dropdown is also checked separately.
- No `mobile/` feature code was edited. No commit, push, deployment, account creation or paid subscription was performed. Native Expo behaviour, complete constraint/collision geometry, device performance/thermal behaviour, true provider imports and catalogue completeness are still future validation.

## Reproduction

Run bundled Python against `build-review-v3.py`, wrap `phone-mockups.html` with the visualization skill's `scripts/render.py`, then run bundled Node against `verify-review-v3.cjs`. The `phone-mockups-v3.html`/CSS/JS/3D files are the editable inputs; generated inline content remains below the 1 MB limit. Do not run old round-2 migration helpers over this source.
