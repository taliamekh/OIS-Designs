import { router } from "expo-router";
import { backToProjects } from "../ui/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  resolveItemAsset,
  assetConflict,
  supportsPlacement,
} from "../catalogue/resolve";
import { initialFilters, Filters } from "../catalogue/search";
import { canPlace, measure } from "../domain/geometry";
import { freePosition } from "../domain/project";
import { AssetRecord, DoorType, Item, newId, Opening } from "../domain/types";
import { placementAssets, useStudio } from "../state/Studio";
import { walkSpawn } from "../scene/walk";
import Plan from "../scene/Plan";
import Viewport from "../scene/Viewport";
import Sheet from "../ui/Sheet";
import {
  Button,
  Header,
  Icon,
  IconButton,
  Page,
  Txt,
  usePalette,
} from "../ui/kit";
import Catalogue from "./Catalogue";
import Surfaces from "./Surfaces";
import {
  AddRoom,
  Dimensions,
  DoorPicker,
  Floors,
  OpeningProperties,
  doorNames,
} from "./Build";
type Panel =
  | "furnish"
  | "surfaces"
  | "build"
  | "dimensions"
  | "doors"
  | "windows"
  | "floors"
  | "add-room"
  | "opening"
  | "item"
  | null;
type Browsing = { filters: Filters; filtersOpen: boolean; offset: number };
export default function Editor() {
  const s = useStudio(),
    c = usePalette(),
    project = s.history.present,
    floor = project.floors.find((f) => f.id === s.floorId) ?? project.floors[0],
    room = floor.rooms.find((r) => r.id === s.roomId) ?? floor.rooms[0];
  const [panel, setPanel] = useState<Panel>(null),
    [sheetHeight, setSheetHeight] = useState(0),
    [editorHeight, setEditorHeight] = useState(780),
    [expanded, setExpanded] = useState(false),
    [browsingByRoom, setBrowsingByRoom] = useState<Record<string, Browsing>>(
      {},
    ),
    [tab, setTab] = useState("Floor"),
    [wallId, setWallId] = useState(""),
    [cutaway, setCutaway] = useState(true),
    [allRooms, setAllRooms] = useState(false),
    [overview, setOverview] = useState(false),
    [doorTool, setDoorTool] = useState(false),
    [walkRoomId, setWalkRoomId] = useState(""),
    [toolSettings, setToolSettings] = useState<{
      type: DoorType;
      width: number;
      height: number;
      repeat: boolean;
      hinge: "left" | "right";
      flip: boolean;
    } | null>(null),
    [selectedDoor, setSelectedDoor] = useState<string | null>(null),
    [draft, setDraft] = useState<Item | null>(null),
    [message, setMessage] = useState("");
  const browsingKey = project.id + "/" + room?.id;
  const browsing = browsingByRoom[browsingKey] ?? {
    filters: { ...initialFilters, room: room?.kind ?? "all" },
    filtersOpen: false,
    offset: 0,
  };
  const { filters, filtersOpen, offset } = browsing;
  const updateBrowsing = (patch: Partial<Browsing>) =>
    setBrowsingByRoom((previous) => ({
      ...previous,
      [browsingKey]: { ...browsing, ...previous[browsingKey], ...patch },
    }));
  const setFilters = (filters: Filters) =>
    updateBrowsing({ filters, offset: 0 });
  const setFiltersOpen = (filtersOpen: boolean) =>
    updateBrowsing({ filtersOpen });
  const setOffset = (offset: number) => updateBrowsing({ offset });
  const exitMode = s.setMode;
  useEffect(() => () => exitMode("3d"), [exitMode]);
  const displayRoom =
    s.mode === "walk"
      ? (floor.rooms.find((r) => r.id === walkRoomId) ?? room)
      : room;
  const item = floor.items.find((i) => i.id === s.selected),
    asset = item ? resolveItemAsset(item) : undefined,
    opening = floor.openings.find((o) => o.id === selectedDoor);
  const latest = useRef({ item, floor, room });
  useLayoutEffect(() => {
    latest.current = { item, floor, room };
  }, [item, floor, room]);
  const rotationStart = useRef(0),
    rotationDraft = useRef<Item | null>(null);
  const rotationPointer = useRef(0);
  const rotation = {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: import("react-native").GestureResponderEvent) => {
      rotationStart.current = latest.current.item?.yaw ?? 0;
      rotationPointer.current = e.nativeEvent.pageX;
    },
    onResponderMove: (e: import("react-native").GestureResponderEvent) => {
      const i = latest.current.item;
      if (!i || i.locked) return;
      const d = {
        ...i,
        yaw:
          rotationStart.current +
          (e.nativeEvent.pageX - rotationPointer.current) * 0.018,
      };
      rotationDraft.current = d;
      setDraft(d);
    },
    onResponderRelease: () => {
      if (rotationDraft.current) {
        commit(rotationDraft.current);
        rotationDraft.current = null;
      }
      setDraft(null);
    },
    onResponderTerminate: () => {
      rotationDraft.current = null;
      setDraft(null);
    },
  };
  function commit(i: Item) {
    s.select(i.id);
    s.dispatch({
      type: "transform",
      floorId: latest.current.floor.id,
      itemId: i.id,
      x: i.x,
      z: i.z,
      yaw: i.yaw,
    });
  }
  if (!room)
    return (
      <Page>
        <Header title={project.name} back={backToProjects} />
        <Txt style={{ padding: 20 }}>
          No room is available. Open another local project.
        </Txt>
      </Page>
    );
  const view = (v: "2d" | "3d" | "walk") => {
    if (v === "walk" && !walkSpawn(floor, room, placementAssets)) {
      setMessage(
        "No clear place to start Walk. Clear furniture space or restore missing model revisions.",
      );
      return;
    }
    setPanel(null);
    setDoorTool(false);
    setOverview(false);
    setDraft(null);
    s.setMode(v);
  };
  const show = (v: Panel) => {
    if (s.mode === "walk") return;
    setPanel(panel === v ? null : v);
    setExpanded(false);
  };
  const place = (a: AssetRecord) => {
    if (a.stage === "needs-rework") {
      setMessage("This model is being updated. Choose another piece for now.");
      return;
    }
    if (!supportsPlacement(a)) {
      setMessage(
        "This item needs wall attachment. Floor placement is unavailable.",
      );
      return;
    }
    const item = freePosition(floor, room, a, placementAssets);
    if (!item) {
      setMessage(
        "No clear position fits this item. Move existing furniture or choose a smaller piece.",
      );
      return;
    }
    if (s.dispatch({ type: "add-item", floorId: floor.id, item })) {
      s.select(item.id);
      setPanel(null);
      s.updateLibrary((l) => ({
        ...l,
        recent: [a.id, ...l.recent.filter((id) => id !== a.id)].slice(0, 40),
      }));
      setMessage("Drag to position. Use the round handle to rotate.");
    }
  };
  const activeTool = toolSettings ?? s.library.lastDoor;
  const wallTap = (id: string, offset: number) => {
    setWallId(id);
    const d = activeTool;
    const o: Opening = {
      id: newId("opening"),
      wallId: id,
      type: d.type,
      offset: offset - d.width / 2,
      width: d.width,
      height: d.height,
      sill: (d.type as string) === "window" ? 0.9 : 0,
      hinge: d.hinge,
      flip: d.flip,
    };
    if (s.dispatch({ type: "opening", floorId: floor.id, opening: o })) {
      setSelectedDoor(o.id);
      if (!d.repeat) {
        setDoorTool(false);
        setPanel("opening");
      }
    }
  };
  const conflicts = floor.items
    .filter((i) => i.roomId === room.id)
    .map(assetConflict)
    .filter(Boolean);
  const select = (id: string | null) => {
    if (id?.startsWith("opening:")) {
      setSelectedDoor(id.slice(8));
      setPanel("opening");
      s.select(null);
    } else {
      s.select(id);
      setSelectedDoor(null);
    }
  };
  const interaction = {
    floor,
    room,
    mode: s.mode,
    selected: s.selected,
    selectedOpening: opening?.id ?? null,
    quickMove: s.library.settings.quickMove && !overview,
    grid: s.library.settings.grid,
    onSelect: select,
    onCommit: commit,
    onWall: doorTool ? wallTap : undefined,
    onDraft: setDraft,
    onWalkRoom: setWalkRoomId,
    cutaway,
    allRooms,
    allFloors: overview ? project.floors : undefined,
  };
  return (
    <Page>
      <Header
        title={project.name}
        back={backToProjects}
        right={
          <View style={{ flexDirection: "row" }}>
            <IconButton
              name="settings"
              label="Settings"
              onPress={() => router.push("/settings")}
            />
          </View>
        }
      />
      <View
        onLayout={(e) => setEditorHeight(e.nativeEvent.layout.height)}
        style={{ flex: 1, position: "relative" }}
      >
        <View style={{ flex: 1, paddingBottom: panel ? sheetHeight : 0 }}>
          {s.mode === "2d" ? (
            <Plan {...interaction} />
          ) : (
            <Viewport {...interaction} draftOverride={draft} />
          )}
        </View>
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", top: 10, left: 10, right: 10, gap: 8 }}
        >
          <View style={{ flexDirection: "row", gap: 7, alignItems: "center" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Choose room, current ${displayRoom.name}`}
              onPress={() => {
                setPanel("floors");
                setDoorTool(false);
              }}
              style={{
                minHeight: 44,
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: c.surface,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                maxWidth: "43%",
              }}
            >
              <Txt small style={{ flexShrink: 1 }}>
                {displayRoom.name}
              </Txt>
              <Icon name="down" size={14} />
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: c.surface,
                borderRadius: 12,
                padding: 3,
                flex: 1,
              }}
            >
              {(["2d", "3d", "walk"] as const).map((v) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${v === "walk" ? "Walk" : v.toUpperCase()}`}
                  accessibilityState={{ selected: s.mode === v }}
                  key={v}
                  onPress={() => view(v)}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: s.mode === v ? c.selected : c.surface,
                    borderRadius: 9,
                  }}
                >
                  <Txt
                    small
                    style={{ color: s.mode === v ? c.onSelected : c.ink }}
                  >
                    {v === "walk" ? "Walk" : v.toUpperCase()}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {s.mode !== "walk" ? (
              s.history.past.length || s.history.future.length ? (
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <IconButton
                    name="undo"
                    label="Undo"
                    disabled={!s.history.past.length}
                    onPress={s.undo}
                  />
                  <IconButton
                    name="redo"
                    label="Redo"
                    disabled={!s.history.future.length}
                    onPress={s.redo}
                  />
                </View>
              ) : null
            ) : (
              <View
                style={{
                  padding: 8,
                  backgroundColor: c.surface,
                  borderRadius: 9,
                }}
              >
                <Txt small>Read-only Walk</Txt>
              </View>
            )}
          </View>
        </View>
        {overview && (
          <View
            style={{ position: "absolute", bottom: 80, alignSelf: "center" }}
          >
            <Button label="Return to room" onPress={() => setOverview(false)} />
          </View>
        )}
        {doorTool && (
          <View
            style={{
              position: "absolute",
              bottom: 16,
              left: 12,
              right: 12,
              padding: 12,
              backgroundColor: c.surface,
              borderRadius: 14,
              gap: 6,
            }}
          >
            <Txt small>{doorNames[activeTool.type]} · Tap a wall to place</Txt>
            {activeTool.type === "pocket" &&
              floor.walls.some(
                (w) => w.id === wallId && w.thickness < 0.15,
              ) && (
                <Button
                  compact
                  label="Use 15 cm thickness for this wall"
                  onPress={() =>
                    s.dispatch({
                      type: "wall-thickness",
                      floorId: floor.id,
                      wallId,
                      thickness: 0.15,
                    })
                  }
                />
              )}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                compact
                label="Done"
                primary
                onPress={() => setDoorTool(false)}
                style={{ flex: 1 }}
              />
              <Button
                compact
                label="Last opening"
                disabled={!opening}
                onPress={() => {
                  if (!opening) return;
                  setDoorTool(false);
                  setPanel("opening");
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
        {!panel && !doorTool && !overview && s.mode !== "walk" && (
          <View
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              right: 12,
              gap: 8,
            }}
          >
            {item && !asset && (
              <View
                style={{
                  padding: 10,
                  borderRadius: 14,
                  backgroundColor: c.surface,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Missing furniture details"
                  onPress={() => setPanel("item")}
                  style={{ flex: 1 }}
                >
                  <Txt small style={{ fontWeight: "600", color: c.error }}>
                    Missing furniture model
                  </Txt>
                  <Txt small muted>
                    Placement and lock preserved
                  </Txt>
                </Pressable>
                <IconButton
                  name="trash"
                  label="Delete unavailable furniture"
                  onPress={() => {
                    if (
                      s.dispatch({
                        type: "delete-item",
                        floorId: floor.id,
                        itemId: item.id,
                        intentional: true,
                      })
                    )
                      s.select(null);
                  }}
                />
              </View>
            )}
            {item && asset && (
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 15,
                  padding: 8,
                  flexDirection: "row",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Furniture properties"
                  onPress={() => show("item")}
                  style={{ flex: 1, paddingLeft: 7 }}
                >
                  <Txt small style={{ fontWeight: "600" }}>
                    {asset.name}
                  </Txt>
                  <Txt small muted>
                    {item.locked ? "Locked" : "Drag to move"}
                  </Txt>
                </Pressable>
                <View
                  accessibilityLabel="Drag rotation handle"
                  {...(!item.locked ? rotation : {})}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: c.warm,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: item.locked ? 0.4 : 1,
                  }}
                >
                  <Icon name="rotate" />
                </View>
                <IconButton
                  name={item.locked ? "lock" : "unlock"}
                  label={
                    item.locked
                      ? "Unlock selected furniture"
                      : "Lock selected furniture"
                  }
                  selected={item.locked}
                  onPress={() =>
                    s.dispatch({
                      type: "lock",
                      floorId: floor.id,
                      itemId: item.id,
                      locked: !item.locked,
                    })
                  }
                />
                <IconButton
                  name="close"
                  label="Deselect furniture"
                  onPress={() => s.select(null)}
                />
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                alignSelf: "center",
                backgroundColor: c.surface,
                borderRadius: 18,
                padding: 5,
                gap: 2,
                borderWidth: 1,
                borderColor: c.line,
              }}
            >
              {[
                ["furnish", "Furnish", "furniture"],
                ["surfaces", "Surfaces", "paint"],
                ["build", "Build", "build"],
              ].map(([p, label, icon]) => (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  onPress={() => show(p as Panel)}
                  style={{
                    minHeight: 45,
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <Icon name={icon} size={18} />
                  <Txt small>{label}</Txt>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {(message || s.notice || conflicts.length > 0) && (
          <View
            style={{
              position: "absolute",
              top: 108,
              left: 12,
              right: 12,
              backgroundColor: c.surface,
              padding: 10,
              borderRadius: 10,
              flexDirection: "row",
              gap: 4,
              alignItems: "center",
            }}
          >
            <Txt small style={{ flex: 1, color: s.notice ? c.error : c.sub }}>
              {s.notice ?? (message || conflicts[0])}
            </Txt>
            <IconButton
              name="close"
              label="Dismiss message"
              onPress={() => {
                s.clearNotice();
                setMessage("");
              }}
            />
          </View>
        )}
        {draft && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: 160, left: 16, right: 16 }}
          >
            <Txt small style={{ color: c.error }}>
              {(() => {
                const a = resolveItemAsset(draft),
                  draftRoom =
                    floor.rooms.find((r) => r.id === draft.roomId) ?? room;
                return a
                  ? canPlace(floor, draftRoom, draft, a, placementAssets)
                  : "Asset unavailable";
              })()}
            </Txt>
          </View>
        )}
        {panel && (
          <View
            onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          >
            <Sheet
              availableHeight={editorHeight}
              title={
                {
                  furnish: "Furniture",
                  surfaces: "Surfaces",
                  build: "Build",
                  dimensions: "Room dimensions",
                  doors: "Doors",
                  windows: "Windows",
                  floors: "Floors and rooms",
                  "add-room": "Add room",
                  opening: "Opening",
                  item: "Furniture properties",
                }[panel]
              }
              expanded={expanded || filtersOpen}
              onExpand={() => setExpanded(!expanded)}
              onClose={() => {
                setPanel(null);
                setFiltersOpen(false);
              }}
            >
              {panel === "furnish" ? (
                <Catalogue
                  key={browsingKey + s.library.settings.unit}
                  filters={filters}
                  setFilters={setFilters}
                  onPlace={place}
                  filtersOpen={filtersOpen}
                  setFiltersOpen={setFiltersOpen}
                  offset={offset}
                  onOffset={setOffset}
                />
              ) : panel === "surfaces" ? (
                <Surfaces
                  key={
                    room.id +
                    s.library.settings.unit +
                    JSON.stringify([
                      room.floorFinish,
                      room.trim,
                      room.trimOverrides,
                    ])
                  }
                  floor={floor}
                  room={room}
                  tab={tab}
                  setTab={setTab}
                  wallId={wallId}
                  setWallId={setWallId}
                />
              ) : panel === "dimensions" ? (
                <Dimensions
                  key={
                    room.id +
                    s.library.settings.unit +
                    JSON.stringify([room.polygon, room.ceiling, floor.ceiling])
                  }
                  floor={floor}
                  room={room}
                />
              ) : panel === "doors" || panel === "windows" ? (
                <DoorPicker
                  key={s.library.settings.unit}
                  windows={panel === "windows"}
                  onUse={(tool) => {
                    setToolSettings(tool);
                    s.setMode("2d");
                    setDoorTool(true);
                    setPanel(null);
                  }}
                />
              ) : panel === "add-room" ? (
                <AddRoom
                  key={floor.id + s.library.settings.unit}
                  floor={floor}
                  onDone={() => setPanel(null)}
                />
              ) : panel === "floors" ? (
                <Floors
                  key={
                    floor.id +
                    s.library.settings.unit +
                    JSON.stringify([
                      floor.elevation,
                      floor.ceiling,
                      floor.alignment,
                    ])
                  }
                  readOnly={s.mode === "walk"}
                  onDone={() => {
                    setWalkRoomId("");
                    setPanel(null);
                    setOverview(false);
                  }}
                  onOverview={() => {
                    s.setMode("3d");
                    setOverview(true);
                    setPanel(null);
                  }}
                />
              ) : panel === "opening" && opening ? (
                <OpeningProperties
                  key={JSON.stringify(opening) + s.library.settings.unit}
                  floor={floor}
                  opening={opening}
                  onDelete={() => {
                    s.dispatch({
                      type: "delete-opening",
                      floorId: floor.id,
                      openingId: opening.id,
                    });
                    setPanel(null);
                    setSelectedDoor(null);
                  }}
                />
              ) : panel === "opening" ? (
                <View style={{ padding: 16 }}>
                  <Txt>This opening was removed. Use Redo to restore it.</Txt>
                </View>
              ) : panel === "item" && item && !asset ? (
                <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                  <Txt style={{ fontWeight: "600" }}>
                    Missing furniture model
                  </Txt>
                  <Txt small>
                    {item.assetId} / {item.assetVersion}
                  </Txt>
                  <Txt small muted>
                    Reopen with an app version that includes this saved model
                    revision, or intentionally remove the placement. Its
                    position and lock are preserved.
                  </Txt>
                  <Button
                    label="Delete unavailable furniture"
                    icon="trash"
                    onPress={() => {
                      if (
                        s.dispatch({
                          type: "delete-item",
                          floorId: floor.id,
                          itemId: item.id,
                          intentional: true,
                        })
                      ) {
                        s.select(null);
                        setPanel(null);
                      }
                    }}
                  />
                </ScrollView>
              ) : panel === "item" && item && asset ? (
                <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                  <Txt>{asset.name}</Txt>
                  <Txt small muted>
                    {measure(
                      asset.dimensionsMetres.width,
                      s.library.settings.unit,
                    )}{" "}
                    ×{" "}
                    {measure(
                      asset.dimensionsMetres.depth,
                      s.library.settings.unit,
                    )}{" "}
                    · {asset.theme.replaceAll("-", " ")}
                  </Txt>
                  <Button
                    label={item.locked ? "Unlock" : "Lock"}
                    icon={item.locked ? "lock" : "unlock"}
                    onPress={() =>
                      s.dispatch({
                        type: "lock",
                        floorId: floor.id,
                        itemId: item.id,
                        locked: !item.locked,
                      })
                    }
                  />
                  <Txt small muted>
                    Drag the round rotation handle in the scene to rotate.
                  </Txt>
                  {asset.variantSlots.map((slot) => (
                    <View key={slot} style={{ gap: 5 }}>
                      <Txt small muted>
                        {slot}
                      </Txt>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {[
                          "#e8e0cc",
                          "#af8b5d",
                          "#614b38",
                          "#333d40",
                          "#8d9b97",
                        ].map((colour) => (
                          <Pressable
                            key={colour}
                            accessibilityRole="button"
                            accessibilityLabel={`Set ${slot} to ${colour}`}
                            onPress={() =>
                              s.dispatch({
                                type: "item-material",
                                floorId: floor.id,
                                itemId: item.id,
                                slot,
                                colour,
                              })
                            }
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: colour,
                              borderWidth: 1,
                              borderColor: c.line,
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                  <Button
                    label="Delete selected furniture"
                    icon="trash"
                    onPress={() => {
                      if (
                        s.dispatch({
                          type: "delete-item",
                          floorId: floor.id,
                          itemId: item.id,
                          intentional: true,
                        })
                      ) {
                        s.select(null);
                        setPanel(null);
                      }
                    }}
                  />
                </ScrollView>
              ) : (
                <ScrollView contentContainerStyle={{ padding: 16, gap: 9 }}>
                  {[
                    ["dimensions", "Room dimensions"],
                    ["add-room", "Add room"],
                    ["doors", "Doors and openings"],
                    ["windows", "Windows"],
                  ].map(([p, label]) => (
                    <Button
                      key={p}
                      label={label}
                      onPress={() => setPanel(p as Panel)}
                    />
                  ))}
                  <Button
                    label={`Quick door · ${doorNames[s.library.lastDoor.type]}`}
                    icon="door"
                    onPress={() => {
                      setToolSettings(null);
                      s.setMode("2d");
                      setDoorTool(true);
                      setPanel(null);
                    }}
                  />
                  <Button
                    label="Cut away near walls"
                    icon="eye"
                    selected={cutaway}
                    onPress={() => setCutaway(!cutaway)}
                  />
                  <Button
                    label="Whole-floor view"
                    selected={allRooms}
                    onPress={() => {
                      setAllRooms(!allRooms);
                      setPanel(null);
                    }}
                  />
                </ScrollView>
              )}
            </Sheet>
          </View>
        )}
      </View>
    </Page>
  );
}
