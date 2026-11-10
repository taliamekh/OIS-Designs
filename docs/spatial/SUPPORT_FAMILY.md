# Attached-family transport proposal

`spatial/src/supportFamily.ts` prepares one immutable pose collection for a support and its attached descendants. It remains outside production `mobile/` schema, commands, renderer and persistence. No app Undo/save integration is claimed.

The proposal traverses parent before children, preserves exact model identities and parent-relative offsets, and blocks locked descendants, cycles, missing children, cross-room attachments, unresolved revisions and stale relative/world poses. A supported root requires an explicit detach proposal. Every candidate item is passed to a mandatory whole-family clearance provider; a transport calculation alone cannot authorize placement.

The caller supplies a token covering the actual room/wall/ceiling/support/asset context. Materialization rejects any token, scene pose, lock, asset or attachment change since validation. Proposals are transient, deeply frozen objects; reconstructed JSON cannot bypass the validation path. The immutable result preserves unrelated items and extra fields such as material overrides. Production must commit it through one guarded domain command and one Undo transaction, with its own full context and persistence tests.

Twelve regressions pass in `spatial/tests/supportFamily.test.mjs`. They include independently known nested 90° transforms/elevation, complete-group lock rejection, stale scene/context refusal, clearance failure and preservation of unrelated/material state. Full owned suite now has 77 passing cases across all six test files.

`spatial/evidence/support-family-browser-r1/result.json` binds the actual writing-drawer-desk and two instances of banker-desk-light to source hashes. The complete three-item move translates and rotates the desk, retaining both lamps on its actual top with zero measured bottom/top contact error. Actual top rays agree. A locked lamp, Walk and an out-of-room proposal reject the complete group. Restoring the local initial pose collection is exact; attachment JSON roundtrip reconstructs both positions. Complete disposal returns zero geometries, textures and leases, with no browser errors.

The before/after/restored screenshots demonstrate local geometric transport. They do not prove production Undo, native gesture handling, load-bearing support or a general precise mesh-collision system. The validator uses the reviewed desk region and conservative footprint/vertical collision checks from SUPPORT_PLACEMENT.md.
