# Runtime QA checkpoint

Recorded Nov 9, 2026, 11:13 p.m. America/Toronto. This supports the original Phase 2 and bounded Phase 3 work; Phase 1 physical-device acceptance remains open. Overnight work continues through at least 01:53 Toronto.

The separate current-review scene loads 40 exact reviewed revisions in 41 placements, keeps 315 leases and 12 renderer textures through Walk/3D cycles, and preserves exact saved data. Independent tints, Undo/Redo, cold reload and bounded idle cleanup pass. Actual iOS/Android Hermes v99 bytecode exports pass; all 825 retained GLB revisions are byte-exact in each export. The [machine-readable summary](summary.json) pins the exact source, review, model, compiler and output hashes.

Open browser framing defects: [structural Undo leaves a tiny room](dynamic-camera-small-after-undo.png) and [whole-floor view clips a taller adjacent room](mixed-height-whole-floor-low-active.png). These remain functional defects despite successful compilation.

No native linking, VM/device launch, EXGL, physical gestures, FPS/thermal or OS-interruption acceptance is claimed. Internal asset review is not user approval and does not establish 300 distinct designs.

![Current40model scene](current-reviewed-40-overview.png)
