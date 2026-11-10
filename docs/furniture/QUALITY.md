# Production stages and quality gates

| Stage | Required evidence | Current delivery |
|---|---|---|
| Research candidate | source, rights, dimensions/format investigation | Kenney/Poly Haven register only; no downloads |
| Geometry prototype | real editable mesh, stable ID, scale, floor pivot, conservative bounds | 14 cross-room originals |
| Material study | shared geometry with clearly labelled theme palette | 20 living-room palette variants |
| Detailed review candidate | deliberate geometry detail, rendered inspection, measured GLB, no claim of approval | five Calm Oak living items |
| Approved catalogue asset | user visual acceptance, front/back/top QA, material/UV finish, ergonomic review, runtime/device gate | zero |
| Release asset | formal glTF validator, device performance, LOD, immutable version/hash, all rights/credits | zero |

## Reproducible verification

`validate_library.py` independently parses GLB headers, padded chunks, binary accessors, index ranges and node transforms. It checks finite positions, triangle lists, positive transform determinants, actual scene-space bounds and floor Y, no external buffers/images/required extensions, <2,000,000 bytes and <15,000 triangles per asset. It records measured bytes, SHA-256, triangles, exported vertices, draw primitives, bounds, dimensions and footprint in the manifest and `validation.json`. This is a deliberate structural subset, not the official Khronos validator; normals/UV quality, every glTF rule and renderer correctness require further checks.

Per-item previews were Cycles rendered at 600 × 500, 24 samples. The imported five-piece scene uses the exported GLBs, at 1400 × 1100, 48 samples. Studio lighting is a review aid; phone baseline lighting will differ. Authoring sources preserve editable parts; export batches each material into a mesh to avoid a draw call for each cabinet slat.

## Remaining gates and limitations

- Plain PBR colours have no fabric normal, wood grain or UV texture treatment. Do not claim photoreal materials. Current glass is an opaque metallic/roughness study; no transmissive rendering required.
- Five detailed pieces need user review; the shared upholstered lounge chair is deliberately an armchair, not the originally suggested bouclé/sculpted/sling/woven chair in every theme.
- Standard manufacturer dimensions, joinery, usable cabinet depths, appliance service gaps, faucet ergonomics and bunk/loft access are unverified design details. Bed platform/mattress conventions are documented separately.
- LOD1 and LOD2 are planned, not delivered. Start at ≤50% and ≤20% of LOD0 triangles, then inspect silhouettes and material slots at phone distances. Do not decimate thin rails away.
- Current no-texture payload is lean. Future maps target 1k, bounded memory and baked PBR; test KTX2/decoder support before adding required extensions. Retain a supported fallback.
- Verify underside/back and multi-view normals, formal validator results, real phone GLB loading and 15-minute thermal/memory runs before release. Individual budgets do not establish the 40-item scene budget.
- User feedback belongs in the main design review; this companion chat has not edited shared feedback/planning/app files.
