# Original Phase 3 — spatial work status

Updated November 10, 2026, 05:58 UTC. Furniture library milestone is accepted: 346 distinct / 311 core / 93 variants, frozen with all evidence in furniture/releases/library-2026-11-10-r1. Overall overnight work remains active through 06:53 UTC.

## Production adoption

The two coordinator-reserved new files are created: mobile/src/scene/spatialView.ts and mobile/src/screens/HouseViews.tsx. Full app TypeScript and targeted ESLint pass. Exact APIs/defaults/hashes: PRODUCTION_HANDOFF.md and spatial/adoption/production-checkpoint.json. App owner retains the Editor/Viewport/RoomScene wiring, camera and resource integration; no Expo/native execution claim yet. No other mobile files were edited here.

## Current evidence

-19policy regressions plus4fixture regressions pass: spatial/tests/spatial-regressions.log. Independent root geometric oracles are in docs/coordination/spatial-plan-probe.json. Conservative rotated model cages are explicitly distinguished from exact transformed vertices.
- Actual Edge browser:17view/layout/resource checks pass on source-matched r6: room/floor/house, top/front/perspective, separated floors, solid ceilings, upstairs-bedroom→kitchen, read-only interior,40view switches,390/320px and large text. Source/fixture hashes and screenshot paths are in spatial/evidence/browser-r6/result.json (SHA-256 `ec83383e09aee3c5d99ec9d682682cf6922f80959b752d01adb62ac6d4a933ac`). Enabled model count is not a claim that all objects are unoccluded in a single projection.
- Authored fixture: two floors/six rooms/40distinct exact model tuples. All furniture cages stay inside the authored16cm wall faces, below ceilings and do not overlap. Each of five inter-room openings has a common unblocked20cm-radius approach on both sides; this is not an entire pathfinding or stair traversal proof. Seating and cabinets face their usable interiors.
- Source-matched production fixture backup is ready: spatial/evidence/production-fixture-r2/six-room-house.backup.json, SHA-256 `6784e78bf4af5dc95cf2365221ba31d3ecfa0085d97d6feee252a1b934d24b41`. Actual production rebuildWalls/validProject/encode/decode accept it;40exact tuples resolve in the current mobile revision inventory. Poses/locks remain unchanged. No existing user save was modified, and this is not a UI import/native result.
- Shared textures: ten renderer texture objects including prototype floor map; stable after warm-up/view switching. Complete disposal returns0geometries/0textures/0leases. The whole-house prototype issues144draw calls in cutaway, above the provisional100call phone baseline; it is not a physical-device performance acceptance. The room/floor scopes reduce active rendering. App performance must be measured separately.

## Remaining work and boundaries

Prompt app adoption and integrated Expo/browser checks are the priority. Keep geometry QA's wall/interior correction disjoint. Next prepare supported-height placement math/fixture under spatial/; do not expose surface/wall models as supported until elevation/attachment, collision, save/reload and Undo paths exist in production. Item currently stores no height. Original Phase3 stair/void markers and advanced ceiling increments remain separate tracked work. House/separation/control styling are reviewable OIS proposals, not verified Home Planner UI or user approval.

## Follow-up maintenance

Future furniture publisher CSV writes now explicitly disable newline translation; regenerated live CSV has noCR-CR-LF. Live status/coverage footers reflect the accepted milestone rather than obsolete rework queues. All frozen library release JSON bytes were verified unchanged. No git mutations from this chat.


Follow-on evidence: SUPPORT_PLACEMENT.md records 16 geometry tests and actual 15-point GLB desk/lamp contact proof on current stricter collision-evidence validation (support-browser-r2). LEVEL_CONNECTIONS.md records 13 marker/void regressions plus actual triangulated slab/ceiling hole rays and area (level-browser-r3). Both remain outside production schema/commands. House-view files are now app-owned; no further writes from this chat.

CEILING_PROFILES.md adds the separate flat/sloped/vaulted/soffit geometry increment: 13 regressions and actual Three meshes, 20 ray heights plus notch rejection, independent surface areas, explicit riser faces and zero retained resources after disposal. It includes a negative-origin asymmetric L-room with an off-centre unequal-slope vault. Frozen browser-r4 evidence is under spatial/evidence/ceiling-browser-r4. Missing profile schema/commands/persistence and double-height connectivity are explicit adoption gaps.

STATIC_BATCHING.md records a frozen read-only browser experiment reducing the same house view from 143 to 75 draw calls, with 344 nearest-surface probes, 17 material/ownership cases and 20 rebuild/dispose cycles. Appearance is close but not pixel-identical (RMSE 0.1636/255); 7.25MiB extra geometry and a single 76.3ms desktop build are material costs. Not added to mobile; native performance is unverified. Source-bound proof: batch-browser-r6 and batch-contract-r1.

All owned geometry regressions pass 77/77 in spatial/tests/all-spatial-result.log. SUPPORT_FAMILY.md adds 12 nested-family/lock/staleness regressions and actual desk/two-lamp transport/contact proof in support-family-browser-r1. It remains an unadopted geometry proposal with mandatory whole-family clearance, not production Undo/save. The adopted app policy also passes the original 19 regressions on a stable read-only actual-source snapshot; AST equivalence ignores formatter parentheses/import roots and confirms no policy/component semantic drift at 05:49 UTC. Evidence: spatial/evidence/production-policy-r2. These helper checks do not replace the app/design/runtime owners' integrated UI and native checks.

Coordinator-requested publication list: PUBLISH_READY.json pins ready source/tests/fixtures/current evidence and documentation. Batching is explicitly a frozen experimental draft and withheld from app adoption. Listed bytes are frozen for the coordinator's sole-Git publication; no branch/index changes occur here. The overnight work gate remains active.
