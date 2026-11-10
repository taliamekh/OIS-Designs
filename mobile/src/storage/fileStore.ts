import { StorageAdapter } from "../domain/persistence";
import { newId } from "../domain/types";

export interface PayloadFiles {
  write(name: string, value: string): Promise<void>;
  read(name: string): Promise<string>;
  remove(name: string): Promise<void>;
}
export const FILE_INDEX_PREFIX = "ois.file-index.v1.";
export const FILE_RETAIN_PREFIX = "ois.file-retain.v1.";
/** Large native payloads live in Documents. AsyncStorage holds only tiny generation pointers.
 * Publish only after a complete write/readback; keep the previous pointer on any failure.
 * All reads/writes share a queue so cleanup cannot race a reader of the old generation.
 */
export class FileBackedStorage implements StorageAdapter {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private index: StorageAdapter,
    private files: PayloadFiles,
  ) {}
  getItem(key: string): Promise<string | null> {
    return this.serial(async () => {
      const pointer = await this.index.getItem(FILE_INDEX_PREFIX + key);
      if (pointer === null) return this.index.getItem(key); // Non-destructive legacy migration.
      if (!/^payload-[a-z0-9-]+\.json$/.test(pointer))
        throw Error("Invalid saved-file pointer; existing data is preserved.");
      return this.files.read(pointer);
    });
  }
  /** Pin original generations before explicit recovery, even if their bytes cannot
   * currently be read. The durable pin protects them across future app restarts. */
  archiveItem(key: string, archiveKey: string): Promise<void> {
    return this.serial(async () => {
      const pointer = await this.index.getItem(FILE_INDEX_PREFIX + key);
      if (pointer !== null) {
        if (!/^payload-[a-z0-9-]+\.json$/.test(pointer))
          throw Error("Invalid saved-file pointer; recovery has preserved it.");
        await this.index.setItem(FILE_RETAIN_PREFIX + pointer, "1");
        await this.index.setItem(FILE_INDEX_PREFIX + archiveKey, pointer);
        return;
      }
      let legacy: string | null;
      try {
        legacy = await this.index.getItem(key);
      } catch {
        // New file pointers never overwrite/delete the original legacy key.
        await this.index.setItem("ois.legacy-retain.v1." + archiveKey, key);
        return;
      }
      if (legacy === null) return;
      const name = newId("payload") + ".json";
      await this.files.write(name, legacy);
      if ((await this.files.read(name)) !== legacy)
        throw Error("Original-save archive verification failed.");
      await this.index.setItem(FILE_RETAIN_PREFIX + name, "1");
      await this.index.setItem(FILE_INDEX_PREFIX + archiveKey, name);
    });
  }
  setItem(key: string, value: string): Promise<void> {
    return this.serial(async () => {
      const old = await this.index.getItem(FILE_INDEX_PREFIX + key),
        name = newId("payload") + ".json";
      let published = false,
        publishing = false;
      try {
        await this.files.write(name, value);
        if ((await this.files.read(name)) !== value)
          throw Error(
            "Save verification failed; previous save is still intact.",
          );
        publishing = true;
        try {
          await this.index.setItem(FILE_INDEX_PREFIX + key, name);
        } catch (error) {
          // A rejected I/O promise can be ambiguous: it may have committed first.
          // Treat a confirmed new pointer as success; otherwise retain every file
          // until the index can be read safely.
          let actual: string | null;
          try {
            actual = await this.index.getItem(FILE_INDEX_PREFIX + key);
          } catch {
            throw error;
          }
          if (actual !== name) throw error;
        }
        published = true;
      } finally {
        if (!published) {
          if (!publishing) await this.files.remove(name).catch(() => {});
          else
            try {
              if ((await this.index.getItem(FILE_INDEX_PREFIX + key)) !== name)
                await this.files.remove(name).catch(() => {});
            } catch {} // Ambiguous commit/read failure: both generations stay intact.
        }
      }
      if (old && /^payload-[a-z0-9-]+\.json$/.test(old))
        try {
          if ((await this.index.getItem(FILE_RETAIN_PREFIX + old)) !== "1")
            await this.files.remove(old).catch(() => {});
        } catch {} // A failed retain lookup must preserve the old bytes.
    });
  }
  private serial<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task);
    this.queue = next.catch(() => {});
    return next;
  }
}
