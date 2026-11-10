# Perspective wall-drag geometry bridge

This is a separate, unadopted gesture-math helper for `next-wall/`. It does not add app pointer listeners, modify the frozen earlier publication lists or enable native wall placement.

The direct drag plane must be parallel to the wall **through the actual picked point**. A fixed along/height offset on the rear wall plane preserves the initial pose but introduces perspective parallax as the pointer moves. `captureWallDrag` records the actual hit's depth/offset and binds the exact item/wall/floor context. `proposeWallDrag` intersects the current camera ray with that parallel plane and passes the resulting along/height coordinates to the existing wall constraint. The model's rear stays flush; existing collision, opening motion, ceiling, grid, lock and read-only checks still apply.

From the repository root:

```powershell
node mobile/node_modules/typescript/bin/tsc -p spatial/interaction-audit/tsconfig.json
node --test spatial/interaction-audit/tests/*.test.mjs
```

Seven regressions pass. The perspective controls use real installed Three cameras and independently known translations. Changed item/asset/wall/floor context, wrong active room/floor, invalid hits, locks and Walk reject. Grid remains explicit quantization; free movement preserves the grabbed point.

`evidence/browser-r3/result.json` binds an actual glass-wall-cupboard GLB and source hashes. Actual mesh ray hits are captured from three camera directions, then the selected surface point is translated with the cupboard. A wrong-plane control drifts 21–31mm (1.97–4.74 pixels). The corrected script keeps the actual picked point at the target projection within floating-point tolerance while all real rear vertices remain outside the wall. Complete disposal returns zero geometries, textures and leases; no browser errors.

These are scripted ray/projection and mesh checks, not actual pointer-event/touch arbitration, save/Undo, physical device or production adoption proof. The future app controller must obtain the hit from the real occlusion-aware picker, keep one owner for drag versus orbit, preview locally, revalidate the current project before one guarded command, cancel on context changes and preserve existing locks/Walk. It must never use separated-floor display coordinates as canonical mounting data.

The existing review server serves `/interaction-audit/review/index.html`; the browser harness uses the same local Playwright/Edge setup as the parent package and writes new evidence revisions only. Compiled pure dependencies are included for reproducibility, with the wall draft's source identity retained in the publication dependency list.
