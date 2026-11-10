# Physical device acceptance — current Expo app

Prepared November10,2026. **No physical device result is recorded yet.** Browser screenshots, Three CPU geometry, simulated storage and Hermes exports are supporting evidence, not device acceptance. The current implementation is Expo58/React Native, with real GLB rendering through native R3F/Expo GL.

## Start with the user's iPhone13

The app chat checks the existing preview and supplies a current QR; the user need not run commands. Follow [phone connection](../planning/PHONE_CONNECTION.md). Public Wi-Fi may isolate LAN clients; use a reachable private network/hotspot or an app-chat-prepared Expo tunnel. Keep credentials on Expo's own screen. A failed QR connection is a delivery issue until the app actually launches.

Record device model, OS, Expo Go/build version, app source fingerprint and furniture manifest/revision set. Use a disposable project and export its backup before interruption tests. Repeat on an Android device before claiming cross-platform acceptance.

## Required checks

| Area | Actual device flow and acceptance | Current state |
| --- | --- | --- |
| Launch and native graphics | Open Projects→Maple House. Confirm floors/walls/trim and actual furniture render without an error boundary or blank texture. Check two identical mapped models with one independently tinted; verify physical map repeat and distinct floor materials. | Pending |
| Phone layout and controls | Portrait, keyboard open, largest supported text, light/dark and safe areas. Reach Create/Back/Done, choose a room, expand/close the compact catalogue; renderer remains usable above the sheet. Close/reopen after scrolling/placing and retain context. | Pending |
| Gesture ownership | Drag/rotate a model in2D/3D, lock it, try moving it, pan empty space and pinch starting on furniture. Add a second finger during a drag; cancel/interruption must not commit it. Pinch/two-finger tap in door placement must create no opening. One deliberate placement makes oneUndo step. | Pending |
| Read-only Walk | Cross a valid doorway into a second room, observe its floor/heading; walls/windows/furniture block travel. Attempt edit/lock/history gestures. Return to3D and verify project poses/locks/finishes are unchanged. | Pending |
| Materials and construction | Paint a shared wall face, confirm opposite room unchanged; explicit whole-room paint affects only that room. Edit inherited ceiling by typing, Undo/Redo with the form open. Place single/double/sliding/pocket doors and inspect both room-corner chains, including a partially shared boundary. | Pending |
| Files, photos and recovery | Pick a close-up trim reference, set measured scale/profile, save/reload. Export a populated JSON backup through the OS share sheet and read it back. Inspect/cancel/import a backup, reject invalid/future data without losing the open project. Permission cancellation remains usable. | Pending |
| Lifecycle and populated scenes | Save an edited room, background/foreground, force-close/reopen, verify exact geometry/revisions/history. Repeat with a populated multi-room project, an unfinished floor draft and a pending save. Cycle2D/3D/Walk and projects, including leaving while models load; inspect missing textures/crashes and sustained-session responsiveness/heat. | Pending |

Record observations and logs, including failures and recovered states. Measure frame time/memory/loading on the actual advertised devices before setting a supported scene budget; browser texture counts do not establish native GPU bytes or thermal behavior. Test a release-like signed build before release acceptance because development instrumentation changes performance.

Scanning, stair traversal, advanced ceiling geometry and wall attachment are explicitly unavailable. Their controls should communicate that state; these flows cannot be marked tested as implemented features.
