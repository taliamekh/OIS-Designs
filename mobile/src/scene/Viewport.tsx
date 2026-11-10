import {
  Component,
  ReactNode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text } from "react-native";
import * as THREE from "three";
import { inside, projectToSegment } from "../domain/geometry";
import { walkMove } from "../domain/project";
import { Floor, Item, Point, Room, ViewMode } from "../domain/types";
import { placementAssets } from "../state/Studio";
import { usePalette } from "../ui/kit";
import { Canvas, useThree } from "./fiber";
import { RoomScene } from "./RoomScene";
import { touchPoints, pinchMetrics, TouchPoint } from "./touches";
import { sceneSnapshot } from "./diagnostics";
import { walkSpawn } from "./walk";
import { fitCamera, clippingRange } from "./camera";
import { resolveItemAsset, supportsPlacement } from "../catalogue/resolve";
import { retainWantedModels } from "./resources";
import { pickItem } from "./picking";
import {
  canonicalFloorOffset,
  createScenePlan,
  ScenePlan,
  Vec3,
} from "./spatialView";
export type Interaction = {
  floor: Floor;
  room: Room;
  mode: ViewMode;
  selected: string | null;
  selectedOpening?: string | null;
  quickMove: boolean;
  grid: boolean;
  onSelect: (id: string | null) => void;
  onCommit: (i: Item) => void;
  onWall?: (id: string, offset: number) => void;
  onDraft?: (i: Item | null) => void;
  onWalkRoom?: (id: string) => void;
  cutaway: boolean;
  allRooms: boolean;
  allFloors?: Floor[];
  showCeilings?: boolean;
  separatedFloorGap?: number;
  cameraRequest?: {
    revision: number;
    preset?: "perspective" | "top" | "front";
  };
  onCameraOrbit?: () => void;
  roomMove?: {
    originalFloor: Floor;
    roomIds: ReadonlySet<string>;
    offset: Point;
    onOffsetChange: (offset: Point) => void;
  };
  /** Derived view data; never stored in the project. */
  scenePlan?: ScenePlan;
  viewOrigin?: Vec3;
  structureKey?: string;
};
type Controller = {
  down: (x: number, y: number) => void;
  move: (x: number, y: number, touches: TouchPoint[]) => void;
  up: () => void;
  cancel: () => void;
};
class SceneError extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <Text style={{ padding: 20, color: "#a3372b" }}>
        3D could not load: {this.state.error}. The 2D editor and saved layout
        remain available.
      </Text>
    ) : (
      this.props.children
    );
  }
}
export default function Viewport(
  props: Interaction & { draftOverride?: Item | null },
) {
  const c = usePalette(),
    controller = useRef<Controller | null>(null),
    [size, setSize] = useState({ w: 360, h: 440 }),
    [draft, setDraft] = useState<Item | null>(null);
  const latest = useRef(props);
  const floors = props.allFloors ?? [props.floor];
  const scenePlan = useMemo(
    () =>
      createScenePlan(
        { floors: props.allFloors ?? [props.floor] },
        (item) => resolveItemAsset(item as Item),
        {
          activeFloorId: props.floor.id,
          scope: props.allFloors
            ? { kind: "house" }
            : props.allRooms
              ? { kind: "floor" }
              : { kind: "room", roomId: props.room.id },
          mode: props.mode === "walk" ? "walk" : "3d",
          shell: props.cutaway ? "cutaway" : "solid",
          camera: { x: 0, y: 0, z: 0 },
          separatedFloorGap: props.separatedFloorGap ?? 0,
          showCeilings: props.showCeilings ?? false,
          selectedItemId: props.selected ?? undefined,
        },
      ),
    [
      props.allFloors,
      props.floor,
      props.room.id,
      props.allRooms,
      props.mode,
      props.cutaway,
      props.separatedFloorGap,
      props.showCeilings,
      props.selected,
    ],
  );
  // Single-floor editing/Walk retain their existing local coordinate system.
  const viewOrigin = props.allFloors
    ? { x: 0, y: 0, z: 0 }
    : canonicalFloorOffset(props.floor);
  const structureKey = JSON.stringify(
    scenePlan.floors.map((planned) => {
      const f = floors.find((f) => f.id === planned.id)!;
      return [
        f.id,
        planned.displayOffset,
        planned.roomIds.map((id) => {
          const r = f.rooms.find((r) => r.id === id)!;
          return [id, r.polygon, r.ceiling ?? f.ceiling];
        }),
        f.walls
          .filter((w) =>
            w.faces.some((face) => planned.roomIds.includes(face.roomId)),
          )
          .map((w) => [
            w.id,
            w.a,
            w.b,
            w.thickness,
            w.faces.map(
              (face) =>
                f.rooms.find((r) => r.id === face.roomId)?.ceiling ?? f.ceiling,
            ),
          ]),
      ];
    }),
  );
  const bridgeProps = { ...props, scenePlan, viewOrigin, structureKey };
  const visibleItems = scenePlan.floors.flatMap((planned) =>
      floors
        .find((f) => f.id === planned.id)!
        .items.filter((i) => planned.itemIds.includes(i.id)),
    ),
    wantedKey = [
      ...new Set(
        visibleItems
          .map(resolveItemAsset)
          .filter((a) => a && supportsPlacement(a))
          .map((a) => a!.sha256),
      ),
    ]
      .sort()
      .join(",");
  useLayoutEffect(
    () => retainWantedModels(wantedKey ? wantedKey.split(",") : []),
    [wantedKey],
  );
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  const responder: import("react-native").ViewProps = {
    // The app owns gestures; R3F draws and supplies the raycast scene only.
    onStartShouldSetResponderCapture: () => true,
    onMoveShouldSetResponderCapture: () => true,
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e) =>
      controller.current?.down(
        e.nativeEvent.locationX,
        e.nativeEvent.locationY,
      ),
    onResponderMove: (e) =>
      controller.current?.move(
        e.nativeEvent.locationX,
        e.nativeEvent.locationY,
        touchPoints(e),
      ),
    onResponderStart: (e) => {
      const points = touchPoints(e);
      if (points.length > 1 && latest.current.mode === "walk")
        controller.current?.cancel();
      else if (points.length > 1)
        controller.current?.move(
          e.nativeEvent.locationX,
          e.nativeEvent.locationY,
          points,
        );
    },
    onResponderRelease: () => controller.current?.up(),
    onResponderTerminate: () => controller.current?.cancel(),
    onResponderTerminationRequest: () => false,
  };
  return (
    <View
      style={{ flex: 1, backgroundColor: c.paper }}
      onLayout={(e) =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
      {...responder}
    >
      <View style={{ flex: 1 }} pointerEvents="none">
        <SceneError>
          <Canvas
            frameloop="demand"
            dpr={[1, 1.5]}
            camera={{ position: [7, 7, 8], fov: 43, near: 0.05, far: 150 }}
            gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
            onCreated={({ gl, scene }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1;
              scene.background = new THREE.Color(c.paper);
            }}
          >
            <color attach="background" args={[c.paper]} />
            <hemisphereLight args={["#ffffff", "#a99b88", 2.1]} />
            <directionalLight
              position={[5, 8, 5]}
              intensity={2.5}
              color="#fff4e3"
            />
            <directionalLight
              position={[-4, 5, -3]}
              intensity={0.7}
              color="#dceafa"
            />
            <CameraBridge
              props={bridgeProps}
              width={size.w}
              height={size.h}
              controller={controller}
              setDraft={(i) => {
                setDraft(i);
                latest.current.onDraft?.(i);
              }}
            />
            <Suspense fallback={null}>
              {scenePlan.floors.map((planned) => {
                const f = floors.find((f) => f.id === planned.id)!;
                const offset = {
                  x: planned.displayOffset.x - viewOrigin.x,
                  y: planned.displayOffset.y - viewOrigin.y,
                  z: planned.displayOffset.z - viewOrigin.z,
                };
                return (
                  <group key={f.id} position={[offset.x, offset.y, offset.z]}>
                    <RoomScene
                      floor={f}
                      roomId={props.room.id}
                      selected={props.selected}
                      walk={props.mode === "walk"}
                      cutaway={props.cutaway}
                      allRooms={
                        props.allRooms ||
                        !!props.allFloors ||
                        props.mode === "walk"
                      }
                      visibleRoomIds={planned.roomIds}
                      showCeilings={planned.ceilingsVisible}
                      viewOffset={offset}
                      draft={
                        f.id === props.floor.id
                          ? (props.draftOverride ?? draft)
                          : null
                      }
                    />
                  </group>
                );
              })}
            </Suspense>
          </Canvas>
        </SceneError>
      </View>
      {props.mode === "walk" && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 20,
            left: 16,
            right: 16,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: c.sub,
              fontSize: 11,
              backgroundColor: c.surface,
              padding: 9,
              borderRadius: 20,
            }}
          >
            Drag left side to walk
          </Text>
          <Text
            style={{
              color: c.sub,
              fontSize: 11,
              backgroundColor: c.surface,
              padding: 9,
              borderRadius: 20,
            }}
          >
            Drag right side to look
          </Text>
        </View>
      )}
    </View>
  );
}
function CameraBridge({
  props,
  width,
  height,
  controller,
  setDraft,
}: {
  props: Interaction;
  width: number;
  height: number;
  controller: React.RefObject<Controller | null>;
  setDraft: (i: Item | null) => void;
}) {
  const { camera, scene, gl, invalidate } = useThree();
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  const pose = useRef({
    theta: 0.75,
    phi: 0.88,
    radius: 7.8,
    sceneExtent: 8,
    targetX: 0,
    targetY: 1,
    targetZ: 0,
    spatialRoomId: "",
    yaw: Math.PI,
    pitch: 0,
    x: 1,
    z: 1,
  });
  const drag = useRef<{
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    point: THREE.Vector3;
    item: Item | null;
    movable: boolean;
    moved: boolean;
    draft: Item | null;
    walkSide: boolean;
    orbited: boolean;
  } | null>(null);
  const pinch = useRef<{
    distance: number;
    radius: number;
    targetX: number;
    targetZ: number;
    anchor: THREE.Vector3;
  } | null>(null);
  const navigation = useRef({ roomId: "", mode: "" });
  const lastCameraRequest = useRef<number | undefined>(undefined);
  const ray = useMemo(() => new THREE.Raycaster(), []),
    plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  function cameraPose() {
    const p = latest.current,
      t = pose.current;
    if (p.mode === "walk") {
      const spatialRoom =
        p.floor.rooms.find((r) => inside({ x: t.x, z: t.z }, r.polygon)) ??
        p.room;
      camera.position.set(
        t.x,
        Math.min(1.6, (spatialRoom.ceiling ?? p.floor.ceiling) - 0.2),
        t.z,
      );
      camera.lookAt(
        t.x + Math.sin(t.yaw) * Math.cos(t.pitch),
        camera.position.y + Math.sin(t.pitch),
        t.z + Math.cos(t.yaw) * Math.cos(t.pitch),
      );
    } else {
      const target = new THREE.Vector3(t.targetX, t.targetY, t.targetZ);
      camera.position.set(
        target.x + t.radius * Math.sin(t.phi) * Math.sin(t.theta),
        target.y + t.radius * Math.cos(t.phi),
        target.z + t.radius * Math.sin(t.phi) * Math.cos(t.theta),
      );
      camera.lookAt(target);
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      const { near, far } = clippingRange(
        t.radius,
        t.sceneExtent,
        p.mode === "walk",
      );
      if (camera.near !== near || camera.far !== far) {
        camera.near = near;
        camera.far = far;
        camera.updateProjectionMatrix();
      }
    }
    camera.updateMatrixWorld();
    invalidate();
  }
  function hit(x: number, y: number) {
    ray.setFromCamera(
      new THREE.Vector2((x / width) * 2 - 1, 1 - (y / height) * 2),
      camera,
    );
    const hits = ray.intersectObjects(scene.children, true);
    const id = pickItem(hits);
    const point = new THREE.Vector3();
    ray.ray.intersectPlane(plane, point);
    return { id, point };
  }
  // Value identity changes for visible structure, including Undo/Redo and
  // same-count floor alignment edits, but stays stable for furniture/finishes.
  const scopePoints = props.allFloors
    ? props.allFloors.flatMap((f) =>
        f.rooms.flatMap((r) =>
          r.polygon.map((p) => ({
            x: p.x + f.alignment.x,
            z: p.z + f.alignment.z,
          })),
        ),
      )
    : props.allRooms
      ? props.floor.rooms.flatMap((r) => r.polygon)
      : props.room.polygon;
  const scopeLow = props.allFloors
    ? Math.min(...props.allFloors.map((f) => f.elevation))
    : 0;
  const scopeHigh = props.allFloors
    ? Math.max(
        ...props.allFloors.map(
          (f) =>
            f.elevation +
            Math.max(...f.rooms.map((r) => r.ceiling ?? f.ceiling)),
        ),
      )
    : props.allRooms
      ? Math.max(
          ...props.floor.rooms.map((r) => r.ceiling ?? props.floor.ceiling),
        )
      : (props.room.ceiling ?? props.floor.ceiling);
  const framingKey = JSON.stringify([scopePoints, scopeLow, scopeHigh]);
  const effectiveFramingKey = props.structureKey ?? framingKey;
  const cameraRevision = props.cameraRequest?.revision;
  useEffect(() => {
    const t = pose.current;
    let [points, low, high] = JSON.parse(framingKey) as [
      Point[],
      number,
      number,
    ];
    const current = latest.current,
      request = current.cameraRequest;
    if (request && request.revision !== lastCameraRequest.current) {
      if (request.preset === "top") {
        t.theta = 0;
        t.phi = 0.001;
      } else if (request.preset === "front") {
        t.theta = 0;
        t.phi = Math.PI / 2 - 0.001;
      } else if (request.preset === "perspective") {
        t.theta = 0.75;
        t.phi = 0.88;
      }
      lastCameraRequest.current = request.revision;
    }
    const b = current.scenePlan?.displayBounds,
      origin = current.viewOrigin ?? { x: 0, y: 0, z: 0 };
    if (b) {
      points = [
        { x: b.min.x - origin.x, z: b.min.z - origin.z },
        { x: b.max.x - origin.x, z: b.min.z - origin.z },
        { x: b.max.x - origin.x, z: b.max.z - origin.z },
        { x: b.min.x - origin.x, z: b.max.z - origin.z },
      ];
      low = b.min.y - origin.y;
      high = b.max.y - origin.y;
    }
    const fit = fitCamera(points, high - low, width / height, t.theta, t.phi);
    t.radius = fit.radius;
    t.sceneExtent = fit.extent;
    t.targetX = fit.target.x;
    t.targetY = fit.target.y + low;
    t.targetZ = fit.target.z;
    const resetWalk =
      props.mode === "walk" &&
      (navigation.current.roomId !== props.room.id ||
        navigation.current.mode !== "walk");
    if (resetWalk) {
      const spawn = walkSpawn(props.floor, props.room, placementAssets);
      if (spawn) {
        t.x = spawn.x;
        t.z = spawn.z;
      }
      t.spatialRoomId = props.room.id;
      props.onWalkRoom?.(props.room.id);
    }
    navigation.current = { roomId: props.room.id, mode: props.mode };
    cameraPose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    effectiveFramingKey,
    cameraRevision,
    props.floor.id,
    props.room.id,
    props.mode,
    props.allRooms,
    props.allFloors?.length,
    width,
    height,
  ]);
  useEffect(() => {
    controller.current = {
      down(x, y) {
        pinch.current = null;
        const p = latest.current,
          h = hit(x, y),
          item =
            p.floor.items.find(
              (i) => i.id === h.id && i.roomId === p.room.id,
            ) ?? null;
        drag.current = {
          x,
          y,
          lastX: x,
          lastY: y,
          point: h.point,
          item,
          movable:
            p.mode !== "walk" &&
            !p.allFloors &&
            p.scenePlan?.canEdit !== false &&
            !p.onWall &&
            !!item &&
            !item.locked &&
            (p.quickMove || item.id === p.selected),
          moved: false,
          draft: null,
          walkSide: x < width * 0.42,
          orbited: false,
        };
      },
      move(x, y, touches) {
        const metrics = pinchMetrics(touches);
        const active = latest.current;
        if (metrics && active.mode !== "walk") {
          const t = pose.current;
          if (!pinch.current) {
            pinch.current = {
              distance: metrics.distance,
              radius: t.radius,
              targetX: t.targetX,
              targetZ: t.targetZ,
              anchor: hit(metrics.x, metrics.y).point,
            };
            if (drag.current) {
              drag.current.movable = false;
              drag.current.moved = true;
              drag.current.draft = null;
            }
            setDraft(null);
          }
          const start = pinch.current;
          t.radius = Math.max(
            1.5,
            Math.min(400, (start.radius * start.distance) / metrics.distance),
          );
          t.targetX = start.targetX;
          t.targetZ = start.targetZ;
          cameraPose();
          const after = hit(metrics.x, metrics.y).point;
          t.targetX += start.anchor.x - after.x;
          t.targetZ += start.anchor.z - after.z;
          cameraPose();
          return;
        }
        if (pinch.current) return;

        const d = drag.current;
        if (!d) return;
        const p = latest.current,
          dx = x - d.lastX,
          dy = y - d.lastY;
        d.moved ||= Math.hypot(x - d.x, y - d.y) > 5;
        if (d.movable && d.item) {
          const h = hit(x, y),
            step = p.grid ? 0.1 : 0.001;
          const i = {
            ...d.item,
            x: Math.round((d.item.x + h.point.x - d.point.x) / step) * step,
            z: Math.round((d.item.z + h.point.z - d.point.z) / step) * step,
          };
          d.draft = i;
          setDraft(i);
        } else if (p.mode === "walk") {
          const t = pose.current;
          if (d.walkSide) {
            const right = dx * 0.009,
              forward = -dy * 0.009;
            const next = walkMove(
              p.floor,
              p.room.id,
              { x: t.x, z: t.z },
              {
                x: t.x + Math.cos(t.yaw) * right + Math.sin(t.yaw) * forward,
                z: t.z - Math.sin(t.yaw) * right + Math.cos(t.yaw) * forward,
              },
              placementAssets,
            );
            t.x = next.x;
            t.z = next.z;
            const spatial = p.floor.rooms.find((r) =>
              inside({ x: t.x, z: t.z }, r.polygon),
            );
            if (spatial && spatial.id !== t.spatialRoomId) {
              t.spatialRoomId = spatial.id;
              p.onWalkRoom?.(spatial.id);
            }
          } else {
            t.yaw -= dx * 0.007;
            t.pitch = Math.max(-0.65, Math.min(0.65, t.pitch - dy * 0.006));
          }
          cameraPose();
        } else if (!p.onWall) {
          d.orbited = true;
          pose.current.theta -= dx * 0.008;
          pose.current.phi = Math.max(
            0.25,
            Math.min(1.4, pose.current.phi + dy * 0.006),
          );
          cameraPose();
        }
        d.lastX = x;
        d.lastY = y;
      },
      up() {
        pinch.current = null;
        const d = drag.current;
        if (!d) return;
        drag.current = null;
        const p = latest.current;
        if (d.orbited && p.mode === "3d") p.onCameraOrbit?.();
        if (d.movable && d.draft && d.moved) {
          p.onCommit(d.draft);
        } else if (!d.moved && p.mode !== "walk" && !p.allFloors) {
          const h = hit(d.x, d.y);
          if (p.onWall) {
            const w = p.floor.walls
              .map((w) => ({
                w,
                ...projectToSegment({ x: h.point.x, z: h.point.z }, w.a, w.b),
              }))
              .sort((a, b) => a.distance - b.distance)[0];
            if (w && w.distance < 0.4) p.onWall(w.w.id, w.offset);
          } else p.onSelect(h.id ?? null);
        }
        setDraft(null);
        invalidate();
      },
      cancel() {
        pinch.current = null;
        drag.current = null;
        setDraft(null);
        invalidate();
      },
    };
    return () => {
      controller.current = null;
    };
    // Callbacks read current props; renderer camera/size changes recreate the bridge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, scene, width, height]);
  useEffect(() => {
    if (!__DEV__) return;
    const diagnostics = globalThis as typeof globalThis & {
      __oisSceneProbe?: () => unknown;
    };
    diagnostics.__oisSceneProbe = () =>
      sceneSnapshot(
        scene,
        camera,
        gl,
        width,
        height,
        latest.current.floor,
        latest.current.mode,
      );
    return () => {
      delete diagnostics.__oisSceneProbe;
    };
  }, [scene, camera, gl, width, height]);
  useEffect(() => {
    invalidate();
  }, [props, invalidate]);
  return null;
}
