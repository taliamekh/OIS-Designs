# Proposed scan handoff contract

## Purpose

Both capture pipelines should deliver a normalized editable room to the app. This proposal needs review by the scanning and app teams. The sample fixture establishes conventions for initial editor work; it does not implement an importer or prove that current scanners export this structure.

The app team should request one real LiDAR export and one real camera reconstruction early. A screenshot or file extension is insufficient to establish dimensions, editable components, alignment, or runtime compatibility.

## Responsibilities

The scanning team owns capture, reconstruction, scale estimation/calibration, structural extraction, scan confidence, and preparation of its visual assets. The app team owns validation, room rendering, selection/colliders, catalog placement, material overrides, and project persistence. Name an owner for native capture UI presentation, permission callbacks, session shutdown, processing jobs, and export conversion.

If processing runs on a server, define authenticated upload/download, job IDs, progress, cancel/retry behavior, retention, and error codes. The room format does not specify a backend. Do not assume splat reconstruction happens instantly or entirely on the phone.

## Version 1 conventions

| Concern | Proposed convention |
| --- | --- |
| Schema version | `schemaVersion: "1.0.0"`; reject unsupported major versions with a readable message |
| Units | Meters; all positions, heights, offsets, widths, thicknesses, and catalog sizes use meters |
| Coordinates | Unity-style left-handed frame: +X right, +Y up, +Z forward |
| Room origin | Fixed point at floor height; independent of the user's current camera position |
| Vectors | `[x, y, z]` |
| Rotations | Unit quaternions `[x, y, z, w]` when used; identity `[0, 0, 0, 1]` |
| IDs | Stable strings scoped by project/room; preserve IDs across a known scan revision or provide a mapping |
| Floor | Simple ordered boundary polygon in the XZ plane; renderer calculates winding/normals |
| Walls | Separate start/end points at the wall base, positive height and thickness; MVP walls are vertical straight segments |
| Openings | Parent wall ID, horizontal offset along start-to-end, width, base height, and height |
| Confidence | `null` if unknown; otherwise a documented scanner quality value in `[0,1]`, not an accuracy probability |
| Scan source | `synthetic`, `lidar`, or `camera_reconstruction`; record pipeline/version for real data |
| Metric scale | State calibration/verification method; unverified scale must be visible before dimension-sensitive design |

Coordinate conversion from ARKit, USD, GLB, or a reconstruction library happens at a defined boundary. A handedness conversion can require reflecting an axis and changing triangle winding; a quaternion rotation alone cannot represent that reflection. Validate with an asymmetric room and a known-size object to catch mirroring.

## Required room content

- A schema version, room ID, source, coordinate system, and scale-verification status.
- A floor boundary and separately identified walls. The room shell must support selecting walls/floor independently, including openings.
- Capture metadata sufficient to locate the originating pipeline and compare revisions for real scans.
- Detected objects, when available, with stable IDs, category, pose, dimensions, and confidence. Detection boxes are not detailed reusable furniture models.
- Explicitly declared unavailable fields; never replace unknown dimensions or scale with invented measurements.
- Optional visual asset references, each with a specific format/version and an already normalized transform into the room frame. Credentials and signed transfer URLs are transport concerns, not permanent project identifiers.

The fixture uses inline parametric geometry with no visual assets. Before introducing real assets, define their manifest fields, coordinate normalization, runtime decoding, integrity checks, file size limits, and cancellation behavior. A `.ply` may contain an ordinary point cloud or Gaussian attributes; a filename extension alone does not identify compatible content.

## Sample fixture

[`samples/rooms/rectangular-room.json`](../samples/rooms/rectangular-room.json) describes a synthetic 4 m by 3 m room, with 2.6 m walls, 0.12 m wall thickness, and a 0.9 m wide doorway in the south wall. It includes no client data, textures, or furniture.

Its `metricScale.status` is `synthetic_known`: dimensions are authored, not scanner measurements. Real pipelines should use `verified` or `unverified`, and record the verification method and reference measurement when available. `defaultMaterialId` is a placeholder catalog identifier for the future app to resolve.

Walls use interior-face floor endpoints. Thickness is extruded away from the interior so the clear room dimensions stay 4 m by 3 m. Compute the inward side from the floor polygon; do not rely on endpoint direction alone for a general importer.

## Preserve capture and design separately

The normalized capture remains immutable. Store a design revision separately with room/source revision, placed catalog item IDs/versions, item transforms, selected material IDs, user dimension corrections, and undoable edits. Rescanning requires a defined revision/remapping policy; do not overwrite finished design placements silently.

The save model can contain `rooms[]` from the start with a per-room transform relative to the project, while enforcing a one-room MVP in the UI. Treat a future house's shared coordinates as a separate concern from a scan's local frame.

## Integration acceptance

1. Both teams load the fixture and agree on dimensions, axis directions, material IDs, doorway position, and wall thickness behavior.
2. Import a real scan; compare at least three distances against physical measurements using an OIS-agreed tolerance. Record actual errors rather than claiming a generic accuracy level.
3. Use an asymmetric room or marker to detect left/right mirroring. Confirm floor normals, wall selection, doorway cutouts, and a known-size catalog item's footprint.
4. Independently select and recolor one wall and the floor. Place furniture using geometry/colliders from the normalized structure.
5. Disable the optional visual asset and verify the editor still operates. If an asset exists, verify alignment, depth/occlusion behavior, and runtime loading on an iPhone.
6. Reject nonfinite coordinates, impossible dimensions, missing/duplicate IDs, unsupported schema versions, invalid opening references, self-intersecting floor polygons, and unbounded asset sizes before creating scene objects.
7. Test unverified scale, partial capture, missing floor/walls, and unavailable reconstruction. Provide review/correction or a clear failure state.
8. Save/reopen edits and check exact IDs and transforms. Test scan revisions so changed wall IDs cannot silently attach finishes to the wrong surface.

If the camera route supplies only a splat, its handoff is incomplete for wall/floor editing until it also supplies a usable structural model or an explicitly agreed manual reconstruction workflow.
