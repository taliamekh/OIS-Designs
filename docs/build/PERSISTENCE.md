# Local storage and recovery

The validated library envelope remains version1, including canonical metre geometry, exact model revisions, locks and bounded Undo/Redo history. The backend changes do not rewrite model versions or discard history.

## Native

Android's installed AsyncStorage2.2.0 backend has default total/per-entry limits that large full-history libraries can exceed. See the [version2 limits](https://react-native-async-storage.github.io/2.0/advanced/Limits/) and independent [size audit](../qa/runtime/SAVE_SIZE_AUDIT.md). Raising total SQLite size alone would leave the entry-read limit.

`mobile/src/storage/library.native.ts` uses the already installed [Expo58 FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/) in the app's Documents/project-saves folder. `FileBackedStorage` writes an immutable generation, reads back the exact text, then publishes a tiny AsyncStorage pointer. Its queue serializes readers and writers. Backup publication precedes primary publication through the existing domain protocol. Cleanup removes an old generation only after a confirmed new pointer and a successful retain lookup.

A rejected pointer write is reconciled: if the new pointer is confirmed, the operation succeeded; if readback is ambiguous, both generations remain. Explicit recovery pins original generations and archives their references before replacing either save. Pins are durable across adapter/app restarts. This works even when the referenced file is temporarily unreadable or already missing; missing bytes cannot be reconstructed, but their unresolved reference is retained. Readable original bytes remain accessible through the archive. Original legacy AsyncStorage keys are never deleted or overwritten by file-pointer writes; unreadable legacy sources get retained reference records.

## Browser

`library.web.ts` uses transactional IndexedDB for payloads and reference photos. It reads legacy localStorage only for keys never migrated. A migration marker commits in the same transaction as the payload; a missing migrated primary therefore reaches normal backup recovery instead of reopening an older legacy primary. Database failures propagate rather than silently choosing stale data. Browser storage is still subject to quota, user clearing and private-session policies; writes show errors and keep work open.

## Export and explicit import

Native export writes/read-verifies a JSON cache file and opens the system file share sheet through [Expo58 Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/). Browser export downloads a JSON Blob. This avoids passing a multi-megabyte backup as share-message text. Text inspection remains available. Reference photos remain local and separate from backup JSON.

Future-schema/invalid data stays protected. A primary read-I/O failure still attempts a verified backup and opens it read-only for export. Settings distinguishes original stored bytes from the currently open library. A validated explicit import archives originals/references before restoring editing; clearing protected state alone is never recovery.

## Evidence and limits

App-owned tests cover8MiB primary+backup payloads with tiny index values, truncated writes, disk/pointer failures, reject-after-commit, ambiguous readback, concurrent queued saves, cleanup, legacy reads and recovery with missing/unreadable originals across adapter restart. `verify-web-storage.cjs` exercises actual browser IndexedDB with8MiB primary+backup, reload and transaction abort. `verify-creation.cjs` exercises unfinished multi-room draft recovery through actual UI/reload. Independent QA uses real desktop files and populated100/300-item histories.

These tests exercise production logic and browser storage. Native device filesystem behavior, share targets, OS process interruption, performance and power-loss durability remain physical-device gates. Never describe a synthetic filesystem or JS export as a native persistence pass.
