# GitHub checkpoint publishing

User authorization: November 9, 2026. Repository: [taliamekh/OIS-Designs](https://github.com/taliamekh/OIS-Designs). This supersedes the earlier no-push instruction. Root is the sole Git writer while chats share one checkout; all workers continue their owned work and supply ready checkpoints.

## Verified identity and initial checkpoints

- GitHub owner/authenticated profile: `taliamekh`, user ID `251501218`.
- Local author/committer: `taliamekh`, ID-based GitHub noreply email. GitHub confirmed author association for the source commit. No anonymous placeholder or bot co-author.
- `528349ea5a9cb52f27658641c78a394391129b8d`: initial source, original plans, live numbered phase map and QA harnesses; pushed to `main`.
- `461b78d185e72ceabcab0d6c367ed72339237c68`: required app binaries and review images using Git LFS; pushed to `main`. Committed-tree closure: 825 retained revisions and 1,770 static asset references, no missing paths. Local LFS object verification passes.
- Full model/source/review archive checkpoint is continuing separately; unreviewed/staged content is never a completion claim.

## Cadence and procedure

1. Inspect authoritative thread/file status; collect a coherent ready increment and its tests/known limitations. Do not stop the build waiting for routine user approval.
2. Use explicit reviewed path lists. Exclude dependencies, client inputs, credentials, generated bundles, local logs/PIDs, caches and incomplete export files. Preserve hash-bound source bytes; use LFS for model/image binaries.
3. Verify `git var GIT_AUTHOR_IDENT` and committer identity against the configured account. Commit with a conventional message describing the actual increment and validation.
4. Push explicitly to `main` while retaining the shared local `codex/project-foundation` branch. Never force-push; reconcile any remote divergence first.
5. Verify the remote ref and GitHub author association. Record the actual SHA, time and evidence here or in the coordination log.
6. Publish after meaningful verified milestones, with no more than 30 minutes of ready changes left unpushed during active overnight work. Do not rerun unchanged expensive tests merely to produce another green count.

Workers must not concurrently run add/commit/push or switch this shared checkout. A later separate worktree/branch protocol needs an explicit ownership handoff.

The active plan remains [PHASE_STATUS.md](../planning/PHASE_STATUS.md), mapped to the original [PHONE_APP_PLAN.md](../planning/PHONE_APP_PLAN.md). Current position is Phase 2 implementation/validation with partial Phase 3, and Phase 1 physical-device acceptance still pending. The queued furniture successor work belongs to Phase 3.
