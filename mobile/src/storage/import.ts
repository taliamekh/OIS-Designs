import * as DocumentPicker from "expo-document-picker";
export async function chooseBackup(): Promise<{
  name: string;
  raw: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: false,
    base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  try {
    if (!asset.file)
      throw Error("The selected backup file could not be opened.");
    return { name: asset.name, raw: await asset.file.text() };
  } finally {
    if (asset.uri.startsWith("blob:")) URL.revokeObjectURL(asset.uri);
  }
}
