import * as THREE from "three";
import { Floor, ViewMode } from "../domain/types";
import { modelCacheStats } from "./resources";
export function sceneSnapshot(
  scene: THREE.Scene,
  camera: THREE.Camera,
  gl: THREE.WebGLRenderer,
  width: number,
  height: number,
  floor: Floor,
  mode: ViewMode,
) {
  const boxes = new Map<string, THREE.Box3>();
  const materials = new Map<
    string,
    Map<
      string,
      {
        slot: string;
        colour: string | null;
        mapped: boolean;
        width: number | null;
        height: number | null;
      }
    >
  >();
  scene.updateMatrixWorld(true);
  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !node.userData.itemId) return;
    const id = node.userData.itemId;
    const box = boxes.get(id) ?? new THREE.Box3();
    // Imported meshes may contain rotated children; precise vertices keep this
    // read-only QA bound consistent with the authored exact-revision bounds.
    box.union(new THREE.Box3().setFromObject(node, true));
    boxes.set(id, box);
    const slots = materials.get(id) ?? new Map();
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material]) {
      const m = material as THREE.MeshStandardMaterial,
        entry = {
          slot: m.name,
          colour:
            m.color instanceof THREE.Color ? m.color.getHexString() : null,
          mapped: !!m.map,
          width: m.map?.image?.width ?? null,
          height: m.map?.image?.height ?? null,
        };
      slots.set(JSON.stringify(entry), entry);
    }
    materials.set(id, slots);
  });
  return {
    rooms: [
      ...new Set(
        (() => {
          const ids: string[] = [];
          scene.traverse((o) => {
            if (o.userData.surface === "floor") ids.push(o.userData.roomId);
          });
          return ids;
        })(),
      ),
    ],
    mode,
    camera: camera.position.toArray(),
    cameraQuaternion: camera.quaternion.toArray(),
    projectionMatrix: camera.projectionMatrix.toArray(),
    items: [...boxes].map(([id, box]) => {
      const p = box.getCenter(new THREE.Vector3()).project(camera);
      return {
        id,
        worldBounds: { min: box.min.toArray(), max: box.max.toArray() },
        x: ((p.x + 1) * width) / 2,
        y: ((1 - p.y) * height) / 2,
        roomId: floor.items.find((i) => i.id === id)?.roomId,
        materials: [...(materials.get(id)?.values() ?? [])],
      };
    }),
    memory: { ...gl.info.memory },
    draw: { ...gl.info.render },
    cache: modelCacheStats(),
  };
}
