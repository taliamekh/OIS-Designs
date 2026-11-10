# Android saved-library size compatibility

**Repair follow-up at02:28UTC:** the app has introduced FileBackedStorage for native payload files and small AsyncStorage pointers. Independent actual-file/Map-index tests now pass17/17 cases, including the exact7,575,865-byte300-item fixture, restart,backup,recovery,legacy preservation and ambiguous pointer publication. Primary/backup index values are29bytes each. An initial injected commit-then-reject case found dangling-pointer cleanup; the owner repaired it and all three ambiguous-publication variants pass. See RUNTIME-010 in STATUS.md and `runs/2026-11-10T02-28-08-585Z-file-store/result.json`. The original size measurements below remain valid for the original single-key path; they do not describe current native pointer size. Device/Expo File/Directory durability remains unverified.

Measured2026-11-10 at02:16UTC. **RUNTIME-009: the current full-history, single-key library can exceed the installed AsyncStorage2.2.0 default Android backend's documented limits.** This is a source/serialized-size compatibility finding. No phone, Android native database, CursorWindow failure or native performance was exercised.

## Exact serialized results

Each project has50 actual retained Undo snapshots plus its current state. The harness executes50 production Rename commands on a fully populated bounded project. It uses ten real catalogue model identities repeatedly, real64-character model hashes, locks, overrides, shared walls/openings, room finishes and trim. All fixture projects, final footprints, production encode/decode and Map-backed saveLibrary calls pass. These are item counts, not accepted distinct furniture designs.

| Library fixture | UTF-8 primary bytes | Primary MiB | Primary + previous backup MiB | Compatibility comparison |
| --- | ---: | ---: | ---: | --- |
| One40-item project,4rooms/2floors | 1,008,288 | 0.962 | 1.923 | Below the approximate entry/default total figures in this fixture |
| One100-item project,10rooms/2floors | 2,508,913 | 2.393 | 4.785 | Above the documented approximate2MiB entry size |
| One300-item project,30rooms/3floors | 7,575,865 | 7.225 | 14.450 | Primary alone exceeds the default6MiB database size |
| Three40-item projects | 3,024,363 | 2.884 | 5.769 | Above approximate entry size despite each project having only40items |
| Two100-item projects | 5,017,574 | 4.785 | 9.570 | Above approximate entry size and default total with backup |

MiB uses1,048,576bytes. Totals exclude SQLite pages/indexes, other keys and recovery archives, so they are serialized-value lower bounds, not measured database files. Device CursorWindow configuration is unknown;2MiB is a compatibility comparison rather than a proven exact cutoff. Fresh40/100/300-item projects without undo history are only20,149/49,573/148,925bytes respectively. The snapshot history is the main multiplier.

Machine-readable output, source/native hashes and complete fixtures: `runs/2026-11-10T02-16-02-194Z-save-size/result.json`. The source hashes remained unchanged throughout this final run. Earlier incomplete harness attempts are superseded; they are not app failures.

## Installed implementation and applicable limits

The installed package and Expo58's bundled-native-module manifest both specify AsyncStorage2.2.0. Its `android/config.gradle` defaults `useNextStorage` tofalse and database size to6. `build.gradle` selects `src/javaPackage/java` when Next isfalse. That package constructs the legacy `AsyncStorageModule`; its query reads key/value through an Android Cursor, and `ReactDatabaseSupplier` sets maximum size to `BuildConfig.AsyncStorage_db_size *1024*1024`.

The inspected managed project has no generated Android project, no EAS config, no app-config storage override and no observed AsyncStorage Gradle flag in the environment. There is no user Gradle properties file. Therefore the installed source's default custom-build path is legacy storage. **No Gradle build or Expo Go native binary was inspected**, so the backend/overrides of a particular installed phone build remain unverified. React Native New Architecture is a separate flag from AsyncStorage Next Storage.

The official [v2 limits](https://react-native-async-storage.github.io/2.0/advanced/Limits/) describe a default6MB Android database and an approximately2MB per-entry read limit. The [database-size documentation](https://react-native-async-storage.github.io/2.0/advanced/IncreaseDbSize/) says the total-size feature is obsolete when Next Storage is enabled. [Next Storage](https://react-native-async-storage.github.io/2.0/advanced/Next/) requires its own opt-in flag. This audit does not apply current v3 behavior to the installed v2 library, or assume that increasing database size resolves per-entry reads.

## Save/recovery consequences and handoff

`persistence.ts` encodes the entire library, including every project's past/present/future, into one PRIMARY value. The prior complete value is written to BACKUP on the next save. No byte budget or storage chunking exists in the tested source. Imported history also has no byte budget.

A separate explicitly injected adapter probe made PRIMARY getItem reject while a valid small backup was available. Actual loadLibrary rejected after only the PRIMARY request and never attempted BACKUP. This demonstrates the JavaScript error path only; it does not reproduce a native CursorWindow failure. Studio catches the rejection, shows storage unavailable and protects saving. Both large primary and large backup could themselves exceed the same backend limits.

App owner should choose a bounded persistent-history/storage strategy that handles all projects and backup/recovery together, then test actual native read/write/restart and interrupted-save behavior. QA has not changed storage, native flags, dependencies or user data. A desktop Map/LocalStorage pass does not close this compatibility finding.
