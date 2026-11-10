import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { newId } from "../domain/types";
export async function storeReference(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  try {
    if (Math.max(width, height) > 1024)
      context.resize(
        width >= height
          ? { width: 1024, height: null }
          : { height: 1024, width: null },
      );
    const image = await context.renderAsync();
    try {
      const output = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.65,
      });
      const folder = new Directory(Paths.document, "trim-references");
      folder.create({ intermediates: true, idempotent: true });
      const id = newId("reference"),
        target = new File(folder, `${id}.jpg`);
      await new File(output.uri).copy(target);
      return id;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
export async function referenceUri(id: string): Promise<string | null> {
  if (!/^reference-[\w-]+$/.test(id)) return null;
  const file = new File(Paths.document, "trim-references", `${id}.jpg`);
  return file.exists ? file.uri : null;
}
