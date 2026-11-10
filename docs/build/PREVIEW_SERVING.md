# Preview serving and cold reloads

The previous static-mode Expo development route initially opened, then returned HTTP500 on cold editor reload with unknown SSR module3962/842. The failed cold-preview-check.log and cold-preview-failure.png preserve the observed error; runtime kept its original library backup. This was a server-render path failure, not evidence of save corruption or a failed floor-settings repair.

The browser preview now uses `web.output=single`, a supported Expo SDK58 client-rendered single-page export. The project is a local editor with client-side persistence; no server/API routes are used. Expo Router still handles navigation. This configuration bypasses the failing SSR worker. [SDK58 configuration reference](https://docs.expo.dev/versions/v58.0.0/config/app/#output).

Current cold-preview-verified.json records a successful initial editor and two cold reloads, errors[], in isolated browser storage. It never touched the runtime QA's original library. Runtime independently completed cold export/Undo/Redo and verified restoration of its original 6,149-byte library. Native preview-route-verified.json separately checks both local/public manifests, exact advertised full iOS bundle and a real final-library GLB with exactSHA.

The running tunnel/PID must be checked when reused. Live connection links and QR images remain ignored local session data. Rebuilding with a new configuration requires fresh export/source fingerprints and route checks; older reports are not blanket approval of later source. No physical phone launch or native graphics/touch acceptance is implied.
