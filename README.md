# OIS Designs

Mobile room planning for OIS designers: capture a client's room, review its dimensions, arrange furniture, change finishes, and save a design for discussion with the client.

**Start here:** [current numbered phase status](docs/planning/PHASE_STATUS.md), based on the original [phone app plan](docs/planning/PHONE_APP_PLAN.md). Current work is Phase 2 implementation/validation with parts of Phase 3 underway; Phase 1 physical-device acceptance is still pending. See [live build status](docs/build/STATUS.md) and [Git publication workflow](docs/planning/GIT_WORKFLOW.md).

## Expo app

The active application is in [`mobile/`](mobile/README.md), using **Expo SDK58**, React Native0.88, React19.3, TypeScript and Expo Router. Native UI, the metre-based editor, GLB rendering and local saves are under implementation and verification. See [live build status](docs/build/STATUS.md).

On this Windows laptop, run `Expo.cmd login` from the repository root to sign in, then run `Expo.cmd` to start the app. Open the terminal QR code with Expo Go on your iPhone, using the same Expo account and Wi-Fi. The launcher reuses the available Node runtime. See the [mobile setup guide](mobile/README.md) for other machines and troubleshooting.

VS Code and a Node runtime are already available on the current laptop. Dependencies are installed in `mobile/node_modules`; generated files and dependencies are excluded from Git. Cloud builds and paid accounts are not needed for this initial Expo Go setup.

## Phone app design review

The [November 8 phone app proposal](docs/planning/README.md) contains the phone mockups, phased implementation plan, shared-data architecture, team responsibilities and sourced research. It covers manual house layouts, five coordinated furniture sets, individual finishes, grid/free placement, later multi-floor refinement, uploaded house-plan recognition, scanning and a web companion. Its earlier starter hold was superseded by the November 9 implementation authorization. Current work and open device gates are tracked in the numbered phase status.

The user authorized the real build November9. Round3 and the latest phone-usability corrections guide implementation; design mockups alone do not establish native capability. The newer proposal supersedes the engine/device assumptions in the historical research below. Phone pairing is deferred and does not block local implementation or automated checks.

## Spatial review sources

The [spatial source package](spatial/README.md) preserves the house-view policy and separate Phase 3 geometry experiments with their tests and adoption contracts. The app has adopted the Views panel and room/floor/house policy. Supported placement, attached families, stairs/voids, advanced ceilings and batching remain experiments; their review evidence does not establish production or physical-phone capability.

## Initial architecture research

The guides below predate the Expo scaffold and describe the original Unity proposal. Their Unity-specific stack and build recommendations are historical research. The room-data handoff and synthetic fixture remain useful starting points for the Expo editor.

Recommended direction: a Unity mobile room editor, with a separate scanning team delivering a shared, editable room format. Validate the iOS build path and one real scan import before committing to the full stack.

The app team has three people. The scanning team is separate. The intended devices are iPhone Pro and Pro Max; exact models and the minimum iOS version still need to be agreed. The current developer setup is a Lenovo Legion 5i running Windows and a standard iPhone 13. The developer has used Unity and is familiar with C#.

The standard iPhone 13 can test an installed editor build and a compatible camera capture implementation. It cannot run LiDAR-dependent RoomPlan capture. Local iOS compilation requires macOS and Xcode; use a shared/remote Mac or a configured cloud build service. See the [phone testing guide](docs/PHONE_TESTING.md) for sources and setup.

## Project guides

- [Project plan](docs/PROJECT_PLAN.md): engine choice, MVP, ownership, build order, UX, learning, and whole-house expansion.
- [Scan handoff contract](docs/SCAN_CONTRACT.md): proposed room format, coordinates, responsibilities, and integration checks.
- [Phone testing](docs/PHONE_TESTING.md): Windows development, iOS builds, device coverage, and acceptance checks.
- [Synthetic room fixture](samples/rooms/rectangular-room.json): a 4 m by 3 m room with 2.6 m walls and one doorway, for developing the importer independently of scanning.

These historical guides establish the initial research and sample data handoff. The current Expo editor is implemented in progress; capture and the scan contract remain separate provider work. Use the numbered phase status for current evidence.

## Next acceptance

The editor now has source/browser evidence for inside measurements, real furniture placement, finishes, save/recovery, connected room movement and multi-floor house views. The [overnight review](docs/coordination/OVERNIGHT_REVIEW.md) records the published checkpoint, checks and limits. Next acceptance includes physical iPhone/Android graphics/touch/storage testing and three fresh usability sessions. Supported attachments, stairs and advanced ceilings remain separate Phase 3 work; scanning keeps its real provider/device gate.

The source repository is [taliamekh/OIS-Designs](https://github.com/taliamekh/OIS-Designs). Keep client scans, credentials, and signing keys out of this public repository.
