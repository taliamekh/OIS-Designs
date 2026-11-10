import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StudioProvider } from "../state/Studio";
import { usePalette } from "../ui/kit";
function Navigation() {
  const c = usePalette();
  return (
    <>
      <StatusBar style={c.paper === "#161d26" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.paper },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <StudioProvider>
        <Navigation />
      </StudioProvider>
    </SafeAreaProvider>
  );
}
