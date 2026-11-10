import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { libraryStorage } from "../storage/library";
import { ScrollView, View } from "react-native";
import Svg, { Circle, Path, Polygon, Text as SvgText } from "react-native-svg";
import {
  bounds,
  measure,
  overlaps,
  rebuildWalls,
  toDisplay,
  toMetres,
  validPolygon,
  roomInsideDimensions,
} from "../domain/geometry";
import { makeFloor, makeRoom } from "../domain/project";
import { DraftStore, FloorDraft } from "../domain/draft";
import {
  newId,
  Point,
  Project,
  Room,
  RoomKind,
  roomNames,
} from "../domain/types";
import { pinchMetrics, touchPoints } from "../scene/touches";
import { useStudio } from "../state/Studio";
import {
  Button,
  Chips,
  Field,
  Header,
  IconButton,
  Page,
  Txt,
  usePalette,
} from "../ui/kit";
export default function FloorPlanDraft({
  guide,
  ceiling,
  onBack,
}: {
  guide?: Point[];
  ceiling: number;
  onBack: () => void;
}) {
  const s = useStudio(),
    c = usePalette(),
    unit = s.library.settings.unit;
  const [store] = useState(() => new DraftStore(libraryStorage));
  const completed = useRef(false);
  const [draftReady, setDraftReady] = useState(false),
    [availableDraft, setAvailableDraft] = useState<FloorDraft | null>(null),
    [draftProblem, setDraftProblem] = useState(""),
    [activeGuide, setActiveGuide] = useState(guide);
  const [rooms, setRooms] = useState<Room[]>([]),
    [points, setPoints] = useState<Point[]>([]),
    [kind, setKind] = useState<RoomKind>("living"),
    [height, setHeight] = useState(toDisplay(ceiling, unit).toFixed(3)),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [size, setSize] = useState({ width: 390, height: 390 }),
    [camera, setCamera] = useState({ zoom: 1, x: 0, y: 0 });
  useEffect(() => {
    let live = true;
    store
      .load()
      .then((d) => {
        if (!live) return;
        if (d && (d.rooms.length || d.points.length)) setAvailableDraft(d);
        else setDraftReady(true);
      })
      .catch((e) => {
        if (live) setDraftProblem(String(e));
      });
    return () => {
      live = false;
    };
  }, [store]);
  useEffect(() => {
    if (!draftReady || busy || completed.current) return;
    void store
      .save({
        version: 1,
        rooms,
        points,
        kind,
        height,
        unit,
        guide: activeGuide,
      })
      .catch((e) => setMessage(`Draft save failed: ${String(e)}`));
  }, [store, draftReady, busy, rooms, points, kind, height, unit, activeGuide]);
  const drawing = useRef<{
      x: number;
      y: number;
      panX: number;
      panY: number;
      moved: boolean;
    } | null>(null),
    pinch = useRef<{ distance: number; zoom: number; anchor: Point } | null>(
      null,
    );
  const measurementFloor = useMemo(() => {
    const floor = makeFloor();
    floor.rooms = rooms;
    floor.walls = rebuildWalls(rooms);
    return floor;
  }, [rooms]);
  const frame = activeGuide
      ? bounds(activeGuide)
      : { minX: 0, minZ: 0, maxX: 10, maxZ: 8 },
    baseScale = Math.min(
      (size.width - 48) / (frame.maxX - frame.minX),
      (size.height - 48) / (frame.maxZ - frame.minZ),
    ),
    scale = baseScale * camera.zoom,
    ox = 24 - frame.minX * scale + camera.x,
    oz = 24 - frame.minZ * scale + camera.y;
  const world = (x: number, y: number): Point => ({
    x: (x - ox) / scale,
    z: (y - oz) / scale,
  });
  const closeRoom = () => {
    if (!validPolygon(points)) {
      setMessage(
        "Use at least three corners and a closed outline without crossing walls.",
      );
      return;
    }
    if (rooms.some((r) => overlaps(r.polygon, points))) {
      setMessage(
        "This room overlaps an existing room. Shared wall edges are allowed.",
      );
      return;
    }
    const number = rooms.filter((r) => r.kind === kind).length + 1,
      room = makeRoom(
        kind,
        roomNames[kind] + (number > 1 ? ` ${number}` : ""),
        points,
      );
    setRooms((r) => [...r, room]);
    setPoints([]);
    setMessage("Room added. Draw the next room or create the floor plan.");
  };
  const save = async () => {
    setBusy(true);
    try {
      const value = toMetres(Number(height), unit);
      if (!Number.isFinite(value) || value < 1.8 || value > 8)
        throw Error("Floor ceiling must be1.8–8 metres.");
      const floor = makeFloor();
      floor.ceiling = value;
      floor.rooms = rooms;
      floor.walls = rebuildWalls(rooms);
      const project: Project = {
        id: newId("project"),
        schemaVersion: 1,
        name: "Untitled floor plan",
        updatedAt: Date.now(),
        floors: [floor],
      };
      await s.addProject({ past: [], present: project, future: [] });
      completed.current = true;
      await store
        .clear()
        .catch((e) =>
          setMessage(
            `The project is saved; the unfinished-draft marker could not be cleared: ${String(e)}`,
          ),
        );
      router.replace("/editor");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };
  if (!draftReady)
    return (
      <Page>
        <Header title="Draw floor plan" back={onBack} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {availableDraft || draftProblem ? (
            <>
              <Txt>
                {draftProblem ||
                  `Resume your unfinished floor plan with ${availableDraft?.rooms.length} rooms?`}
              </Txt>
              {availableDraft && (
                <Button
                  primary
                  label="Resume saved draft"
                  onPress={() => {
                    const d = availableDraft;
                    setRooms(d.rooms);
                    setPoints(d.points);
                    setKind(d.kind);
                    setActiveGuide(d.guide);
                    setHeight(
                      d.unit === unit
                        ? d.height
                        : String(
                            toDisplay(toMetres(Number(d.height), d.unit), unit),
                          ),
                    );
                    setDraftReady(true);
                  }}
                />
              )}
              <Button
                label="Start a new draft"
                onPress={() => {
                  void store
                    .startFresh()
                    .then(() => {
                      setAvailableDraft(null);
                      setDraftProblem("");
                      setDraftReady(true);
                    })
                    .catch((e) => setDraftProblem(String(e)));
                }}
              />
              <Txt small muted>
                Starting again keeps an archived copy of the previous draft on
                this device.
              </Txt>
            </>
          ) : (
            <Txt>Opening unfinished drawing…</Txt>
          )}
        </ScrollView>
      </Page>
    );
  return (
    <Page>
      <Header title="Draw floor plan" eyebrow="New project" back={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 5 }}>
          <Chips
            values={Object.keys(roomNames)}
            labels={roomNames}
            value={kind}
            onChange={(v) => setKind(v as RoomKind)}
          />
          <Txt small muted>
            Tap room corners on the plan. Drag to pan; pinch to zoom. Corners
            snap to10 cm. Drawing edges follow wall reference lines; closed room
            sizes measure inside wall faces, before trim.
          </Txt>
        </View>
        <View
          testID="floor-plan-drawing"
          style={{
            flexGrow: 1,
            height: 360,
            minHeight: 240,
            backgroundColor: c.paper,
            overflow: "hidden",
          }}
          onLayout={(e) =>
            setSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
          onStartShouldSetResponderCapture={() => true}
          onMoveShouldSetResponderCapture={() => true}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderStart={(e) => {
            if (touchPoints(e).length > 1 && drawing.current)
              drawing.current.moved = true;
          }}
          onResponderGrant={(e) => {
            drawing.current = {
              x: e.nativeEvent.locationX,
              y: e.nativeEvent.locationY,
              panX: camera.x,
              panY: camera.y,
              moved: false,
            };
            pinch.current = null;
          }}
          onResponderMove={(e) => {
            const m = pinchMetrics(touchPoints(e)),
              d = drawing.current;
            if (m) {
              if (!pinch.current)
                pinch.current = {
                  distance: m.distance,
                  zoom: camera.zoom,
                  anchor: world(m.x, m.y),
                };
              const p = pinch.current,
                zoom = Math.max(
                  0.4,
                  Math.min(10, (p.zoom * m.distance) / p.distance),
                ),
                next = baseScale * zoom;
              setCamera({
                zoom,
                x: m.x - 24 + frame.minX * next - p.anchor.x * next,
                y: m.y - 24 + frame.minZ * next - p.anchor.z * next,
              });
              if (d) d.moved = true;
              return;
            }
            if (!d || pinch.current) return;
            const dx = e.nativeEvent.locationX - d.x,
              dy = e.nativeEvent.locationY - d.y;
            d.moved ||= Math.hypot(dx, dy) > 7;
            if (d.moved)
              setCamera((p) => ({ ...p, x: d.panX + dx, y: d.panY + dy }));
          }}
          onResponderRelease={() => {
            const d = drawing.current;
            drawing.current = null;
            if (!d || d.moved || pinch.current) {
              pinch.current = null;
              return;
            }
            const p = world(d.x, d.y);
            setPoints((v) => [
              ...v,
              { x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10 },
            ]);
            setMessage("");
          }}
          onResponderTerminate={() => {
            drawing.current = null;
            pinch.current = null;
          }}
        >
          <View style={{ flex: 1 }} pointerEvents="none">
            <Svg width="100%" height="100%">
              {Array.from({ length: 100 }, (_, i) => {
                const x = (i * 0.5 - 20) * scale + ox,
                  z = (i * 0.5 - 20) * scale + oz;
                return (
                  <Path
                    key={i}
                    d={`M${x} 0V${size.height}M0 ${z}H${size.width}`}
                    stroke={c.line}
                    strokeWidth={0.5}
                  />
                );
              })}
              {activeGuide && (
                <Polygon
                  points={activeGuide
                    .map((p) => `${p.x * scale + ox},${p.z * scale + oz}`)
                    .join(" ")}
                  fill="none"
                  stroke={c.sub}
                  strokeDasharray="5 5"
                />
              )}
              {rooms.map((r) => (
                <Polygon
                  key={r.id}
                  points={r.polygon
                    .map((p) => `${p.x * scale + ox},${p.z * scale + oz}`)
                    .join(" ")}
                  fill={c.warm}
                  stroke={c.ink}
                  strokeWidth={3}
                />
              ))}
              {rooms.map((r) => {
                const b = bounds(r.polygon);
                let dimensions = "Inside size unavailable";
                try {
                  const inside = roomInsideDimensions(measurementFloor, r);
                  dimensions = `${measure(inside.width, unit)} × ${measure(inside.depth, unit)} inside`;
                } catch {
                  // The draft remains recoverable even if thick walls collapse an interior.
                }
                return (
                  <SvgText
                    key={r.id + "name"}
                    x={(b.minX + 0.2) * scale + ox}
                    y={(b.minZ + 0.35) * scale + oz}
                    fill={c.ink}
                    fontSize={11}
                  >
                    {r.name} · {dimensions}
                  </SvgText>
                );
              })}
              <Path
                d={points
                  .map(
                    (p, i) =>
                      `${i ? "L" : "M"}${p.x * scale + ox} ${p.z * scale + oz}`,
                  )
                  .join(" ")}
                fill="none"
                stroke={c.focus}
                strokeWidth={2}
              />
              {points.map((p, i) => (
                <Circle
                  key={i}
                  cx={p.x * scale + ox}
                  cy={p.z * scale + oz}
                  r={4}
                  fill={c.focus}
                />
              ))}
              {points.slice(1).map((p, i) => {
                const a = points[i];
                return (
                  <SvgText
                    key={i}
                    x={((a.x + p.x) / 2) * scale + ox}
                    y={((a.z + p.z) / 2) * scale + oz - 8}
                    fill={c.focus}
                    fontSize={10}
                  >
                    {measure(Math.hypot(p.x - a.x, p.z - a.z), unit)}
                  </SvgText>
                );
              })}
            </Svg>
          </View>
        </View>
        <View style={{ padding: 16, gap: 9 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <IconButton
              name="undo"
              label="Undo corner"
              disabled={!points.length}
              onPress={() => setPoints((p) => p.slice(0, -1))}
            />
            <Button
              label="Close room"
              primary
              disabled={points.length < 3}
              onPress={closeRoom}
              style={{ flex: 1 }}
            />
            {rooms.length > 0 && (
              <IconButton
                name="trash"
                label="Remove last drafted room"
                onPress={() => setRooms((r) => r.slice(0, -1))}
              />
            )}
          </View>
          {activeGuide && rooms.length === 0 && (
            <Button
              label="Use starting outline as room"
              onPress={() => {
                setPoints(activeGuide);
                setMessage(
                  "Starting outline selected. Close the room to keep it.",
                );
              }}
            />
          )}
          <Field
            label={`Floor ceiling (${unit})`}
            value={height}
            onChange={setHeight}
            keyboard="decimal-pad"
          />
          <Txt small muted>
            {rooms.length} {rooms.length === 1 ? "room" : "rooms"} ·{" "}
            {points.length} unclosed corners
          </Txt>
          {message ? <Txt small>{message}</Txt> : null}
          <Button
            label={busy ? "Saving floor plan…" : "Create floor plan"}
            disabled={!rooms.length || points.length > 0 || busy}
            primary
            onPress={() => {
              void save();
            }}
          />
        </View>
      </ScrollView>
    </Page>
  );
}
