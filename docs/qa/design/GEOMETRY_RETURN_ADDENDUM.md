# Returned geometry — requested legacy/insertion checks

05:17 UTC. The exact returned geometry0b029dd1…/projectdbc3f9e… remain unchanged. Production writes stopped at the05:11return; app integration can proceed using GEOMETRY_RETURN.md and GEOMETRY_API_PREVIEW.md.

New `boundary-insertion-legacy.json` passes **25/25** additional cases against those exact hashes:

-24new-opening insertion cases cover single/double/surface slider, both hinge fields/flips and near/safe controls. Every initial furniture placement is valid before the door exists. New physical collisions reject with the exact original history, while safe doors add one history step and Undo restores the original project. This complements the120real-GLB furniture-near-existing-door cases and14,544continuous hinge-panel corner samples.
-One compound legacy case decodes an old wall-overlap placement with past/future snapshots byte-for-byte, then exercises floor finish, all-wall paint, unlock, each action's exact Undo/Redo, saved-history travel and Walk guards. The original source history/pose/revision remains unchanged. Unlock→move-out reaches a clear valid position. No persistence validation change or implicit migration was needed.

These analytic boxes are explicitly synthetic test shapes, not new furniture models or native/render proof. Geometry-neutral editing remains usable for a recoverable legacy collision; newly introduced physical intersections are rejected. The separate31case aperture/sill/lintel/glass/trim-height and both-face inside-dimension fixture remains passed. Required app-owned UI/readout/mesh adoption and actual source-matched Expo retests remain open.
