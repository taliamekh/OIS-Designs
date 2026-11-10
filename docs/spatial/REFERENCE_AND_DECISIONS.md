# Phase 3 reference and evaluated OIS proposals

Checked2026-11-10. Correct reference product: Home Planner by Room Planner Ltd, pink-logo app. Existing baseline: docs/planning/HOME_PLANNER_REFERENCE.md. This refresh covers the queued full-house viewing work, not import/scanning implementation.

## Documented reference behaviour

The official [floor-plan editor page](https://homeplannerapp.com/floor-plan-creator) describes an editable2Dplan and a3Dview of the same home, furnishing with real-size items and walking through rooms. The [whole-home3D page](https://share.homeplannerapp.com/floor-plan-to-3d) describes ordering multiple floor plans into one multi-level house and navigating it in3D. These are vendor-documented capabilities, not a hands-on native control test. Some marketing images are explicitly AI-generated and cannot prove current controls or rendering fidelity.

Unknown from the reviewed pages: exact camera presets, how roof/front-wall hiding works, cutaway hysteresis, exploded floors, gesture arbitration or a complete read-only Walk contract. OIS must evaluate and test its own behaviour rather than describe these as copied features.

## OIS proposal under evaluation

Keep2D/3D/Walk as the existing top-level view modes. Within3D, use contextual room/floor/house scope and a compact Views sheet. Cutaway and solid are shell presentations. House view should be read-only and expose room/floor navigation rather than edit every distant item. A presentation-only separated-floor option may help inspect lower floors; it must be explicitly labelled and cannot alter structural elevations or be confused with a real stair connection. Exact UI styling and labels remain reviewable proposals.

Use one physical-wall visibility decision for its faces, doors and trim. Cut away near boundaries while retaining internal partitions. A paint/selection context can force a relevant wall visible. Solid and Walk show walls; Walk shows ceilings. Hysteresis near the wall plane reduces orbit flicker. All view changes leave canonical project bytes untouched.

Framing needs the complete visible volume: all floor alignments/elevations, per-room ceiling overrides, floor slabs and the actual saved asset's rotated local bounding cage. This cage is conservative; vertex-tight mesh bounds remain a separate import measurement. App owner is already repairing CameraBridge; the reusable view plan supplies scope/transforms/bounds without taking ownership of its fitting code.

## Current production boundaries observed

Read-only inspection of mobile/src/scene/Viewport.tsx, RoomScene.tsx, camera.ts, picking.ts, catalogue/resolve.ts and domain/types.ts confirms existing room/floor/house grouping, direct placement, cutaway, Walk ceilings and exact asset resolution. Current near-wall visibility is calculated per face, while openings have their own visibility branch. A shared physical-wall policy is therefore a concrete integration candidate, not a claim that the production renderer lacks all cutaway support.

Production supportsPlacement permits floor-anchored models only. Item storesx/z/yaw and no vertical elevation. Surface or wall attachment needs explicit model/command/persistence/collision/Undo integration; it is not enabled by this research prototype. Native phone ergonomics, GL upload, memory and performance remain distinct gates.
