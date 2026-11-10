# Checked additions for the Home Planner reference maintainer

Checked2026-11-10 04:03UTC. Keep `docs/planning/HOME_PLANNER_REFERENCE.md` as the canonical reference; this is a bounded handoff from QA, not another competing product specification. Correct product remains Home Planner AI: Room Design3D by Room Planner Ltd/pink logo. These are **official documented behaviours**, not hands-on native observations. Exact new OIS camera presets remain proposals.

## Ceiling behaviour now has an explicit primary answer

The October18,2026 official guide places the height setting inside a room's size inspector but describes it as one flat height shared by the level. It explicitly says different flat heights for two rooms on that level are unavailable. It separately documents changing an individual wall's height and adding a catalogued slope. [Ceiling-height guide](https://share.homeplannerapp.com/help/how-to-change-ceiling-height).

For the existing reference's height unknown: update it to this documented answer. **OIS decision remains distinct:** the user requires floor defaults plus independent room overrides, already implemented and UI-tested; do not remove that capability to copy Home Planner. A wall-height edit is not proof of a complete independently shaped ceiling/void system.

## Interactive editor, rendered photos and panoramas differ

The October17,2026 rendering guide describes choosing the interactive3D angle before opening the camera/render interface. It documents separate Photo/AI Photo modes, adjustable lighting and server-produced still images. Panoramas are a separately generated browser-viewable result. This is not evidence that cloud photos or panoramas are an editable whole-house viewer. [Render/360 guide](https://share.homeplannerapp.com/help/how-to-make-a-3d-render-and-360-virtual-tour-of-a-room).

**OIS inference:** prioritize true-scale interactive framing/visibility first. Keep any future still/AI/panorama service separate from project geometry; the queued spatial phase does not authorize a paid render service or substitute generated photos for editable models.

## Attachment-aware position controls

The October22,2026 wall-material guide distinguishes floor elevation, wall-relative offsets and ceiling-relative offsets. A wall shelf uses its support/edge clearances; the lower clearance can refer to a supporting sideboard rather than the floor. Object dimensions and mounting position are separate operations. [Surface/position guide](https://homeplannerapp.com/help/wall-panel-visualizer).

**OIS implication for the spatial lead:** validate explicit mounting/support semantics before enabling wall/ceiling candidates. The current floor-only schema/Coming soon attachment state must not silently place those models on the floor. Proposed elevation/attachment controls need integrated transform,collision,save and native tests.

The reviewed documents do not establish exact cutaway/dollhouse presets, invisible-wall selection rules, camera reset policy, gesture arbitration or a proprietary renderer/Blender pipeline. Keep those unknown and evaluate OIS choices against actual phone tasks. Existing stairs/Walk/navigation evidence in the canonical reference can be reused without restarting that research.
