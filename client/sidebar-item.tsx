import type { PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { Text, View } from "react-native";
import { useReviews } from "./useReviews";

export const SCREEN_ID = "queue";

export function SidebarItem({ currentScreen, openScreen, theme }: PluginSidebarItemProps) {
  const reviews = useReviews();
  const total = reviews.data?.total ?? 0;
  const badge = reviews.error ? "!" : total > 0 ? String(total) : null;
  return (
    <SidebarRow
      icon="GitPullRequest"
      active={currentScreen?.screenId === SCREEN_ID}
      onPress={() => openScreen({ screenId: SCREEN_ID })}
      trailing={
        badge && (
          <View style={{ minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, backgroundColor: reviews.error ? theme.colors.statusDanger : theme.colors.accent }}>
            <Text style={{ color: theme.colors.accentForeground, fontSize: 11, fontWeight: "700", textAlign: "center" }}>{badge}</Text>
          </View>
        )
      }
    />
  );
}
