import { Point, Room, RoomKind, Unit, roomNames, newId } from "./types";
import { rebuildWalls, validPolygon } from "./geometry";
import { makeFloor } from "./project";
import { validProject, StorageAdapter } from "./persistence";

export const DRAFT_KEY = "ois.floor-draft.v1";
export type FloorDraft = {
  version: 1;
  rooms: Room[];
  points: Point[];
  kind: RoomKind;
  height: string;
  unit: Unit;
  guide?: Point[];
};
const pointsValid = (v: unknown): v is Point[] =>
  Array.isArray(v) &&
  v.length <= 500 &&
  v.every(
    (p) =>
      p &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.z) &&
      Math.abs(p.x) <= 10000 &&
      Math.abs(p.z) <= 10000,
  );
export function decodeDraft(raw: string): FloorDraft | null {
  const d = JSON.parse(raw);
  if (d?.version !== 1)
    throw Error(
      "This floor-plan draft needs a newer app. Its saved data has been preserved.",
    );
  if (d.cleared === true) return null;
  if (
    !Array.isArray(d.rooms) ||
    d.rooms.length > 100 ||
    !pointsValid(d.points) ||
    !Object.hasOwn(roomNames, d.kind) ||
    !["m", "ft"].includes(d.unit) ||
    typeof d.height !== "string" ||
    d.height.length > 40 ||
    (d.guide !== undefined && (!pointsValid(d.guide) || !validPolygon(d.guide)))
  )
    throw Error(
      "The unfinished floor-plan draft could not be read. Its saved data has been preserved.",
    );
  if (d.rooms.length) {
    const floor = makeFloor();
    floor.rooms = d.rooms;
    floor.walls = rebuildWalls(d.rooms);
    if (
      !validProject({
        id: "draft-validation",
        schemaVersion: 1,
        name: "Draft",
        updatedAt: 0,
        floors: [floor],
      })
    )
      throw Error(
        "The saved draft contains invalid room geometry. Its data has been preserved.",
      );
  }
  return d as FloorDraft;
}
/** Serialises writes so a slower earlier autosave cannot overwrite a later corner. */
export class DraftStore {
  private queue: Promise<void> = Promise.resolve();
  constructor(private storage: StorageAdapter) {}
  async load() {
    const raw = await this.storage.getItem(DRAFT_KEY);
    return raw === null ? null : decodeDraft(raw);
  }
  save(draft: FloorDraft) {
    const raw = JSON.stringify(draft);
    decodeDraft(raw);
    return this.enqueue(() => this.storage.setItem(DRAFT_KEY, raw));
  }
  startFresh() {
    return this.enqueue(async () => {
      const raw = await this.storage.getItem(DRAFT_KEY);
      if (raw !== null)
        await this.storage.setItem(
          `${DRAFT_KEY}.before-reset.${newId("draft")}`,
          raw,
        );
      await this.storage.setItem(
        DRAFT_KEY,
        JSON.stringify({ version: 1, cleared: true }),
      );
    });
  }
  clear() {
    return this.enqueue(() =>
      this.storage.setItem(
        DRAFT_KEY,
        JSON.stringify({ version: 1, cleared: true }),
      ),
    );
  }
  private enqueue(write: () => Promise<void>) {
    const next = this.queue.then(write);
    this.queue = next.catch(() => {});
    return next;
  }
}
