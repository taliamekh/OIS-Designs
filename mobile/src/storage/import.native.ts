import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
export async function chooseBackup(): Promise<{
  name: string;
  raw: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return { name: asset.name, raw: await new File(asset.uri).text() };
}
