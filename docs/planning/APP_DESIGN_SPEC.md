# OIS Designs — current phone design, round 3

November 8, 2026, with implementation authorization added November 9. This document and the parity checklist supersede conflicting earlier mockup notes. The user now explicitly requests the real Expo build in a new chat and autonomous overnight work; this supersedes the earlier requirement to preserve the starter pending a separate approval. The browser review remains a prototype. No feature can be treated as finished merely because its screen exists. See `OVERNIGHT_BUILD_HANDOFF.md` for current execution instructions and the expanded 300-distinct-design furniture requirement.

## Branding, copy and hierarchy

**November 9 phone correction:** Units are configured in Settings, not a persistent editor button. Furniture uses a compact, expandable bottom sheet over the room renderer; prioritize viewport space and contextual tools. Paint targets one wall face by default, with a readily accessible explicit Apply to room action. Research credible wall finish options beyond the rejected mockup choices. These instructions supersede conflicting round 3 screen details below.

Use plain `ois designs` text. No company image logo, taglines, promotional quotes or obvious scene commentary. Functional labels only. Upload floor plan and Scan Room use the same right-aligned Coming soon badge and honest planned-flow previews. One entry point per action on a screen; contextual controls replace the global Add duplicates. Keep most editor space for the room.

## Creation and project navigation

Start offers Create room or floor plan, Upload floor plan and Scan Room. Manual creation asks for whole floor plan or a room type (living, bedroom, kitchen, dining, bathroom, office, children's room, entry, utility). Next choose square, rectangle, L-shape, or draw walls from scratch. A blank house opens the floor-plan drawing context. Generic rooms expose width/depth/ceiling height together before entering the editor; these values stay editable together afterward. Switching metres/feet changes display/input conversion, not underlying geometry.

Within a project, keep project/back navigation and room/floor selection; view modes are **2D, 3D and Walk**. Design actions are **Furnish, Surfaces and Build**. These are action drawers, not progress steps. Furnish opens a catalogue and returns the selected asset to the current 2D/3D view. Surfaces exposes the selected floor/wall/trim. Build contains room dimensions, add room, doors/openings, windows and trim. Avoid duplicating these with another top Add control. Settings returns to the same room/view/selection. Post-import and post-scan review commits the structure into this same editor rather than a different scan-specific editor.

## Furniture assets and catalogue

The manual room and **actual 3D furniture** are parallel early work. Do not wait for scans or use SVGs/billboards as final furniture. The dedicated furniture chat owns source modelling, sourcing/licences, model exports, previews and manifests. Blender is installed according to that chat's environment check. A detailed real-model batch plus geometry prototypes is being prepared; prototypes and material studies must not be called a finished all-room catalogue.

Extend Calm Oak, Walnut Form, Soft Japandi, City Loft and Coastal Linen into coordinated cross-room themes. Cover living, bedroom, dining, kitchen, bathroom, office, entry/hall, utility/laundry and children's rooms. Theme is independent of furniture function and colour variant. Beds include twin, full/double, queen, king, bunk and loft, with documented regional dimensions; a loft bed needs proper geometry, not a stretched regular bed. A manifest supplies ID/version, room/category/subtype, bed-size subtype, theme, colour/material slots, real dimensions, pivot, footprint/collision bounds, licence/provenance and performance statistics. A set suggests matching pieces but does not force buying or placing every piece.

Catalogue: keyword search, room/category, furniture subtype, bed size, style/theme, colour/material, fit dimensions, favourites, recent selections and clear active-filter chips. Start with the current room's categories; other rooms remain reachable. Search matches names, tags and synonyms, handles no results without deleting filters unexpectedly, and persists the browsing position when returning from placement. No price/brand/stock claims without actual data. Models may expose fabric/wood/metal slots independently so colour variants do not repaint the entire object.

## Direct placement, locking and walkthrough

Placement works in **both 2D and 3D**. In 3D, raycast onto the active floor/support plane, preserve grab offset and show a ghost footprint/contact. Furniture drag is independent of camera orbit; once the gesture owns the object, camera movement is suspended. Use direct rotation handles or a deliberate rotate gesture; remove centre-item and directional/nudge buttons.

Quick move lets a drag begun on any unlocked piece move it without first entering a per-item Move mode. Tap still selects for properties. A locked piece cannot translate, rotate, resize, duplicate through a move action, or be removed by accidental canvas gestures; intentional property/delete operations require explicit selection/intent. Lock/unlock is a visible selection property with an on-object state indicator. Lock settings persist and are undoable; selecting another piece or reopening the app must not unlock it. Lock differs from hidden and from scan-detected original objects.

Grid/free settings apply to 2D and 3D using the same floor-wide metre coordinate system. Do not move existing items on toggling. Keep the 10 cm default and defined precision rules from the architecture, but allow direct pointer placement. Typed positions belong in an optional property inspector, not a persistent arrow control pad.

Walk mode is explicitly **read-only**: no selection mutation, object drags, adding/removing, paints, dimensions, undo/redo mutations or editor keyboard shortcuts. Guard the command layer, not merely the visible buttons. Camera/room/floor navigation remains available. Exiting restores prior editor mode and the original individual lock states; it must not unlock everything. No material or geometry should change after a full walkthrough. First-person camera avoids walls/obstacles; stair traversal depends on actual connected openings, not a camera teleport disguised as a staircase.

## Materials: distinct floor appearances and wall controls

Initial floors (at least ten): **white oak planks, walnut planks, maple planks, oak herringbone, bamboo, slate tile, marble tile, terrazzo, concrete and wool carpet**. These differ in grain, joints, pattern scale/orientation, surface texture and light response, not only RGB tint. Each needs a stable material ID, real-world repeat size, licensed/generated base-colour texture and appropriate normal/roughness data; share bounded textures/LODs where sensible. Switching material must visibly change the room floor, while adjacent rooms retain their materials. Plank/tile direction and repeat size are editable without stretching textures with room size.

Walls: choose **any colour** using hue wheel plus saturation/value and precise HEX entry; provide recent swatches. Texture choices include smooth paint, plaster/limewash, brick, wood slats/panelling, wallpaper and tile. Sheens: matte, eggshell, satin, semi-gloss and gloss. Store colour/texture/roughness separately, apply to selected wall face, and expose an explicit whole-room apply operation only when requested. Reflectance must respond to lighting in real 3D; no assertion of exact physical paint matching. Preview libraries may simulate texture, but the Expo build requires real materials and correct UV/colour-space handling. Three's physically based material supports these maps; device rendering remains a validation gate. [Primary material API](https://threejs.org/docs/pages/MeshStandardMaterial.html).

## Baseboards and trim

Provide none, flat/square, bevelled, ogee/colonial and stepped/tall profile families. Record profile cross-section, height, projection, material/colour and sheen; allow room default and per-wall override. Generate real 3D trim along wall-face paths, clip at doors/openings, join/mitre corners, terminate at casing and preserve consistent scale. Do not paint a line onto a wall and call it trim. Furniture clearance checks account for trim projection.

Manual preset selection and height/projection measurements are the dependable starting path. For an exact existing profile, optionally attach a close-up straight-on photograph with a ruler/reference and review its measurements. Do not require users to scan every baseboard to use the editor, or promise automatic reconstruction of small mouldings from a standard iPhone 13 scan. A close-up without scale does not establish dimensions. Later source adapters can supply verified trim if the scanning team can actually recover it.

## Doors: select visually, position in the plan

Build → Doors presents illustrated type cards: single swing, double swing, surface sliding, pocket sliding and open doorway. Plain-language illustrations show how each opens; choosing a type does **not** ask the user to position it in an abstract detached wall diagram. Opening width/height have sensible editable defaults. The selected type becomes a plan placement tool.

Position by tapping/dragging an actual eligible wall in the floor plan. The selected opening shows width and distances to adjacent corners on both room-facing sides of that wall, with room labels and optional precise numeric editing. Keep frame/clear/rough-opening conventions explicit as in the architecture. Provide hinge/swing/travel flipping in the selected door's contextual properties. Validate shared-wall extents, overlap, ceiling height, door motion and pocket/track feasibility.

**Quick doors:** remember last type/size/handing and offer recent types. Keep placing/repeat mode remains active after each placement; tap another wall to place the next opening. Done exits; Undo removes the last individual placement. Switching view or room does not silently stamp more doors. Each placement gets its own stable ID and one undo command. A type-specific pocket requirement remains visible when invalid; do not silently turn it into another type.

## Dimensions, multi-floor and inputs

Width, depth and ceiling height are on the same room dimensions sheet. Display metres or feet (with feet/inch readouts or explicit decimal feet inputs); canonical storage stays metres. Changing display units must not accumulate rounding or resize the room. Individual wall measurements remain accessible on the plan. Remove the separate height-only screen. Floor defaults and room overrides stay distinct; sloped/vaulted/soffit/double-height profiles remain explicitly planned later geometry increments.

Preserve multi-room and multi-floor data, house dollhouse/cutaway, alignment and room jumping. Uploaded plans and scans still require dimensional/scale review and produce the same editable structure. Upload/scan availability remains honest: Coming soon until actual providers pass acceptance. Standard iPhone 13 LiDAR fallback remains manual/upload or a separately validated camera provider.

## Approval and first Expo build

After the user approves this design round, guide the existing Windows/iPhone setup; do not reinstall working tools. Validate SDK/Expo Go compatibility, launch the preserved starter, then implement against `BUILD_PARITY_CHECKLIST.md`. Internal increments may be small, but the first design-parity review must cover **every approved screen and interaction**, including real furniture/room models, real materials, 2D/3D placement, locks, walkthrough safety, search, quick doors and units. Additional features must not displace required ones or introduce unreviewed clutter. Keep genuine later features labelled accordingly; never claim a fake scan/import or replace real models with SVGs to satisfy a checklist.
