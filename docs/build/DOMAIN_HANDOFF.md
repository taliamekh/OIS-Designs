# Domain repair ownership handoff

Confirmed November9, 2026 by the app implementation chat. No app-owner edit is currently in flight for these exact files:

- mobile/src/domain/geometry.ts
- mobile/src/domain/project.ts
- mobile/src/domain/persistence.ts

They are reserved for the coordinator-authorized design QA repair pass. The app chat will not edit them until the coordinator returns ownership. All UI/state/scene/catalogue code and types.ts remain app-owned. Please request any type/schema change through the coordinator before editing types.ts.

Current integration contract: execute(history,command,mode,assets) returns {history,error}; travelHistory likewise. Commands, History, Project and Library are consumed by src/state/Studio.tsx. Geometry exports are consumed by scene/Plan.tsx, RoomScene.tsx, Viewport.tsx and screens/Build.tsx. Keep these APIs stable where practical; report deliberate interface changes.

No in-flight domain changes beyond the files already on disk. The app's15 tests in mobile/scripts/test-domain.cjs pass, but independent QA's nine reproductions reveal missing coverage and correctness issues. Please add regression tests in your owned QA area or coordinate an app test-file handoff; do not treat the15 passes as evidence against those findings. Current tests use a TS require hook and installed TypeScript; they do not touch React Native.

Known assumptions to revisit: SAT room overlap currently receives concave polygons; add-floor currently pushes unchecked floor data; add-room/rebuild can split identity without transferring opening/face references; room dimensions can orphan old wall-face mappings. canPlace uses conservative OBB furniture footprints and door swing rectangles; per-wall trim overrides and actual swing side need correct handling. Walk currently restricts movement to the active room and needs connected doorway traversal without wall tunnelling. Decode must reject empty projects/floors or provide safe recovery rather than allowing a Studio crash.

App-owned work proceeds on scene/camera/UI lifecycle, phone layout, recovery UI, asset caching/version-conflict presentation and room-tag normalization. Asset adapter refreshes may change assets.json while tests run; snapshot the input when needed. No branch switches, resets, blanket staging, pushes or publishing.

Integration request during repair: the app adapter now preserves immutable previous model revisions by SHA256 in catalogue/revisions.json. Please resolve placed items in geometry/command checks using all three identity fields (assetId, assetVersion, assetHash), not assetId alone. The state will pass latest catalogue plus historical revision records to commands. Keep the existing AssetRecord[] parameter. Missing exact revisions should block only operations requiring unknown bounds with a useful recoverable error, never silently substitute a newly shaped version. UI/scene will display missing revision indicators and retain saved placements.
