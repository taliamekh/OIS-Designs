# Development and phone testing

> Historical Unity investigation. The current manual editor is the Expo58/React Native app in mobile/. Use [current phone connection](planning/PHONE_CONNECTION.md) and [native acceptance](build/NATIVE_ACCEPTANCE.md) for this implementation. The Unity build instructions below are retained as earlier research, not the current launch procedure.

## Available setup

Development machine: Lenovo Legion 5i on Windows. Personal test device: standard iPhone 13. Target devices: iPhone Pro and Pro Max, exact models to be agreed. The scanning team is separate from the three-person app team.

[Apple's iPhone 13 specifications](https://support.apple.com/en-us/111872) list its sensors without LiDAR; [iPhone 13 Pro specifications](https://support.apple.com/en-us/111871) include LiDAR. The standard iPhone 13 is useful for editor and camera-route tests, but cannot validate RoomPlan capture. Use [RoomCaptureSession.isSupported](https://developer.apple.com/documentation/roomplan/roomcapturesession/issupported) at runtime rather than assuming support from a phone name.

The current Unity installation is 6000.6.5f1. Inspection found Windows and WebGL playback engines, with neither Android nor iOS build support installed. No project or device build currently exists.

## What Windows can do

Develop Unity scenes, UI, generated room geometry, touch-input logic, save/load, materials, and catalog placement on the Lenovo. Feed the importer the synthetic room and real scan files supplied by the scanning team. A desktop run is useful for rapid iteration but does not validate touch behavior, iOS native plugins, Metal rendering, LiDAR, memory pressure, or phone heat.

Unity generates an Xcode project and Xcode compiles the iOS app. Xcode runs on macOS; plugging the iPhone into Windows does not provide the missing toolchain. Unity documents a cloud alternative in its [iOS build guide](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/iphone/ios-building-and-delivering/build-process).

## Choose an iOS build route

| Route | Workflow | Tradeoff |
| --- | --- | --- |
| Shared or borrowed Mac | Pull the repository, open the exact Unity version with iOS support, export to Xcode, sign, and run on a connected phone | Best starting point for native bridge debugging; needs shared access |
| Remote Mac | Sync code to the Mac, build/sign with Xcode, distribute using an appropriate signed installation route | Native debugging and remote device access need planning |
| Unity Build Automation | Connect the repository, configure macOS/iOS builds and signing, then distribute a signed build through an appropriate route such as TestFlight | Enables Windows coding; requires account/signing setup, build budget, and a functioning native-plugin build configuration |

A cloud build does not automatically solve RoomPlan bridge errors or produce an installable app without signing. Have the scanning team or a teammate with Apple tooling help establish the first successful native build. The service's standard certificate setup uses a Mac; if no teammate has one, include signing setup in the remote-build arrangement rather than assuming everything is ready from Windows.

For Unity Build Automation, configure the required provisioning profile, signing certificate/private key (`.p12`), and its password securely. Use the service's credential management, never Git. [Unity signing workflow](https://docs.unity.com/en-us/build-automation/sign-build-artifacts/sign-an-ios-application).

Prefer an OIS-controlled Apple Developer organization account for team distribution, with team access instead of shared passwords. TestFlight is included with Apple Developer Program membership. Free personal Xcode device testing has different limitations and still needs a Mac. [Apple account and program options](https://developer.apple.com/programs/).

## First iPhone build

1. Confirm the exact Unity version, supported iOS version, bundle identifier controlled by OIS, and whether the selected native bridge supports those versions.
2. Establish a Mac or configured cloud build owner. Install the correct iOS build support on the machine/service that exports the project. Add it locally through Unity Hub if the Windows workflow also needs iOS export/settings.
3. Create the minimal Unity project and one scene with the synthetic room, one catalog item, and a visible build version. Keep device capability checks independent of the editor.
4. Configure any required camera usage description before testing capture. Request camera access when needed, and allow imported-room editing when camera access is unavailable.
5. Build, sign, and install on the iPhone 13 using the chosen route. In a shared-Mac workflow use Xcode; for distributed testing configure TestFlight or a valid provisioned-device route. Follow the route's developer-mode/device-trust requirements where applicable.
6. Confirm touch input, scale, materials, save/reopen, suspend/resume, and logs. This proves delivery and basic editing, not scanning.
7. On a LiDAR-capable test phone, confirm the capture capability check, launch/exit the native capture UI, and return a valid structured room into Unity.
8. Configure a release-like build for final performance checks; development instrumentation can change performance.

## Minimum device coverage

| Device | What to verify |
| --- | --- |
| Personal iPhone 13 | Editor, saving, imported rooms, permission handling, unsupported-LiDAR state, camera route if implemented, and runtime splat rendering if that device is supported |
| At least one exact supported LiDAR Pro model | RoomPlan/LiDAR capture, native handoff, scan import, dimensions, and full editing workflow |
| An exact supported Pro Max model | Larger screen/safe areas, control reach, capture flow, and rendering behavior |
| Oldest/least-capable advertised model | Memory, frame time, loading, prolonged editing, and scan asset limits |

One model can cover several rows. For the first integration, borrow a LiDAR phone through OIS or the scanning team; the developer does not need to buy a new phone merely to start editor work. If iPhone 13 is only an internal test device and outside the release support list, record that distinction.

## Acceptance checklist

- Launch -> load room -> place/rotate/delete furniture -> change one wall/floor -> save -> force-close -> reopen. Verify stable IDs, dimensions, poses, and finishes.
- Undo and redo edits across furniture and finishes. Confirm autosave timing and safe recovery if the app closes during a write.
- Check UI gestures do not accidentally move furniture or the camera; inspect both screen sizes and their safe areas.
- Test denied camera permission, unsupported LiDAR, capture cancellation, incomplete scans, and unavailable assets. The editor should remain usable where its inputs permit.
- Compare real room measurements against an agreed tolerance; check a known-size furniture footprint and texture tiling scale.
- Test clutter, plain walls, mirrors/windows, low light, and camera motion with the scanning team. Separate capture failure from import failure in logs.
- If processing or asset delivery uses a server, test offline launch, disconnect during upload/download, retry, cancel, and re-entering the app without duplicate processing jobs.
- Profile CPU/GPU frame time, peak memory, import duration, and asset size on physical devices. Use the [Unity Profiler](https://docs.unity3d.com/6000.3/Documentation/Manual/Profiler.html); use Xcode tools when investigating native/Metal issues.
- As provisional product targets, aim for sustained 30 fps or better while editing one room and run a 15-minute editing session. OIS should approve actual thresholds, scene complexity, load-time targets, and device limits after baseline measurements. These are targets, not measured results.
- If splats are used, check runtime loading, memory peak, transparency/depth interaction with furniture, cutaway behavior, and alignment with editable surfaces. Test actual client-sized assets with authorization.
- Repeat final acceptance in a release-like build on each required device class; record model, iOS version, build/commit, scene/assets, results, and any crash logs.

## Work that can start immediately

Build the importer and sample-room editor on Windows while the delivery owner sets up signed iOS builds. Ask the scanning team for normalized structural output and a LiDAR-device demo. These parallel workstreams converge at the first real room import; passing desktop checks alone does not complete the phone milestone.
