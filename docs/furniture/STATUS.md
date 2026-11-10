# Furniture production status

Catalogue 0.7.14; 439 complete new candidates, **346 internally accepted distinct designs**, 93 reviewed variants, 0 needing rework. 439 current GLBs have matching hash-bound visual decisions. 39 legacy assets remain compatible.

Manifest SHA-256: `edde7f8f2ba36c7757f555afdeed3f8da5715e886e8ae90952f40c1b20509fa0`. Review-ledger SHA-256: `8fcf9dbe2b53d9307c26942efc3e6adede5b7a2605416c1805629b9e6bbcc3fc`. Exact counts and batch-ready marker: `furniture/catalogue-v2/status.json`, `batch-ready.json`. Manifest publication is atomic; a row appears after export, structural checks and both renders.

**Count changes during repairs are deliberate, not monotonic progress:** a new geometry version/hash returns to candidate status until its new renders are reviewed. The earlier 97-reviewed / 72-accepted checkpoint applied to the then-current 0.2.0 shapes. Replacing the first 20 shapes with 0.2.1 invalidated their prior current-asset decisions; old review decisions were not copied forward. The review-ledger digest and manifest hash pin each count snapshot.

**Work remains active.** Minimum work gate: November 10, 2026 at 01:53 America/Toronto / 06:53 UTC. The goal requires at least 300 distinct designs plus visual quality and the minimum work window; no premature completion.

Accepted by primary room: `{'storage': 23, 'office': 38, 'living': 70, 'entry-hall': 29, 'dining': 40, 'bedroom': 41, 'children': 31, 'kitchen': 30, 'bathroom': 24, 'laundry-utility': 20}`.
Accepted by theme: `{'soft-japandi': 58, 'city-loft': 77, 'coastal-linen': 62, 'walnut-form': 69, 'calm-oak': 80}`.

Count method: curated construction briefs; no colour/size/mirror counts; canonical triangle and normalized mirror/scale fingerprints; three-view silhouette screening; explicit rendered front/back sheet review. Acceptance is internal planning-asset review, not user approval, product certification or phone validation.

Blender 5.2.2 exports + bundled Python structural audit. Run `furniture/scripts/audit_catalogue_v2.py`; inspect `catalogue-v2/geometry-audit.json` for its exact audited count, errors and duplicate groups. Visual decisions are in `catalogue-v2/visual-decisions.json`.

Current production: all-room geometry batches, followed by seating/table/intersection corrections, richer materials, LOD and interoperability tests. See `INTEGRATION.md` for room aliases and immutable revision handling. Old 0.2.0 geometry remains on disk when replaced by a new version; historical manifests exclude it from new-design counts.

Known review themes: curved cushion/shell intersection, shaped-table support fit, wine-divider clipping and visible canopy fabric are under correction before acceptance. Plain material factors are still used in the first candidates. Poly Haven API returned HTTP 403; external models remain research candidates, not falsely claimed imports.

## Frozen textured interoperability fixture

`furniture/catalogue-v2/fixtures/textured-v0.3.2.json` — SHA-256 `ad94017d8ad89a7082aedfb0a7c69312d1f1b4fe99337dd92fb97f08e53b9d03`. Five staged assets (sofa, barrel chair, draped bed, glazed wall cabinet, dining table), exact GLB/image hashes and paths included. No promotion/count implication. Formal report: `furniture/catalogue-v2/format-validation-v0.3.2/summary.json`: 5 checked, 0 errors, 0 warnings at the frozen fixture checkpoint.
