# Domain repair return — 2026-11-10 01:24 UTC

**The bounded repair pass is finished and exclusive edit ownership of the three domain files is returned to the coordinator/app owner. No design-QA edit is in flight.** This does not declare the overnight build or QA goal complete. Further work in this chat is read-only audit plus owned QA harnesses/reports unless another explicit handoff is made. The shared 06:53 UTC minimum-work gate remains active.

## Exact production files changed

| File | SHA-256 at return |
| --- | --- |
| `mobile/src/domain/geometry.ts` | `d9138c18b37995882cfd61c6f6e877e80896773a367f3b5ea98bd5701ce5afa9` |
| `mobile/src/domain/project.ts` | `e85177e62485bf221acdccd35fadb5613c6001341df3af7b5636049fbaf8ea74` |
| `mobile/src/domain/persistence.ts` | `6ef5bed818cddd6fe26925a3356647f349aa854705d341eeae7b3e08105ee945` |

No types.ts, UI/state/scene/catalogue, furniture, build/planning or feedback files were edited in this repair pass. Original source and pre-fix observations remain under baseline-source/ and baseline-*-results.json. The three files were formatted using installed Prettier.

## Resulting behaviour

- Validates new floors, created/drawn rooms, imports, nested render fields, shell topology, IDs/references and finite dimensions. Invalid/unknown commands reject atomically instead of crashing or poisoning history/saves.
- Migrates openings, handing, thickness, per-face paint and trim overrides through room resizing and wall splitting. Preserves physical hole endpoints/motion sectors when canonical wall direction reverses. Rejects real junction/opening conflicts precisely.
- Uses concave-safe overlap checks and exact segment intervals for full footprint containment; handles the U-notch boundary-vertex escape. Per-wall trim clearances and actual hinge/swing sectors are enforced. Pocket cavities and sliding travel cannot cross other openings.
- Allows collision-sampled Walk through real non-window portals, keeping ordinary walls blocked. Command-level Walk edit protection and individual locks remain intact.
- Resolves collision bounds by exact saved id/version/hash from the supplied revision union. Missing revisions preserve records and return actionable conflicts; they are never silently replaced with current geometry.
- Protects future-schema saves, validates backup content, recovers a remaining backup when primary is absent, and does not overwrite the primary if writing its verified backup fails.
- Validates only the moved item against neighbours for a transform. The 300-item fixture's median commit changed from about113ms to1–2ms on this laptop; no physical phone/GPU claim.

## Validation

- **22/22 focused independent checks**: repair-final-domain-results.json, with exact hashes.
- **4,453/4,453 deterministic broader assertions**: stress-domain-results.json. Includes 1,500 analytic L-union overlap fixtures, symmetry/rotation/winding, 100 topology scenarios with physical openings and complete swing-sector comparisons, malformed imports and commands, exact saved revisions, save I/O failures and populated-room transforms.
- **15/15 app tests**: actual `node scripts/test-domain.cjs` passes.
- Full actual TypeScript: `node node_modules/typescript/bin/tsc --noEmit`, exit0.
- Actual scoped lint: `node node_modules/eslint/bin/eslint.js src/domain/geometry.ts src/domain/project.ts src/domain/persistence.ts`, exit0.
- Repaired production files did not change after the reported type/lint runs except Prettier formatting; typecheck and scoped lint were rerun after formatting and passed. Focused/app/stress checks were also rerun on the final hashes.

The first stress harness wrongly compared a directional start anchor after a canonical wall reversal; its 34 false findings are preserved in stress-initial-results.json. The corrected, stronger test compares both physical endpoints and the complete swing-sector point set, varying handing and flip. The in-memory TS loader was also corrected to supply the real filename so standard `.ts` generic syntax is not parsed as JSX. Neither change weakens production acceptance or hides failures.

## Remaining integration / limitations

See INTEGRATION_NOTES.md for the exact asset-registry contract. Studio must deduplicate retained revisions by full tuple, not hash only. Render connected rooms in Walk and keep camera/room context coherent; the old active-room-only scene would otherwise hide a traversed neighbour. Door-open fractions and stairs are not represented by current public types. Conservative furniture OBBs do not support stacking a desk under a loft or objects on support surfaces.

Arbitrary outline changes with changed corner counts and existing opened/finished walls require an explicit future topology mapping; they reject instead of losing work. Polygon edits with corresponding ordered corners and supported resize/add-room operations are covered. A formerly corrupt save/history remains protected rather than being silently repaired by deleting data. No data schema was changed.

Latest isolated browser home smoke now succeeds at390×844 after the app owner's server restart: two matching Coming soon labels, all three creation entries, no horizontal page overflow, and no recorded page/console errors. This is web evidence only. Editor gestures, native iPhone/Android rendering, recovery under OS interruption and thermal performance remain outside this handoff's proof.
