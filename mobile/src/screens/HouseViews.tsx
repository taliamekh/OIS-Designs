import { ScrollView, View } from "react-native";
import Sheet from "../ui/Sheet";
import { Button, Txt } from "../ui/kit";

export type HouseViewScope = "room" | "floor" | "house";
export type HouseViewPreset = "perspective" | "top" | "front";
export type HouseViewsProps = {
  scope: HouseViewScope;
  onScopeChange: (scope: HouseViewScope) => void;
  cutaway: boolean;
  onCutawayChange: (cutaway: boolean) => void;
  onFit: () => void;
  onClose: () => void;
  availableHeight?: number;
  expanded?: boolean;
  onExpand?: () => void;
  preset?: HouseViewPreset;
  onPresetChange?: (preset: HouseViewPreset) => void;
  showCeilings?: boolean;
  onCeilingsChange?: (visible: boolean) => void;
  separatedFloors?: boolean;
  onSeparatedFloorsChange?: (separated: boolean) => void;
};

/** Controlled contextual panel. Optional controls appear only with a real renderer callback.
 * No second store, project command, room/floor picker or navigation route is introduced. */
export default function HouseViews({
  scope,
  onScopeChange,
  cutaway,
  onCutawayChange,
  onFit,
  onClose,
  availableHeight,
  expanded = false,
  onExpand,
  preset = "perspective",
  onPresetChange,
  showCeilings = false,
  onCeilingsChange,
  separatedFloors = false,
  onSeparatedFloorsChange,
}: HouseViewsProps) {
  return (
    <Sheet
      title="View options"
      onClose={onClose}
      availableHeight={availableHeight}
      expanded={expanded}
      onExpand={onExpand}
    >
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16 }}
      >
        <View style={{ gap: 8 }}>
          <Txt style={{ fontWeight: "600" }}>Show</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["room", "floor", "house"] as const).map((value) => (
              <Button
                key={value}
                label={
                  value === "room"
                    ? "Room"
                    : value === "floor"
                      ? "Floor"
                      : "House"
                }
                selected={scope === value}
                onPress={() => onScopeChange(value)}
                style={{ flexGrow: 1, flexBasis: "28%", minHeight: 48 }}
              />
            ))}
          </View>
          {scope === "house" && <Txt muted>House overview is read-only.</Txt>}
        </View>

        <View style={{ gap: 8 }}>
          <Txt style={{ fontWeight: "600" }}>Walls</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Button
              label="Cutaway"
              selected={cutaway}
              onPress={() => onCutawayChange(true)}
              style={{ flexGrow: 1, minHeight: 48 }}
            />
            <Button
              label="Solid"
              selected={!cutaway}
              onPress={() => onCutawayChange(false)}
              style={{ flexGrow: 1, minHeight: 48 }}
            />
          </View>
          {onCeilingsChange && (
            <Button
              label={showCeilings ? "Hide ceilings" : "Show ceilings"}
              selected={showCeilings}
              onPress={() => onCeilingsChange(!showCeilings)}
              style={{ minHeight: 48 }}
            />
          )}
        </View>

        {onPresetChange && (
          <View style={{ gap: 8 }}>
            <Txt style={{ fontWeight: "600" }}>Camera</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(["perspective", "top", "front"] as const).map((value) => (
                <Button
                  key={value}
                  label={
                    value === "perspective"
                      ? "Perspective"
                      : value === "top"
                        ? "Top"
                        : "Front"
                  }
                  selected={preset === value}
                  onPress={() => onPresetChange(value)}
                  style={{ flexGrow: 1, flexBasis: "28%", minHeight: 48 }}
                />
              ))}
            </View>
          </View>
        )}

        {scope === "house" && onSeparatedFloorsChange && (
          <View style={{ gap: 8 }}>
            <Button
              label={separatedFloors ? "Align floors" : "Separate floors"}
              selected={separatedFloors}
              onPress={() => onSeparatedFloorsChange(!separatedFloors)}
              style={{ minHeight: 48 }}
            />
            <Txt muted>Viewing only. Saved floor heights stay unchanged.</Txt>
          </View>
        )}
        <Button
          label={
            scope === "house"
              ? "Fit house"
              : scope === "floor"
                ? "Fit floor"
                : "Fit room"
          }
          onPress={onFit}
          style={{ minHeight: 48 }}
        />
      </ScrollView>
    </Sheet>
  );
}
