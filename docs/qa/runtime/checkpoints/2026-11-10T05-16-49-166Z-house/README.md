# Two-floor saved-house runtime checkpoint

The immutable browser consumer contains 478 current records and 1,187 retained revisions. This synthetic two-floor/six-room library pins 40 older exact model revisions in 41 placements. The upper floor has elevation 6.2 m and alignment (+3.2, −2.1) m; individual room ceilings vary. The [exact-hash summary](summary.json) records source and fixture identities.

All 40 requested GLB identities, 40 precise geometry bounds and 125 actual material bindings match. All 41 observed item projections agree with independently composed floor elevation/alignment and item pose. The app diagnostic uses conservative bounding boxes; the CPU audit reproduces that measurement and separately checks precise vertex bounds. The initial metadata-centre comparison is retained as a diagnostic investigation, not a product failure.

Cold reload, ground/upper room jumping, all-floor restoration, actual orbit drag, read-only upper-floor Walk, 320×568 and 844×390 layouts pass. The final public 21,085-byte library is byte-for-byte identical to the fixture, preserving all saved identities, poses, locks, room/floor geometry and history. Zero browser warnings/errors. Scope changes may reload evicted models; settled whole-house ownership remains 40 active/wanted models, 315 leases and 12 renderer textures.

The first network window was truncated. Six missing first-room requests were captured after a genuine cold reload of the same immutable consumer and unchanged project, then merged by URL with the original 34. The report explicitly retains that recovery qualification.

This is bounded Phase 3 baseline and legacy-save evidence, not current-release visual acceptance, user design approval, complete Phase 3, stairs, or physical iPhone/Android acceptance. Other design/clearance findings remain separate. Work continues through at least 06:53 UTC.

![Whole house at 390 pixels](phase3-house-whole-390.png)

![Narrow house view](phase3-house-whole-320.png)

![Landscape house view](phase3-house-whole-844.png)
