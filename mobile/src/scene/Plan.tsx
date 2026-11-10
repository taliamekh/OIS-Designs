import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Text as SvgText,
} from "react-native-svg";
import {
  bounds,
  footprint,
  inside,
  measure,
  distance,
  swingEnvelopes,
  projectToSegment,
  wallFaceSpan,
} from "../domain/geometry";
import { Item } from "../domain/types";
import { useStudio } from "../state/Studio";
import { usePalette } from "../ui/kit";
import { resolveItemAsset, supportsPlacement } from "../catalogue/resolve";
import { touchPoints, pinchMetrics } from "./touches";
import { Interaction } from "./Viewport";
export default function Plan(props: Interaction) {
  const c = usePalette(),
    s = useStudio(),
    [width, setWidth] = useState(360),
    [height, setHeight] = useState(650),
    [planCamera, setPlanCamera] = useState({ zoom: 1, panX: 0, panY: 0 }),
    [draft, setDraft] = useState<Item | null>(null),
    latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  const shownRooms = props.allRooms ? props.floor.rooms : [props.room];
  const shownWalls = props.floor.walls.filter((w) =>
    w.faces.some((f) => shownRooms.some((r) => r.id === f.roomId)),
  );
  const selectedWall = shownWalls.find((w) =>
    props.floor.openings.some(
      (o) => o.id === props.selectedOpening && o.wallId === w.id,
    ),
  );
  const chainCorners = selectedWall
    ? selectedWall.faces.flatMap((face) => {
        const { low, high } = wallFaceSpan(
          props.floor,
          selectedWall,
          face.roomId,
        );
        const length = distance(selectedWall.a, selectedWall.b);
        return [low, high].map((offset) => ({
          x:
            selectedWall.a.x +
            ((selectedWall.b.x - selectedWall.a.x) * offset) / length,
          z:
            selectedWall.a.z +
            ((selectedWall.b.z - selectedWall.a.z) * offset) / length,
        }));
      })
    : [];
  const b = bounds([...shownRooms.flatMap((r) => r.polygon), ...chainCorners]);
  // SVG annotations have screen-space size, independent of the plan's metres.
  const horizontalPadding = selectedWall ? 64 : 28;
  const scale =
      Math.min(
        (width - horizontalPadding * 2) / (b.maxX - b.minX),
        Math.max(180, height - 240) / (b.maxZ - b.minZ),
      ) * planCamera.zoom,
    ox = horizontalPadding - b.minX * scale + planCamera.panX,
    oz = 128 - b.minZ * scale + planCamera.panY;
  const point = (x: number, y: number) => ({
    x: (x - ox) / scale,
    z: (y - oz) / scale,
  });
  const drag = useRef<{
    item: Item | null;
    x: number;
    z: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    move: boolean;
    pinched: boolean;
    draft: Item | null;
  } | null>(null);
  const pinch = useRef<{
    distance: number;
    zoom: number;
    scale: number;
    anchor: { x: number; z: number };
  } | null>(null);
  const gestureLog = useRef<Record<string, unknown>>({});
  useEffect(() => {
    if (!__DEV__) return;
    const diagnostics = globalThis as typeof globalThis & {
      __oisPlanProbe?: () => unknown;
    };
    diagnostics.__oisPlanProbe = () => ({
      width,
      height,
      scale,
      ox,
      oz,
      gesture: gestureLog.current,
      items: props.floor.items.map((i) => ({
        id: i.id,
        x: ox + i.x * scale,
        y: oz + i.z * scale,
      })),
    });
    return () => {
      delete diagnostics.__oisPlanProbe;
    };
  }, [width, height, scale, ox, oz, props.floor.items]);
  const startPinch = (e: import("react-native").GestureResponderEvent) => {
    const metrics = pinchMetrics(touchPoints(e));
    if (metrics && !pinch.current)
      pinch.current = {
        distance: metrics.distance,
        zoom: planCamera.zoom,
        scale,
        anchor: point(metrics.x, metrics.y),
      };
  };
  const responder: import("react-native").ViewProps = {
    onStartShouldSetResponderCapture: () => true,
    onMoveShouldSetResponderCapture: () => true,
    onResponderTerminationRequest: () => false,
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e) => {
      pinch.current = null;
      const p = point(e.nativeEvent.locationX, e.nativeEvent.locationY),
        v = latest.current;
      const i =
        [...v.floor.items]
          .reverse()
          .filter((i) => v.allRooms || i.roomId === v.room.id)
          .find((i) => {
            const a = resolveItemAsset(i);
            return a && supportsPlacement(a)
              ? inside(p, footprint(i, a))
              : Math.hypot(p.x - i.x, p.z - i.z) < 0.25;
          }) ?? null;
      gestureLog.current = {
        phase: "grant",
        hit: i?.id,
        locationX: e.nativeEvent.locationX,
        locationY: e.nativeEvent.locationY,
        point: p,
      };
      drag.current = {
        item: i,
        x: p.x,
        z: p.z,
        startX: e.nativeEvent.locationX,
        startY: e.nativeEvent.locationY,
        panX: planCamera.panX,
        panY: planCamera.panY,
        move: false,
        pinched: touchPoints(e).length > 1,
        draft: null,
      };
      startPinch(e);
    },
    onResponderStart: (e) => {
      if (touchPoints(e).length > 1 && drag.current) {
        drag.current.pinched = true;
        drag.current.item = null;
        drag.current.draft = null;
        setDraft(null);
        latest.current.onDraft?.(null);
        startPinch(e);
      }
    },
    onResponderMove: (e) => {
      const metrics = pinchMetrics(touchPoints(e));
      if (metrics) {
        if (!pinch.current) {
          pinch.current = {
            distance: metrics.distance,
            zoom: planCamera.zoom,
            scale,
            anchor: point(metrics.x, metrics.y),
          };
          if (drag.current) {
            drag.current.pinched = true;
            drag.current.item = null;
            drag.current.move = true;
            drag.current.draft = null;
          }
          setDraft(null);
          latest.current.onDraft?.(null);
        }
        const start = pinch.current,
          zoom = Math.max(
            0.4,
            Math.min(8, (start.zoom * metrics.distance) / start.distance),
          ),
          nextScale = (start.scale * zoom) / start.zoom;
        setPlanCamera({
          zoom,
          panX:
            metrics.x -
            horizontalPadding +
            b.minX * nextScale -
            start.anchor.x * nextScale,
          panY:
            metrics.y - 128 + b.minZ * nextScale - start.anchor.z * nextScale,
        });
        return;
      }
      if (pinch.current) return;

      const d = drag.current,
        v = latest.current;
      if (!d) return;
      const dx = e.nativeEvent.locationX - d.startX,
        dy = e.nativeEvent.locationY - d.startY;
      d.move ||= Math.hypot(dx, dy) > 4;
      if (v.onWall) {
        const p = point(e.nativeEvent.locationX, e.nativeEvent.locationY);
        d.x = p.x;
        d.z = p.z;
        return;
      }
      if (
        !d.item ||
        d.item.locked ||
        (!v.quickMove && d.item.id !== v.selected)
      ) {
        if (d.move)
          setPlanCamera((p) => ({
            ...p,
            panX: d.panX + dx,
            panY: d.panY + dy,
          }));
        return;
      }
      gestureLog.current = {
        ...gestureLog.current,
        phase: "move",
        hit: d.item.id,
        moveX: e.nativeEvent.locationX,
        moveY: e.nativeEvent.locationY,
      };
      const p = point(e.nativeEvent.locationX, e.nativeEvent.locationY),
        step = v.grid ? 0.1 : 0.001;
      d.draft = {
        ...d.item,
        x: Math.round((d.item.x + p.x - d.x) / step) * step,
        z: Math.round((d.item.z + p.z - d.z) / step) * step,
      };
      setDraft(d.draft);
      v.onDraft?.(d.draft);
    },
    onResponderRelease: () => {
      pinch.current = null;
      const d = drag.current,
        v = latest.current;
      drag.current = null;
      if (!d) return;
      if (d.pinched) {
        setDraft(null);
        v.onDraft?.(null);
        return;
      }
      gestureLog.current = {
        ...gestureLog.current,
        phase: "release",
        moved: d.move,
        draft: d.draft,
      };
      if (d.move && d.draft) v.onCommit(d.draft);
      else if (v.onWall) {
        const p = { x: d.x, z: d.z };
        const wall = v.floor.walls
          .map((w) => ({ w, ...projectToSegment(p, w.a, w.b) }))
          .sort((a, b) => a.distance - b.distance)[0];
        if (wall && wall.distance < 0.3) v.onWall(wall.w.id, wall.offset);
      } else if (!d.move) {
        const opening = v.floor.openings.find((o) => {
          const w = v.floor.walls.find((w) => w.id === o.wallId);
          if (!w) return false;
          const t = projectToSegment({ x: d.x, z: d.z }, w.a, w.b);
          return (
            t.distance < 0.15 &&
            t.offset >= o.offset &&
            t.offset <= o.offset + o.width
          );
        });
        v.onSelect(opening ? "opening:" + opening.id : (d.item?.id ?? null));
      }
      setDraft(null);
      v.onDraft?.(null);
    },
    onResponderTerminate: () => {
      gestureLog.current = { ...gestureLog.current, phase: "terminate" };
      pinch.current = null;
      drag.current = null;
      setDraft(null);
      latest.current.onDraft?.(null);
    },
  };
  return (
    <View
      testID="plan-canvas"
      style={{ flex: 1, backgroundColor: c.paper }}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        setHeight(e.nativeEvent.layout.height);
      }}
      {...responder}
    >
      <View style={{ flex: 1 }} pointerEvents="none">
        <Svg width="100%" height="100%">
          {shownRooms.map((r) => (
            <G key={r.id}>
              <Polygon
                points={r.polygon
                  .map((p) => `${p.x * scale + ox},${p.z * scale + oz}`)
                  .join(" ")}
                fill={r.id === props.room.id ? c.warm : c.surface}
                stroke={c.line}
              />
              <SvgText
                x={(bounds(r.polygon).minX + 0.2) * scale + ox}
                y={(bounds(r.polygon).minZ + 0.3) * scale + oz}
                fontSize={11}
                fill={c.sub}
              >
                {r.name}
              </SvgText>
            </G>
          ))}
          {shownWalls.map((w) => (
            <G key={w.id}>
              <Line
                x1={w.a.x * scale + ox}
                y1={w.a.z * scale + oz}
                x2={w.b.x * scale + ox}
                y2={w.b.z * scale + oz}
                stroke={props.onWall ? c.focus : c.ink}
                strokeWidth={props.onWall ? 7 : 5}
                strokeLinecap="square"
              />
              {props.floor.openings.some(
                (o) => o.id === props.selectedOpening && o.wallId === w.id,
              ) ? null : (
                <SvgText
                  x={Math.max(
                    28,
                    Math.min(
                      width - 28,
                      ((w.a.x + w.b.x) / 2) * scale + ox + 4,
                    ),
                  )}
                  textAnchor="middle"
                  y={((w.a.z + w.b.z) / 2) * scale + oz - 7}
                  fontSize={10}
                  fill={c.sub}
                >
                  {measure(
                    Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z),
                    s.library.settings.unit,
                  )}
                </SvgText>
              )}
            </G>
          ))}
          {props.floor.openings
            .filter((o) => shownWalls.some((w) => w.id === o.wallId))
            .map((o) => {
              const w = props.floor.walls.find((w) => w.id === o.wallId);
              if (!w) return null;
              const l = Math.hypot(w.b.x - w.a.x, w.b.z - w.a.z),
                ux = (w.b.x - w.a.x) / l,
                uz = (w.b.z - w.a.z) / l,
                x = (w.a.x + ux * o.offset) * scale + ox,
                y = (w.a.z + uz * o.offset) * scale + oz,
                angle = (Math.atan2(uz, ux) * 180) / Math.PI,
                sw = o.width * scale;
              return (
                <G
                  key={o.id}
                  transform={`translate(${x} ${y}) rotate(${angle})`}
                >
                  <Line
                    x1={0}
                    y1={0}
                    x2={sw}
                    y2={0}
                    stroke={c.paper}
                    strokeWidth={8}
                  />
                  {o.type === "single" || o.type === "double" ? (
                    swingEnvelopes(w, o).map((sector, index) => {
                      const local = sector.map((p) => {
                          const dx = p.x - w.a.x - ux * o.offset,
                            dz = p.z - w.a.z - uz * o.offset;
                          return {
                            x: (dx * ux + dz * uz) * scale,
                            y: (-dx * uz + dz * ux) * scale,
                          };
                        }),
                        hinge = local[0],
                        tip = local[local.length - 1];
                      return (
                        <Path
                          key={index}
                          d={
                            `M${hinge.x} ${hinge.y}L${tip.x} ${tip.y}M` +
                            local
                              .slice(1)
                              .map((p) => `${p.x} ${p.y}`)
                              .join("L")
                          }
                          fill="none"
                          stroke={c.focus}
                          strokeWidth={1.5}
                        />
                      );
                    })
                  ) : (
                    <Line
                      x1={0}
                      y1={o.type === "window" ? 0 : 4}
                      x2={sw}
                      y2={o.type === "window" ? 0 : 4}
                      stroke={o.type === "window" ? "#749caa" : c.focus}
                      strokeWidth={2}
                    />
                  )}
                  {props.selectedOpening === o.id ? null : (
                    <SvgText
                      x={sw / 2}
                      y={-10}
                      fill={c.focus}
                      fontSize={10}
                      textAnchor="middle"
                    >
                      {measure(o.width, s.library.settings.unit)}
                    </SvgText>
                  )}
                </G>
              );
            })}
          {props.floor.openings
            .filter((o) => o.id === props.selectedOpening)
            .map((o) => {
              const w = shownWalls.find((w) => w.id === o.wallId);
              if (!w) return null;
              const start = o.offset * scale,
                end = (o.offset + o.width) * scale,
                angle =
                  (Math.atan2(w.b.z - w.a.z, w.b.x - w.a.x) * 180) / Math.PI;
              return (
                <G
                  key={"dimensions-" + o.id}
                  transform={`translate(${w.a.x * scale + ox} ${w.a.z * scale + oz}) rotate(${angle})`}
                >
                  {w.faces.map((face) => {
                    const sign = face.reversed ? -1 : 1,
                      y = sign * 20,
                      room = props.floor.rooms.find(
                        (r) => r.id === face.roomId,
                      ),
                      span = wallFaceSpan(props.floor, w, face.roomId),
                      low = span.low * scale,
                      high = span.high * scale;
                    return (
                      <G key={face.roomId}>
                        <Line
                          x1={low}
                          y1={y}
                          x2={high}
                          y2={y}
                          stroke={c.focus}
                          strokeWidth={0.8}
                        />
                        {[low, start, end, high].map((x, i) => (
                          <Line
                            key={i}
                            x1={x}
                            y1={y - 4}
                            x2={x}
                            y2={y + 4}
                            stroke={c.focus}
                          />
                        ))}
                        {[
                          [(low + start) / 2, o.offset - span.low],
                          [(start + end) / 2, o.width],
                          [(end + high) / 2, span.high - o.offset - o.width],
                        ].map(([x, value], i) => (
                          <SvgText
                            key={i}
                            x={x}
                            y={y - 5}
                            fontSize={9}
                            textAnchor="middle"
                            fill={c.focus}
                          >
                            {measure(value, s.library.settings.unit)}
                          </SvgText>
                        ))}
                        <SvgText
                          x={
                            low +
                            (high - low) *
                              (face.roomId === props.room.id ? 0.18 : 0.82)
                          }
                          y={y + 13}
                          fontSize={9}
                          textAnchor="middle"
                          fill={c.ink}
                        >
                          {room?.name ?? "Room"}
                        </SvgText>
                      </G>
                    );
                  })}
                </G>
              );
            })}
          {props.floor.items
            .filter((i) => shownRooms.some((r) => r.id === i.roomId))
            .map((item) => {
              const i = draft?.id === item.id ? draft : item,
                a = resolveItemAsset(i);
              if (!a || !supportsPlacement(a))
                return (
                  <G key={i.id}>
                    <Circle
                      cx={i.x * scale + ox}
                      cy={i.z * scale + oz}
                      r={11}
                      fill={c.surface}
                      stroke={c.error}
                      strokeWidth={2}
                    />
                    <SvgText
                      x={i.x * scale + ox}
                      y={i.z * scale + oz + 4}
                      textAnchor="middle"
                      fill={c.error}
                      fontSize={13}
                    >
                      !
                    </SvgText>
                    <SvgText
                      x={i.x * scale + ox}
                      y={i.z * scale + oz + 26}
                      fill={c.error}
                      textAnchor="middle"
                      fontSize={10}
                    >
                      Model needs attention
                    </SvgText>
                  </G>
                );
              return (
                <G key={i.id}>
                  <Polygon
                    points={footprint(i, a)
                      .map((p) => `${p.x * scale + ox},${p.z * scale + oz}`)
                      .join(" ")}
                    fill={i.locked ? "#bfc6c6" : "#d0b990"}
                    fillOpacity={0.8}
                    stroke={props.selected === i.id ? c.focus : "#918675"}
                    strokeWidth={props.selected === i.id ? 2 : 1}
                  />
                  <SvgText
                    x={i.x * scale + ox}
                    y={i.z * scale + oz + 3}
                    fill={c.ink}
                    fontSize={9}
                    textAnchor="middle"
                  >
                    {i.locked ? "🔒 " : ""}
                    {a.name.slice(0, 16)}
                  </SvgText>
                  {props.selected === i.id && (
                    <Circle
                      cx={i.x * scale + ox}
                      cy={i.z * scale + oz}
                      r={3}
                      fill={c.focus}
                    />
                  )}
                </G>
              );
            })}
        </Svg>
      </View>
    </View>
  );
}
