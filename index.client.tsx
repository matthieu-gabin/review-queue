import type { PluginClientContext } from "@getpaseo/plugin/client";
import { QueueScreen } from "./client/queue-screen";
import { SettingsScreen } from "./client/settings-screen";
import { SCREEN_ID, SidebarItem } from "./client/sidebar-item";

export default function contribute(client: PluginClientContext) {
  const removeScreen = client.addScreen({ id: SCREEN_ID, title: "Reviews to do", Component: QueueScreen });
  const removeSidebarItem = client.addSidebarHeaderItem({ id: "review-queue", title: "Reviews to do", Component: SidebarItem });
  const removeSettings = client.addSettingsScreen({ id: "review-queue", title: "Review queue", icon: "GitPullRequest", Component: SettingsScreen });
  const removeCommand = client.addCommandCenterItem({
    id: "review-queue",
    title: "Reviews to do",
    icon: "GitPullRequest",
    keywords: ["pull request", "review", "github"],
    context: "global",
    onSelect: (context) => context.openScreen({ screenId: SCREEN_ID }),
  });
  return () => {
    removeCommand();
    removeSettings();
    removeSidebarItem();
    removeScreen();
  };
}
