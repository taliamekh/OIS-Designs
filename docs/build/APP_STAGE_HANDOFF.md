# Final app checkpoint — original Phases 2 and 3

Ready 06:58 UTC. **Production source/config is frozen** at milestone-neutral-corners-client.json: all72source/config/package hashes;76native inputs SHA `b9096fcac6fb3b2babbed8e3f26be15e31e90d9b4aaa846e5fa755c61505f962`. Coordinator is sole Git writer; app made no Git mutations. The earlier3152checkpoint remains independently preserved.

Production changes since3152: `mobile/app.json`; `src/domain/geometry.ts`, `project.ts`; `src/scene/Plan.tsx`; `src/screens/Build.tsx`, `Editor.tsx`, `RoomMove.tsx`. All are app-owned. No furniture assets or immutable identities changed.

Physical openings now reserve actual casing extent and full slider/pocket travel within both inside-face corner spans. Quick placement clamps to the same range and explains adjustment; numeric edits validate it. Old blocked openings stay readable, show a correction/range hint, and support exact no-op/correction/Undo. Structural decode remains unchanged. Actual boundary edits revalidate physical openings; metadata/world registration preserve local legacy placements. No-op commands return original history. Floor name/alignment/elevation changes do not introduce local collision validation; geometry/ceiling changes remain strict.

Room-move preview suppresses crowded ordinary captions while retaining geometry/locks and signed offsets. Short door chains place colliding numbers on separate rows, retaining room-face names and exact graphic endpoints. Signed imperial output has one sign, correct absolute magnitude, carry/ties and no negative zero. Parsing/canonical metres are unchanged.

The static-mode development server reproduced an actual cold HTTP500/unknown SSR module after refresh. `app.json` now uses documented SDK58 `web.output=single`; this local editor's browser preview loads on the client. Current development origin loads the editor and survives two cold reloads with errors[]. No source data migration. Runtime independently reports original6,149-byte QA library restored exactly and cold Undo/Redo/export accepted. [Serving details](PREVIEW_SERVING.md).

Verification at the frozen current config:

-56/56app tests, actual TypeScript, full ESLint zero errors/warnings.
-One current59-compiled-source-matched client export: all8UI scripts pass. This includes4neutral/opening/imperial cases,6house/move/reload cases,7inside-creation cases,5camera cases,128normal door assertions,4phone repairs,3occlusion cases and4real-GLB wall touch cases. Same-source near-corner matrix adds128/128. [Pinned checkpoint](milestone-neutral-corners-client.json).
-Both actual Hermes exports match56/56compiled source contents with the same76-input SHA above. Root independently audited Hermesv99 and all1,187exact GLBs per platform with zero issues. [Native audit](../coordination/native-checkpoint-audit.json).
-Actual corner-wall renderer probe8/8, new insertion/legacy25/25, immutable runtime fixture6/6; signed formatter owner/regression and root literal oracles pass. Original failed evidence remains intact.
-Live local/public SDK58iOS manifests, exact full advertised native bundles and403,304-byte final-library GLB allHTTP200 with exactSHA. [Route proof](preview-route-verified.json), [cold web proof](cold-preview-verified.json). Current owned Metro task80384/port8081; verify its PID before any later reuse. Live URL/QR remain only in ignored `mobile/.expo/ois-preview-connection.json` / `phone-qr.png`.

App-owned changed/new scripts include test-domain, run-boundary-audit, run-legacy-floor-retest, verify-neutral-opening-ui, verify-wall-pointer, verify-cold-preview, verify-preview, verify-spatial-measurements and adapted door/camera/phone/occlusion harnesses. They write only app evidence, preserving QA-owned reproductions. Root can stage the owned source/config/scripts plus curated docs/build evidence and updated parity/setup docs.

Library remains0.7.14:439reviewed current rows,346internally accepted distinct designs,311excluding appliance/bathroom fixtures and1,187retained exact revisions. Browser/JS export success is not a physical phone launch. Physical iPhone/Android touch/GL/files/OS interruption/performance, stair/void geometry, advanced ceilings, wall attachment and upload/scan provider phases remain explicitly separate gates. No additional prototype feature is pending in this owned checkpoint. The six-hour minimum has passed; publication/current remoteCI remains coordinator-owned before final handoff.
