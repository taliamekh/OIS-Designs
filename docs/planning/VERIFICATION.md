# Review verification

November 8, 2026.

- Opened the actual Expo package/configuration, starter screens, theme, mobile AGENTS instructions, root/mobile READMEs, original scan contract and synthetic room JSON. Existing work is uncommitted on `codex/project-foundation`; no commits or push were made.
- Confirmed the official OIS website with the user; inspected its current screenshot, computed typography, logo and office reference image. Matched the user-clarified Home Planner AI reference to Room Planner Ltd's app ID 1076159017.
- Mockup source is under 1 MB, uses embedded local reference images, and requests no real uploads/scans/network operations from the preview. JavaScript interactions are local.
- Headless installed Edge checks cover all eight primary screens at 320, 390 and 736 px in light/dark mode, no horizontal overflow, all five sets/five pieces, movement preference propagation, nudge/rotation/drag and retained individual wall/floor selections. See `mockup-checks.json`. Selected screenshots were visually inspected, including light editor/catalogue/house views and a narrow dark upload screen.
- Existing starter TypeScript check passed using the bundled Node executable and local `tsc`.
- `expo lint` emitted a missing `npx` launcher message despite exit code 0. It was **not counted as a successful lint run**. Running the already installed ESLint directly with bundled Node passed. No tools/dependencies were installed to work around the launcher.
- No `mobile/` application source, source fixture or historical project document was edited. Checks may regenerate ignored tooling caches.

Limits: these checks validate the review prototype in a browser, not a built React Native editor, native performance, recognition accuracy, scan capability, screen-reader support or usability with real participants. Screens can grow vertically in the conversation; production phones need bounded canvases and scrollable inspectors with fixed reachable primary actions. Those are implementation acceptance work, not established by screenshots.

## Revision after user feedback

The revised mockup uses a shared entry/badge helper, removes promotional copy and the four-tab app bar, adds contextual editor access, five door types with live dimensions from both room faces, independent flat ceiling-height controls, and three logo studies. The door diagram uses the same 3.00 m living-room / 2.40 m kitchen shared-wall face lengths as the sample planning context. The different face endpoints are deliberate and the chains are calculated independently.

Extended checks cover these behaviours plus all earlier finish/placement tasks, in 320/390/736 px light/dark layouts. Logo navigation is tested through the runtime's own carousel picker. The preference record and root AGENTS pointer were added for future UI work. These remain review-only changes; no production editor, Blender asset, scan provider or native rendering feature was implemented.
