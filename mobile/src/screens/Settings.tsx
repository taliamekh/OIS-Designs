import { backToProjects } from "../ui/navigation";
import { useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { exportBackup } from "../storage/export";
import { chooseBackup } from "../storage/import";
import { decode, encode } from "../domain/persistence";
import { useStudio } from "../state/Studio";
import {
  Button,
  Chips,
  Field,
  Header,
  Page,
  Section,
  Txt,
  styles,
  usePalette,
} from "../ui/kit";
export default function Settings() {
  const s = useStudio(),
    c = usePalette(),
    [text, setText] = useState(""),
    [file, setFile] = useState<{ name: string; raw: string } | null>(null),
    [importing, setImporting] = useState(false),
    [message, setMessage] = useState("");
  const settings = s.library.settings;
  const backupRaw = file?.raw ?? text;
  const change = (key: string, value: string | boolean) =>
    s.updateLibrary((l) => ({
      ...l,
      settings: { ...l.settings, [key]: value },
    }));
  return (
    <Page>
      <Header title="Settings" back={backToProjects} />
      <ScrollView
        contentContainerStyle={styles.pad}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="Measurements">
          <Chips
            values={["m", "ft"]}
            value={settings.unit}
            onChange={(v) => change("unit", v)}
          />
          <Txt small muted>
            {settings.unit === "m"
              ? "Metres"
              : "Decimal feet for input; feet and inches for measurements."}{" "}
            Stored geometry stays in metres.
          </Txt>
        </Section>
        <Section title="Furniture movement">
          <Chips
            values={["Grid snap", "Free move"]}
            value={settings.grid ? "Grid snap" : "Free move"}
            onChange={(v) => change("grid", v === "Grid snap")}
          />
          <Txt small muted>
            10 cm grid. Changing this setting does not move existing items.
          </Txt>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Txt style={{ flex: 1 }}>Quick move unlocked furniture</Txt>
            <Switch
              accessibilityLabel="Quick move unlocked furniture"
              value={settings.quickMove}
              onValueChange={(v) => change("quickMove", v)}
              trackColor={{ true: c.focus }}
            />
          </View>
        </Section>
        <Section title="Appearance">
          <Chips
            values={["system", "light", "dark"]}
            value={settings.appearance}
            onChange={(v) => change("appearance", v)}
          />
        </Section>
        <Section title="Local saving and recovery">
          {s.saveError && !s.protectedSave ? (
            <Button
              label="Retry local save"
              onPress={() => s.updateLibrary((l) => ({ ...l }))}
            />
          ) : null}
          <Txt small muted>
            Projects, lock states and undo history save on this device. Export a
            backup before clearing app storage.
          </Txt>
          <Button
            label="Export project library"
            icon="upload"
            onPress={async () => {
              try {
                await exportBackup(await s.exportStored());
              } catch (e) {
                setMessage(String(e));
              }
            }}
          />
          <Button
            label="Show backup text"
            onPress={async () => {
              try {
                const raw = await s.exportStored();
                setFile(null);
                setText(raw);
              } catch (e) {
                setMessage(String(e));
              }
            }}
          />
          {s.protectedSave && (
            <Button
              label="Show currently open library"
              onPress={() => {
                setFile(null);
                setText(encode(s.library));
                setMessage(
                  "This is the library currently open in the app. Original protected saved bytes remain separate.",
                );
              }}
            />
          )}
          <Button
            label="Choose backup file"
            disabled={importing || s.mode === "walk"}
            onPress={async () => {
              try {
                const chosen = await chooseBackup();
                if (!chosen) return;
                setFile(null);
                setText("");
                const verified = decode(chosen.raw);
                setFile(chosen);
                setText("");
                setMessage(
                  `${chosen.name}: ${verified.projects.length} projects. Import replaces the local library.`,
                );
              } catch (e) {
                setMessage(String(e));
              }
            }}
          />
          {file ? <Txt small>{file.name}</Txt> : null}
          <Field
            label="Paste an OIS backup to inspect"
            value={text}
            onChange={(v) => {
              setFile(null);
              setText(v);
            }}
            multiline
          />
          <Button
            label="Validate backup"
            onPress={() => {
              try {
                const l = decode(backupRaw);
                setMessage(
                  `Valid backup: ${l.projects.length} projects. Import replaces this local library.`,
                );
              } catch (e) {
                setMessage(String(e));
              }
            }}
          />
          <Button
            label={importing ? "Importing backup…" : "Import validated backup"}
            disabled={!backupRaw || s.mode === "walk" || importing}
            onPress={async () => {
              try {
                setImporting(true);
                const l = decode(backupRaw);
                await s.restoreLibrary(l);
                setMessage("Backup imported.");
                setText("");
                setFile(null);
              } catch (e) {
                setMessage(String(e));
              } finally {
                setImporting(false);
              }
            }}
          />
          {s.protectedSave && (
            <Txt style={{ color: c.error }}>
              Saved data is protected. Try exporting its original bytes, or
              export the currently open library. Import a validated backup to
              restore editing.
            </Txt>
          )}
          {message ? <Txt small>{message}</Txt> : null}
          {s.notice && (
            <Txt small style={{ color: c.error }}>
              {s.notice}
            </Txt>
          )}
        </Section>
        <Section title="Account and sync">
          <Txt small muted>
            Local editing works without an account. Cloud sync is a later phase.
          </Txt>
        </Section>
      </ScrollView>
    </Page>
  );
}
