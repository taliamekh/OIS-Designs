# OIS real furniture library

Active all-room production toward **at least 300 distinct designs**. Read [live status](STATUS.md) and [coverage](COVERAGE.md) for current exact counts; generated rows, variants and internally accepted designs are reported separately. The original five-piece/39-file batch is retained in [the initial batch record](INITIAL-BATCH-v0.1.0.md), and its files/IDs remain compatible.

- Consumer entry point: [`furniture/manifest.json`](../../furniture/manifest.json), additive schema 1. Every published row references a complete GLB, source model, thumbnail, dimensions, footprint, material slots, provenance and performance measurements.
- Transfer checkpoint: [`catalogue-v2/batch-ready.json`](../../furniture/catalogue-v2/batch-ready.json), with exact manifest/review-ledger hashes. Use current `qualityStatus` when presenting candidates vs accepted stock.
- Visual review: [`catalogue-v2/review/index.html`](../../furniture/catalogue-v2/review/index.html), indexed front/back sheets with design briefs. The [row inventory](../../furniture/catalogue-v2/inventory.csv) includes explicit count exclusions and variant links.
- Exact geometry/family checks: [`geometry-audit.json`](../../furniture/catalogue-v2/geometry-audit.json). Hash-bound decisions: [`visual-decisions.json`](../../furniture/catalogue-v2/visual-decisions.json).
- [Integration contract](INTEGRATION.md), [licence/provenance register](SOURCES-LICENCES.md), [quality gates](QUALITY.md), [active notebook](PRODUCTION-NOTES.md).

Recolours, mirrored/scaled copies, bed-size-only changes and the 39 legacy files do not count toward 300. Construction-family grouping deliberately excludes relatives that exact hashes can miss. Internal acceptance is rendered planning-asset QA; it does not establish user approval, certified product construction or physical-phone validation.

## Reproduce a new immutable revision

Use installed Blender 5.2.2 LTS and bundled Python; no installation is needed:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python furniture/scripts/build_catalogue_v2.py -- --force --asset-version NEW_VERSION
& 'C:\Users\talia\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' furniture/scripts/audit_catalogue_v2.py
& 'C:\Users\talia\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' furniture/scripts/review_sheets_v2.py
```

Choose a genuinely new version string instead of `NEW_VERSION`. Existing published version paths are never overwritten. The latest runner snapshots its geometry source and parameters, saves editable part-based `.blend` models, cleans degenerate vertices/normals, batches GLB meshes by material, measures the exported geometry and renders front/back images. Failed assets are not published. Resume with the same version: completed records for that version skip; unsuccessful paths need a new version for repair. Procedural modelling is reproducible; byte-identical hashes across Blender sessions are not promised.

Only record visual decisions after actually inspecting the current sheets/images. New geometry hashes invalidate previous current-asset acceptance; counts can fall during a repair run. Prior GLBs remain resolvable through `historicalAssets`, independently of the current review result.

All generated/source/review work is confined to `furniture/` and `docs/furniture/`. The app owner controls copying/integration under `mobile/`. No app features, commits or public publication are implied by this asset work.
