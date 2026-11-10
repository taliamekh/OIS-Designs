import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { FileBackedStorage } from "./fileStore";
const directory = () => {
  const folder = new Directory(Paths.document, "project-saves");
  folder.create({ intermediates: true, idempotent: true });
  return folder;
};
export const libraryStorage = new FileBackedStorage(AsyncStorage, {
  async write(name, value) {
    const file = new File(directory(), name);
    file.create();
    await file.write(value);
  },
  async read(name) {
    return new File(directory(), name).text();
  },
  async remove(name) {
    const file = new File(directory(), name);
    if (file.exists) file.delete();
  },
});
