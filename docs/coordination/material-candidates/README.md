# Corrected floor maps — app integration handoff

These are original procedural candidates prepared by the coordinator to address INT-006. They preserve the existing ten floor IDs and filenames. No production file has been edited by the coordinator.

## Ready artifacts and checks

- `maps/`:30 PNG maps, ten colour/normal/roughness triplets, each512×512; **1,937,167 compressed bytes** total.
- Every material uses a **2m physical repeat**; the3m review planes tile each map1.5 times.
- `maps/manifest.json`: exact SHA-256, byte counts and provenance.
- `verification/results.json`: no invalid normal-length/image-size findings, no byte-identical normal-map groups, and no brightness-correlation pairs above0.995.
- `render-review.png` / `.json`: all ten materials rendered with the app's installed Three180 MeshStandardMaterial in an isolated desktop software-WebGL context, without page/console errors.
- True4:1 rectangular herringbone construction replaces the diagonal square checker. White oak, walnut, maple and bamboo use different grain fields, board widths and joint arrangements. Mineral maps use periodic multi-scale fields; terrazzo has angular chips; carpet uses tuft/fibre relief.
- Visual iteration reduced exaggerated oak ray flecks before this handoff.

## Normal orientation calibration

`calibrate_normals.py` creates two explicitly signed normal maps from an analytic metre-height surface. `render-review.cjs` compares them against an actual displaced, densely tessellated plane under the same lighting and camera. With Three TextureLoader's default `flipY=true`, positive image-dY in the green channel matches the displaced reference: mean absolute channel error **0.0615/255**, versus **4.8525/255** for negative image-dY. The corrected generator uses `(-dx,+dy,1)` for its PNG row convention. Existing app-generator `(-dx,-dy,1)` should not be assumed correct merely because vectors have unit length.

This is a measured desktop orientation test, not physical material matching or native-device validation. Primary APIs: [Texture flipY](https://threejs.org/docs/pages/Texture.html), [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html).

## Integration by the app owner

1. Copy only the30 `*-colour.png`, `*-normal.png`, `*-rough.png` maps into `mobile/assets/materials/`, preserving the names and floor IDs. Do not copy the review sheet, manifest or calibration images into the phone bundle.
2. Preserve the original generator in reproducible app source, adapted to the app's output path. Ensure the older `generate-materials.py` cannot later overwrite floors with the superseded algorithm; delegate floor generation to the revised generator or run the revised floor step explicitly after wall generation.
3. Preserve2m UV repeat semantics and sRGB colour / non-colour normal+roughness handling. Do not globally invert normalScale.y for these corrected maps. Wall maps generated with the older sign need their own correction/retest.
4. Refresh only the app-owned Metro if its file-map cache fails to observe replaced assets. Verify actual room material changes, neighboring-room isolation, orientation/repeat edits and resource disposal. Independent runtime QA should rerun settled-source checks and the material review.

## Reproduce in this review folder

Use the existing bundled Python with `generate_floors.py`, then `audit-materials.py --source <maps> --output <verification>`, and `calibrate_normals.py`. Use bundled Node with `render-review.cjs`. The renderer creates an ephemeral localhost-only QA server and closes it and its isolated browser at completion; it does not use port8081 or user projects.

The user has authorized routine overnight implementation. This handoff is a source-ownership/integration checkpoint, not a request for new visual approval or a release-quality claim.
