# Original Phase3 — production ownership acknowledgement

Updated November10,2026 ~04:50UTC by the app owner.

## Reserved for the existing spatial lead

The app owner acknowledges the disjoint reservation of these **new** files, both verified absent before this acknowledgement:

- `mobile/src/scene/spatialView.ts`: pure view policy and visual floor/room transforms.
- `mobile/src/screens/HouseViews.tsx`: a controlled compact panel using the existing UI kit, if useful.

The lead can prepare their contents under spatial/ now. Create the mobile files after the current camera/library publication freeze is released by the coordinator. The app retains Editor,Viewport,RoomScene,camera,types,commands,persistence and final integration. Root remains the sole Git publisher.

Expose typed values/callbacks and documented defaults rather than a second store/router. Separate visual exploded-floor offsets from canonical alignment/elevation. Supply the same visible world transforms/bounds for rendering and camera framing; include the maximum visible room ceiling. Current framing invalidation deliberately ignores tint/selection/item motion while reacting to structure and Undo/Redo. Preserve that behavior, exact saved model identities, texture leases, missing markers, locks and read-only Walk. Keep the panel contextual; no permanent extra toolbar or unapproved reference claims. The actual Expo integration and source-matched checks remain app-owned.

## Proposed temporary QA-GEO10 repair handoff — not active yet

After publishing the camera/library checkpoint, the app can transfer **only** `mobile/src/domain/geometry.ts` and `mobile/src/domain/project.ts` to the existing design QA owner for a focused physical-boundary repair, if the coordinator assigns it and that owner acknowledges. The app will keep these two files unchanged while this offer is pending; no implicit transfer of other files. Exact current hashes are in geometry-handoff-baseline.json. Types,persistence,RoomScene and meshes remain app-owned unless a further exact handoff is acknowledged.

Confirmed requirements:

- New accepted placements must not intersect actual rendered wall/trim volume, including unequal12/15/30cm walls, no/flat trim, grid/free movement, both windings and openings. Reuse real-GLB/actual-wall probes; conservative bounds remain acceptable.
- Typed room width/depth mean **inside wall faces**, as required by the design contract. Extra placement padding alone does not establish5m clear-room fidelity. Return explicit helpers/API for actual inside dimensions and converting requested inside dimensions to the stored layout; the app will adopt them in creation/dimensions/plan/opening readouts.
- Existing v1 stored coordinates, exact models,poses and history must remain unchanged on load. Current rendering uses stored wall reference lines. Document the convention and any interpretation change; never silently enlarge rooms or move saved furniture. Existing overlaps may be surfaced honestly without corrupting/locking out recoverable libraries.
- Preserve doors, shared-wall topology, per-face finishes, trim joins, locks, Walk guards, failed-command history and unit idempotence. Empty apertures and low window/lintel volumes require their actual vertical behavior.

Return exact changed hashes, focused failures-before/passes-after, and a concise API/convention handoff before the app resumes edits to those files. Request app-owned changes or dependencies through the coordinator rather than writing them concurrently. This is a production repair offer, not native acceptance or user approval of a new measurement convention.
