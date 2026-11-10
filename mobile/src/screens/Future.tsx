import { router, useLocalSearchParams } from "expo-router";
import { backToProjects } from "../ui/navigation";
import { ScrollView, View } from "react-native";
import { Badge, Button, Header, Page, Txt, styles } from "../ui/kit";
export default function Future() {
  const { kind } = useLocalSearchParams();
  const scan = kind === "scan";
  return (
    <Page>
      <Header
        title={scan ? "Scan Room" : "Upload floor plan"}
        eyebrow="New project"
        back={backToProjects}
      />
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Txt>{scan ? "Room capture" : "Image or PDF"}</Txt>
          <Badge />
        </View>
        <Txt muted>
          {scan
            ? "A verified capture provider is required. Standard iPhone 13 does not have LiDAR."
            : "Plan recognition and scale review will be available when an import provider is connected."}
        </Txt>
        {[
          "Review walls and dimensions",
          "Check openings and ceiling heights",
          "Open in the same project editor",
        ].map((v, i) => (
          <Txt key={v}>
            {i + 1}. {v}
          </Txt>
        ))}
        <Button
          label="Create manually"
          primary
          onPress={() => router.replace("/create")}
        />
      </ScrollView>
    </Page>
  );
}
