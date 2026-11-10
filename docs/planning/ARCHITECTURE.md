# Proposed phone and companion architecture

**Round 3 UI/behaviour override:** use [APP_DESIGN_SPEC.md](APP_DESIGN_SPEC.md) and [BUILD_PARITY_CHECKLIST.md](BUILD_PARITY_CHECKLIST.md). Earlier references below to nudge buttons, a separate height page, sequential finish/furnish flow or small tint-only material palettes are historical. Current requirements include actual GLB assets alongside manual geometry, 2D/3D quick drag, persistent locks, command-level read-only Walk, ten textured floors, arbitrary wall colour/textures/sheens, real baseboard profiles, combined dimensions with metric/imperial, visual door type choice then repeated plan placement, and searchable all-room themed furniture.

Design proposal, November 8, 2026. Read with [research](RESEARCH.md) and [phased plan](PHONE_APP_PLAN.md). No domain/editor code has been added to `mobile/`.

## One editable project model

Keep a versioned TypeScript domain package independent of React, Expo, scanners and the renderer. Introduce shared packages only when implementation starts; do not restructure the existing starter during design review.

| Record | Essential content |
| --- | --- |
| HouseProject | Stable ID, schema version, revision, title, units preference, floors, room/source revisions, catalogue references, creation/update metadata. Account owner is nullable locally, later assigned through authenticated migration. |
| Floor | ID, name/order, elevation in metres, slab thickness, shared-house XZ transform, room IDs. Elevation is structural; exploded-view displacement is camera/view state only. |
| Room | Stable ID, name, floor ID, room-local transform, boundary polygon, interior wall-face references, openings, ceiling height, source revision and scale status. Rectangles/templates initially; nonrectangular polygons later after validation. |
| Wall / wall face | Shared physical wall segment ID, thickness, height, and separate adjacent room-face IDs/material overrides. Connect openings once across both faces. Do not create two overlapping physical walls when rooms meet. |
| Opening / connection | Parent wall ID, offset, width, sill/base height, height, type, hinge/swing, and adjacent room IDs. Room routing uses this graph. |
| SourceRevision | Provider/pipeline version, immutable imported structure, original scale/units/frame, calibration/confidence, mapping to canonical IDs, asset manifest and corrections. Manual, sample, uploaded plan, LiDAR and camera reconstructions all converge here. |
| DesignRevision | Surface material overrides, room corrections, placed catalogue assets/transforms, visibility flags and command history references. Preserve capture separately from design choices. |
| PlacedItem | Stable ID, room ID, catalogue item/version, room-local floor position, yaw, dimensions derived from the catalogue, optional later elevation/attachment. No arbitrary scale by default. |
| AssetManifest | Stable asset ID/hash, content type, actual format/version, byte count, bounds, units, canonical transform, source licence, LODs and required extensions. Transport URLs are replaceable, not permanent IDs. |

Persist data, not a serialized Three.js scene. Scene meshes/colliders are derived caches. Keep selection and camera separate from durable house geometry. Wall/floor selection resolves stable domain IDs; changes update one surface override. A whole-room finish action must be an explicit separate command.

## Coordinates and the existing fixture

Use **metres**, right-handed **Y-up**, **+X right, −Z forward/north on the default plan**. A room's origin is fixed at its floor, not at the current camera. Place items relative to the room; put rooms relative to a floor; compose floors in the house frame. Plan view projects `(x,z)` to screen `(u,v)` so north/−Z is up. Floor elevations remain Y.

The existing fixture and `docs/SCAN_CONTRACT.md` deliberately use Unity-style left-handed +Z-forward. Preserve that original fixture as a source-adapter test; do not relabel its coordinates without conversion.

For that specific source frame, reflect Z with `S = diag(1,1,-1)`:

- Position/direction: `(x,y,z) → (x,y,−z)`.
- Orientation: convert the full rotation matrix `R' = S R S`, then extract a normalized quaternion. A single rotation alone cannot change handedness.
- Normals: apply the appropriate inverse-transpose to transformed geometry; reverse triangle winding for the reflection when converting raw indexed triangles. Avoid reflecting geometry twice through both an adapter and a negative-scale scene node.
- Recompute polygon winding, normals, wall inside/outside and opening directions in the canonical frame. Preserve stable IDs and opening offsets along the transformed wall's start-to-end direction.
- Source south door remains on Z=0; source room extends to +3 Z, canonical room to −3 Z. Clear interior stays 4 × 3 × 2.6 m, door offset stays 0.4 m and width 0.9 m. Wall thickness extrudes outside each interior face.

Validate with an asymmetric L-marker/door, labelled axes and a 1 m cube, not only the symmetric rectangle. Round-trip a rotation, point and placement. Record source frame/version per adapter. ARKit/USD/GLB inputs must declare their actual frames instead of all being assumed to use the Unity convention.

## Source adapters and asynchronous work

`ManualRoomAdapter`, `FixtureAdapter`, `PlanRecognitionAdapter`, `LiDARRoomAdapter`, and `CameraReconstructionAdapter` produce a validated candidate project/room plus warnings and asset references. They never mutate the current project directly. Workflow: acquire → process → validate → review dimensions/scale → preview merge → commit one undoable import.

Provider capabilities declare capture support, supported input formats, structured output, metric-scale verification, local/server processing and cancellation. Failed/partial output returns typed errors and preserves the editable project. A splat-only result enters reference-view mode or a manual reconstruction flow; it cannot be passed off as editable room structure.

For floor-plan upload, a photo/PDF is a **source document**, not itself a room model. Select page/floor; deskew/crop; recognise walls/openings; review a vector overlay; calibrate with at least one known length (two independent directions for photographed/perspective-distorted plans); label rooms; align floors; commit the proposed structure. Printed scale is only trustworthy with correct page geometry. Separate dimension annotations from wall strokes, reject self-intersections and uncertain room closure, preserve confidence per feature and allow manual corrections. No silent guessed heights or stair connections.

If recognition/reconstruction is remote: authenticated job IDs, user-visible progress, idempotency, retry/cancel, bounded file/page/image sizes, source retention/deletion, and provider-error mapping. Choose a service only after an evaluation on actual permitted plans; no provider or paid subscription is selected here. Expo DocumentPicker can acquire files; it does not perform recognition. [SDK 57 DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/).

## Ceiling geometry and clear height

The earlier proposal contained a room height and wall heights, but did not fully specify mixed ceilings. Use a floor-level authoring default with an explicit per-room override for the first flat-ceiling editor. Store room clear height above its finished floor separately from the structural floor-to-floor elevation and slab thickness. A kitchen at 2.40 m and living room at 2.90 m can share the same floor elevation. A height edit to one room must not silently resize its neighbour or move the next storey.

Generate each room's ceiling surface and wall-face tops from its ceiling profile. Adjacent faces of a shared wall can have different visible heights; their common physical wall/upper structure must be resolved without duplicate coplanar geometry. Validate openings, tall furniture, cabinets and attached items against the local clear height, preserving their floor-relative poses and flagging conflicts.

Reserve a versioned `CeilingProfile`: `flat {clearHeight}` first; later planar/sloped or multi-plane surfaces with boundaries, offsets and explicit soffit/drop regions. Vaulted geometry needs a real surface profile. A double-height room needs a void in the floor/slab above, plus wall/ceiling connectivity; raising one wall is insufficient. Unknown imported heights remain unverified until reviewed. Phase 3 adds these geometry refinements after independent flat heights work.

Acceptance: on one level, author adjacent 2.40 m / 2.90 m rooms, change either height, verify the other and the next floor elevation are unchanged, check shared-wall faces, and reject an opening above the lower ceiling. Later tests cover a slope over tall furniture, a soffit and a double-height void through the upper slab.

## Door types, shared walls and dimension feedback

Door/opening records require a stable shared-wall ID, two room-face references, `kind` (single hinged, double hinged, surface sliding, pocket sliding, or open doorway), clear opening width/height, position along the wall axis, frame allowance, leaf/panel geometry and mechanism-specific handing/direction. Hinged doors support left/right hinges and either swing side. Double doors declare leaf split; sliding doors declare travel side and track/pocket clearance. Wall thickness and pocket feasibility must be checked rather than assumed.

During drag or numeric placement, show the clear opening and motion envelope in the plan. Keep **both room-facing dimension chains visible**, each comprising corner-to-opening-edge, clear opening width and opening-edge-to-corner. Compute each chain from that face's own finished interior endpoints. Opposite faces can have different lengths/origins or reversed orientation; simply copying or swapping the other face's numbers is incorrect. Label the rooms and inside-face units explicitly. A selected face can expose endpoint labels while the other remains visible for reference.

Differentiate clear opening, frame/trim extent and rough opening in data and any detailed inspector; the first preview labels clear opening dimensions. Confirm the opening is inside both relevant wall-face extents, check intersecting openings/corners, swing/panel/pocket clearance, and compare opening height with both rooms' ceilings. Changing door type does not duplicate the physical hole or create separate unsynchronised doors for each room. Support typed offsets, width and height, flip hinge/swing/travel and a one-command undo. Door import adapters preserve mechanism metadata or mark it unknown.

The new door mockup demonstrates five type choices and two independent dimension chains while adjusting position. It is a review diagram, not a production opening/structural feasibility solver.

## Runtime visual assets

The house shell is generated from the editable domain: floor polygons, wall segments, real opening cutouts, ceiling profiles and level transforms. It is not a Blender scene baked into one uneditable house mesh. Furniture is a separate asset pipeline: model or clean licensed assets in Blender, verify real dimensions/pivots/material slots, simplify geometry, prepare bounded textures and export self-contained GLB for the proposed Three/R3F-native renderer. Validate on physical devices before expanding the catalogue. Blender is an authoring tool on the computer, not a dependency running inside the phone app. No claim is made about the private modelling tools or engine used by Home Planner.

## Editor navigation

Replace the first mockup's Projects / Plan / 3D / Furnish bottom bar. It mixed a destination, modes and an action and duplicated canvas controls. Use project/back navigation at the top, one stable 2D/3D switch, room/floor selection and an Add control for rooms, doors/openings and furniture. Selecting a surface opens finish properties; selecting a room exposes dimensions/ceiling properties. Catalogue selection returns to placement in the same editor and active room. Temporary placement retains Done/Cancel and Undo; editing is not a forced floor-plan → finishes → furnishing wizard. Opening Settings and returning preserves the editor, room, selection and camera. Mockup screen-preview buttons are review navigation outside the depicted app.

## Catalogue, materials and placement

Start with the 25 conceptual sample pieces listed in the plan. A catalogue set references five versioned items; pieces remain independently placeable. Store dimensions, floor footprint, bounding box/pivot, allowed rotation/elevation, thumbnail, mesh/material manifests and licence. Use lightweight original proxies initially, then licensed optimized GLBs. Applying a set is a reviewed layout suggestion later, not five items automatically piled at the origin.

Materials have an ID/version, base colour or bounded texture maps, real-world UV scale and applicable surface types. Use image previews marked approximate; no claim that a screen is a paint specification. Load only visible catalogue thumbnails; cache meshes/materials with reference counts; dispose GPU resources when evicted.

Placement interaction:

1. Tap a piece → explicit Place mode, outline/footprint, coordinates, dimensions and movement badge. Default to top view for predictable drag; 3D preview remains a separate action.
2. Drag ray/point intersects the active floor plane; preserve grab offset. Floor-bound pieces stay at floor Y. Gesture ownership locks camera until completion/cancel.
3. **Grid Snap** defaults to 0.10 m, rounds the item pivot X/Z against the **floor-wide origin**, and rotates in 15° steps. Use the same floor grid in every room. Room-local transforms are converted before snapping.
4. **Free Move** applies no positional or rotational snapping. Numeric fields can set positions to 0.001 m and angle to 0.1°; 1 cm / 1° nudge buttons are optional precision aids, not a hidden snap rule.
5. Toggle applies to the next gesture; never jump existing furniture on changing Settings. Store grid spacing/mode per project and unit display per user/device. Display grid units explicitly; canonical data always stays metres/radians.
6. Check oriented footprints against room boundary, walls, other pieces and doorway swing. Invalid overlap is a labelled preview with reason; cancel or restore last valid pose. Allow deliberate overlaps only through a later explicit override. Do not market this as building-code certification.
7. Commit a drag as one command on release. Cancel restores original pose. Undo/redo moves whole commands, not hundreds of individual frames.

Separate rotation, translation and view gestures to avoid gesture ambiguity. Plan: one-finger empty-space pan; two-finger/pinch pan/zoom. 3D Browse: one-finger orbit, two-finger pan/pinch zoom. Place: selected-item drag, numeric/nudge/rotate controls; no simultaneous orbit. A room picker and persistent plan/3D switch are always reachable. Later eye-height walkthrough is optional, with room jump and Fit view as recovery.

## Local persistence, undo and recovery

Use SQLite on the phone for transactional project snapshots/command journal and metadata, with asset files in app-managed storage. The bundled module persists across restarts. [SDK 57 SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/).

Commands include AddRoom, ResizeRoom, ConnectRooms, SetSurfaceMaterial, AddItem, MoveItem, RemoveItem and ImportRevision. Validate before commit; store inverse data or revision snapshots. Coalesce drag preview in memory, save on completed commands, and use an explicit last-good checkpoint. Save indicator reports actual transaction state: Saving / Saved on device / Save failed. On interruption reopen the last committed revision; do not say cloud-synced when only local storage succeeded. Keep an independent project export as an early recovery path. Schema upgrades back up before migration and preserve old versions on failure.

## Later account and web companion

Use provider-neutral auth, project API and object-store interfaces first. Phone SQLite and browser IndexedDB repositories implement the same persistence boundary; do not assume Expo SQLite web behaves identically without its own integration work. The web renderer uses Three/R3F web and the same geometry/catalogue domain, with mouse/keyboard accessibility.

Stage sync as versioned snapshots + asset hashes + outbox: finish local transaction → enqueue change → authenticated upload → conditional revision commit → acknowledge sync state. Project owner/ACL enforced server-side. Tokens belong in platform secure storage, not project JSON. Source scans/plans stay out of the public Git repository.

Initial conflict rule: optimistic revision check; if phone and computer edited the same base, preserve both branches and offer a named conflict copy/choice. Never use blind last-write-wins for walls, IDs or room transforms. Offline edits remain usable and visible as unsynced; failed uploads retry idempotently. Real-time multi-user merge is a later product decision, not required for “same account, same project.” Export/import supports local-to-account migration before login becomes necessary.
