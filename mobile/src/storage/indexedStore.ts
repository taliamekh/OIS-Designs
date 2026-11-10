import type { StorageAdapter } from "../domain/persistence";
/** Web payloads use transactional IndexedDB; legacy localStorage is read-only fallback.
 * A failed database operation must not silently reopen an older legacy snapshot.
 */
export class IndexedStorage implements StorageAdapter {
  private opening: Promise<IDBDatabase> | null = null;
  constructor(
    private legacy: StorageAdapter,
    private name = "ois-designs",
  ) {}
  private database(): Promise<IDBDatabase> {
    if (!this.opening)
      this.opening = new Promise<IDBDatabase>((resolve, reject) => {
        let abandoned = false;
        const request = indexedDB.open(this.name, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("payloads"))
            request.result.createObjectStore("payloads");
        };
        request.onerror = () =>
          reject(
            request.error ?? Error("Local project database could not open."),
          );
        request.onblocked = () => {
          abandoned = true;
          reject(
            Error("Close the other OIS tab to finish opening saved projects."),
          );
        };
        request.onsuccess = () => {
          const db = request.result;
          if (abandoned) {
            db.close();
            return;
          }
          db.onversionchange = () => {
            db.close();
            this.opening = null;
          };
          resolve(db);
        };
      }).catch((e) => {
        this.opening = null;
        throw e;
      });
    return this.opening;
  }
  async getItem(key: string): Promise<string | null> {
    const db = await this.database(),
      result = await new Promise<{ value: unknown; migrated: unknown }>(
        (resolve, reject) => {
          const transaction = db.transaction("payloads", "readonly"),
            request = transaction.objectStore("payloads").get(key),
            marker = transaction
              .objectStore("payloads")
              .get("ois.internal.migrated." + key);
          transaction.oncomplete = () =>
            resolve({ value: request.result, migrated: marker.result });
          transaction.onabort = () =>
            reject(
              transaction.error ?? Error("Saved project read was interrupted."),
            );
          transaction.onerror = () => {};
        },
      );
    const { value, migrated } = result;
    if (value === undefined)
      return migrated === true ? null : this.legacy.getItem(key);
    if (typeof value !== "string")
      throw Error("Saved project data has an invalid format and is protected.");
    return value;
  }
  async setItem(key: string, value: string): Promise<void> {
    const db = await this.database();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("payloads", "readwrite");
      transaction.objectStore("payloads").put(value, key);
      transaction
        .objectStore("payloads")
        .put(true, "ois.internal.migrated." + key);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(
          transaction.error ??
            Error(
              "Saved project write was interrupted. Previous data remains intact.",
            ),
        );
      transaction.onerror = () => {};
    });
  }
}
