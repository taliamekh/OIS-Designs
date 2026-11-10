import type { Intersection, Mesh, Object3D } from "three";

/** Ray hits are nearest first. A visible opaque surface stops selection;
 * cutaway ancestors and non-depth-tested decoration do not hide pick targets. */
export function pickItem(hits: Intersection[]): string | undefined {
  for (const hit of hits) {
    let visible = true;
    for (let node: Object3D | null = hit.object; node; node = node.parent)
      if (!node.visible) {
        visible = false;
        break;
      }
    if (!visible) continue;
    const mesh = hit.object as Mesh;
    if (!mesh.isMesh) continue;
    const material = Array.isArray(mesh.material)
      ? mesh.material[hit.face?.materialIndex ?? 0]
      : mesh.material;
    if (!material?.visible || (material.transparent && material.opacity <= 0))
      continue;
    const itemId = mesh.userData.itemId;
    if (typeof itemId === "string") return itemId;
    if (
      material.depthTest &&
      (!material.transparent || material.opacity >= 0.999)
    )
      return undefined;
  }
  return undefined;
}
