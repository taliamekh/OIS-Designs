import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { newId } from "../domain/types";
export async function exportBackup(raw: string) {
  if (!(await Sharing.isAvailableAsync()))
    throw Error(
      "File sharing is unavailable. Use Show backup text to copy the data.",
    );
  const file = new File(Paths.cache, newId("ois-backup") + ".json");
  file.create();
  await file.write(raw);
  if ((await file.text()) !== raw)
    throw Error("The backup file could not be verified. Please try again.");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Export OIS Designs backup",
  });
  // Share targets may read after the dialog returns. Cache owns this export;
  // never remove it while another app may still be opening it.
}
