# Design decisions and open review

## November 9, 2026 — queued 3D space and house-view phase

After completing the furniture library, its existing chat leads the full 3D furnishing/whole-house viewing phase, using the verified Home Planner reference. See `docs/coordination/NEXT_SPATIAL_PHASE.md`. The app already has a 3D placement/Walk/overview foundation; this phase extends and integrates it. Exact view presets, controls and visual styling remain proposals, while app-file ownership and independent QA stay coordinated.

## November 9, 2026 — phone usability correction

User correction supersedes round 3 where conflicting: move unit selection to Settings; use a compact furniture bottom sheet over the persistent room renderer; reduce persistent tool chrome. Wall finishes are per face, with an explicit whole-room operation. Research improved finish choices before implementing the surface inspector. These requested behaviours are confirmed; exact new sheet heights and styling are reversible implementation assumptions, not visual approval.

## November 9, 2026 — real Expo build requested

The user now explicitly authorizes implementation in a new app chat and sustained autonomous work overnight. The older instruction to preserve the starter pending a separate approval is superseded for this build. Round 3 remains the visual and interaction baseline; additional unsolicited styling approval is not inferred. Follow `docs/planning/OVERNIGHT_BUILD_HANDOFF.md` and the full parity checklist. The existing furniture chat is redirected to at least 300 distinct furniture designs; material/size variants do not inflate that count. Phone login/pairing is initial user setup; inability to keep a phone connected must not block independent implementation and test work.

## November 8, 2026 — correction after first mockup review

| Issue | Evaluation / proposed correction | Review status |
| --- | --- | --- |
| Different Coming soon treatments | One availability-badge helper and one entry-row helper for upload and scanning. Both open an explicitly labelled planned-flow preview; neither launches real capture/upload. | Requested correction applied in mockup. |
| Unrequested slogans | Remove promotional headings throughout. Use Projects, New project, Furniture sets, Set contents, Upload floor plan, etc. Preserve necessary instructions and official company identification. | Requested correction applied. |
| Pasted logo | Compare Compact header, Centered header and Project cover treatments using original artwork with clear space. Compact/centered studies crop the embedded small tagline using layout; no new official logo is claimed. | Options proposed; user choice pending. |
| Projects / Plan / 3D / Furnish bar | Quick switching has value, but this bar mixed a destination, view modes and an action. Replace it with project/back navigation, one stable 2D/3D switch, Add and contextual selection tools. Retain Done/Cancel for temporary placement states. | Revised proposal; user feedback pending. |
| Source of inspiration | Home Planner official guide documents contextual tools, Add Furniture bottom-right and Open 3D plan bottom-left. Our original four-tab bar was not a verified reproduction of its app. No numerical inspiration percentage is meaningful. | Evidence recorded in planning research. |
| Real visuals | Generate editable room geometry from dimensions. Author/clean optimized furniture in Blender, export GLB and render with the proposed Three/R3F-native stack after physical-device validation. Blender is an asset-authoring tool, not the phone runtime. | Architecture proposal; no app renderer implemented. |
| Ceiling variation | Floor default plus per-room flat ceiling overrides now explicit. Sloped/vaulted surfaces, soffits and double-height voids require later geometry support and tests. Keep ceiling clearance separate from floor-to-floor elevation. | Expanded requirement. |
| Door placement | Single/double hinged, surface sliding, pocket sliding and open doorway. Show clear opening dimensions, both faces' corner distances, motion clearance and numeric positioning. | Expanded requirement and mockup. |

## Before the next review

### Latest round — supersedes earlier alternatives

The user now requests plain text branding, so the three image-logo variants are historical only. The current review is round 3. A consolidated dimensions sheet replaces the height page. Project actions are Furnish / Surfaces / Build, while 2D / 3D / Walk are explicit view modes. There is no universal Add button duplicating the action dock. Door types are selected visually before positioning on the plan; repeat mode remembers the last type. Furniture drag has no nudge/centre buttons, item locks persist, and walkthrough is read-only. Floors, wall paint/textures/sheens, trim, catalogue filters and real asset production are now acceptance requirements in `docs/planning/APP_DESIGN_SPEC.md` and `BUILD_PARITY_CHECKLIST.md`.

Furniture asset work has its own user-requested chat: **OIS furniture library — real 3D assets** (`01a1bd3f-562d-73d2-8ea3-8a5344049c49`). It owns only `furniture/` and `docs/furniture/`; the app/manual-editor and furniture pipelines proceed before scan integration. Original five living-room sets are now cross-room theme directions, not the complete required catalogue.

- Compare repeated states for wording, position, styling and behaviour.
- Check that selection and the active room survive opening/closing tools.
- Check that useful actions are reachable without a compulsory plan → finish → furnish sequence.
- Check both sides of openings and test different adjacent ceiling heights.
- Inspect logo variants at actual phone size and in dark mode.
- Review these notes; append new feedback without erasing the reason for previous decisions.
