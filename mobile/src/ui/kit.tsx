import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useStudio } from "../state/Studio";
export const light = {
  ink: "#252d36",
  sub: "#606873",
  paper: "#f4f3ef",
  surface: "#ffffff",
  line: "#dedfdc",
  selected: "#283342",
  onSelected: "#ffffff",
  warm: "#ece6dc",
  focus: "#a17a46",
  error: "#a3372b",
};
export const dark = {
  ink: "#eef0f2",
  sub: "#aeb8c3",
  paper: "#161d26",
  surface: "#222b36",
  line: "#3e4854",
  selected: "#e7e9ed",
  onSelected: "#202a36",
  warm: "#383228",
  focus: "#c6a06b",
  error: "#ffada2",
};
export function usePalette() {
  const scheme = useColorScheme(),
    { library } = useStudio();
  return (
    library.settings.appearance === "system"
      ? scheme === "dark"
      : library.settings.appearance === "dark"
  )
    ? dark
    : light;
}
const paths: Record<string, string> = {
  back: "m15 18-6-6 6-6",
  close: "m6 6 12 12M6 18 18 6",
  plus: "M12 5v14M5 12h14",
  chevron: "m9 6 6 6-6 6",
  down: "m6 9 6 6 6-6",
  settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
  home: "m3 10 9-7 9 7v10h-6v-7H9v7H3z",
  plan: "M3 3h18v18H3zM3 12h8V3m0 9h10",
  upload: "M5 3h10l4 4v14H5zM12 17V9m-3 3 3-3 3 3",
  scan: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 10h8v5H8z",
  undo: "M9 7 4 12l5 5M4 12h10a6 6 0 0 1 6 6",
  redo: "m15 7 5 5-5 5m5-5H10a6 6 0 0 0-6 6",
  lock: "M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4",
  unlock: "M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",
  furniture: "M4 11V6h16v5M3 11h4v5h10v-5h4v9H3zM6 20v2m12-2v2",
  paint: "M4 3h14v6H4zM18 6h3v7h-9v8",
  build: "M3 3h18v18H3zM9 3v18M9 10h12",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6",
  heart: "M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15",
  rotate: "M20 8a8 8 0 1 0 0 8M20 3v6h-6",
  layers: "m2 7 10-5 10 5-10 5zm0 5 10 5 10-5M2 17l10 5 10-5",
  check: "m4 12 5 5L20 6",
  eye: "M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  door: "M5 21V3h14v18M9 3v18l10-3M14 12h1",
  info: "M12 11v6m0-10v1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
};
export function Icon({
  name,
  size = 20,
  colour,
}: {
  name: string;
  size?: number;
  colour?: string;
}) {
  const c = usePalette();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colour ?? c.ink}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name] ?? paths.info} />
    </Svg>
  );
}
export function Txt({
  children,
  small = false,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  small?: boolean;
  muted?: boolean;
  style?: object;
}) {
  const c = usePalette();
  return (
    <Text
      style={[
        {
          color: muted ? c.sub : c.ink,
          fontSize: small ? 12 : 15,
          lineHeight: small ? 18 : 22,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  icon,
  selected = false,
  disabled = false,
  compact = false,
  primary = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  primary?: boolean;
  style?: ViewStyle;
}) {
  const c = usePalette();
  const filled = selected || primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          minHeight: 44,
          borderWidth: 1,
          borderColor: filled ? c.selected : c.line,
          backgroundColor: filled ? c.selected : c.surface,
          borderRadius: 12,
          paddingHorizontal: compact ? 10 : 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} colour={filled ? c.onSelected : c.ink} />
      ) : null}
      <Text
        style={{
          color: filled ? c.onSelected : c.ink,
          fontSize: compact ? 12 : 14,
          fontWeight: primary ? "600" : "400",
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
  selected = false,
}: {
  name: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        backgroundColor: selected ? c.warm : c.surface,
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Page({ children }: { children: React.ReactNode }) {
  const c = usePalette();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.paper }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Header({
  title,
  eyebrow,
  back,
  right,
}: {
  title: string;
  eyebrow?: string;
  back?: () => void;
  right?: React.ReactNode;
}) {
  const c = usePalette();
  return (
    <View
      style={{
        minHeight: 65,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderColor: c.line,
      }}
    >
      {back && <IconButton name="back" label="Back" onPress={back} />}
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Txt small muted style={{ fontSize: 10, letterSpacing: 1 }}>
            {eyebrow.toUpperCase()}
          </Txt>
        ) : null}
        <Txt
          style={{
            fontSize: title === "ois designs" ? 23 : 20,
            fontWeight: "600",
            lineHeight: 27,
          }}
        >
          {title}
        </Txt>
      </View>
      {right}
    </View>
  );
}
export function Badge({ label = "Coming soon" }: { label?: string }) {
  const c = usePalette();
  return (
    <View
      style={{
        backgroundColor: c.warm,
        borderRadius: 7,
        paddingVertical: 6,
        paddingHorizontal: 8,
        flexShrink: 0,
      }}
    >
      <Txt small style={{ fontSize: 11 }}>
        {label}
      </Txt>
    </View>
  );
}
export function Field({
  label,
  value,
  onChange,
  keyboard = "default",
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: "default" | "decimal-pad";
  placeholder?: string;
  multiline?: boolean;
}) {
  const c = usePalette();
  return (
    <View style={{ gap: 5, flexGrow: 1, flexBasis: 130 }}>
      <Txt small muted>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={c.sub}
        autoCorrect={false}
        autoCapitalize="none"
        multiline={multiline}
        style={{
          color: c.ink,
          backgroundColor: c.paper,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 11,
          minHeight: 46,
          fontSize: 16,
        }}
      />
    </View>
  );
}
export function Chips({
  values,
  value,
  onChange,
  labels,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
    >
      {values.map((v) => (
        <Button
          key={v}
          label={labels?.[v] ?? v.replaceAll("-", " ")}
          compact
          selected={value === v}
          onPress={() => onChange(v)}
        />
      ))}
    </ScrollView>
  );
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 12, marginBottom: 22 }}>
      <Txt style={{ fontWeight: "600" }}>{title}</Txt>
      {children}
    </View>
  );
}
export const styles = StyleSheet.create({
  pad: { padding: 20, gap: 16 },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  grid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
});
