# GitHub checkpoint publishing

User authorization: November 9, 2026. Repository: [taliamekh/OIS-Designs](https://github.com/taliamekh/OIS-Designs). This supersedes the earlier no-push instruction. Root is the sole Git writer while chats share one checkout; all workers continue their owned work and supply ready checkpoints.

## Verified identity and initial checkpoints

- GitHub owner/authenticated profile: `taliamekh`, user ID `251501218`.
- Local author/committer: `taliamekh`, ID-based GitHub noreply email. GitHub confirmed author association for the source commit. No anonymous placeholder or bot co-author.
- `528349ea5a9cb52f27658641c78a394391129b8d`: initial source, original plans, live numbered phase map and QA harnesses; pushed to `main`.
- `461b78d185e72ceabcab0d6c367ed72339237c68`: required app binaries and review images using Git LFS; pushed to `main`. Committed-tree closure: 825 retained revisions and 1,770 static asset references, no missing paths. Local LFS object verification passes.
- `5adfef4835eea6706bf6c2721f9e5d4a0430a0b0`: immutable model/source/review archive, 8,560 additional files; 6,763 unique LFS objects uploaded (about 1.2 GB). Pushed to `main` and remote SHA verified at 04:30 UTC. GitHub associates both author and committer with `taliamekh`. Unreviewed/staged archive content is never a completion claim.

- `5d1c961230d1c4689a5386ef0568d94ff4ceaa93`: final frozen library readiness milestone, dependency assets and source CI; pushed at 04:40 UTC. GitHub associates author/committer with `taliamekh`. [Remote checks passed](https://github.com/taliamekh/OIS-Designs/actions/runs/42757289719): locked install, TypeScript, ESLint and domain/storage/scene tests. Later working-tree changes require their own checkpoint.

## Cadence and procedure

Latest integrated checkpoint: `43b53e6d341e177abb9dc30e1b9730ef3e315a83`, pushed at 04:58 UTC under verified author/committer `taliamekh`. [Remote source checks passed](https://github.com/taliamekh/OIS-Designs/actions/runs/42759090732), including 45/45 tests, TypeScript, ESLint and locked dependency installation. Native checkpoint evidence independently verifies 52 compiled sources and all 1,187 retained GLBs on each platform.

Byte-fidelity correction: `70585c46ef74da1e093cd447b1c126756e2afb52`, pushed at 05:07 UTC under the same verified identity. Restores original CRLF bytes in 5,753 text files previously normalized during initial staging, preserving all content after newline normalization. No active working file was rewritten. The committed tree now matches all 3,175 frozen library dependency digests and 68 native-checkpoint source digests. Independent closure checks 4,978 paths, including 2,200 static references and 1,187 saved model bindings, with zero issues. The verifier uses actual revisionModels static bindings; producer-relative metadata file fields are not app filesystem paths.

1. Inspect authoritative thread/file status; collect a coherent ready increment and its tests/known limitations. Do not stop the build waiting for routine user approval.
2. Use explicit reviewed path lists. Exclude dependencies, client inputs, credentials, generated bundles, local logs/PIDs, caches and incomplete export files. Preserve hash-bound source bytes; use LFS for model/image binaries.
3. Verify `git var GIT_AUTHOR_IDENT` and committer identity against the configured account. Commit with a conventional message describing the actual increment and validation.
4. Push explicitly to `main` while retaining the shared local `codex/project-foundation` branch. Never force-push; reconcile any remote divergence first.
5. Verify the remote ref and GitHub author association. Record the actual SHA, time and evidence here or in the coordination log.
6. Publish after meaningful verified milestones, with no more than 30 minutes of ready changes left unpushed during active overnight work. Do not rerun unchanged expensive tests merely to produce another green count.

Workers must not concurrently run add/commit/push or switch this shared checkout. A later separate worktree/branch protocol needs an explicit ownership handoff.

## Repository checks

`.github/workflows/mobile-checks.yml` runs the locked Node 24 dependency install, TypeScript, ESLint and existing domain/storage/scene contract tests for main pushes and pull requests. Path filtering was removed after the large archive correction produced no run: GitHub evaluates only the first 300 changed paths for such filters, so it can miss later mobile paths in a large asset commit. That is the inferred cause of this observed skip; see [GitHub's filter limits](https://docs.github.com/enterprise-cloud%40latest/actions/monitoring-and-troubleshooting-workflows/troubleshooting-workflows#filtering-and-diff-limits). Every main push now requests the source job. Checkout/setup actions use verified immutable v7 commit pins from their official repositories. The source job leaves LFS pointers in place and does not fetch the large Blender/review archive. These tests do not load model binaries and do not establish Expo export, native linking, device graphics/touch or visual acceptance. Those remain in the source-bound QA/build reports. A workflow definition is not a passed remote run; record its actual conclusion after publication.

The active plan remains [PHASE_STATUS.md](../planning/PHASE_STATUS.md), mapped to the original [PHONE_APP_PLAN.md](../planning/PHONE_APP_PLAN.md). Current position is Phase 2 implementation/validation with partial Phase 3, and Phase 1 physical-device acceptance still pending. The queued furniture successor work belongs to Phase 3.
