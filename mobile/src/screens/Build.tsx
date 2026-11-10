import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Path, Line, Rect } from "react-native-svg";
import {
  bounds,
  measure,
  openingInsideDimensions,
  toDisplay,
  toMetres,
  shapePolygon,
  newRoomReferenceDimensions,
  roomInsideDimensions,
  openingOffsetRange,
  openingPhysicalError,
} from "../domain/geometry";
import { makeFloor, makeRoom } from "../domain/project";
import {
  DoorType,
  Floor,
  Opening,
  Room,
  RoomKind,
  roomNames,
} from "../domain/types";
import { useStudio } from "../state/Studio";
import { enteredMetres } from "../ui/measurements";
import { Button, Chips, Field, Txt, styles, usePalette } from "../ui/kit";
export function DoorArt({ type }: { type: DoorType }) {
  const c = usePalette();
  return (
    <Svg width={110} height={55} viewBox="0 0 110 55">
      <Line x1={0} y1={42} x2={20} y2={42} stroke={c.ink} strokeWidth={5} />
      <Line x1={90} y1={42} x2={110} y2={42} stroke={c.ink} strokeWidth={5} />
      {type === "single" ? (
        <Path
          d="M20 42V7M20 7A35 35 0 0 1 55 42M55 42H90"
          fill="none"
          stroke={c.focus}
          strokeWidth={2}
        />
      ) : type === "double" ? (
        <Path
          d="M20 42V12M20 12A30 30 0 0 1 50 42M90 42V12M90 12A30 30 0 0 0 60 42"
          fill="none"
          stroke={c.focus}
          strokeWidth={2}
        />
      ) : type === "sliding" || type === "pocket" ? (
        <>
          <Rect
            x={type === "pocket" ? 6 : 20}
            y={32}
            width={65}
            height={5}
            stroke={c.focus}
            fill="none"
          />
          <Path d="M32 20h40m-8-6 8 6-8 6" fill="none" stroke={c.focus} />
        </>
      ) : type === "window" ? (
        <Rect
          x={20}
          y={37}
          width={70}
          height={9}
          stroke={c.focus}
          fill="none"
        />
      ) : (
        <Path d="M20 34v16m70-16v16" stroke={c.focus} />
      )}
    </Svg>
  );
}
export const doorNames: Record<DoorType, string> = {
  single: "Single swing",
  double: "Double swing",
  sliding: "Surface sliding",
  pocket: "Pocket sliding",
  open: "Open doorway",
  window: "Window",
};
export function DoorPicker({
  onUse,
  windows = false,
}: {
  onUse: (tool: {
    type: DoorType;
    width: number;
    height: number;
    repeat: boolean;
    hinge: "left" | "right";
    flip: boolean;
  }) => void;
  windows?: boolean;
}) {
  const s = useStudio(),
    c = usePalette(),
    d = s.library.lastDoor,
    unit = s.library.settings.unit,
    [type, setType] = useState<DoorType>(
      windows ? "window" : (d.type as string) === "window" ? "single" : d.type,
    ),
    [widthBase, setWidthBase] = useState(windows ? 1.2 : d.width),
    [width, setWidth] = useState(toDisplay(widthBase, unit).toFixed(3)),
    [height, setHeight] = useState(
      toDisplay(windows ? 1.2 : d.height, unit).toFixed(3),
    ),
    [repeat, setRepeat] = useState(d.repeat);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={styles.grid}>
        {(windows
          ? ["window"]
          : [
              ...new Set([
                ...(s.library.recentDoorTypes ?? []),
                "single",
                "double",
                "sliding",
                "pocket",
                "open",
              ]),
            ]
        ).map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={doorNames[v as DoorType]}
            accessibilityState={{ selected: type === v }}
            onPress={() => {
              setType(v as DoorType);
              setWidthBase(v === "double" ? 1.4 : 0.9);
              setWidth(toDisplay(v === "double" ? 1.4 : 0.9, unit).toFixed(3));
            }}
            style={{
              width: "47%",
              minHeight: 100,
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: 8,
              borderWidth: 1,
              borderRadius: 12,
              borderColor: type === v ? c.focus : c.line,
              backgroundColor: type === v ? c.warm : c.surface,
            }}
          >
            <DoorArt type={v as DoorType} />
            <Txt small>{doorNames[v as DoorType]}</Txt>
            {!windows &&
            s.library.recentDoorTypes?.includes(v as typeof d.type) ? (
              <Txt small muted>
                Recent
              </Txt>
            ) : null}
          </Pressable>
        ))}
        <View style={{ alignItems: "center", width: "100%" }}>
          <DoorArt type={type} />
        </View>
      </View>
      <View style={styles.row}>
        <Field
          label={`Clear width (${unit})`}
          value={width}
          onChange={setWidth}
          keyboard="decimal-pad"
        />
        <Field
          label={`Clear height (${unit})`}
          value={height}
          onChange={setHeight}
          keyboard="decimal-pad"
        />
      </View>
      <Button
        label="Keep placing"
        selected={repeat}
        onPress={() => setRepeat(!repeat)}
      />
      {type === "pocket" && (
        <Txt small muted>
          Pocket placement requires a wall at least 15 cm thick and a full-width
          clear pocket beside the opening.
        </Txt>
      )}
      <Button
        label="Place on floor plan"
        primary
        disabled={
          !Number.isFinite(Number(width)) ||
          !Number.isFinite(Number(height)) ||
          enteredMetres(width, widthBase, unit) < 0.3 ||
          enteredMetres(height, windows ? 1.2 : d.height, unit) < 0.3
        }
        onPress={() => {
          const tool = {
            ...d,
            type,
            width: enteredMetres(width, widthBase, unit),
            height: enteredMetres(height, windows ? 1.2 : d.height, unit),
            repeat,
          };
          if (type !== "window")
            s.updateLibrary((l) => ({
              ...l,
              lastDoor: { ...tool, type },
              recentDoorTypes: [
                type,
                ...(l.recentDoorTypes ?? []).filter((v) => v !== type),
              ].slice(0, 5),
            }));
          onUse(tool);
        }}
      />
    </ScrollView>
  );
}
export function OpeningProperties({
  floor,
  opening,
  onDelete,
}: {
  floor: Floor;
  opening: Opening;
  onDelete: () => void;
}) {
  const s = useStudio(),
    unit = s.library.settings.unit,
    [offset, setOffset] = useState(toDisplay(opening.offset, unit).toFixed(2)),
    [width, setWidth] = useState(toDisplay(opening.width, unit).toFixed(2)),
    [height, setHeight] = useState(toDisplay(opening.height, unit).toFixed(2)),
    [sill, setSill] = useState(toDisplay(opening.sill, unit).toFixed(2)),
    [hinge, setHinge] = useState(opening.hinge),
    [flip, setFlip] = useState(opening.flip);
  const wall = floor.walls.find((w) => w.id === opening.wallId)!;
  const savedIssue = openingPhysicalError(floor, opening);
  let range: ReturnType<typeof openingOffsetRange> | undefined;
  try {
    range = openingOffsetRange(floor, {
      ...opening,
      hinge,
      width: enteredMetres(width, opening.width, unit, 2),
    });
  } catch {
    // Keep legacy openings inspectable, even when their room needs repair.
  }
  const inputRange = range
    ? {
        min: Math.ceil(toDisplay(range.min, unit) * 100 - 1e-7) / 100,
        max: Math.floor(toDisplay(range.max, unit) * 100 + 1e-7) / 100,
      }
    : undefined;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Txt style={{ fontWeight: "600" }}>{doorNames[opening.type]}</Txt>
      {savedIssue && (
        <Txt small>Saved opening needs correction: {savedIssue}</Txt>
      )}
      {inputRange && inputRange.min <= inputRange.max && (
        <Txt small muted>
          Position range from wall start ({unit}): {inputRange.min.toFixed(2)}–
          {inputRange.max.toFixed(2)}.
        </Txt>
      )}
      {openingInsideDimensions(floor, opening).map((d) => (
        <View key={d.roomId}>
          <Txt small>{d.name}</Txt>
          <Txt small muted>
            {measure(d.before, unit)} to corner · {measure(opening.width, unit)}{" "}
            clear opening · {measure(d.after, unit)} to corner
          </Txt>
        </View>
      ))}
      {wall.faces.length === 1 && (
        <Txt small muted>
          Exterior face follows the same wall endpoints.
        </Txt>
      )}
      <View style={styles.row}>
        <Field
          label={`Offset from wall start (${unit})`}
          value={offset}
          onChange={setOffset}
          keyboard="decimal-pad"
        />
        <Field
          label={`Width (${unit})`}
          value={width}
          onChange={setWidth}
          keyboard="decimal-pad"
        />
        <Field
          label={`Height (${unit})`}
          value={height}
          onChange={setHeight}
          keyboard="decimal-pad"
        />
      </View>
      {opening.type === "window" && (
        <Field
          label={`Sill height (${unit})`}
          value={sill}
          onChange={setSill}
          keyboard="decimal-pad"
        />
      )}
      <Chips
        values={["left", "right"]}
        value={hinge}
        onChange={(v) => setHinge(v as "left" | "right")}
      />
      <Button
        label="Flip swing / travel side"
        selected={flip}
        onPress={() => setFlip(!flip)}
      />
      <Button
        primary
        label="Apply opening"
        onPress={() =>
          s.dispatch({
            type: "opening",
            floorId: floor.id,
            opening: {
              ...opening,
              offset: enteredMetres(offset, opening.offset, unit, 2),
              width: enteredMetres(width, opening.width, unit, 2),
              height: enteredMetres(height, opening.height, unit, 2),
              sill: enteredMetres(sill, opening.sill, unit, 2),
              hinge,
              flip,
            },
          })
        }
      />
      <Button
        label="Use 15 cm wall for pocket"
        onPress={() =>
          s.dispatch({
            type: "wall-thickness",
            floorId: floor.id,
            wallId: wall.id,
            thickness: 0.15,
          })
        }
      />
      <Button label="Delete opening" icon="trash" onPress={onDelete} />
    </ScrollView>
  );
}
export function Dimensions({ floor, room }: { floor: Floor; room: Room }) {
  let inside: ReturnType<typeof roomInsideDimensions> | undefined;
  try {
    inside = roomInsideDimensions(floor, room);
  } catch {
    // Keep collapsed legacy outlines editable through explicit reference sizes.
  }
  const s = useStudio(),
    unit = s.library.settings.unit,
    b = bounds(room.polygon),
    originalWidth = inside?.width ?? b.maxX - b.minX,
    originalDepth = inside?.depth ?? b.maxZ - b.minZ,
    [width, setWidth] = useState(toDisplay(originalWidth, unit).toFixed(3)),
    [depth, setDepth] = useState(toDisplay(originalDepth, unit).toFixed(3)),
    [ceiling, setCeiling] = useState(
      toDisplay(room.ceiling ?? floor.ceiling, unit).toFixed(3),
    ),
    [inherit, setInherit] = useState(room.ceiling === null);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Txt small muted>
        {unit === "ft" ? "Enter decimal feet." : "Enter metres."} Changing
        display units in Settings preserves geometry.
      </Txt>
      <Txt small muted>
        {inside
          ? "Width and depth measure between inside wall faces, before trim. Existing wall reference coordinates stay unchanged until you apply a resize."
          : "Inside dimensions are unavailable because the wall thickness collapses this outline. These are wall reference dimensions; increase them to repair the room."}
      </Txt>
      <View style={styles.row}>
        <Field
          label={`Width (${unit})`}
          value={width}
          onChange={setWidth}
          keyboard="decimal-pad"
        />
        <Field
          label={`Depth (${unit})`}
          value={depth}
          onChange={setDepth}
          keyboard="decimal-pad"
        />
      </View>
      <Field
        label={`Ceiling height (${unit})`}
        value={ceiling}
        onChange={(value) => {
          setCeiling(value);
          setInherit(false);
        }}
        keyboard="decimal-pad"
      />
      <Button
        label={`Use floor ceiling · ${measure(floor.ceiling, unit)}`}
        selected={inherit}
        onPress={() => setInherit(!inherit)}
      />
      <Button
        label="Apply dimensions"
        primary
        onPress={() =>
          s.dispatch({
            type: "room-dimensions",
            floorId: floor.id,
            roomId: room.id,
            width: enteredMetres(width, originalWidth, unit),
            depth: enteredMetres(depth, originalDepth, unit),
            dimensionMode: inside ? "inside" : "reference",
            ceiling: inherit
              ? null
              : enteredMetres(ceiling, room.ceiling ?? floor.ceiling, unit),
          })
        }
      />
      <Txt small muted>
        Flat room overrides are supported. Sloped/vaulted ceilings, soffits and
        double-height voids are planned geometry increments.
      </Txt>
    </ScrollView>
  );
}
export function AddRoom({
  floor,
  onDone,
}: {
  floor: Floor;
  onDone: () => void;
}) {
  const s = useStudio(),
    unit = s.library.settings.unit,
    [kind, setKind] = useState<RoomKind>("bedroom"),
    [shape, setShape] = useState("rectangle"),
    [width, setWidth] = useState(toDisplay(3.2, unit).toFixed(3)),
    [depth, setDepth] = useState(toDisplay(3.8, unit).toFixed(3)),
    b = bounds(floor.rooms.flatMap((r) => r.polygon)),
    [x, setX] = useState(toDisplay(b.maxX, unit).toFixed(3)),
    [z, setZ] = useState(toDisplay(b.minZ, unit).toFixed(3));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Chips
        values={Object.keys(roomNames)}
        labels={roomNames}
        value={kind}
        onChange={(v) => setKind(v as RoomKind)}
      />
      <Chips
        values={["square", "rectangle", "l"]}
        value={shape}
        onChange={setShape}
      />
      <Txt small muted>
        Width and depth measure inside wall faces, before trim. Origins follow
        wall reference lines in the units selected in Settings.
      </Txt>
      <View style={styles.row}>
        <Field
          label={`Width (${unit})`}
          value={width}
          onChange={setWidth}
          keyboard="decimal-pad"
        />
        <Field
          label={`Depth (${unit})`}
          value={depth}
          onChange={setDepth}
          keyboard="decimal-pad"
        />
        <Field
          label={`X origin (${unit})`}
          value={x}
          onChange={setX}
          keyboard="decimal-pad"
        />
        <Field
          label={`Z origin (${unit})`}
          value={z}
          onChange={setZ}
          keyboard="decimal-pad"
        />
      </View>
      <Button
        label="Add room"
        primary
        onPress={() => {
          const reference = newRoomReferenceDimensions(
            toMetres(Number(width), unit),
            toMetres(Number(depth), unit),
          );
          const room = makeRoom(
            kind,
            roomNames[kind],
            shapePolygon(shape, reference.width, reference.depth, {
              x: toMetres(Number(x), unit),
              z: toMetres(Number(z), unit),
            }),
          );
          if (
            s.dispatch({
              type: "add-room",
              floorId: floor.id,
              room,
              insideDimensions: {
                width: toMetres(Number(width), unit),
                depth: toMetres(Number(depth), unit),
              },
            })
          )
            onDone();
        }}
      />
    </ScrollView>
  );
}
export function Floors({
  onDone,
  onOverview,
  readOnly = false,
}: {
  onDone: () => void;
  onOverview: () => void;
  readOnly?: boolean;
}) {
  const s = useStudio(),
    unit = s.library.settings.unit,
    project = s.history.present,
    [floorName, setFloorName] = useState("New floor"),
    [newElevation, setNewElevation] = useState(
      toDisplay(
        Math.max(...project.floors.map((f) => f.elevation)) + 3,
        unit,
      ).toFixed(3),
    ),
    [elevation, setElevation] = useState(
      toDisplay(
        (project.floors.find((f) => f.id === s.floorId) ?? project.floors[0])
          .elevation,
        unit,
      ).toFixed(3),
    ),
    [height, setHeight] = useState(
      toDisplay(
        (project.floors.find((f) => f.id === s.floorId) ?? project.floors[0])
          .ceiling,
        unit,
      ).toFixed(3),
    ),
    [x, setX] = useState(
      toDisplay(
        (project.floors.find((f) => f.id === s.floorId) ?? project.floors[0])
          .alignment.x,
        unit,
      ).toFixed(3),
    ),
    [z, setZ] = useState(
      toDisplay(
        (project.floors.find((f) => f.id === s.floorId) ?? project.floors[0])
          .alignment.z,
        unit,
      ).toFixed(3),
    );
  const f = project.floors.find((f) => f.id === s.floorId) ?? project.floors[0];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      {project.floors.map((f) => (
        <View key={f.id} style={{ gap: 6 }}>
          <Txt style={{ fontWeight: "600" }}>
            {f.name} · {measure(f.elevation, s.library.settings.unit)}
          </Txt>
          <View style={styles.row}>
            {f.rooms.map((r) => (
              <Button
                key={r.id}
                label={r.name}
                compact
                selected={r.id === s.roomId}
                onPress={() => {
                  s.selectRoom(f.id, r.id);
                  onDone();
                }}
              />
            ))}
          </View>
        </View>
      ))}
      <Button label="View all floors" icon="layers" onPress={onOverview} />
      {!readOnly && (
        <>
          <Txt style={{ fontWeight: "600" }}>Floor alignment and defaults</Txt>
          <View style={styles.row}>
            <Field
              label={`X alignment (${unit})`}
              value={x}
              onChange={setX}
              keyboard="decimal-pad"
            />
            <Field
              label={`Z alignment (${unit})`}
              value={z}
              onChange={setZ}
              keyboard="decimal-pad"
            />
            <Field
              label={`Floor elevation (${unit})`}
              value={elevation}
              onChange={setElevation}
              keyboard="decimal-pad"
            />
            <Field
              label={`Default ceiling (${unit})`}
              value={height}
              onChange={setHeight}
              keyboard="decimal-pad"
            />
          </View>
          <Button
            label={`Apply to ${f.name}`}
            onPress={() =>
              s.dispatch({
                type: "floor-settings",
                floorId: f.id,
                name: f.name,
                elevation: enteredMetres(elevation, f.elevation, unit),
                ceiling: enteredMetres(height, f.ceiling, unit),
                alignment: {
                  x: enteredMetres(x, f.alignment.x, unit),
                  z: enteredMetres(z, f.alignment.z, unit),
                },
              })
            }
          />
          <Field
            label="New floor name"
            value={floorName}
            onChange={setFloorName}
          />
          <Field
            label={`New floor elevation (${unit})`}
            value={newElevation}
            onChange={setNewElevation}
            keyboard="decimal-pad"
          />
          <Button
            label="Create floor with room"
            icon="plus"
            onPress={() => {
              const floor = makeFloor(
                floorName,
                toMetres(Number(newElevation), unit),
              );
              floor.ceiling = toMetres(Number(height), unit);
              floor.alignment = {
                x: toMetres(Number(x), unit),
                z: toMetres(Number(z), unit),
              };
              floor.rooms = [
                makeRoom(
                  "bedroom",
                  "Bedroom",
                  shapePolygon("rectangle", 4.12, 3.92),
                ),
              ];
              s.dispatch({ type: "add-floor", floor });
            }}
          />
          <Txt small muted>
            Use room jumping to change floors. Stair traversal is not available
            without connected stair/opening geometry.
          </Txt>
        </>
      )}
    </ScrollView>
  );
}
