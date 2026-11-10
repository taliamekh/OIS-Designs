import { AssetRecord, Item } from "../domain/types";
import records from "./revisions.json";
export const revisions = records as AssetRecord[];
export const supportsPlacement = (a: AssetRecord) =>
  !a.placement?.anchor || a.placement.anchor === "floor";
export function resolveItemAsset(item: Item) {
  return revisions.find(
    (a) =>
      a.id === item.assetId &&
      a.version === item.assetVersion &&
      a.sha256 === item.assetHash,
  );
}
export function assetConflict(item: Item) {
  const record = resolveItemAsset(item);
  if (record && !supportsPlacement(record))
    return `Wall attachment is required for ${record.name}. This placement is preserved until wall mounting is supported.`;
  return record
    ? null
    : `Furniture ${item.assetId} (${item.assetVersion}) needs its saved model revision. Placement and lock state are preserved.`;
}
