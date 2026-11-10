import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Field, Txt } from "./kit";
export function hsvHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))))
      .toString(16)
      .padStart(2, "0");
  };
  return "#" + f(5) + f(3) + f(1);
}
function hexHsv(hex: string) {
  const n = parseInt(hex.slice(1), 16),
    r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255,
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  return {
    h: d
      ? (max === r
          ? (g - b) / d + (g < b ? 6 : 0)
          : max === g
            ? (b - r) / d + 2
            : (r - g) / d + 4) * 60
      : 0,
    s: max ? d / max : 0,
    v: max,
  };
}
export default function ColourPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [rememberedHue, setRememberedHue] = useState(() => hexHsv(value).h);
  const hsv = hexHsv(/^#[\da-f]{6}$/i.test(value) ? value : "#000000");
  if (hsv.s < 0.001) hsv.h = rememberedHue;
  const update = (next: typeof hsv) => {
    setRememberedHue(next.h);
    onChange(hsvHex(next.h, next.s, next.v));
  };
  const wheel = (x: number, y: number) =>
    update({
      ...hsv,
      h: ((Math.atan2(y - 68, x - 68) * 180) / Math.PI + 450) % 360,
    });
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <View
          accessibilityLabel="Hue wheel"
          onResponderTerminationRequest={() => false}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) =>
            wheel(e.nativeEvent.locationX, e.nativeEvent.locationY)
          }
          onResponderMove={(e) =>
            wheel(e.nativeEvent.locationX, e.nativeEvent.locationY)
          }
          style={{ width: 136, height: 136 }}
        >
          <Svg
            width={136}
            height={136}
            viewBox="0 0 136 136"
            pointerEvents="none"
          >
            {Array.from({ length: 72 }, (_, i) => {
              const a = ((i * 5 - 90) * Math.PI) / 180,
                b = (((i + 1) * 5 - 90) * Math.PI) / 180;
              return (
                <Path
                  key={i}
                  d={`M${68 + 61 * Math.cos(a)} ${68 + 61 * Math.sin(a)}A61 61 0 0 1 ${68 + 61 * Math.cos(b)} ${68 + 61 * Math.sin(b)}`}
                  stroke={hsvHex(i * 5, 1, 1)}
                  strokeWidth={13}
                />
              );
            })}
            <Circle
              cx={68 + 61 * Math.cos(((hsv.h - 90) * Math.PI) / 180)}
              cy={68 + 61 * Math.sin(((hsv.h - 90) * Math.PI) / 180)}
              r={5}
              fill={hsvHex(hsv.h, 1, 1)}
              stroke="#fff"
              strokeWidth={2}
            />
          </Svg>
          <View
            accessibilityLabel="Saturation and brightness"
            onResponderTerminationRequest={() => false}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) =>
              update({
                ...hsv,
                s: Math.max(0, Math.min(1, e.nativeEvent.locationX / 84)),
                v: 1 - Math.max(0, Math.min(1, e.nativeEvent.locationY / 84)),
              })
            }
            onResponderMove={(e) =>
              update({
                ...hsv,
                s: Math.max(0, Math.min(1, e.nativeEvent.locationX / 84)),
                v: 1 - Math.max(0, Math.min(1, e.nativeEvent.locationY / 84)),
              })
            }
            style={{
              position: "absolute",
              left: 26,
              top: 26,
              width: 84,
              height: 84,
              backgroundColor: hsvHex(hsv.h, 1, 1),
            }}
          >
            <LinearGradient
              colors={["#ffffff", "#ffffff00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: "absolute", inset: 0 }}
              pointerEvents="none"
            />
            <LinearGradient
              colors={["#00000000", "#000000"]}
              style={{ position: "absolute", inset: 0 }}
              pointerEvents="none"
            />
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: hsv.s * 84 - 5,
                top: (1 - hsv.v) * 84 - 5,
                width: 10,
                height: 10,
                borderWidth: 2,
                borderColor: "white",
                borderRadius: 5,
              }}
            />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 120, gap: 10 }}>
          <View
            style={{
              height: 40,
              backgroundColor: /^#[\da-f]{6}$/i.test(value) ? value : "#ffffff",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#999",
            }}
          />
          <Field
            label="HEX colour"
            value={value}
            onChange={(v) => {
              onChange(v);
              if (/^#[\da-f]{6}$/i.test(v)) setRememberedHue(hexHsv(v).h);
            }}
          />
        </View>
      </View>
      <Txt small muted>
        Drag the ring for hue; use the square for saturation and brightness.
      </Txt>
    </View>
  );
}
