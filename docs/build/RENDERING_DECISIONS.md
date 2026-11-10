# Rendering and phone interaction decisions

App implementation decisions are reversible proposals unless explicitly stated as user preferences. Round3 plus November9 phone corrections remain the contract.

## Native touch ownership

Installed R3F/native9.8.2 creates child capture responders. A parent using only bubbling responder requests can lose the gesture. The app uses one outer viewport responder, parent capture requests, and a pointer-events-disabled child drawing subtree. Camera, object drag and Walk share the app-owned gesture arbiter; R3F supplies drawing and raycast objects. Floating controls and sheets are sibling views, so the drawing responder does not capture their touches.

This follows React Native0.88's [capture responder guidance](https://reactnative.dev/docs/gesture-responder-system) and [View pointer-event semantics](https://reactnative.dev/docs/view#pointerevents), checked against installed source. Browser tests will exercise the shared controller. Physical iPhone/Android input negotiation remains unverified; no test substitutes for that gate.

## Phone space

Units live in Settings. Furniture is a compact expandable sheet. The scene resizes into the visible area above a sheet so the furniture stays visible instead of being hidden underneath it. One room/floor selector replaces duplicate header navigation. Undo/redo appear when history exists. Cutaway is a Build option rather than a permanent extra viewport button. The portrait camera fits actual room corners with reserved control space; the plan defaults to the active room and has a whole-floor option.

## Surface appearance

Ten floor types and nine wall-covering types use original deterministic procedural512px base-colour, tangent-space normal and roughness maps. These are actual renderer inputs, not swatch-only colour variants. Repeat size is stored in metres, independently of polygon dimensions, and floor orientation is stored in radians. This first texture set is stylized and reviewable; it does not claim photographic capture or commercial finish matching.

Paint colour, covering texture and sheen are stored separately per room-facing wall. Whole-room apply updates only that room's faces. Five sheen choices map to distinct PBR roughness values for visual comparison; they are not manufacturer gloss measurements. [Benjamin Moore's finish guide](https://www.benjaminmoore.com/en-us/interior-exterior-paints-stains/how-to-advice/painting-101/choosing-paint-finish) supports treating finish sheen as a separate choice, with matte/eggshell/satin/semi-gloss/gloss differing in reflectance and uses.

The current surface taxonomy distinguishes painted drywall, mineral plaster, limewash, microcement, brick, stone veneer, timber slats, painted panelling, linen wallpaper and ceramic tile. It replaces the rejected small mockup list with material families rather than promoting arbitrary colour names. Product-specific substrate/installation performance is not inferred from a visual material selection.

## Assets and resources

Furniture source files remain read-only. The adapter verifies bytes and SHA256, copies immutable hash-named GLBs, retains earlier imported revisions, normalizes room aliases, and publishes static requires before metadata. Only placed/visible models are parsed; catalogue rows use thumbnails. A bounded idle model cache retains up to8 unreferenced models within16MiB of source payload, never disposes live instances, and clones materials per placed item. Source payload bytes are not measured GPU memory. Device resource/thermal tests remain pending.

Missing exact revisions keep their saved positions and locks and receive a visible error marker plus a recovery notice; they must never become a newly shaped model silently. Command collision and Walk checks must use the same exact revision bounds as rendering.

## Native map upload and launcher

Surface texture clones preserve the source's isDataTexture adapter flag when present. Installed R3F/native marks a base Texture this way so EXGL receives image.data.localUri; Three.Texture.copy otherwise drops it. Ordinary web image textures keep their ordinary upload path. Actual Three/native-shaped source regression passes; physical native upload remains unverified. See docs/qa/design/NATIVE_SOURCE_AUDIT.md.

The Expo template launcher artwork is replaced by plain lowercase ois text on the app paper colour, generated locally from the existing Windows UI font. This is a development placeholder consistent with plain text branding, not a newly approved company logo. Existing Expo template assets remain preserved and unused.

