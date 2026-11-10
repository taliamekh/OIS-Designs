# OIS spatial review source package

This directory contains the original Phase 3 scene-policy handoff and separate geometry experiments. Only the room/floor/house policy and controlled Views panel have been handed into `mobile/`; app integration and all subsequent mobile changes belong to the app owner.

## Reproduce source checks

Use installed dependencies from the repository's matching `mobile/package-lock.json`. No new package installation is required in the current workspace. With Node available, run from this directory:

```powershell
node ../mobile/node_modules/typescript/bin/tsc -p tsconfig.json
node --test tests/*.test.mjs
```

The supplied harnesses use the verified Windows bundled Node/Playwright location. On a different machine, replace that local dependency path with its installed Playwright package and an available Chromium/Edge channel. This environment assumption is explicit; bundled dependencies are not copied into the source package.

## Review browser evidence

Start `scripts/review_server.py` using Python. It binds only `127.0.0.1:8772` and reads local `spatial/`, `furniture/` and installed `mobile/node_modules/three/`. It does not modify the app or the user's project library. The main reviewer is `http://127.0.0.1:8772`; browser harnesses write a new evidence directory and refuse to overwrite an earlier revision.

Committed evidence identifies exact model id/version/hash tuples from the immutable `furniture/releases/library-2026-11-10-r1/` release. Keep that release, its referenced model files, material maps and the matching installed Three runtime available. These are repository review sources, not a standalone bundled application.

## Scope and evidence

| Work | Current evidence | Production status |
| --- | --- | --- |
| Room/floor/house policy, canonical/separated transforms, wall/ceiling visibility | 19 regressions, 17 real-GLB browser view/layout/resource checks; adopted-source AST/regression proof | Policy and panel adopted; actual integrated acceptance belongs to app/QA |
| Authored 40-model, six-room, two-floor house | Four placement regressions; production topology/backup roundtrip | Disposable authored QA fixture, not an existing user save |
| Horizontal supported placement | 16 regressions, real desk/lamp contact | Geometry only; no production height/attachment schema |
| Attached-family transport | 12 regressions, actual desk/two-lamp group movement | Geometry proposal only; no production Undo/save |
| Stair/void markers and real slab/ceiling cuts | 13 regressions, ray/area/landing checks | Geometry only; no automatic Walk traversal |
| Flat, slope, vault and soffit profiles | 13 regressions, real meshes, 20 height rays and asymmetric L-notch rejection | Geometry only; double-height connectivity remains separate |
| Static batching | 143→75 browser draw calls, material/picking/resource evidence | Frozen experimental draft, withheld from app adoption |

The current full owned suite has 77 cases. Browser results are source-bound desktop evidence and do not establish Expo/native execution, physical-phone performance, user styling approval or completion of every original Phase 3 requirement. Read the corresponding documents under `docs/spatial/` for limitations and adoption contracts. `docs/spatial/PUBLISH_READY.json` lists the exact reviewed publication paths and hashes; the coordinator is the sole Git writer.
