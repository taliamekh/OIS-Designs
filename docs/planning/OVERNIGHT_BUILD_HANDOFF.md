# Autonomous Expo build handoff — November 9, 2026

## User authorization and outcome

The user explicitly requests a new chat to make the existing design into a real Expo app and to continue research, implementation, testing and improvement while they sleep. After initial phone/account setup, do not ask questions or wait for review between routine build phases. Start a persistent goal for the complete first implementation, without inventing a token budget. Continue to the next unmet requirement after each useful milestone; do not stop after the setup, plan, starter screen or first small batch. Record assumptions and blockers and keep progressing independent work. Never claim all-night uptime, finished features or phone validation without evidence.

This is current authorization to begin implementation. Older 'preserve starter until approval' text is historical where it conflicts. Preserve the existing checkout and use round 3 as the visual baseline. Avoid product slogans, extra redundant controls or silently reduced scope.

## Required context

Read root/mobile AGENTS, design-feedback/preferences.md and decisions.md, APP_DESIGN_SPEC.md, BUILD_PARITY_CHECKLIST.md, HOME_PLANNER_REFERENCE.md, GIT_WORKFLOW.md, PHONE_CONNECTION.md, and current furniture INTEGRATION/QUALITY/manifest. Use the actual review source/layout, not just prose: phone-mockups-v3.html, phone-review-v3.css/js, phone-review-3d.js and screens-v3. The generated phone-mockups.html embeds real review GLBs. This browser renderer does not establish native support; build native Expo screens and validate the native renderer separately.

## Existing environment

- Repository: C:\Users\talia\OneDrive\Documents\ChatGPT\OIS Designs. Existing mobile/ starter, dependencies, Expo Router, SDK ~57.0.32, RN 0.86.3, React 19.2.3. Do not scaffold over it or run reset-project.
- Node: C:\Users\talia\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe. Python: analogous dependencies\python\python.exe. The Node bin currently contains node.exe only; npm/npx may need explicit existing CLI paths. Do not interpret a wrapper exit code as a lint pass if lint did not actually run.
- Root Expo.cmd launches the preserved project and accepts Expo CLI commands. Initial whoami: Not logged in. No dev server was listening on 8081/8082 at handoff preparation. Recheck because the user may start one. Do not create competing servers or stop unrelated processes.
- VS Code and Blender are installed. No Expo account/cloud signing project/payment setup has been performed by this chat.
- Current branch codex/project-foundation has no commits and all initial files are untracked. Other chats share the checkout: NEVER switch its branch, reset, clean or blanket-stage. App chat may make coherent local commits of its owned, checked files after inspecting exclusions, with conventional messages. Do not push/publish/merge without explicit authorization. No paid storage, force upgrades or audit fix --force.
- Physical test target: iPhone 13. No LiDAR. Do not propose Unity again. Check SDK-matched Expo docs and official library APIs before integrating new native dependencies. Resolve Expo Go/device constraints during initial setup; missing credentials/device access must not block independent build work.

## File ownership and furniture coordination

The app chat owns mobile/, docs/build/ and updates to the main implementation/parity documentation. This coordinating chat prepares the handoff/feedback, then stops editing them. The existing furniture chat (01a1bd3f-562d-73d2-8ea3-8a5344049c49, local) owns ONLY furniture/ and docs/furniture/. Read its manifests; do not overwrite its sources. There are presently 39 GLB records from 19 geometry families, including palette variants, not a finished large catalogue.

The user has redirected that chat to at least **300 distinct designs**, excluding recolours, size-only variants and repeated geometry. Real varied pieces must cover every room and coordinated themes. It must provide stable IDs, exact dimensions, material slots, search tags, provenance, bounds, performance statistics, thumbnails and validation. Do not count 300 catalogue rows as 300 designs. Integrate usable batches early. Build an adapter/copy pipeline within mobile for bundled models and metadata; coordinate schema with docs/furniture/INTEGRATION.md. Native Metro GLB asset loading, memory/disposal and device performance require real validation. Avoid downloading all 300 into memory at once or doing parsing on every render.

## Build phases (continue through them autonomously)

1. Audit current setup and check SDK 57 docs. Run actual ESLint/typecheck/doctor as appropriate. Prepare/start Expo, provide the real QR/local URL, and guide one-time login/phone pairing. If the user has left, record phone verification pending and keep building.
2. Recreate approved UI: plain brand, shared availability badges, project list, manual room OR floor-plan entry, shapes/draw, combined width/depth/ceiling and metres/feet, contextual editor navigation. Preserve round 3 spacing/colours/hierarchy. Upload/scan remain honest Coming soon.
3. Implement a canonical metre-based project/floor/room/wall/opening/object/material domain, stable IDs, command history, versioned durable local persistence/recovery and sample projects. Build real room geometry and GLB rendering alongside 2D editing. Do not replace final furniture with SVGs, boxes or WebView mockup embeds.
4. Catalogue search/filters/favourites/recent, dimension-fit filters, bed types and all-room/theme support. Placement and rotation in BOTH 2D and 3D, direct quick moving, camera/object gesture arbitration, persistent undoable locks. Enforce read-only Walk at the command layer and preserve individual locks on exit.
5. Ten distinct real floor appearances with physical UV scale and texture/normal/roughness data, wall wheel/SV/HEX, textures and five sheens per wall face. Real mesh baseboards with profiles, dimensions, corner joins and door cutouts. Do not mistake recolouring for a material library.
6. Visual door types → placement on the actual plan, both-face corner distances, opening dimensions and swing/travel validation, repeat/quick doors, one Undo per opening. Multi-room/floor navigation, ceiling overrides, alignment/cutaway per staged spec, realistic collision constraints. Keep later ceiling geometries/providers explicitly pending where appropriate.
7. Run meaningful domain/geometry/command/persistence tests (Walk mutation prohibition, locks, unit conversion, shared walls, opening constraints and undo), lint/typecheck, iOS JS export and browser/native smoke as available. Compare screenshots against round 3 at phone widths, light/dark and large text. Distinguish web/export checks from physical device checks. Test resource lifecycle and representative populated scenes. Fix findings and continue unmet checklist rows.
8. Update docs/build/STATUS.md and BUILD_PARITY_CHECKLIST with implemented/partial/blocked rows, file/check evidence, assumptions, exact commands and next steps. Keep bounded test output/logs, no secret credentials. A complete first parity build and a morning-review report are the target; no false 'done' from UI-only screens. If blocked from a provider, improve/test the local editor rather than stop all work.

## Autonomous decisions and boundaries

Use existing design decisions and official primary sources. Reuse the Home Planner reference file; research specific missing behaviours and record citations/unknowns rather than repeatedly restarting discovery. Use reversible sensible defaults and log them. Initial setup is the only time for user-dependent actions; afterward do not send questions to the absent user. No purchases, payments, accepting new legal terms on their behalf, paid developer memberships, remote publishing or external messages. Leave these exact steps documented and proceed elsewhere. Avoid busy waiting or empty research loops: each phase should produce working code/models or meaningful verification. Usage limits, connection loss or OS/tool approval policy can still stop a local run and must be reported accurately.
