import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageAdapter } from "../domain/persistence";
export const libraryStorage: StorageAdapter = AsyncStorage;
