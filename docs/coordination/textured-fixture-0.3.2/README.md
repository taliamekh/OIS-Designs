# Independent textured-fixture verification

Exact producer fixture: `furniture/catalogue-v2/fixtures/textured-v0.3.2.json`. `fixture-snapshot.json` freezes its bytes and `result.json` records its SHA-256 and each tested model hash.

Five staged GLBs loaded through the app-installed Three180 GLTFLoader in an isolated Edge software-WebGL context. Embedded images decoded; precise world bounds matched within1mm; exported base-colour factors and colour/data spaces matched; changing one named slot per model visibly changed that instance while original material objects stayed unchanged. After explicit geometry/material/texture disposal, renderer memory returned to0 geometries and0 textures after every model. No page/console errors occurred. A ReadPixels GPU-stall warning came from the diagnostic capture path and is not a phone timing result.

`review.png` shows original and tint-override views. The staged barrel chair's supports now visibly join its seat assembly; canopy fabric,glazed cabinet shelves and trestle geometry are present. Those observations are limited to the displayed views. They do not accept all five designs, promote them to the catalogue, prove every appearance variant or establish Expo/native image upload,phone gestures,GPU memory or thermal performance.

Reproduce with bundled Node and `docs/coordination/verify-textured-fixture.cjs`. It opens an ephemeral localhost-only QA server and isolated browser, closes both at completion, and does not touch user projects or production files.
