import { GestureResponderEvent } from "react-native";
export type TouchPoint = { x: number; y: number };
export function touchPoints(event: GestureResponderEvent): TouchPoint[] {
  const e = event.nativeEvent,
    ox = e.pageX - e.locationX,
    oy = e.pageY - e.locationY;
  return (e.touches ?? []).map((t) => ({ x: t.pageX - ox, y: t.pageY - oy }));
}
export function pinchMetrics(points: TouchPoint[]) {
  if (points.length < 2) return null;
  return {
    distance: Math.max(
      1,
      Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
    ),
    x: (points[0].x + points[1].x) / 2,
    y: (points[0].y + points[1].y) / 2,
  };
}
