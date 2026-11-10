# OIS Designs mobile app

Expo58 / React Native0.88 / React19 / Expo Router. Native screens, a canonical metre-based editor, real Three/GLB rendering and durable local project data. The current visual contract is [APP_DESIGN_SPEC](../docs/planning/APP_DESIGN_SPEC.md); current evidence and limitations are in [build status](../docs/build/STATUS.md).

## Preview

The project commands can be run by the app chat. The user does not need to learn terminal folders to connect their phone. See [phone connection](../docs/planning/PHONE_CONNECTION.md). Existing Metro may already occupy8081; check before starting another server.

From the repository root, double-click Expo.cmd or run it in PowerShell. It starts this project's Expo workflow; have the app chat check whether a preview is already running first. From mobile with an installed Node/npm environment, npm start starts Expo; npm run web opens a web preview. npm run ios starts the Expo Go workflow on this Windows laptop, not an Apple simulator. Never run a starter-reset script against this implementation. Original starter sources/dependencies are preserved under ignored .tools/.

The phone and laptop need a reachable network path. Public Wi-Fi can isolate them; private Wi-Fi, a hotspot or a prepared Expo tunnel are alternatives. Expo Go version compatibility must match SDK58. Only the user enters credentials on Expo's own sign-in page. No paid account, cloud signing project or remote deployment has been configured.

## Fresh GitHub clones

The furniture GLBs are stored with Git LFS. Install Git LFS and run `git lfs pull` in a fresh clone so the actual model bytes are present before starting 3D. The existing laptop checkout already contains the models. Local dependencies and generated previews are not committed; use the lockfile for reproducible dependency installation.

## Development checks

- npm run typecheck — actual TypeScript.
- npm run lint — Expo's ESLint wrapper; npm/npx must be available. A wrapper error is not a lint pass.
- npm test — domain, geometry, draft/persistence and native-texture-contract regressions.
- node scripts/check-export.cjs ios (or android/web) — export plus before/after production-input fingerprints; outputs under ignored .tools/, report/log under docs/build/.
- node scripts/sync-furniture.cjs — verifies and copies the read-only furniture producer's ready manifest; preserves imported exact revisions. Coordinate before replacing a candidate batch.

Browser workflow scripts use the locally installed Edge/Playwright runtime and produce evidence under docs/build/. Set OIS_QA_BASE_URL to a completed isolated frozen server when Metro is changing. scripts/freeze-web.cjs copies production inputs, enables only three existing read-only probes in that copy, isolates caches, exports source maps and verifies compiled source contents; scripts/serve-frozen.cjs serves only an accepted completed export on loopback. They do not establish native touch or GPU performance. Physical iPhone13 and Android validation is still pending. Check STATUS before relying on historical reports.

## Source map

src/app contains Router routes. src/screens and src/ui contain native UI; src/state coordinates commands and saves; src/domain contains canonical geometry, project commands/history and validated envelopes. src/scene renders actual rooms, surfaces, openings, trim and GLBs; src/catalogue resolves exact saved models and search. src/storage selects native verified generation files or browser transactional IndexedDB, with preserved legacy data and explicit recovery. See [persistence design](../docs/build/PERSISTENCE.md).

Upload/scan, stair traversal and advanced ceiling geometry are honestly unavailable. Unsupported wall-mounted assets stay unavailable until attachment/elevation is implemented. Candidate counts are not visually accepted distinct-design counts. The development launcher uses plain ois text; it is a reviewable placeholder, not a newly approved company logo.
