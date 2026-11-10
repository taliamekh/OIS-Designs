# Integrated house-view runtime checkpoint

Immutable browser source ca34f677… matches all 59 compiled app-source modules. The synthetic two-floor/six-room saved library contains 40 older exact model revisions in 41 placements and one real Undo step. The [exact summary](summary.json) records all source/fixture/evidence bindings.

Actual Room/Floor/House controls, Perspective/Top/Front presets, solid/cutaway walls, ceiling visibility, floor separation/realignment and fit actions were exercised. All 20 actual camera states fit the intended complete world bounds; 676 independently composed placement projections match the existing diagnostic within 1.03e-13 CSS pixels. The audit uses actual camera/quaternion/projection matrices and exact parsed model geometry. No horizontal overflow at 320×568 or 844×390. Short-screen sheet leaves a 239-pixel renderer; controls remain reachable through its scroll area.

Upper room/floor scope correctly returns to local floor coordinates. The older 14 m reference-line room displays 13.880 m inside width/depth and its 5.200 m override, without altering saved coordinates. The complete 41,797-byte library, including Undo history, exact models, poses, locks, floor elevations/alignment and finishes, remains byte-identical after all views and cold reload. Zero browser warnings/errors.

This 05:28 source snapshot predates the app owner’s later house-overview history-button guard. Its visible Undo/Redo controls are known historical behavior; those callbacks were not invoked and the later guard is not claimed verified here. Subsequent strict connected-room lock changes also require current-source UI evidence. This checkpoint does not close overall house-read-only or room-movement acceptance.

Separately, all 1,187 retained GLB revisions/294,090,088 bytes parse through installed Three with finite vertices and metadata bounds matching within floating-point error. Texture dependencies in that CPU audit are explicit stubs. Six source camera regression groups also pass at their independently pinned source.

Bounded original Phase2/3 evidence, not current-release visual approval, complete phases, physical phone/native linking, image decode, GPU bytes, FPS, thermals or OS interruption acceptance. Work continues through at least 06:53 UTC.

![Separated house and controls](spatial-house-separated-panel390.png)

![Short phone layout](spatial-house-panel320.png)

![Landscape separated house](spatial-house-separated844.png)

![Legacy inside-wall readout](spatial-upper-legacy-inside-dimensions390.png)
