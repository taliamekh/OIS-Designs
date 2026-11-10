# Setup and build sequence after design approval

This is the prepared next-step guide, not a request to start app implementation now.

1. Confirm the user approves round 3 and resolve any final design edits. Use `APP_DESIGN_SPEC.md` and `BUILD_PARITY_CHECKLIST.md` as the implementation contract; older screenshots are historical where they conflict.
2. Inspect existing tools and `mobile/AGENTS.md` again. The starter currently uses Expo ~57.0.32, RN 0.86.3 and React 19.2.3. Use the bundled absolute Node runtime and existing `Expo.cmd`; VS Code/dependencies already exist. Do not reset or recreate the app.
3. Recheck current SDK 57 versioned docs and installed iPhone Expo Go compatibility. Earlier official Expo pages conflicted about physical iPhone Go distribution. Verify the actual phone launch; bundling alone is insufficient. If a custom native module or incompatible Go route requires a development build, explain the concrete signed/cloud-build step then. No Mac ownership requirement.
4. Run local lint/typecheck/compatible dependency checks. Review existing dependency advisories rather than force-upgrading the SDK. Open `.\Expo.cmd` from the repository root and guide the user through the real QR/device connection using the installed setup. Confirm laptop/phone connectivity before changing unrelated network settings.
5. Agree/review the first foundation commit file list, exclusions and asset storage. Coordinate separate checkouts before multiple chats perform branch switches. Use the documented Git workflow; do not assume a remote default branch exists.
6. Validate one real furniture batch from the asset chat: licence, metre scale, pivot, material slots, GLB parsing and physical-device render. Develop the real parametric room in parallel. No SVG substitution for 3D furniture in the Expo editor.
7. Build all approved UI and interactions through demonstrable internal increments. Keep a live parity checklist, compare screenshot layouts against the approved design, and show actual phone demos. Keep real later features honestly labelled. The user-facing first design-parity review must disclose every incomplete requirement.

The initial app source has not been changed during this design round. Runtime/native model compatibility, device performance and complete catalogue maturity are still validation work, not established by mockups or a model export.
