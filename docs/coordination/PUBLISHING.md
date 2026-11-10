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

Latest integrated app checkpoint: `3152a85b5691231155aa59829540028e8dbb1314`, pushed at 06:09 UTC under verified author/committer `taliamekh`. [Remote source/provenance checks passed](https://github.com/taliamekh/OIS-Designs/actions/runs/42766373109): locked installation, TypeScript, ESLint, 51/51 tests and committed archive audit. Independent native checkpoint evidence verifies 56 compiled sources and all 1,187 retained GLBs on each platform. Later active fixes require a new source-bound checkpoint. The previous integrated checkpoint `43b53e6d341e177abb9dc30e1b9730ef3e315a83` passed all remote checks with 45/45 tests.

Published spatial base: `a3226d07182b7415c314996a533a4f87c5ab0e5d`, pushed at 06:24 UTC. GitHub independently confirms author and committer `taliamekh`. Publishes 119 hash-verified spatial review source/evidence paths (4,934,965 bytes), their exact publication list, and the CI checkout correction. Root independently ran strict TypeScript without emission; owner reports 77/77 geometry regressions. Complete [remote CI passed](https://github.com/taliamekh/OIS-Designs/actions/runs/42768274333), including archive audit: 1,187 retained revisions, 3,175 release dependencies, 2,200 static references, 4,910 checked paths, zero issues. That CI audit does not claim historical source checkpoints describe later code. Unadopted experiments are explicitly identified in spatial/README.md.

Latest repository checkpoint: `eba98b8033666e67359e8b07823002b9b1e7b3d2`, pushed at 06:51 UTC. GitHub confirms author and committer `taliamekh`. Adds the 62-path wall/drag review follow-up and root phase/acceptance records. Root verifies exact publication hashes, strict TypeScript and 21+7 existing geometry regressions; these remain unadopted. Complete [remote CI passed](https://github.com/taliamekh/OIS-Designs/actions/runs/42771363406). Active mobile repairs remain outside this checkpoint pending the final coherent source/config/export handoff.

Byte-fidelity correction: `70585c46ef74da1e093cd447b1c126756e2afb52`, pushed at 05:07 UTC under the same verified identity. Restores original CRLF bytes in 5,753 text files previously normalized during initial staging, preserving all content after newline normalization. No active working file was rewritten. The committed tree now matches all 3,175 frozen library dependency digests and 68 native-checkpoint source digests. Independent closure checks 4,978 paths, including 2,200 static references and 1,187 saved model bindings, with zero issues. The verifier uses actual revisionModels static bindings; producer-relative metadata file fields are not app filesystem paths.

1. Inspect authoritative thread/file status; collect a coherent ready increment and its tests/known limitations. Do not stop the build waiting for routine user approval.
2. Use explicit reviewed path lists. Exclude dependencies, client inputs, credentials, generated bundles, local logs/PIDs, caches and incomplete export files. Preserve hash-bound source bytes; use LFS for model/image binaries.
3. Verify `git var GIT_AUTHOR_IDENT` and committer identity against the configured account. Commit with a conventional message describing the actual increment and validation.
4. Push explicitly to `main` while retaining the shared local `codex/project-foundation` branch. Never force-push; reconcile any remote divergence first.
5. Verify the remote ref and GitHub author association. Record the actual SHA, time and evidence here or in the coordination log.
6. Publish after meaningful verified milestones, with no more than 30 minutes of ready changes left unpushed during active overnight work. Do not rerun unchanged expensive tests merely to produce another green count.

Workers must not concurrently run add/commit/push or switch this shared checkout. A later separate worktree/branch protocol needs an explicit ownership handoff.

## Archive-audit checkout correction

The 06:09 run added a committed-tree audit of static model bindings, LFS pointers and frozen dependency digests. It ultimately passed, but sparse checkout made the audit slow: the pinned checkout action automatically uses `blob:none` for sparse checkout, leaving thousands of audited blobs to be fetched on demand. Revision a3226d07 uses a complete shallow Git snapshot while retaining `lfs: false` and `GIT_LFS_SKIP_SMUDGE=1`. Large LFS model/media bodies remain skipped. Its completed remote job passes; archive audit completed in under one second. The diagnosis is supported by the [pinned checkout implementation](https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/src/git-source-provider.ts#L168).

## Repository checks

`.github/workflows/mobile-checks.yml` runs the locked Node 24 dependency install, TypeScript, ESLint and existing domain/storage/scene contract tests for main pushes and pull requests. Path filtering was removed after the large archive correction produced no run: GitHub evaluates only the first 300 changed paths for such filters, so it can miss later mobile paths in a large asset commit. That is the inferred cause of this observed skip; see [GitHub's filter limits](https://docs.github.com/enterprise-cloud%40latest/actions/monitoring-and-troubleshooting-workflows/troubleshooting-workflows#filtering-and-diff-limits). Every main push now requests the source job. Checkout/setup actions use verified immutable v7 commit pins from their official repositories. The source job leaves LFS pointers in place and does not fetch the large Blender/review archive. These tests do not load model binaries and do not establish Expo export, native linking, device graphics/touch or visual acceptance. Those remain in the source-bound QA/build reports. A workflow definition is not a passed remote run; record its actual conclusion after publication.

The active plan remains [PHASE_STATUS.md](../planning/PHASE_STATUS.md), mapped to the original [PHONE_APP_PLAN.md](../planning/PHONE_APP_PLAN.md). Current position is Phase 2 implementation/validation with partial Phase 3, and Phase 1 physical-device acceptance still pending. The queued furniture successor work belongs to Phase 3.
