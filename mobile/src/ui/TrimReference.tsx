import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Trim, Unit } from "../domain/types";
import { toDisplay, toMetres } from "../domain/geometry";
import { referenceUri, storeReference } from "../storage/reference";
import { Button, Field, Txt } from "./kit";
export default function TrimReference({
  reference,
  onChange,
  unit,
}: {
  reference: Trim["reference"];
  onChange: (r: Trim["reference"]) => void;
  unit: Unit;
}) {
  const [uri, setUri] = useState<string | null>(null),
    [ruler, setRuler] = useState(() =>
      toDisplay(reference?.rulerMetres ?? 0.1, unit).toFixed(3),
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    if (reference)
      referenceUri(reference.id)
        .then((uri) => {
          if (live) setUri(uri);
        })
        .catch(() => {
          if (live) setUri(null);
        });
    return () => {
      live = false;
    };
  }, [reference]);
  const choose = async () => {
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
        selectionLimit: 1,
      });
      if (result.canceled) return;
      const image = result.assets[0],
        id = await storeReference(image.uri, image.width, image.height);
      onChange({ id, rulerMetres: toMetres(Number(ruler), unit) });
      setMessage(
        "Reference ready. Apply baseboards to save it with this trim.",
      );
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 10 }}>
      <Txt style={{ fontWeight: "600" }}>Optional trim reference</Txt>
      <Txt small muted>
        Use a straight-on close-up with a ruler. Enter the ruler length;
        matching remains manual.
      </Txt>
      <Field
        label={`Ruler length (${unit})`}
        value={ruler}
        onChange={(v) => {
          setRuler(v);
          if (reference)
            onChange({ ...reference, rulerMetres: toMetres(Number(v), unit) });
        }}
        keyboard="decimal-pad"
      />
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="contain"
          style={{ height: 130, width: "100%", borderRadius: 10 }}
        />
      ) : reference ? (
        <Txt small muted>
          Reference photo is unavailable on this device.
        </Txt>
      ) : null}
      <Button
        label={busy ? "Preparing reference…" : "Choose close-up photo"}
        disabled={busy || !Number.isFinite(Number(ruler)) || Number(ruler) <= 0}
        onPress={() => {
          void choose();
        }}
      />
      {reference ? (
        <Button
          label="Detach reference"
          onPress={() => {
            onChange(undefined);
            setUri(null);
          }}
        />
      ) : null}
      <Txt small muted>
        Reference photos stay on this device and are separate from the project
        backup text.
      </Txt>
      {message ? <Txt small>{message}</Txt> : null}
    </View>
  );
}
