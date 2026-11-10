# Hash-bound visual review and staged promotion

The 72 → 56 → 0 internally accepted count changes were deliberate current-asset invalidation during geometry regeneration, not lost review decisions. The first 97 decisions applied to older GLB hashes. New 0.2.1 geometry returned to candidate status; it did not inherit those approvals. The current manifest/review-ledger digests pin each published snapshot. The first count is a historical checkpoint, not current stock.

The initial review retained GLB/image hashes but its mutable contact sheets did not yet have immutable archives/member bindings. Those historical decisions are retained as evidence of early inspection and **are insufficient for new promotion**. Current acceptance requires schema-2 bindings:

1. At sheet generation, `index.json` captures each member's ID, asset version/SHA-256, front/back paths and image SHA-256, plus the JPEG sheet SHA-256. The exact sheet bytes are copied to `catalogue-v2/sheet-history/<sha>.jpg`.
2. At review recording, `record_visual_review.py` rejects changed GLB/version, image bytes or sheet bytes before writing any decision. Decisions include member bindings, exact image hashes and immutable sheet archive references.
3. At publication, `catalogue_manifest.py` independently rechecks those bindings against the current asset and actual files. It resets inherited accepted state before applying valid evidence. Missing/stale/changed evidence cannot increase accepted counts; decisions remain preserved rather than silently erased.
4. A staged revision remains outside the current catalogue until promotion. Promotion additionally requires the current geometry fingerprint and clean official glTF validation. Rejected/unreviewed staged content does not replace an older current asset.

`test_review_provenance.py` has nine passing regressions, covering matched evidence, changed asset hash/version, old hash-only decisions, changed front/back render, changed archived sheet and member mismatch. These tests establish guard behavior; they do not substitute for actually inspecting the rendered sheet.

Current staging: `catalogue-v2/staged/v0.3.0` demonstrated real maps but formal validation identified missing explicit tangent-space attributes. That revision was stopped and is not promoted. A triangulated, tangent-exported fixture is being produced under `v0.3.2`; exact file/hash records will be linked from STATUS/INTEGRATION when complete. No phone compatibility is inferred.
