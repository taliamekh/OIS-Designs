const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),base=__dirname;
const files=['clear-input-web.json','clear-input-Rectangle.png','clear-input-L-shape.png','clear-input-Draw-walls.png','house-readonly-web.json','house-readonly-after-gestures.png','bed-filter-web.json','bed-filter-loft-options.png','bed-filter-queen-theme.png','inside-legacy-units-web.json','inside-legacy-resize-after-redo.png','inside-collapsed-recovery-before.png','inside-collapsed-recovery-after.png','room-move-domain.json','concave-trim-real-model.historical.json','concave-trim-real-model.json','trim-collision-coverage.json','CONCAVE_TRIM_CLOSURE.md','concave-trim-owner-repair.patch'];
for(const f of files)if(!fs.existsSync(path.join(base,f)))throw Error('Required evidence absent '+f);
const dir=path.join(base,'frozen-evidence/integrated-qa-0550'),index={timestamp:new Date().toISOString(),files:{}};fs.mkdirSync(dir,{recursive:true});
for(const f of files){const b=fs.readFileSync(path.join(base,f)),target=path.join(dir,f);if(fs.existsSync(target)&&!b.equals(fs.readFileSync(target)))throw Error('Refusing to overwrite historical evidence '+f);fs.writeFileSync(target,b);index.files[f]={sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length};}fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify(index,null,2)+'\n');
const old=fs.readFileSync(path.join(base,'FINDINGS.md'),'utf8');fs.writeFileSync(path.join(base,'FINDINGS_BOARD_BEFORE_0550.md'),old);
fs.writeFileSync(path.join(base,'FINDINGS.md'),`# Independent design QA — current findings

Updated2026-11-10 05:50UTC. In progress through06:53UTC minimum. QA writes only docs/qa/design after the focused two-file production return; app owns mobile. Older board detail is retained in FINDINGS_BOARD_BEFORE_0550.md and FINDINGS_HISTORY.md.

## Open issue

**QA-GEO13 / P2 new Draw walls input convention.** Actual59-source snapshot05:37: Width4/Depth3/Ceiling3.1 gives4×3inside for Rectangle/L, but Draw walls produces3.88×2.88inside and editor fields3.880/2.880. The supplied polygon is intentionally normalized to reference extents; the same typed customer dimensions must mean inside faces for all new-room shapes. Preserve existing drawings, convert new explicit inside input before first save. clear-input-web.json12pass/3fail, DRAW_INSIDE_DIMENSIONS.md and frozen-evidence/integrated-qa-0550 retain exact failed evidence. No capture/console errors. App repair/actual retest pending.

## Remaining independent UI coverage

-QA-ROOM01 now has actual source/button implementation and7compound domain passes: connected-room lock rejection, unrelated lock independence, unlock/retry, negative-coordinate world door/window motion, topology/finishes/trim/thickness, contained exact identities and one-command Undo/Redo. Actual Move room preview/commit/cancel/locked UI remains to close the originalPhase2 capability gap.
-QA-GEO10/11 CPU physical wall/trim/aperture/frame/door coverage passes192real-wall,120real-door,16real-cabinet concave corner,64actual-profile/208,896synthetic-box positions with0accepted intersections,31analytic/inside/history and25new-opening/legacy-neutral-edit cases. Actual near-wall pointer rejection and current inside-face shared-door chains require final UI checks. Measured-room closure remains open while QA-GEO13 fails.
-Whole-house framing/source scope is also tested by runtime QA. This chat's actual House read-only19checks pass, including nonempty past/future, presets/ceiling/separation/Fit, tap/drag attempts and Floor Undo/Redo restoration. Future source increments need their own bounded checks.

## Bounded closures

-**QA-GEO12 concave miter closed in CPU geometry:** app geometry0c3a9928… shares the affine miter with meshes and extends only physical endpoint intervals. Historical exact-source16cases reproduce8near failures/8safe passes; owner repair16/16passes. Actual64fixture trim audit has9,072accepted/0intersections. CONCAVE_TRIM_CLOSURE.md and exact owner diff. QA made no mobile edits after return.
-**QA-METRO01 current development route closed at05:40:** coordinator independently fetched local/public iOS manifests, exact full native JS bundles and prior403,304-byte breakfast-island GLB: all200, exact model hash, room-move/view markers and stable sources. docs/coordination/preview-route-independent.json. Earlier500reports remain historical failures. No physical launch is established.
-**Legacy inside dimensions actual19checks pass:** original coordinates survive inspector opening and repeated m/ft untouchedApply. Explicit clear resize/ceiling override and Undo/Redo remain exact. Collapsed .5m room/.6m walls stays readable, warns explicitly, repairs only on Apply, and restores the original through Undo. inside-legacy-units-web.json.
-**QA-CAT01 actual final-curated source11/11:** catalogueb935502e…/snapshot67cbdc5c… retains512→512scroll, combined filters/query/favourites/recent, separate room state and reload. Additional bed UI19checks pass twin/full/queen/king/bunk/loft counts and real members, combined desk search/theme and clear chips. These are consumer workflow checks, not new model acceptance.
-Prior independent door clipping/per-room-chain and ordinary-label fixes passed128checks across16side/unit/size layouts before the inside-convention adapter. Current inside-chain geometry is the remaining targeted retest, not a reopened old numeric verdict. Quick doors, oneUndo each, pocket correction, warning cleanup, height inheritance, text growth, draft recovery and per-face colour/material/trim closures retain their source-bound earlier evidence.
-Library milestone is separately verified346internally accepted distinct constructions plus93non-counting variants. Current real40model spatial fixture and producer/browser reviews do not establish native acceptance or count repeated/withdrawn geometry as new designs.

## Evidence limits

Reports distinguish actual isolated browser UI, CPU real-GLB/mesh geometry, analytic synthetic boxes, source contracts and native JS exports. None establishes physical iPhone/Android GL/touch/OS-sharing/thermal behavior. OriginalPhase1 physical acceptance, Phase2fresh human usability tests and later scan/import/sync gates remain separate. No overall build completion is claimed.

Key source/API repair handoff: GEOMETRY_RETURN.md / GEOMETRY_RETURN_ADDENDUM.md. Production authority remains app/root; root alone publishes Git. Continue meaningful new coverage and fixes through06:53UTC, without rerunning unchanged green suites for counts.
`);
process.stdout.write(JSON.stringify({archive:dir,files:files.length})+'\n');
