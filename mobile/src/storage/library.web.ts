import AsyncStorage from "@react-native-async-storage/async-storage";
import { IndexedStorage } from "./indexedStore";
export const libraryStorage = new IndexedStorage(AsyncStorage);
