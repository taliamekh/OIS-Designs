import { Context } from "./context";
import { libraryStorage } from "../storage/library";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AssetRecord, History, newId, ViewMode } from "../domain/types";
import { execute, sampleProject, travelHistory } from "../domain/project";
import {
  Library,
  loadLibrary,
  saveLibrary,
  recoverLibrary,
  decode,
  encode,
  PRIMARY,
  validProject,
} from "../domain/persistence";
import { ActivityIndicator, AppState, View, Text } from "react-native";
import rawAssets from "../catalogue/assets.json";
import { revisions } from "../catalogue/resolve";
export const assets = rawAssets as AssetRecord[];
export const placementAssets = [
  ...assets,
  ...revisions.filter(
    (r) =>
      !assets.some(
        (a) =>
          a.id === r.id && a.version === r.version && a.sha256 === r.sha256,
      ),
  ),
];
const initial = (): Library => {
  const p = sampleProject(assets);
  // Review composition: seating faces the room from the far wall.
  for (const item of p.floors[0].items) {
    const a = assets.find((a) => a.id === item.assetId);
    if (a?.geometryFamily === "sofa") {
      item.x = 2;
      item.z = 0.65;
      item.yaw = Math.PI;
    }
    if (a?.geometryFamily === "coffee-table") {
      item.x = 2;
      item.z = 1.85;
    }
    if (a?.geometryFamily === "armchair") {
      item.x = 3.75;
      item.z = 2;
      item.yaw = Math.PI / 2;
    }
  }
  return {
    version: 1,
    projects: [{ past: [], present: p, future: [] }],
    activeId: p.id,
    favourites: [],
    recent: [],
    settings: { unit: "m", grid: true, quickMove: true, appearance: "system" },
    lastDoor: {
      type: "single",
      width: 0.9,
      height: 2.1,
      hinge: "left",
      flip: false,
      repeat: true,
    },
  };
};
export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState(initial),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState<string | null>(null),
    [protectedSave, setProtected] = useState(false),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState<string | null>(null),
    [mode, setView] = useState<ViewMode>("3d"),
    [floorId, setFloor] = useState(""),
    [roomId, setRoom] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const current = useRef(library);
  const saveQueue = useRef(Promise.resolve());
  const dirty = useRef(false);
  const saveGeneration = useRef(0);
  const view = useRef(mode);
  useEffect(() => {
    let live = true;
    loadLibrary(libraryStorage)
      .then((r) => {
        if (live) {
          if (r.library) {
            current.current = r.library;
            setLibrary(r.library);
          }
          setNotice(r.notice);
          setProtected(r.protected);
          if (!r.library && !r.protected) {
            dirty.current = true;
            setSaving(true);
          }
          setReady(true);
        }
      })
      .catch((e) => {
        if (live) {
          setNotice(`Local storage unavailable: ${String(e)}`);
          setProtected(true);
          setReady(true);
        }
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!__DEV__) return;
    const diagnostics = globalThis as typeof globalThis & {
      __oisReadLibrary?: () => Library;
    };
    diagnostics.__oisReadLibrary = () =>
      JSON.parse(JSON.stringify(current.current));
    return () => {
      delete diagnostics.__oisReadLibrary;
    };
  }, []);
  const updateLibrary = useCallback((fn: (l: Library) => Library) => {
    const next = fn(current.current);
    current.current = next;
    dirty.current = true;
    setSaving(true);
    setSaveError(null);
    setLibrary(next);
  }, []);
  useEffect(() => {
    if (!ready || protectedSave || !dirty.current) return;
    const generation = saveGeneration.current;
    const timer = setTimeout(() => {
      if (generation !== saveGeneration.current) return;
      setSaving(true);
      const snapshot = current.current;
      saveQueue.current = saveQueue.current
        .then(() =>
          generation === saveGeneration.current
            ? saveLibrary(libraryStorage, snapshot)
            : undefined,
        )
        .then(() => {
          if (
            generation === saveGeneration.current &&
            current.current === snapshot
          ) {
            dirty.current = false;
            setSaving(false);
            setSaveError(null);
            setNotice((previous) =>
              previous?.startsWith("Save failed") ? null : previous,
            );
          }
        })
        .catch((e) => {
          setNotice(`Save failed. Your work is still open: ${String(e)}`);
          if (
            generation === saveGeneration.current &&
            current.current === snapshot
          ) {
            setSaving(false);
            setSaveError(String(e));
          }
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [library, ready, protectedSave]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" || !ready || protectedSave || !dirty.current)
        return;
      const snapshot = current.current;
      const generation = saveGeneration.current;
      saveQueue.current = saveQueue.current
        .then(() =>
          generation === saveGeneration.current
            ? saveLibrary(libraryStorage, snapshot)
            : undefined,
        )
        .then(() => {
          if (
            generation === saveGeneration.current &&
            current.current === snapshot
          ) {
            dirty.current = false;
            setSaving(false);
            setSaveError(null);
            setNotice((previous) =>
              previous?.startsWith("Save failed") ? null : previous,
            );
          }
        })
        .catch((e) => {
          setNotice(`Save failed: ${String(e)}`);
          if (
            generation === saveGeneration.current &&
            current.current === snapshot
          ) {
            setSaving(false);
            setSaveError(String(e));
          }
        });
    });
    return () => sub.remove();
  }, [ready, protectedSave]);
  const history =
    library.projects.find((h) => h.present.id === library.activeId) ??
    library.projects[0];
  const activeFloor =
    history.present.floors.find((f) => f.id === floorId) ??
    history.present.floors[0];
  const activeRoom =
    activeFloor.rooms.find((r) => r.id === roomId) ?? activeFloor.rooms[0];
  const setMode = useCallback((m: ViewMode) => {
    view.current = m;
    setView(m);
    setSelected(null);
  }, []);
  const apply = (
    fn: (h: History) => { history: History; error: string | null },
  ) => {
    if (protectedSave) {
      setNotice(
        "Saved data is protected. Export and recover it in Settings before editing.",
      );
      return false;
    }
    const l = current.current,
      h = l.projects.find((h) => h.present.id === l.activeId) ?? l.projects[0],
      r = fn(h);
    if (r.error) {
      setNotice(r.error);
      return false;
    }
    setNotice((previous) =>
      previous?.startsWith("Save failed") ? previous : null,
    );
    if (r.history !== h)
      updateLibrary((l) => ({
        ...l,
        projects: l.projects.map((x) =>
          x.present.id === h.present.id ? r.history : x,
        ),
      }));
    return true;
  };
  const selectRoom = (f: string, r: string) => {
    setFloor(f);
    setRoom(r);
    setSelected(null);
  };
  return (
    <Context.Provider
      value={{
        library,
        ready,
        notice,
        protectedSave,
        saving,
        saveError,
        mode,
        setMode,
        history,
        floorId: activeFloor.id,
        roomId: activeRoom?.id ?? "",
        selectRoom,
        selected,
        select: (v) => {
          if (view.current !== "walk") setSelected(v);
        },
        dispatch: (c) =>
          apply((h) => execute(h, c, view.current, placementAssets)),
        undo: () => apply((h) => travelHistory(h, "undo", view.current)),
        redo: () => apply((h) => travelHistory(h, "redo", view.current)),
        updateLibrary,
        exportStored: async () =>
          protectedSave
            ? ((await libraryStorage.getItem(PRIMARY)) ??
              encode(current.current))
            : encode(current.current),
        restoreLibrary: async (l) => {
          if (view.current === "walk")
            throw Error("Exit Walk before importing a backup.");
          const verified = decode(encode(l));
          saveGeneration.current++;
          const recovery = saveQueue.current.then(() =>
            recoverLibrary(libraryStorage, verified),
          );
          saveQueue.current = recovery.catch(() => {});
          try {
            await recovery;
          } catch (e) {
            setProtected(true);
            setSaving(false);
            setSaveError(String(e));
            throw e;
          }
          setProtected(false);
          setNotice(null);
          updateLibrary(() => verified);
          dirty.current = false;
          setSaving(false);
          setSaveError(null);
          setFloor("");
          setRoom("");
          setSelected(null);
        },
        openProject: (id) => {
          updateLibrary((l) => ({ ...l, activeId: id }));
          setFloor("");
          setRoom("");
          setSelected(null);
          setMode("3d");
        },
        addProject: async (h) => {
          if (protectedSave)
            throw Error(
              "Saved data is protected. Recover it in Settings before creating a project.",
            );
          if (view.current === "walk")
            throw Error("Exit Walk before creating a project.");
          if (!validProject(h.present))
            throw Error("The new project contains invalid geometry.");
          const next = {
            ...current.current,
            projects: [h, ...current.current.projects],
            activeId: h.present.id,
          };
          saveGeneration.current++;
          const save = saveQueue.current.then(() =>
            saveLibrary(libraryStorage, next),
          );
          saveQueue.current = save.catch(() => {});
          try {
            await save;
          } catch (e) {
            setSaving(false);
            setSaveError(String(e));
            throw e;
          }
          updateLibrary(() => next);
          dirty.current = false;
          setSaving(false);
          setSaveError(null);
          setFloor(h.present.floors[0].id);
          setRoom(h.present.floors[0].rooms[0]?.id ?? "");
          setMode("2d");
        },
        clearNotice: () => setNotice(null),
      }}
    >
      {ready ? (
        children
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f4f3ef",
            gap: 14,
          }}
        >
          <ActivityIndicator color="#a17a46" />
          <Text>Opening projects…</Text>
        </View>
      )}
    </Context.Provider>
  );
}
export function useStudio() {
  const s = useContext(Context);
  if (!s) throw Error("StudioProvider missing");
  return s;
}
export const uniqueId = () => newId("id");
