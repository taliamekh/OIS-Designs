import { router } from "expo-router";
import { backToProjects } from "../ui/navigation";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  bounds,
  shapePolygon,
  toDisplay,
  toMetres,
  validPolygon,
  newRoomReferenceDimensions,
} from "../domain/geometry";
import FloorPlanDraft from "./FloorPlanDraft";
import { execute, makeProject } from "../domain/project";
import { Point, RoomKind, roomNames } from "../domain/types";
import { useStudio } from "../state/Studio";
import {
  Button,
  Field,
  Header,
  Page,
  Txt,
  styles,
  usePalette,
} from "../ui/kit";
export default function Create() {
  const s = useStudio(),
    c = usePalette();
  const [step, setStep] = useState(0),
    [kind, setKind] = useState<RoomKind>("living"),
    [whole, setWhole] = useState(false),
    [floorGuide, setFloorGuide] = useState<Point[] | undefined>(),
    [shape, setShape] = useState("rectangle"),
    [polygon, setPolygon] = useState<Point[]>([]),
    [width, setWidth] = useState("4.8"),
    [depth, setDepth] = useState("3.8"),
    [height, setHeight] = useState("2.7"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const unit = s.library.settings.unit;
  const choose = (k: RoomKind, all = false) => {
    setKind(k);
    setWhole(all);
    setStep(1);
  };
  const selectShape = (v: string) => {
    setShape(v);
    setWidth(toDisplay(v === "square" ? 4 : 4.8, unit).toFixed(2));
    setDepth(toDisplay(v === "square" ? 4 : 3.8, unit).toFixed(2));
    setHeight(toDisplay(2.7, unit).toFixed(2));
    if (whole && v === "draw") {
      setFloorGuide(undefined);
      setStep(3);
    } else setStep(2);
  };
  const create = async () => {
    const w = toMetres(Number(width), unit),
      d = toMetres(Number(depth), unit),
      h = toMetres(Number(height), unit);
    if (
      ![w, d, h].every(Number.isFinite) ||
      w < 0.5 ||
      d < 0.5 ||
      w > 50 ||
      d > 50 ||
      h < 1.8 ||
      h > 8
    ) {
      setError("Use width/depth 0.5–50 m and ceiling 1.8–8 m.");
      return;
    }
    if (whole) {
      const reference = newRoomReferenceDimensions(w, d);
      setFloorGuide(shapePolygon(shape, reference.width, reference.depth));
      setStep(3);
      return;
    }
    let drawn: Point[] | undefined;
    if (shape === "draw" && polygon.length >= 3) {
      const b = bounds(polygon);
      drawn = polygon.map((p) => ({
        x: ((p.x - b.minX) / (b.maxX - b.minX)) * w,
        z: ((p.z - b.minZ) / (b.maxZ - b.minZ)) * d,
      }));
    }
    if (drawn && !validPolygon(drawn)) {
      setError(
        "Draw a closed outline with distinct corners and no crossing walls.",
      );
      return;
    }
    try {
      setBusy(true);
      let p = makeProject(kind, w, d, h, shape, drawn, "inside");
      if (drawn) {
        const floor = p.floors[0],
          room = floor.rooms[0];
        // Typed dimensions have the same inside-face meaning for every new
        // shape. Existing/imported polygon coordinates never take this path.
        const result = execute(
          { past: [], present: p, future: [] },
          {
            type: "room-dimensions",
            floorId: floor.id,
            roomId: room.id,
            width: w,
            depth: d,
            ceiling: room.ceiling,
            dimensionMode: "inside",
          },
          "2d",
          [],
        );
        if (result.error) throw new Error(result.error);
        p = result.history.present;
      }
      if (whole) p.name = "Untitled floor plan";
      await s.addProject({ past: [], present: p, future: [] });
      router.replace("/editor");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  if (step === 3)
    return (
      <FloorPlanDraft
        guide={floorGuide}
        ceiling={toMetres(Number(height), unit)}
        onBack={() => setStep(1)}
      />
    );
  return (
    <Page>
      <Header
        title={
          step === 0
            ? "Create room or floor plan"
            : step === 1
              ? "Starting shape"
              : "Room dimensions"
        }
        eyebrow="New project"
        back={() => (step ? setStep(step - 1) : backToProjects())}
      />
      <ScrollView contentContainerStyle={styles.pad}>
        {step === 0 ? (
          <>
            <Button
              label="Whole floor plan"
              icon="layers"
              onPress={() => choose("living", true)}
            />
            <View style={styles.grid}>
              {Object.entries(roomNames).map(([k, n]) => (
                <Button
                  key={k}
                  label={n}
                  onPress={() => choose(k as RoomKind)}
                  style={{ width: "47%", minHeight: 80 }}
                />
              ))}
            </View>
          </>
        ) : step === 1 ? (
          <View style={styles.grid}>
            {[
              ["square", "Square"],
              ["rectangle", "Rectangle"],
              ["l", "L-shape"],
              ["draw", "Draw walls"],
            ].map(([v, n]) => (
              <View key={v} style={{ width: "47%" }}>
                <Button
                  label={n}
                  onPress={() => selectShape(v)}
                  style={{ minHeight: 100 }}
                />
              </View>
            ))}
          </View>
        ) : (
          <>
            {shape === "draw" ? (
              <>
                <Txt small muted>
                  Tap corners on the grid, then close the outline. Each grid
                  square is 0.5 m before resizing.
                </Txt>
                <View
                  accessibilityLabel="Draw room outline"
                  onStartShouldSetResponderCapture={() => true}
                  onStartShouldSetResponder={() => true}
                  onResponderTerminationRequest={() => false}
                  onResponderRelease={(e) => {
                    const x = Math.round(e.nativeEvent.locationX / 25) * 0.5,
                      z = Math.round(e.nativeEvent.locationY / 25) * 0.5;
                    setPolygon((p) => [...p, { x, z }]);
                  }}
                  style={{
                    height: 250,
                    backgroundColor: c.surface,
                    borderRadius: 12,
                  }}
                >
                  <View pointerEvents="none">
                    <Svg width="100%" height="250">
                      {Array.from({ length: 15 }, (_, i) => (
                        <Path
                          key={i}
                          d={`M${i * 25} 0V250M0 ${i * 25}H350`}
                          stroke={c.line}
                        />
                      ))}
                      <Path
                        d={
                          polygon
                            .map(
                              (p, i) =>
                                `${i ? "L" : "M"}${p.x * 50} ${p.z * 50}`,
                            )
                            .join(" ") + (polygon.length > 2 ? "Z" : "")
                        }
                        fill={c.warm}
                        stroke={c.focus}
                        strokeWidth={2}
                      />
                    </Svg>
                  </View>
                </View>
                <Button
                  label="Undo corner"
                  onPress={() => setPolygon((p) => p.slice(0, -1))}
                  disabled={!polygon.length}
                />
              </>
            ) : (
              <View style={{ alignItems: "center", padding: 22 }}>
                <Svg width={240} height={140} viewBox="-5 -5 250 150">
                  <Path
                    d={
                      shapePolygon(shape, 240, 130)
                        .map((p, i) => `${i ? "L" : "M"}${p.x} ${p.z}`)
                        .join(" ") + "Z"
                    }
                    fill={c.warm}
                    stroke={c.ink}
                    strokeWidth={2}
                  />
                </Svg>
              </View>
            )}
            <Txt small muted>
              {unit === "ft" ? "Enter decimal feet." : "Enter metres."} Change
              measurement units in Settings.
            </Txt>
            <Txt small muted>
              Width and depth measure between the inside wall faces, before
              trim.
            </Txt>
            <View style={styles.grid}>
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
              value={height}
              onChange={setHeight}
              keyboard="decimal-pad"
            />
            {error ? <Txt style={{ color: c.error }}>{error}</Txt> : null}
            <Button
              label={
                busy
                  ? "Saving room…"
                  : whole
                    ? "Open floor-plan drawing"
                    : "Create room"
              }
              primary
              onPress={create}
              disabled={busy || (shape === "draw" && polygon.length < 3)}
            />
          </>
        )}
      </ScrollView>
    </Page>
  );
}
