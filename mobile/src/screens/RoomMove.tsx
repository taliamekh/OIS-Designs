import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Point, Unit } from "../domain/types";
import { toDisplay, toMetres } from "../domain/geometry";
import { Button, Field, Txt, styles } from "../ui/kit";

export default function RoomMove({
  offset,
  unit,
  roomCount,
  lockedCount,
  onChange,
  onApply,
  onCancel,
}: {
  offset: Point;
  unit: Unit;
  roomCount: number;
  lockedCount: number;
  onChange: (offset: Point) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const [x, setX] = useState(toDisplay(offset.x, unit).toFixed(3));
  const [z, setZ] = useState(toDisplay(offset.z, unit).toFixed(3));
  const [synced, setSynced] = useState({ ...offset, unit });
  if (synced.x !== offset.x || synced.z !== offset.z || synced.unit !== unit) {
    setSynced({ ...offset, unit });
    const hydrate = (text: string, value: number) =>
      text.trim() && Math.abs(toMetres(Number(text), unit) - value) < 1e-8
        ? text
        : toDisplay(value, unit).toFixed(3);
    setX((text) => hydrate(text, offset.x));
    setZ((text) => hydrate(text, offset.z));
  }
  const change = (axis: "x" | "z", text: string) => {
    (axis === "x" ? setX : setZ)(text);
    if (text.trim() && Number.isFinite(Number(text)))
      onChange({ ...offset, [axis]: toMetres(Number(text), unit) });
  };
  const valid =
    [x, z].every((v) => v.trim() && Number.isFinite(Number(v))) &&
    (offset.x !== 0 || offset.z !== 0) &&
    lockedCount === 0;
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <Txt small muted>
        Drag a highlighted room or enter signed offsets. Drag outside to pan;
        pinch to zoom.
      </Txt>
      <Txt small>
        Moves {roomCount === 1 ? "this room" : `${roomCount} connected rooms`}{" "}
        with furniture, openings and finishes.
      </Txt>
      {lockedCount > 0 && (
        <Txt>
          {lockedCount} locked items prevent this room move. Cancel and unlock
          them first.
        </Txt>
      )}
      <View style={styles.row}>
        <Field
          label={`Move X (${unit})`}
          value={x}
          onChange={(v) => change("x", v)}
        />
        <Field
          label={`Move Z (${unit})`}
          value={z}
          onChange={(v) => change("z", v)}
        />
      </View>
      <Button
        label="Apply room move"
        primary
        disabled={!valid}
        onPress={onApply}
      />
      <Button label="Cancel room move" onPress={onCancel} />
    </ScrollView>
  );
}
