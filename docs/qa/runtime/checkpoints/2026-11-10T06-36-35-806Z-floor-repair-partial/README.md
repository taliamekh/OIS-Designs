# RUNTIME-015 repair: cold closure pending

The latest independent command regression passes6/6 on project12211660…/geometryb163f0fe… . Untouched floor settings return the original history object. Neutral name/alignment/elevation retain exact local geometry and reversible history. New physical overlap and ceiling conflict still reject. Five separately pinned save/recovery/ordinary-path groups also pass,including original bytes,backup,cold history,two exact recovery archives and unavailable model tuples.

Actual repaired live UI confirms unchanged Apply produces the original byte-exact backup. Separate alignment(+1,−2)m and elevation3.2m edits succeed with two history steps. Independent public-backup comparison confirms all local items,rooms,walls,openings,model tuples,locks and finishes remain exact. Undo×2 restores the exact original project with two future entries;Redo×2 controls pass.

Full cold reload then hits Expo dev-server SSR error: Requiring unknown module3962. That prevents completing cold UI and restoring the original preview library through Settings. The owner has been informed;only the owner manages the server. The original library is safely backed up in ignored local evidence,and restoration remains an explicit pending obligation. No coldUI/restoration success or overall completion is claimed. [Exact summary](summary.json).

This is live development UI with sampled source identities,not a frozen59-source-map UI proof. Each command/recovery test pins its own source;no physical/native execution claim. Runtime QA made no server/Git changes. Work continues through at least06:53UTC and required cleanup.

![Repaired floor registration](legacy-floor-repaired-registration390.png)

![Separate live server error](live-preview-cold-ssr-module-error.png)
