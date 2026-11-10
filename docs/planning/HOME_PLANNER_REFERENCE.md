# Home Planner AI — reusable workflow reference

Verified/researched November 8, 2026. Product: **Home Planner AI: Room Design 3D**, pink-logo app, Room Planner Ltd, Apple ID 1076159017. [Official product](https://homeplannerapp.com/), [correct store listing](https://apps.apple.com/us/app/home-planner-ai-room-design-3d/id1076159017).

This is the durable reference for **features relevant to OIS**, not a claim to have exhaustively tested every screen, platform, paid tier or private implementation. Read this before repeating research. Descriptions below come from official guides unless explicitly marked otherwise; they are documented behaviour, not our hands-on native-app test. Some vendor hero illustrations are AI-generated and do not prove exact button layout. Record a refresh when a relevant flow changes or an implementation decision depends on an unknown. Do not copy proprietary assets, branding or model files.

## 1. Starting and drawing a room or floor

The kitchen guide documents a first home tile for adding a room/floor plan, a room-type choice, then a blank-start screen with Plans/Templates. Generic options include square, rectangle and L-shape, plus drawing walls from scratch. Room type focuses the catalogue. The same guide describes importing an existing plan before refining dimensions. [Kitchen workflow](https://homeplannerapp.com/help/how-to-design-a-kitchen-layout-step-by-step-in-3d).

**OIS decision:** retain our three entry options, rename manual creation generically, and use type → shape/scratch → dimensions → editor. Do not drop users directly into an unexplained furnished sample.

## 2. Editor navigation and contextual tools

The furniture guide places Add Furniture at bottom-right and Open 3D plan at bottom-left. Object selection exposes nearby editing/replacement tools. Edit Walls changes the available Add/Done controls. Catalogue selection opens a product card, then Add to room; furniture can be dragged in the scene. It also documents filtering by dimensions, brand, price and availability. [Furniture workflow](https://homeplannerapp.com/help/how-to-visualize-furniture-in-your-room-before-you-buy).

**OIS decision:** explicit 2D/3D/Walk modes and Furnish/Surfaces/Build actions within one project. Preserve context on returning from catalogues/settings. The earlier four-tab OIS bar was our invention, not verified Home Planner navigation. Keep one place per action per screen.

## 3. Catalogue search, themes and favourites

The catalogue guide describes room-focused categories, an Other Rooms route, and More entries for Styles, Brands, Themes and Favorites. A star saves an item. Store catalogues provide another browse path. [Catalogue guide](https://share.homeplannerapp.com/help/how-to-not-get-lost-in-300-000-models-a-quick-guide-to-finding-furniture-in-a-huge-catalog).

The bedroom page explicitly advertises single/queen/king/super-king, bunk, loft and storage beds, plus bedroom storage and accessories. [Bedroom categories](https://share.homeplannerapp.com/rooms/bedroom). This is product documentation, not a validated OIS asset inventory.

**OIS decision:** searchable, tagged real-model library across all rooms; five coordinated themes, functional subtypes, colour/material variants, bed-size/type filters, dimension fit and favourites. We do not claim Home Planner's catalogue counts or paid access as our own capabilities. Avoid brand/price filters until OIS has real associated data.

## 4. Furniture placement in 2D and 3D

The photo-search guide describes Add to room, dragging an item, a round rotation control, switching to 3D, and changing an item's colour/material. Some wall/ceiling objects prompt switching to 3D for placement. An active selection may cause a catalogue choice to replace that item, so deselection matters. [Placement and search flow](https://share.homeplannerapp.com/help/how-to-find-furniture-from-a-picture).

**OIS decision:** direct 2D and 3D placement, unambiguous ghost preview and Add-versus-Replace intent. Quick move acts on unlocked objects without requiring a separate Move mode for every item. No centre-item/nudge controls. Camera and object gestures must not fight.

## 5. Walkthrough and floors

The multi-floor guide documents a view-menu route to 3D-Walkthrough, a phone joystick, and keyboard walking on computers. Stair traversal depends on an appropriate stair, an opening above it and a corresponding upper room; it identifies limitations for certain stair types. [Walkthrough/floors](https://share.homeplannerapp.com/help/how-to-make-a-2-story-floor-plan-with-stairs).

**Not verified from reviewed sources:** whether every editor action is blocked in its walkthrough, and exact item-lock/quick-move semantics. A paywall lock on a catalogue result is not evidence of a positional furniture lock.

**OIS decision:** our Walk mode must explicitly block commands, not just hide buttons. Preserve individual object locks on exit. Multi-floor dollhouse, registration and camera navigation remain staged features in our own design.

## 6. Wall, floor and ceiling materials

The material guide describes selecting one wall side, opening its colour/material swatch and choosing categories such as Colors, Bricks, Wallpaper, Paneling and Tile; floor options include Wood, Tile and Carpet. Materials apply per surface/room; own photos can become material references. It also documents panel creation and texture scaling separately from structure. [Material guide](https://homeplannerapp.com/help/wall-panel-visualizer).

The official colour lesson describes RAL/HEX selection and a colour wheel with shades/tints. It is a legacy course source rather than verification of the current portrait phone control layout. [Colour lesson](https://www.homeplannerapp.com/ru/lesson-6).

**Not verified:** a current explicit matte/eggshell/satin/semi-gloss/gloss inspector equivalent to OIS's requested control. Do not invent one on Home Planner's behalf. AI Redesign's photo recolouring/renovation is a different workflow from editing parametric material surfaces.

**OIS decision:** ten genuinely distinct floors; wall hue/SV/HEX plus textures and five sheens. Real PBR maps and UV scale belong in the runtime; a tint-only preview is insufficient.

## 7. Dimensions, ceilings, doors and openings

The measurement guide describes interior wall measurements, room length/width/ceiling controls, and selected opening distances to corners. Wall + controls add a door/window which can be dragged along the wall; information/position tools expose sizes and sill height. [Measurement/opening workflow](https://share.homeplannerapp.com/help/how-to-measure-a-room-for-a-floor-plan).

The angled-wall guide documents moving/dividing corners and adding an attic/sloped piece in 3D. Its Add Molding action is at the wall top. [Wall and ceiling geometry](https://homeplannerapp.com/help/how-to-draw-angled-walls-on-a-floor-plan).

**Not verified:** a current comprehensive visual door-type picker, repeat-door stamping, exactly how all units options are labelled, or all per-room ceiling-height combinations. Our earlier research found official pages describing floor-level height behaviour; do not assume it equals independent OIS room overrides.

**OIS decision:** width/depth/ceiling on one sheet, metric/imperial conversion, visual door choice first and actual-plan positioning afterward. Repeat last door, both-face dimension chains and independent clear heights are explicit requirements, not claims that Home Planner implements them identically.

## 8. Baseboards versus crown moulding

The reviewed source documents top-of-wall molding; the measuring guide warns that floor-level skirting affects measurements. Neither establishes exact automatic baseboard reconstruction, profile extraction or corner/jamb logic. **Do not equate crown moulding with baseboards.**

**OIS decision:** real 3D profile geometry at the wall base, presets and measured height/projection, optional close-up/ruler references, doorway cutouts and corner joins. Scanner recovery of trim remains a provider-specific capability to prove.

## 9. Plans, capture and cross-device work

Official plan recognition accepts image/PDF input and produces a proposed editable plan; scale and layout still need review. [Plan recognition](https://homeplannerapp.com/help/plan-from-a-photo). The product site describes scanning and desktop apps. Its collaboration guide describes view/edit roles, accounts and connection requirements. [Collaboration](https://homeplannerapp.com/help/design-together-in-real-time).

**OIS decision:** normalized source adapters into one editable project, with manual creation first. Upload and scan keep Coming soon until genuinely integrated. Later shared storage/auth/revision sync supports a web companion. Product existence does not establish that any specific native SDK or model pipeline is reusable by OIS.

## Refresh and evidence rules

When revisiting a feature, update its section with checked date, exact platform/version if observed, the official page or actual captured state, and remaining uncertainty. Search only the changed/unverified part instead of rediscovering the whole app. Do not infer the renderer, Blender use, proprietary algorithms, catalogue licences or exact gesture implementation from marketing. Current verified coverage above is enough to guide OIS's requested creation, catalogue, material and navigation flows; unknowns remain visible.
