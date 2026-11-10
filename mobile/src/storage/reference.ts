import { libraryStorage } from "./library";
import { newId } from "../domain/types";
export async function storeReference(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new globalThis.Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(Error("The reference image could not be opened."));
    image.src = uri;
  });
  const ratio = Math.min(1, 1024 / Math.max(width, height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Image resizing is unavailable.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL("image/jpeg", 0.65);
  if (data.length > 700000)
    throw Error("Reference image is too large. Choose a smaller crop.");
  const id = newId("reference");
  await libraryStorage.setItem(`ois.reference.${id}`, data);
  return id;
}
export async function referenceUri(id: string): Promise<string | null> {
  return libraryStorage.getItem(`ois.reference.${id}`);
}
