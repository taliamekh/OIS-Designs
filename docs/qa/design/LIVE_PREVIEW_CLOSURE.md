# Live browser cold-reload follow-up — 06:54 UTC

The app owner reported a real late static-mode SSR reload failure and switched its owned browser development route to client-rendered output. This is separate from the already frozen 59-module feature evidence. Independent QA opened the actual refreshed `127.0.0.1:8081` in a new isolated mobile-sized browser context, then performed two full reloads. All three responses returned 200 and rendered the real Projects/Create entry; zero page/console errors were captured. No other browser library, shared server, account or production config was changed by QA. The browser was closed afterwards.

`live-cold-reload.json` binds all three actual observations to stable before/after hashes, including app.json **100a9b7f8233bfccf63a7ecd2fbb4df8fed0c2be922b95f61181f9934aff6914**, geometry b163f0fe…, project 12211660… and Editor 7a742a0b…. This checks live empty-context boot/reload, not saved-project durability, native launch or physical rendering. The default sample project is app-created inside the isolated context.

The first harness waited for a nonexistent New project button; that text is a heading. It made zero feature assertions and timed out. `live-cold-reload-before-selector-correction.json` preserves that diagnostic. The corrected wait uses the production accessible Create room or floor plan button. No app failure is inferred from the initial selector error.

Owner's 06:53 status separately records current local/public native manifests/full bundles/final-library GLB and two 56-module native exports against input SHA b9096fca…. Runtime QA separately checked original-library restoration and saved history. Those are owner/runtime findings, not additional native checks performed by this chat. Physical phone launch remains pending.
