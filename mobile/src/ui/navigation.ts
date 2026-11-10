import { router } from "expo-router";
export function backToProjects() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
