import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  CASING_WIDTH,
  CASING_OFFSET,
  CASING_TOP,
} from "../domain/construction";
import { SharedGLTFLoader } from "./modelLoader";
import {
  AssetRecord,
  defaultWall,
  Floor,
  Item,
  Room,
  Wall,
  Finish,
} from "../domain/types";
import {
  distance,
  footprint,
  lerp,
  DOOR_LEAF_THICKNESS,
} from "../domain/geometry";
import { revisionModels } from "../catalogue/bundled";
import { resolveItemAsset, supportsPlacement } from "../catalogue/resolve";
import { retainModel, retainTextureSet } from "./resources";
import { Asset, nativeRenderer, useLoader, useFrame } from "./fiber";
import {
  floorGeometry,
  trimGeometry,
  trimIntervals,
  wallPieces,
  trimCornerMiter,
} from "./meshes";
import { openingLeaves } from "./openingPose";
import { materialMaps } from "./materials";
import { physicalWallPlan, Vec3 } from "./spatialView";
const zeroOffset: Vec3 = { x: 0, y: 0, z: 0 };
function wallVisible(
  floor: Floor,
  wall: Wall,
  rooms: ReadonlySet<string>,
  offset: Vec3,
  camera: THREE.Vector3,
  cutaway: boolean,
  walk: boolean,
  previous: Record<string, boolean>,
) {
  const plan = physicalWallPlan(floor, wall, rooms, offset, {
    activeFloorId: floor.id,
    scope: { kind: "floor" },
    mode: walk ? "walk" : "3d",
    shell: cutaway ? "cutaway" : "solid",
    camera: { x: camera.x, y: camera.y, z: camera.z },
    previousWallVisibility: previous,
  });
  if (plan) previous[plan.key] = plan.visible;
  return plan?.visible ?? false;
}
const source = (id: number) => (nativeRenderer ? id : Asset.fromModule(id).uri);
const sheen = {
  matte: 0.96,
  eggshell: 0.78,
  satin: 0.5,
  "semi-gloss": 0.29,
  gloss: 0.13,
};
export function SurfaceMaterial({
  id,
  colour = "#ffffff",
  roughness,
  repeatX = 1,
  repeatY = 1,
  angle = 0,
  offsetX = 0,
  offsetY = 0,
  attach,
}: {
  id: string;
  colour?: string;
  roughness?: number;
  repeatX?: number;
  repeatY?: number;
  angle?: number;
  offsetX?: number;
  offsetY?: number;
  attach?: string;
}) {
  const info = materialMaps[id];
  return info ? (
    <MappedMaterial
      id={id}
      colour={colour}
      roughness={roughness}
      repeatX={repeatX}
      repeatY={repeatY}
      angle={angle}
      offsetX={offsetX}
      offsetY={offsetY}
      attach={attach}
    />
  ) : (
    <meshStandardMaterial
      attach={attach}
      color={colour}
      roughness={roughness ?? 0.8}
      side={THREE.DoubleSide}
    />
  );
}
function MappedMaterial({
  id,
  colour,
  roughness,
  repeatX,
  repeatY,
  angle,
  offsetX,
  offsetY,
  attach,
}: {
  id: string;
  colour: string;
  roughness?: number;
  repeatX: number;
  repeatY: number;
  angle: number;
  offsetX: number;
  offsetY: number;
  attach?: string;
}) {
  const m = materialMaps[id];
  const raw = useLoader(THREE.TextureLoader, [
    source(m.colour),
    source(m.normal),
    source(m.rough),
  ] as string[]);
  useEffect(
    () =>
      retainTextureSet(
        id,
        [source(m.colour), source(m.normal), source(m.rough)],
        raw,
      ),
    [id, m.colour, m.normal, m.rough, raw],
  );
  const maps = useMemo(
    () =>
      raw.map((t, i) => {
        const q = t.clone();
        // R3F/native marks a base Texture as a data texture for EXGL's localUri
        // upload. Three.Texture.copy omits this adapter flag. Keep it only when
        // the source uses that path; normal browser images stay ordinary textures.
        if ("isDataTexture" in t && t.isDataTexture === true)
          Object.assign(q, { isDataTexture: true });
        q.wrapS = q.wrapT = THREE.RepeatWrapping;
        q.repeat.set(repeatX, repeatY);
        q.rotation = angle;
        q.offset.set(offsetX, offsetY);
        q.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        q.needsUpdate = true;
        return q;
      }),
    [raw, repeatX, repeatY, angle, offsetX, offsetY],
  );
  useEffect(() => () => maps.forEach((t) => t.dispose()), [maps]);
  return (
    <meshStandardMaterial
      attach={attach}
      color={colour}
      map={maps[0]}
      normalMap={maps[1]}
      normalScale={new THREE.Vector2(0.45, 0.45)}
      roughnessMap={maps[2]}
      roughness={roughness ?? 1}
      side={THREE.DoubleSide}
    />
  );
}
function FloorMesh({ room }: { room: Room }) {
  const polygonKey = JSON.stringify(room.polygon);
  const g = useMemo(
    () => floorGeometry({ polygon: JSON.parse(polygonKey) }),
    [polygonKey],
  );
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh
      geometry={g}
      receiveShadow
      userData={{ surface: "floor", roomId: room.id }}
    >
      <SurfaceMaterial
        id={room.floorFinish.id}
        repeatX={1 / room.floorFinish.repeat}
        repeatY={1 / room.floorFinish.repeat}
        angle={room.floorFinish.angle}
      />
    </mesh>
  );
}
function LockMarker({ asset }: { asset: AssetRecord }) {
  const group = useRef<THREE.Group>(null),
    inverse = useMemo(() => new THREE.Quaternion(), []);
  useFrame(({ camera }) => {
    if (!group.current) return;
    group.current.parent?.getWorldQuaternion(inverse);
    group.current.quaternion.copy(inverse.invert()).multiply(camera.quaternion);
  });
  return (
    <group
      ref={group}
      position={[
        (asset.bounds.min[0] + asset.bounds.max[0]) / 2,
        asset.bounds.max[1] + 0.18,
        (asset.bounds.min[2] + asset.bounds.max[2]) / 2,
      ]}
    >
      <mesh renderOrder={1000}>
        <circleGeometry args={[0.105, 24]} />
        <meshBasicMaterial color="#f4f3ef" depthTest={false} />
      </mesh>
      <mesh position={[0, -0.018, 0.006]} renderOrder={1001}>
        <boxGeometry args={[0.1, 0.075, 0.014]} />
        <meshBasicMaterial color="#43585e" depthTest={false} />
      </mesh>
      <mesh position={[0, 0.024, 0.006]} renderOrder={1001}>
        <torusGeometry args={[0.035, 0.009, 6, 16, Math.PI]} />
        <meshBasicMaterial color="#43585e" depthTest={false} />
      </mesh>
    </group>
  );
}
function CeilingMesh({ room, height }: { room: Room; height: number }) {
  const polygonKey = JSON.stringify(room.polygon);
  const geometry = useMemo(
    () => floorGeometry({ polygon: JSON.parse(polygonKey) }),
    [polygonKey],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, height, 0]}>
      <meshStandardMaterial color="#eeeae2" side={THREE.DoubleSide} />
    </mesh>
  );
}
function WallFace({
  floor,
  room,
  wall,
  cutaway,
  walk,
  visibleRooms,
  viewOffset,
  visibility,
}: {
  floor: Floor;
  room: Room;
  wall: Wall;
  cutaway: boolean;
  walk: boolean;
  visibleRooms: ReadonlySet<string>;
  viewOffset: Vec3;
  visibility: React.RefObject<Record<string, boolean>>;
}) {
  const face = wall.faces.find((f) => f.roomId === room.id)!;
  const len = distance(wall.a, wall.b),
    ux = (wall.b.x - wall.a.x) / len,
    uz = (wall.b.z - wall.a.z) / len,
    sign = face.reversed ? -1 : 1,
    angle = -Math.atan2(uz, ux),
    h = room.ceiling ?? floor.ceiling;
  const finish: Finish = room.wallFaces[wall.id] ?? defaultWall;
  const trim = room.trimOverrides[wall.id] ?? room.trim;
  const group = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!group.current) return;
    group.current.visible = wallVisible(
      floor,
      wall,
      visibleRooms,
      viewOffset,
      camera.position,
      cutaway,
      walk,
      visibility.current,
    );
  });
  const intervalKey = JSON.stringify(trimIntervals(wall, floor));
  const intervals = useMemo(
    () => JSON.parse(intervalKey) as [number, number][],
    [intervalKey],
  );
  const { profile, height, projection } = trim;
  const { slope: startSlope, offset: startOffset } = trimCornerMiter(
      floor,
      room,
      wall,
      true,
    ),
    { slope: endSlope, offset: endOffset } = trimCornerMiter(
      floor,
      room,
      wall,
      false,
    ),
    baseInset = wall.thickness / 2;
  const trimGeometries = useMemo(
    () =>
      intervals.map(([a, b]) =>
        trimGeometry(
          { profile, height, projection },
          b - a,
          (sign === 1 ? a < 0.001 : b > len - 0.001)
            ? { slope: startSlope, offset: startOffset }
            : 0,
          (sign === 1 ? b > len - 0.001 : a < 0.001)
            ? { slope: endSlope, offset: endOffset }
            : 0,
          baseInset,
        ),
      ),
    [
      profile,
      height,
      projection,
      intervals,
      sign,
      len,
      startSlope,
      startOffset,
      endSlope,
      endOffset,
      baseInset,
    ],
  );
  useEffect(
    () => () => trimGeometries.forEach((g) => g.dispose()),
    [trimGeometries],
  );
  return (
    <group
      ref={group}
      position={[wall.a.x, 0, wall.a.z]}
      rotation={[0, angle, 0]}
    >
      {wallPieces(wall, floor.openings, h).map((p, i) => (
        <mesh
          key={i}
          position={[
            (p.start + p.end) / 2,
            (p.bottom + p.top) / 2,
            (sign * (wall.thickness + (p.cavity ?? 0))) / 4,
          ]}
        >
          <boxGeometry
            args={[
              p.end - p.start,
              p.top - p.bottom,
              (wall.thickness - (p.cavity ?? 0)) / 2,
            ]}
          />
          <SurfaceMaterial
            id={finish.texture}
            colour={finish.colour}
            roughness={sheen[finish.sheen]}
            offsetX={p.start / (materialMaps[finish.texture]?.repeat ?? 1)}
            offsetY={p.bottom / (materialMaps[finish.texture]?.repeat ?? 1)}
            repeatX={
              (p.end - p.start) / (materialMaps[finish.texture]?.repeat ?? 1)
            }
            repeatY={
              (p.top - p.bottom) / (materialMaps[finish.texture]?.repeat ?? 1)
            }
          />
        </mesh>
      ))}
      {trim.profile !== "none" &&
        intervals.map(([a, b], i) => (
          <mesh
            key={`trim${i}`}
            geometry={trimGeometries[i]}
            position={[sign === 1 ? a : b, 0, (sign * wall.thickness) / 2]}
            rotation={[0, sign === 1 ? 0 : Math.PI, 0]}
          >
            {trim.material === "aluminium" ? (
              <meshStandardMaterial
                attach="material-0"
                color={trim.colour}
                roughness={sheen[trim.sheen]}
                metalness={0.75}
              />
            ) : (
              <SurfaceMaterial
                attach="material-0"
                id={trim.material ?? "paint"}
                colour={trim.colour}
                roughness={sheen[trim.sheen]}
                repeatX={0.5}
                repeatY={0.5}
              />
            )}
            <meshStandardMaterial
              attach="material-1"
              color={trim.colour}
              roughness={sheen[trim.sheen]}
              metalness={trim.material === "aluminium" ? 0.75 : 0}
            />
          </mesh>
        ))}
    </group>
  );
}
function Openings({
  floor,
  room,
  onlyPrimary,
  cutaway,
  walk,
  visibleRooms,
  viewOffset,
  visibility,
}: {
  floor: Floor;
  room: Room;
  onlyPrimary: boolean;
  cutaway: boolean;
  walk: boolean;
  visibleRooms: ReadonlySet<string>;
  viewOffset: Vec3;
  visibility: React.RefObject<Record<string, boolean>>;
}) {
  const groups = useRef(new Map<string, THREE.Group>());
  useFrame(({ camera }) => {
    for (const [id, group] of groups.current) {
      const o = floor.openings.find((o) => o.id === id),
        w = floor.walls.find((w) => w.id === o?.wallId),
        face = w?.faces.find((f) => f.roomId === room.id);
      if (!w || !face) continue;
      group.visible = wallVisible(
        floor,
        w,
        visibleRooms,
        viewOffset,
        camera.position,
        cutaway,
        walk,
        visibility.current,
      );
    }
  });
  return (
    <>
      {floor.openings.map((o) => {
        const w = floor.walls.find((w) => w.id === o.wallId);
        if (
          !w ||
          !w.faces.some((f) => f.roomId === room.id) ||
          (onlyPrimary && w.faces[0].roomId !== room.id)
        )
          return null;
        const len = distance(w.a, w.b),
          p = lerp(w.a, w.b, o.offset / len),
          angle = -Math.atan2(w.b.z - w.a.z, w.b.x - w.a.x),
          h = o.height,
          th = w.thickness;
        return (
          <group
            key={o.id}
            ref={(node) => {
              if (node) groups.current.set(o.id, node);
              else groups.current.delete(o.id);
            }}
            userData={{ openingId: o.id }}
            position={[p.x, o.sill, p.z]}
            rotation={[0, angle, 0]}
          >
            {[-CASING_OFFSET, o.width + CASING_OFFSET].map((x) => (
              <mesh key={x} position={[x, (h + CASING_TOP) / 2, 0]}>
                <boxGeometry args={[CASING_WIDTH, h + CASING_TOP, th + 0.04]} />
                <meshStandardMaterial color="#e5dfd4" />
              </mesh>
            ))}
            <mesh position={[o.width / 2, h + 0.025, 0]}>
              <boxGeometry args={[o.width + 0.1, 0.05, th + 0.04]} />
              <meshStandardMaterial color="#e5dfd4" />
            </mesh>
            {o.type === "window" && (
              <mesh position={[o.width / 2, h / 2, 0]}>
                <boxGeometry args={[o.width - 0.06, h - 0.06, 0.025]} />
                <meshStandardMaterial
                  color="#9dbcc4"
                  roughness={0.15}
                  transparent
                  opacity={0.45}
                />
              </mesh>
            )}
            {openingLeaves(o, th, walk).map((leaf, i) => (
              <group
                key={i}
                position={[leaf.pivotX, 0, leaf.z]}
                rotation={[0, leaf.yaw, 0]}
              >
                <mesh position={[leaf.width / 2, h / 2, 0]}>
                  <boxGeometry args={[leaf.width, h, DOOR_LEAF_THICKNESS]} />
                  <meshStandardMaterial color="#c9b795" roughness={0.5} />
                </mesh>
              </group>
            ))}
            {o.type === "sliding" && (
              <mesh
                position={[
                  o.width / 2 +
                    (o.hinge === "left" ? -o.width / 2 : o.width / 2),
                  h + 0.08,
                  (o.flip ? -1 : 1) * (th / 2 + 0.04),
                ]}
              >
                <boxGeometry args={[o.width * 2 + 0.08, 0.025, 0.025]} />
                <meshStandardMaterial
                  color="#777a78"
                  roughness={0.35}
                  metalness={0.6}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}
function Furniture({
  item,
  asset,
  selected,
  showLock,
}: {
  item: Item;
  asset: AssetRecord;
  selected: boolean;
  showLock: boolean;
}) {
  const gltf = useLoader(
    SharedGLTFLoader,
    source(revisionModels[asset.sha256]) as string,
  );
  useLayoutEffect(
    () =>
      retainModel(
        asset.sha256,
        source(revisionModels[asset.sha256]),
        gltf,
        asset.bytes,
      ),
    [asset.sha256, asset.bytes, gltf],
  );
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.userData.itemId = item.id;
        node.material = Array.isArray(node.material)
          ? node.material.map((m) => m.clone())
          : node.material.clone();
        const mats = Array.isArray(node.material)
          ? node.material
          : [node.material];
        for (const m of mats) {
          const override = Object.entries(item.materialOverrides).find(
            ([slot]) => m.name.toLowerCase().includes(slot.toLowerCase()),
          );
          if (override && m instanceof THREE.MeshStandardMaterial)
            m.color.set(override[1]);
        }
      }
    });
    return clone;
  }, [gltf.scene, item.id, item.materialOverrides]);
  useEffect(
    () => () =>
      object.traverse((node) => {
        if (node instanceof THREE.Mesh)
          (Array.isArray(node.material)
            ? node.material
            : [node.material]
          ).forEach((m) => m.dispose());
      }),
    [object],
  );
  if (item.assetVersion !== asset.version || item.assetHash !== asset.sha256)
    return null;
  return (
    <group position={[item.x, 0, item.z]} rotation={[0, item.yaw, 0]}>
      <primitive object={object} dispose={null} />
      {showLock && item.locked && <LockMarker asset={asset} />}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry
            args={[
              Math.max(
                asset.dimensionsMetres.width,
                asset.dimensionsMetres.depth,
              ) /
                2 +
                0.04,
              Math.max(
                asset.dimensionsMetres.width,
                asset.dimensionsMetres.depth,
              ) /
                2 +
                0.055,
              48,
            ]}
          />
          <meshBasicMaterial
            color={item.locked ? "#73828a" : "#a17a46"}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
export function SelectionFootprint({
  item,
  valid = true,
}: {
  item: Item;
  valid?: boolean;
}) {
  const a = resolveItemAsset(item);
  const points = useMemo(
    () =>
      a
        ? footprint(item, a).map((p) => new THREE.Vector3(p.x, 0.025, p.z))
        : [],
    [item, a],
  );
  const g = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points],
  );
  useEffect(() => () => g.dispose(), [g]);
  return (
    <lineLoop geometry={g}>
      <lineBasicMaterial color={valid ? "#ad803f" : "#cc4935"} />
    </lineLoop>
  );
}
export function RoomScene({
  floor,
  roomId,
  selected,
  walk,
  cutaway,
  allRooms = false,
  draft,
  visibleRoomIds,
  showCeilings = false,
  viewOffset = zeroOffset,
}: {
  floor: Floor;
  roomId: string;
  selected: string | null;
  walk: boolean;
  cutaway: boolean;
  allRooms?: boolean;
  draft?: Item | null;
  visibleRoomIds?: readonly string[];
  showCeilings?: boolean;
  viewOffset?: Vec3;
}) {
  const rooms = visibleRoomIds
    ? floor.rooms.filter((r) => visibleRoomIds.includes(r.id))
    : allRooms
      ? floor.rooms
      : floor.rooms.filter((r) => r.id === roomId);
  const visibleKey = JSON.stringify(rooms.map((r) => r.id).sort());
  const visibleRooms = useMemo(
    () => new Set<string>(JSON.parse(visibleKey)),
    [visibleKey],
  );
  const visibility = useRef<Record<string, boolean>>({});
  return (
    <>
      {rooms.map((room) => (
        <group key={room.id}>
          <Suspense fallback={null}>
            <FloorMesh room={room} />
            {floor.walls
              .filter((w) => w.faces.some((f) => f.roomId === room.id))
              .map((w) => (
                <WallFace
                  key={w.id}
                  room={room}
                  floor={floor}
                  wall={w}
                  cutaway={cutaway}
                  walk={walk}
                  visibleRooms={visibleRooms}
                  viewOffset={viewOffset}
                  visibility={visibility}
                />
              ))}
          </Suspense>
          <Openings
            floor={floor}
            room={room}
            onlyPrimary={allRooms}
            cutaway={cutaway}
            walk={walk}
            visibleRooms={visibleRooms}
            viewOffset={viewOffset}
            visibility={visibility}
          />
          {(walk || showCeilings) && (
            <CeilingMesh room={room} height={room.ceiling ?? floor.ceiling} />
          )}
        </group>
      ))}
      {floor.items
        .filter((i) => rooms.some((r) => r.id === i.roomId))
        .map((i) => {
          const a = resolveItemAsset(i);
          const placed = draft?.id === i.id ? draft : i;
          return a && supportsPlacement(a) ? (
            <Suspense key={i.id} fallback={null}>
              <Furniture
                item={placed}
                asset={a}
                selected={selected === i.id && !walk}
                showLock={!walk}
              />
            </Suspense>
          ) : (
            <group key={i.id} position={[i.x, 0, i.z]}>
              <mesh position={[0, 0.2, 0]} userData={{ itemId: i.id }}>
                <octahedronGeometry args={[0.15]} />
                <meshBasicMaterial color="#bb4333" wireframe />
              </mesh>
            </group>
          );
        })}
      {draft && <SelectionFootprint item={draft} />}
    </>
  );
}
