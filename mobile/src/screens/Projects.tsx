import { router } from "expo-router";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import {
  Badge,
  Header,
  Icon,
  IconButton,
  Page,
  Txt,
  usePalette,
} from "../ui/kit";
import { useStudio } from "../state/Studio";
export default function Projects() {
  const s = useStudio(),
    c = usePalette();
  const dimensions = useWindowDimensions(),
    stacked = dimensions.width < 360 || dimensions.fontScale > 1.2;
  return (
    <Page>
      <Header
        title="ois designs"
        right={
          <IconButton
            name="settings"
            label="Settings"
            onPress={() => router.push("/settings")}
          />
        }
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 13 }}>
        <Txt
          style={{
            fontSize: 26,
            fontWeight: "600",
            lineHeight: 34,
            marginBottom: 15,
          }}
        >
          Projects
        </Txt>
        <Txt style={{ marginBottom: 2 }}>New project</Txt>
        {[
          {
            title: "Create room or floor plan",
            description: "Choose a room, shape or blank floor plan.",
            icon: "plan",
            route: "/create",
          },
          {
            title: "Upload floor plan",
            description: "Use a house-plan image or PDF.",
            icon: "upload",
            route: "/future?kind=upload",
          },
          {
            title: "Scan Room",
            description: "Capture and review room geometry.",
            icon: "scan",
            route: "/future?kind=scan",
          },
        ].map((v, i) => (
          <Pressable
            key={v.title}
            accessibilityRole="button"
            accessibilityLabel={v.title}
            onPress={() => router.push(v.route as "/create")}
            style={{
              minHeight: 88,
              padding: 12,
              borderRadius: 14,
              borderColor: c.line,
              borderWidth: 1,
              backgroundColor: c.surface,
              flexDirection: stacked ? "column" : "row",
              alignItems: stacked ? "stretch" : "center",
              gap: 10,
            }}
          >
            {stacked ? (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      padding: 8,
                      backgroundColor: c.warm,
                      borderRadius: 9,
                    }}
                  >
                    <Icon name={v.icon} size={18} />
                  </View>
                  {i > 0 ? <Badge /> : <Icon name="chevron" size={16} />}
                </View>
                <View style={{ gap: 4 }}>
                  <Txt style={{ fontSize: 14, fontWeight: "600" }}>
                    {v.title}
                  </Txt>
                  <Txt small muted>
                    {v.description}
                  </Txt>
                </View>
              </>
            ) : (
              <>
                <View
                  style={{
                    padding: 8,
                    backgroundColor: c.warm,
                    borderRadius: 9,
                  }}
                >
                  <Icon name={v.icon} size={18} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt style={{ fontSize: 13, fontWeight: "600" }}>
                    {v.title}
                  </Txt>
                  <Txt small muted style={{ fontSize: 11 }}>
                    {v.description}
                  </Txt>
                </View>
                {i > 0 ? <Badge /> : <Icon name="chevron" size={16} />}
              </>
            )}
          </Pressable>
        ))}
        <Txt style={{ marginTop: 24 }}>Recent projects</Txt>
        {s.library.projects.map((h) => (
          <Pressable
            key={h.present.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${h.present.name}`}
            onPress={() => {
              s.openProject(h.present.id);
              router.push("/editor");
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                backgroundColor: c.warm,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="home" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt style={{ fontWeight: "600" }}>{h.present.name}</Txt>
              <Txt small muted>
                {h.present.floors.length}{" "}
                {h.present.floors.length === 1 ? "floor" : "floors"} ·{" "}
                {s.protectedSave
                  ? "Saved data protected"
                  : s.saving
                    ? "Saving…"
                    : s.saveError
                      ? "Changes not saved"
                      : "Saved locally"}
              </Txt>
            </View>
            <Icon name="chevron" size={16} />
          </Pressable>
        ))}
        {!s.ready && (
          <Txt small muted>
            Opening local projects…
          </Txt>
        )}
        {s.notice && (
          <Txt small style={{ color: c.error }}>
            {s.notice}
          </Txt>
        )}
      </ScrollView>
    </Page>
  );
}
