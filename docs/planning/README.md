# OIS Designs — current design review

November 8, 2026, round 3. App implementation awaits approval. The browser review now loads actual GLB assets from the dedicated furniture chat; this is not proof of Expo/device performance or completion of the full catalogue.

- [Current design specification](APP_DESIGN_SPEC.md): authoritative flow and requirements.
- [Build parity checklist](BUILD_PARITY_CHECKLIST.md): required screens, interactions, assets and acceptance evidence; prevents silently reducing the first Expo review to a starter.
- [Home Planner reference](HOME_PLANNER_REFERENCE.md): reusable sourced feature/workflow reference, including explicit unknowns.
- [Git workflow](GIT_WORKFLOW.md): present repository state, branch/commit/push/PR conventions and asset storage.
- [Setup after approval](EXPO_AFTER_APPROVAL.md): existing Windows/iPhone/Expo setup and staged parity build.
- [Preferences](../../design-feedback/preferences.md) and [decisions](../../design-feedback/decisions.md).
- [Furniture library review](../furniture/README.md): first real-model batch, asset maturity, licences and expansion plan.
- [Architecture](ARCHITECTURE.md), [phased plan](PHONE_APP_PLAN.md), [initial research](RESEARCH.md): background, with round 3 overrides noted.

## Review contents

Plain text branding; create room/floor plan → room type → shapes/scratch → combined width/depth/ceiling dimensions; metric/feet; one 2D/3D/Walk editor with Furnish/Surfaces/Build; icon undo/redo; direct furniture drags/locks; searchable themed catalogue with bed-size filters; ten floor appearances; wall colour wheel/HEX, textures/sheens; real 3D baseboard profiles; visual door choice followed by repeat placement on the plan. Upload and scanning remain Coming soon.

`phone-mockups-v3.html`, `phone-review-v3.css`, `phone-review-v3.js` and `phone-review-3d.js` are the editable review sources. `build-review-v3.py` assembles `phone-mockups.html` and the chat preview, embedding hash-verified compressed local GLB geometry, thumbnails and original procedural floor studies. The fragment stays below 1 MB. It loads a pinned Three.js runtime from the allowed CDN and makes no real upload/scan/account calls. `review-asset-proof.json` records model sources and maturity. `archive/round-2.html` preserves the previous design; do not reapply its one-time migration scripts.

`verify-review-v3.cjs` uses installed Edge and bundled Node to check the prototype and save `screens-v3/` and `round3-checks.json`. The visualization runtime wraps it for QA. It is not published. Do not count old round 2 QA or image-logo choices as current approval.

## Practical limits

This is a review prototype. Its interaction examples do not constitute a robust room constraint solver, complete 3D collision/walk path solver, production importer, mature theme catalogue or native persistence. Model candidates/prototypes and palette studies retain those stages. Floor textures are original procedural appearance studies, not the complete production PBR library. Shape geometry, room/floor structure, opening mechanisms, per-face materials, exact trim matching and multi-floor behaviour still require the production acceptance in the design contract. Real exported meshes are not by themselves phone runtime validation.

No `mobile/` feature code was changed. After user approval, follow the setup guide and implement the complete approved design with explicit incomplete-item reporting.
