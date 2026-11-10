# Git and GitHub workflow

## Active publication policy — November 9, 2026

The user explicitly authorizes regular pushes to `https://github.com/taliamekh/OIS-Designs.git`. This supersedes the earlier no-publish boundary below. The authenticated repository owner and local credential account were verified as `taliamekh` (GitHub user ID251501218). Repository-local author/committer identity uses that handle and its GitHub ID-based noreply email; no anonymous placeholder or bot co-author is added.

The coordinator is the single Git writer for this shared checkout. Other chats continue their owned work and report coherent checked milestones; they do not independently stage/commit/push or switch this checkout's branch. Checkpoints are published after meaningful verified increments, with a maximum30minutes of unpushed ready changes while overnight work is active. A failing/incomplete feature is labelled accurately rather than described as complete.

The initially empty remote is seeded on `main`; the local `codex/project-foundation` branch is retained and pushed explicitly to `main`. Never force-push. Stop and reconcile unexpected remote changes before another publication. No repository visibility, billing budget or paid service setting is changed.

Dependencies, credentials, local logs/PIDs, generated bundles and private client inputs stay excluded. Version the code, original numbered plans, small evidence summaries and required model/source/review files. Binary models/images use installed Git LFS; source/manifests preserve their exact hash-bound bytes. Initial publication is split into a source checkpoint and the corresponding asset checkpoint. Large in-progress export scratch files do not become a completed-library claim.

The live plan is [PHASE_STATUS.md](PHASE_STATUS.md), mapped to [PHONE_APP_PLAN.md](PHONE_APP_PLAN.md). The historical audit below is retained as history, not the current state.

Current local audit, November 8, 2026: branch `codex/project-foundation`; **no commits**; app/docs are untracked working files; origin is `https://github.com/taliamekh/OIS-Designs.git`. A configured remote is not proof that this work exists on GitHub. No commit or push was performed in this design round. Remote state was not assumed from local status.

## Organisation and naming

- `mobile/`: Expo application. Later shared domain/geometry/catalogue packages are extracted when implementation warrants them.
- `docs/planning/`: current design, acceptance, reference research and setup notes. Round 3 specification/checklist supersede conflicting early proposals.
- `design-feedback/`: direct preferences and design decisions. Root AGENTS requires reading it.
- `furniture/`: asset chat's model/source/export/manifest work; `docs/furniture/`: licence register and catalogue coverage.
- Branches use `codex/<short-purpose>`: `codex/manual-room-editor`, `codex/material-library`, `codex/furniture-library`, `codex/catalog-search`. Do not create competing feature branches before the initial foundation commit exists. Do not let two chats switch branches in the same checkout; use separately coordinated checkouts/worktrees when authorised.

## Commits and pushes

Commit a coherent, reviewable increment after relevant checks and visual verification. Avoid one giant end-of-project commit or commits for every small edit. Before the first foundation commit, review the file list and exclusions; exclude dependencies, client plans/scans, credentials and unnecessary generated QA wrappers. Select an asset storage policy before staging large models. Never stage unrelated changes blindly with `git add .` in a shared workspace.

Use `<type>(<scope>): <imperative summary>`:

- `docs(design): record approved phone editor`
- `feat(editor): add room dimension editing`
- `feat(catalog): filter bedroom furniture by bed size`
- `fix(placement): prevent locked items from moving`
- `test(editor): cover walkthrough edit protection`
- `chore(assets): register licensed furniture sources`

The commit body explains why and records meaningful validation when needed. A **push has no separate comment**: it sends commits. Describe the overall change and checks in the pull request. Push feature branches after their checks pass and the checkpoint is ready to share/back up; use a PR for review before merging to the verified default branch. `main` is the proposed target, not an asserted existing remote branch. Never force-push shared work or merge an unreviewed design merely because tests pass.

Use Git LFS for approved large binary `.blend`/GLB/texture source files when appropriate, configured before uploading those assets; keep manifests, scripts and small thumbnails in regular Git. Account storage limits/availability must be checked before selecting it. Licence/provenance is versioned alongside each asset. Publishing, paid storage and blanket push authorisation are not inferred from this explanation.

Blender automatic backup files (`*.blend1` etc.) and local furniture build logs are ignored. The actual `.blend` sources, exported models, manifests and useful verification records remain available for the agreed asset-storage policy; nothing was deleted from the workspace.
