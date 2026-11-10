import { AssetRecord } from "../domain/types";
export type Filters = {
  query: string;
  room: string;
  category: string;
  subtype: string;
  theme: string;
  bed: string;
  colour: string;
  material: string;
  width: string;
  depth: string;
  height: string;
  favourites: boolean;
  recent: boolean;
};
export const initialFilters: Filters = {
  query: "",
  room: "all",
  category: "all",
  subtype: "all",
  theme: "all",
  bed: "all",
  colour: "all",
  material: "all",
  width: "",
  depth: "",
  height: "",
  favourites: false,
  recent: false,
};
const aliases: Record<string, string> = {
  lounge: "living",
  nursery: "children",
  hall: "entry",
  laundry: "utility",
  double: "full",
  couch: "sofa",
};
export function searchAssets(
  assets: AssetRecord[],
  f: Filters,
  favourites: string[],
  recent: string[],
): AssetRecord[] {
  const tokens = f.query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => aliases[t] || t);
  return assets
    .filter((a) => {
      const text = [
        a.name,
        a.category,
        a.subtype,
        a.theme,
        a.bedSize,
        ...a.roomTags,
        ...a.searchAliases,
        ...a.colourTags,
        ...a.materials,
      ]
        .join(" ")
        .toLowerCase();
      return (
        tokens.every((t) => text.includes(t)) &&
        (f.room === "all" || a.roomTags.includes(f.room)) &&
        (f.category === "all" || a.category === f.category) &&
        (f.subtype === "all" || a.subtype === f.subtype) &&
        (f.theme === "all" || a.theme === f.theme) &&
        (f.bed === "all" ||
          a.bedSize === f.bed ||
          ((f.bed === "bunk" || f.bed === "loft") &&
            `${a.subtype} ${a.geometryFamily}`
              .split(/[-\s]+/)
              .includes(f.bed))) &&
        (f.colour === "all" || a.colourTags.includes(f.colour)) &&
        (f.material === "all" || a.materials.includes(f.material)) &&
        (!f.width || a.dimensionsMetres.width <= Number(f.width)) &&
        (!f.depth || a.dimensionsMetres.depth <= Number(f.depth)) &&
        (!f.height || a.dimensionsMetres.height <= Number(f.height)) &&
        (!f.favourites || favourites.includes(a.id)) &&
        (!f.recent || recent.includes(a.id))
      );
    })
    .sort((a, b) => {
      if (f.recent) return recent.indexOf(a.id) - recent.indexOf(b.id);
      const rank = (stage: string) =>
        stage === "internally-accepted"
          ? 0
          : stage === "reviewed-variant"
            ? 1
            : 2;
      return rank(a.stage) - rank(b.stage);
    });
}
