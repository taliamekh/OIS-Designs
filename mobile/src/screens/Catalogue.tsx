import { useRef, useState } from "react";
import {
  FlatList,
  FlatListProps,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { thumbnails } from "../catalogue/bundled";
import { supportsPlacement } from "../catalogue/resolve";
import { Filters, isReviewedAsset, searchAssets } from "../catalogue/search";
import { measure, toDisplay, toMetres } from "../domain/geometry";
import { AssetRecord, roomNames } from "../domain/types";
import { assets, useStudio } from "../state/Studio";
import {
  Badge,
  Button,
  Chips,
  Field,
  Icon,
  IconButton,
  Txt,
  usePalette,
} from "../ui/kit";
type FitKey = "width" | "depth" | "height";
const catalogueAssets = assets.filter(isReviewedAsset);
/** A clamped initial scroll prompts FlatList to render the next virtual rows;
 * repeat after content measurements until the saved offset is reachable.
 * Ignore intermediate/zero events so they cannot replace that saved target. */
function RememberedList({
  offset,
  onOffset,
  ...props
}: FlatListProps<AssetRecord> & {
  offset: number;
  onOffset: (offset: number) => void;
}) {
  const list = useRef<FlatList<AssetRecord>>(null),
    target = useRef(offset),
    viewport = useRef(0),
    content = useRef(0),
    restored = useRef(offset === 0);
  const [initialOffset] = useState(() => ({ x: 0, y: offset }));
  const restore = () => {
    if (
      !restored.current &&
      viewport.current > 0 &&
      content.current > viewport.current
    ) {
      list.current?.scrollToOffset({ offset: target.current, animated: false });
    }
  };
  return (
    <FlatList
      {...props}
      ref={list}
      contentOffset={initialOffset}
      scrollEventThrottle={16}
      onLayout={(e) => {
        viewport.current = e.nativeEvent.layout.height;
        restore();
      }}
      onContentSizeChange={(_width, height) => {
        content.current = height;
        restore();
      }}
      onScrollBeginDrag={() => {
        restored.current = true;
      }}
      onScroll={(e) => {
        const y = e.nativeEvent.contentOffset.y;
        if (!restored.current && Math.abs(y - target.current) < 2)
          restored.current = true;
        if (restored.current) onOffset(y);
      }}
    />
  );
}
export default function Catalogue({
  filters,
  setFilters,
  onPlace,
  filtersOpen,
  setFiltersOpen,
  offset,
  onOffset,
}: {
  filters: Filters;
  setFilters: (v: Filters) => void;
  onPlace: (a: AssetRecord) => void;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  offset: number;
  onOffset: (n: number) => void;
}) {
  const s = useStudio(),
    c = usePalette(),
    unit = s.library.settings.unit;
  const display = (v: string) =>
    v ? String(Number(toDisplay(Number(v), unit).toFixed(3))) : "";
  const [fitDraft, setFitDraft] = useState(() => ({
    width: display(filters.width),
    depth: display(filters.depth),
    height: display(filters.height),
  }));
  const field = (key: keyof Filters, value: string | boolean) =>
    setFilters({ ...filters, [key]: value });
  const fitField = (key: FitKey, value: string) => {
    setFitDraft((d) => ({ ...d, [key]: value }));
    field(
      key,
      value && Number.isFinite(Number(value))
        ? String(toMetres(Number(value), unit))
        : "",
    );
  };
  const list = searchAssets(
    catalogueAssets,
    filters,
    s.library.favourites,
    s.library.recent,
  );
  const values = (key: "category" | "subtype" | "theme") => [
    "all",
    ...new Set(catalogueAssets.map((a) => a[key])),
  ];
  const active = Object.entries(filters).filter(
    ([key, value]) => key !== "room" && value && value !== "all",
  );
  const clearFilter = (key: keyof Filters) => {
    if (key === "width" || key === "depth" || key === "height")
      setFitDraft((d) => ({ ...d, [key]: "" }));
    field(
      key,
      key === "favourites" || key === "recent"
        ? false
        : key === "query" ||
            key === "width" ||
            key === "depth" ||
            key === "height"
          ? ""
          : "all",
    );
  };
  const clearAll = () => {
    setFitDraft({ width: "", depth: "", height: "" });
    setFilters({
      ...filters,
      query: "",
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
    });
  };
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingHorizontal: 15,
          paddingBottom: 5,
        }}
      >
        <Icon name="search" size={18} />
        <TextInput
          accessibilityLabel="Search furniture"
          placeholder="Search furniture"
          placeholderTextColor={c.sub}
          value={filters.query}
          onChangeText={(v) => field("query", v)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, minHeight: 44, fontSize: 15, color: c.ink }}
        />
        <IconButton
          name="settings"
          label="Furniture filters"
          selected={filtersOpen}
          onPress={() => setFiltersOpen(!filtersOpen)}
        />
        <IconButton
          name="heart"
          label="Favourite furniture"
          selected={filters.favourites}
          onPress={() => field("favourites", !filters.favourites)}
        />
      </View>
      <View style={{ paddingHorizontal: 15 }}>
        <Chips
          values={["all", ...Object.keys(roomNames)]}
          labels={{ all: "All rooms", ...roomNames }}
          value={filters.room}
          onChange={(v) => field("room", v)}
        />
      </View>
      {filtersOpen ? (
        <ScrollView
          style={{ maxHeight: 280 }}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
        >
          {(["category", "subtype", "theme"] as const).map((key) => (
            <View key={key}>
              <Txt small muted>
                {key === "theme"
                  ? "Coordinated theme"
                  : key === "subtype"
                    ? "Furniture type"
                    : "Category"}
              </Txt>
              <Chips
                values={values(key)}
                value={filters[key]}
                onChange={(v) => field(key, v)}
              />
            </View>
          ))}
          <Txt small muted>
            Bed size / structure
          </Txt>
          <Chips
            values={["all", "twin", "full", "queen", "king", "bunk", "loft"]}
            value={filters.bed}
            onChange={(v) => field("bed", v)}
          />
          <Txt small muted>
            Colour
          </Txt>
          <Chips
            values={[
              "all",
              ...new Set(catalogueAssets.flatMap((a) => a.colourTags)),
            ]}
            value={filters.colour}
            onChange={(v) => field("colour", v)}
          />
          <Txt small muted>
            Material
          </Txt>
          <Chips
            values={[
              "all",
              ...new Set(catalogueAssets.flatMap((a) => a.materials)),
            ]}
            value={filters.material}
            onChange={(v) => field("material", v)}
          />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {(["width", "depth", "height"] as const).map((key) => (
              <Field
                key={key}
                label={`Max ${key} (${unit})`}
                value={fitDraft[key]}
                onChange={(v) => fitField(key, v)}
                keyboard="decimal-pad"
              />
            ))}
          </View>
          <Button
            label="Recent selections"
            selected={filters.recent}
            onPress={() => field("recent", !filters.recent)}
          />
          <Button
            label="Show results"
            primary
            onPress={() => setFiltersOpen(false)}
          />
        </ScrollView>
      ) : (
        <RememberedList
          key={JSON.stringify(filters)}
          testID="furniture-results"
          offset={offset}
          onOffset={onOffset}
          data={list}
          keyExtractor={(a) => a.id}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={3}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingVertical: 6, gap: 5 }}>
              <Txt small muted>
                {list.length} {list.length === 1 ? "result" : "results"}
              </Txt>
              {active.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
                >
                  {active.map(([key, value]) => (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`Clear ${key} filter`}
                      onPress={() => clearFilter(key as keyof Filters)}
                      style={{
                        minHeight: 44,
                        paddingHorizontal: 10,
                        borderRadius: 22,
                        backgroundColor: c.warm,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Txt small>
                        {key === "query"
                          ? `Search: ${value}`
                          : ["width", "depth", "height"].includes(key)
                            ? `${key} ≤ ${Number(toDisplay(Number(value), unit).toFixed(2))} ${unit}`
                            : typeof value === "boolean"
                              ? key
                              : String(value).replaceAll("-", " ")}
                      </Txt>
                      <Icon name="close" size={14} />
                    </Pressable>
                  ))}
                  {active.length > 1 && (
                    <Button
                      compact
                      label="Clear active filters"
                      onPress={clearAll}
                    />
                  )}
                </ScrollView>
              )}
            </View>
          }
          ListEmptyComponent={
            <Txt muted style={{ padding: 20 }}>
              No matching furniture. Change the search or filters.
            </Txt>
          }
          renderItem={({ item: a }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginHorizontal: 16,
                borderBottomWidth: 1,
                borderColor: c.line,
              }}
            >
              <Pressable
                accessibilityRole="button"
                disabled={!supportsPlacement(a) || a.stage === "needs-rework"}
                accessibilityLabel={`Place ${a.name}`}
                onPress={() => onPlace(a)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                  paddingVertical: 12,
                }}
              >
                {thumbnails[a.id] ? (
                  <Image
                    source={thumbnails[a.id]}
                    resizeMode="contain"
                    style={{
                      width: 76,
                      height: 70,
                      borderRadius: 10,
                      backgroundColor: c.warm,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 76,
                      height: 70,
                      backgroundColor: c.warm,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="furniture" />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={{ fontSize: 13, fontWeight: "600" }}>
                    {a.name}
                  </Txt>
                  <Txt small muted>
                    {a.theme.replaceAll("-", " ")}
                  </Txt>
                  <Txt small muted>
                    {measure(a.dimensionsMetres.width, unit)} ×{" "}
                    {measure(a.dimensionsMetres.depth, unit)}
                  </Txt>
                  <Txt small muted style={{ fontSize: 10 }}>
                    {a.stage === "internally-accepted"
                      ? "Reviewed"
                      : a.stage === "reviewed-variant"
                        ? "Reviewed variant"
                        : a.stage === "needs-rework"
                          ? "Being updated"
                          : "Preview"}
                  </Txt>
                  {!supportsPlacement(a) && (
                    <>
                      <Txt small muted>
                        Wall attachment
                      </Txt>
                      <Badge />
                    </>
                  )}
                </View>
              </Pressable>
              <IconButton
                name="heart"
                label={`Favourite ${a.name}`}
                selected={s.library.favourites.includes(a.id)}
                onPress={() =>
                  s.updateLibrary((l) => ({
                    ...l,
                    favourites: l.favourites.includes(a.id)
                      ? l.favourites.filter((id) => id !== a.id)
                      : [...l.favourites, a.id],
                  }))
                }
              />
            </View>
          )}
        />
      )}
    </>
  );
}
