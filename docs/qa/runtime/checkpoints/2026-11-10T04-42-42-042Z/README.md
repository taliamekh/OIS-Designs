# Runtime QA checkpoint

Recorded Nov 9, 2026, 11:42 p.m. America/Toronto. This supports the original Phase 2 and bounded Phase 3 work; Phase 1 physical-device acceptance remains open. Overnight work continues through at least 01:53 Toronto.

The separate current-review scene loads 40 exact reviewed revisions in 41 placements, keeps 315 leases and 12 renderer textures through Walk/3D cycles, and preserves exact saved data. Independent tints, Undo/Redo, cold reload and bounded idle cleanup pass. Actual iOS/Android Hermes v99 bytecode exports pass; all 825 retained GLB revisions are byte-exact in each export. The [machine-readable summary](summary.json) pins the exact source, review, model, compiler and output hashes.

Both original browser framing defects are repaired: [structural Undo refits the room](dynamic-camera-repaired-small-after-undo.png), and [mixed ceiling heights fit from the shorter room](mixed-height-repaired-low-active.png). The actual camera bridge passes four targeted source checks. Six real IndexedDB transaction-interruption cases also pass; these are deliberate aborts, not disk-full or native interruption tests.

Each check pins its own source snapshot. These records are bounded evidence, not overall Phase 2 signoff or a single final-head test run.

No native linking, VM/device launch, EXGL, physical gestures, FPS/thermal or OS-interruption acceptance is claimed. Internal asset review is not user approval and does not establish 300 distinct designs.

![Current 40-model scene](current-reviewed-40-overview.png)
