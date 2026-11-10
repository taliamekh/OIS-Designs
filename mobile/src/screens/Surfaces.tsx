import { useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import {
  defaultWall,
  Finish,
  Floor,
  Room,
  Sheen,
  Trim,
  WallTexture,
} from "../domain/types";
import { toDisplay } from "../domain/geometry";
import { useStudio } from "../state/Studio";
import { floorIds, materialMaps, wallIds } from "../scene/materials";
import { Button, Chips, Field, Txt, styles, usePalette } from "../ui/kit";
import ColourPicker from "../ui/ColourPicker";
import TrimReference from "../ui/TrimReference";
import { enteredMetres } from "../ui/measurements";
const sheens: Sheen[] = ["matte", "eggshell", "satin", "semi-gloss", "gloss"];
export default function Surfaces({
  floor,
  room,
  tab,
  setTab,
  wallId,
  setWallId,
}: {
  floor: Floor;
  room: Room;
  tab: string;
  setTab: (v: string) => void;
  wallId: string;
  setWallId: (v: string) => void;
}) {
  const s = useStudio(),
    c = usePalette(),
    unit = s.library.settings.unit;
  const walls = floor.walls.filter((w) =>
    w.faces.some((f) => f.roomId === room.id),
  );
  const activeWall = walls.find((w) => w.id === wallId) ?? walls[0];
  const actual = room.wallFaces[activeWall?.id] ?? defaultWall;
  const [repeat, setRepeat] = useState(
      toDisplay(room.floorFinish.repeat, unit).toFixed(3),
    ),
    [angle, setAngle] = useState(
      String(Math.round((room.floorFinish.angle * 180) / Math.PI)),
    ),
    [trim, setTrim] = useState<Trim>({ ...room.trim }),
    [trimScope, setTrimScope] = useState("Room default");
  const trimDisplay = (value: number, projection = false) =>
    String(
      Number(
        (unit === "ft"
          ? value / 0.0254
          : value * (projection ? 1000 : 100)
        ).toFixed(3),
      ),
    );
  const [trimHeight, setTrimHeight] = useState(() =>
      trimDisplay(room.trim.height),
    ),
    [trimProjection, setTrimProjection] = useState(() =>
      trimDisplay(room.trim.projection, true),
    );
  const chooseTrim = (t: Trim) => {
    setTrim({ ...t });
    setTrimHeight(trimDisplay(t.height));
    setTrimProjection(trimDisplay(t.projection, true));
  };
  return (
    <>
      <View style={{ paddingHorizontal: 16 }}>
        <Chips
          values={["Floor", "Walls", "Trim"]}
          value={tab}
          onChange={(v) => {
            setTab(v);
            if (v === "Trim")
              chooseTrim(
                trimScope === "Selected wall"
                  ? (room.trimOverrides[activeWall.id] ?? room.trim)
                  : room.trim,
              );
            if (v === "Floor") {
              setRepeat(toDisplay(room.floorFinish.repeat, unit).toFixed(3));
              setAngle(
                String(Math.round((room.floorFinish.angle * 180) / Math.PI)),
              );
            }
          }}
        />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "Floor" ? (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {floorIds.map((id) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`Apply ${materialMaps[id].name}`}
                  accessibilityState={{ selected: room.floorFinish.id === id }}
                  onPress={() =>
                    s.dispatch({
                      type: "floor-finish",
                      floorId: floor.id,
                      roomId: room.id,
                      finish: { ...room.floorFinish, id },
                    })
                  }
                  style={{ width: "30%", gap: 4 }}
                >
                  <Image
                    source={materialMaps[id].colour}
                    style={{
                      width: "100%",
                      height: 58,
                      borderRadius: 9,
                      borderWidth: 2,
                      borderColor:
                        room.floorFinish.id === id ? c.focus : c.line,
                    }}
                  />
                  <Txt small style={{ fontSize: 11 }}>
                    {materialMaps[id].name}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              <Field
                label={`Texture repeat (${unit})`}
                value={repeat}
                onChange={setRepeat}
                keyboard="decimal-pad"
              />
              <Field
                label="Direction (degrees)"
                value={angle}
                onChange={setAngle}
                keyboard="decimal-pad"
              />
            </View>
            <Button
              label="Apply scale and direction"
              onPress={() =>
                s.dispatch({
                  type: "floor-finish",
                  floorId: floor.id,
                  roomId: room.id,
                  finish: {
                    ...room.floorFinish,
                    repeat: enteredMetres(
                      repeat,
                      room.floorFinish.repeat,
                      unit,
                    ),
                    angle:
                      angle ===
                      String(
                        Math.round((room.floorFinish.angle * 180) / Math.PI),
                      )
                        ? room.floorFinish.angle
                        : (Number(angle) * Math.PI) / 180,
                  },
                })
              }
            />
          </>
        ) : tab === "Walls" ? (
          <WallFinishEditor
            key={activeWall.id + JSON.stringify(actual)}
            floor={floor}
            room={room}
            wallId={activeWall.id}
            setWallId={setWallId}
          />
        ) : (
          <>
            <Chips
              values={["Room default", "Selected wall"]}
              value={trimScope}
              onChange={(v) => {
                setTrimScope(v);
                chooseTrim(
                  v === "Selected wall"
                    ? (room.trimOverrides[activeWall.id] ?? room.trim)
                    : room.trim,
                );
              }}
            />
            {trimScope === "Selected wall" && (
              <Chips
                values={walls.map((_, i) => `Wall ${i + 1}`)}
                value={`Wall ${walls.findIndex((w) => w.id === activeWall?.id) + 1}`}
                onChange={(v) => {
                  const id = walls[Number(v.split(" ")[1]) - 1].id;
                  setWallId(id);
                  chooseTrim(room.trimOverrides[id] ?? room.trim);
                }}
              />
            )}
            <Txt small muted>
              Baseboard profile
            </Txt>
            <Chips
              values={["none", "flat", "bevel", "ogee", "stepped"]}
              value={trim.profile}
              onChange={(v) =>
                setTrim({ ...trim, profile: v as Trim["profile"] })
              }
            />
            <View style={styles.row}>
              <Field
                label={unit === "ft" ? "Height (in)" : "Height (cm)"}
                value={trimHeight}
                onChange={setTrimHeight}
                keyboard="decimal-pad"
              />
              <Field
                label={unit === "ft" ? "Projection (in)" : "Projection (mm)"}
                value={trimProjection}
                onChange={setTrimProjection}
                keyboard="decimal-pad"
              />
            </View>
            <Field
              label="Trim HEX"
              value={trim.colour}
              onChange={(v) => setTrim({ ...trim, colour: v })}
            />
            <Txt small muted>
              Material
            </Txt>
            <Chips
              values={["paint", "white-oak", "walnut", "aluminium"]}
              value={trim.material ?? "paint"}
              onChange={(v) =>
                setTrim({ ...trim, material: v as Trim["material"] })
              }
            />
            <Chips
              values={sheens}
              value={trim.sheen}
              onChange={(v) => setTrim({ ...trim, sheen: v as Sheen })}
            />

            <TrimReference
              key={trimScope + activeWall.id + (trim.reference?.id ?? "none")}
              reference={trim.reference}
              unit={unit}
              onChange={(reference) => setTrim({ ...trim, reference })}
            />
            <Button
              label="Apply baseboards"
              primary
              onPress={() =>
                s.dispatch({
                  type: "trim",
                  floorId: floor.id,
                  roomId: room.id,
                  wallId:
                    trimScope === "Selected wall" ? activeWall.id : undefined,
                  trim: {
                    ...trim,
                    height:
                      trimHeight === trimDisplay(trim.height)
                        ? trim.height
                        : Number(trimHeight) * (unit === "ft" ? 0.0254 : 0.01),
                    projection:
                      trimProjection === trimDisplay(trim.projection, true)
                        ? trim.projection
                        : Number(trimProjection) *
                          (unit === "ft" ? 0.0254 : 0.001),
                  },
                })
              }
            />
          </>
        )}
      </ScrollView>
    </>
  );
}

function WallFinishEditor({
  floor,
  room,
  wallId,
  setWallId,
}: {
  floor: Floor;
  room: Room;
  wallId: string;
  setWallId: (v: string) => void;
}) {
  const s = useStudio(),
    c = usePalette(),
    walls = floor.walls.filter((w) =>
      w.faces.some((f) => f.roomId === room.id),
    ),
    activeWall = walls.find((w) => w.id === wallId) ?? walls[0],
    actual = room.wallFaces[activeWall.id] ?? defaultWall;
  const [colour, setColour] = useState(actual.colour),
    [texture, setTexture] = useState<WallTexture>(actual.texture),
    [sheen, setSheen] = useState<Sheen>(actual.sheen);
  const recent = s.library.recentColours ?? [
    "#dedbd2",
    "#ffffff",
    "#b5b8a5",
    "#87969a",
    "#d9c9b5",
  ];
  const applyWall = (all: boolean) => {
    const finish: Finish = { colour, texture, sheen };
    if (
      s.dispatch({
        type: "wall-finish",
        floorId: floor.id,
        roomId: room.id,
        wallId: all ? "all" : activeWall.id,
        finish,
      })
    )
      s.updateLibrary((l) => ({
        ...l,
        recentColours: [
          colour,
          ...(l.recentColours ?? recent).filter((c) => c !== colour),
        ].slice(0, 8),
      }));
  };
  return (
    <>
      <Txt small muted>
        Painting changes this room-facing side only.
      </Txt>
      <Chips
        values={walls.map((_, i) => `Wall ${i + 1}`)}
        value={`Wall ${walls.findIndex((w) => w.id === activeWall?.id) + 1}`}
        onChange={(v) => {
          const w = walls[Number(v.split(" ")[1]) - 1];
          setWallId(w.id);
          const f = room.wallFaces[w.id] ?? defaultWall;
          setColour(f.colour);
          setTexture(f.texture);
          setSheen(f.sheen);
        }}
      />
      <ColourPicker value={colour} onChange={setColour} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {recent.map((hex) => (
          <Pressable
            key={hex}
            accessibilityRole="button"
            accessibilityLabel={`Use ${hex}`}
            onPress={() => setColour(hex)}
            style={{
              backgroundColor: hex,
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.line,
            }}
          />
        ))}
      </View>
      <Txt style={{ fontWeight: "600" }}>Wall finish</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {wallIds.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={
              id === "paint" ? "Painted drywall" : materialMaps[id].name
            }
            onPress={() => setTexture(id as WallTexture)}
            style={{
              width: "30%",
              gap: 4,
              padding: 4,
              borderWidth: 1,
              borderColor: texture === id ? c.focus : c.line,
              borderRadius: 10,
            }}
          >
            {id === "paint" ? (
              <View
                style={{
                  height: 44,
                  backgroundColor: colour,
                  borderRadius: 7,
                }}
              />
            ) : (
              <Image
                source={materialMaps[id].colour}
                style={{ height: 44, width: "100%", borderRadius: 7 }}
              />
            )}
            <Txt small style={{ fontSize: 11 }}>
              {id === "paint" ? "Painted drywall" : materialMaps[id].name}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Txt small muted>
        Reflectance
      </Txt>
      <Chips
        values={sheens}
        value={sheen}
        onChange={(v) => setSheen(v as Sheen)}
      />
      <View style={styles.row}>
        <Button
          label="Paint selected wall"
          primary
          disabled={!/^#[\da-f]{6}$/i.test(colour)}
          onPress={() => applyWall(false)}
          style={{ flex: 1 }}
        />
        <Button
          label="Apply to room"
          disabled={!/^#[\da-f]{6}$/i.test(colour)}
          onPress={() => applyWall(true)}
          style={{ flex: 1 }}
        />
      </View>
    </>
  );
}
