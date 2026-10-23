import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc, useSettings } from "@getpaseo/plugin/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { openReviewRpc, type PullRequest } from "../shared/reviews";
import { settingsDefinition } from "../shared/settings";
import { filterByLabels, labelsOf, useLabelFilter } from "./labelFilter";
import { PullRequestRow } from "./pull-request-row";
import { timeAgo } from "./time";
import { REVIEWS_QUERY_KEY, useReviews } from "./useReviews";
import { openExternal } from "./web";

export function QueueScreen({ theme, layout, navigation }: PluginScreenProps) {
  const reviews = useReviews();
  const openReview = useRpc(openReviewRpc);
  // One checkout at a time: a worktree takes a while and the rows stay inert meanwhile.
  const open = useMutation({
    mutationFn: (pullRequest: PullRequest) => openReview({ number: pullRequest.number }),
    onSuccess: ({ workspaceId }) => navigation?.openWorkspace({ workspaceId }),
  });
  const styles = useMemo(() => createStyles(theme.colors, layout.compact), [theme, layout.compact]);
  const data = reviews.data;
  const [selectedLabels, toggleLabel] = useLabelFilter();
  // "Hide drafts" is the stored setting: the server then leaves drafts out of the search, so the badge follows too.
  const settings = useSettings(settingsDefinition);
  const queryClient = useQueryClient();
  const hideDrafts = settings.status === "ready" && settings.values.hideDrafts;
  const toggleDrafts = async () => {
    if (settings.status !== "ready") return;
    const saved = await settings.save({ ...settings.values, hideDrafts: !settings.values.hideDrafts }, settings.revision);
    if (saved) void queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
  };
  const drafts = data?.pullRequests.filter((pullRequest) => pullRequest.isDraft).length ?? 0;
  const labels = labelsOf(data?.pullRequests ?? []);
  const shown = filterByLabels(data?.pullRequests ?? [], selectedLabels);
  const listed = data?.pullRequests.length ?? 0;
  const notListed = data ? data.total - listed : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Reviews to do{data ? ` · ${selectedLabels.size > 0 ? `${shown.length} of ${data.total}` : data.total}` : ""}</Text>
        {data && (
          <Pressable accessibilityRole="link" onPress={() => openExternal(`https://github.com/${data.repo}/pulls?q=${encodeURIComponent(SEARCH_ON_GITHUB)}`)}>
            <Text style={styles.subtle}>{data.repo}</Text>
          </Pressable>
        )}
        <View style={styles.spacer} />
        {data && <Text style={styles.subtle}>{reviews.isFetching ? "Refreshing…" : `Fetched ${timeAgo(data.fetchedAt)} ago`}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh" style={styles.button} onPress={() => reviews.refetch()} disabled={reviews.isFetching}>
          <Text style={styles.buttonText}>Refresh</Text>
        </Pressable>
      </View>
      {(reviews.error ?? open.error) && (
        <View style={styles.error}>
          <Text style={styles.errorText}>{(reviews.error ?? open.error)?.message}</Text>
        </View>
      )}
      {data && (
        <View style={styles.labels}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: hideDrafts }} disabled={settings.status !== "ready" || settings.saving} onPress={() => void toggleDrafts()}>
            <Text style={[styles.label, hideDrafts && styles.labelActive]}>{hideDrafts ? "Drafts hidden" : `Hide drafts${drafts > 0 ? ` ${drafts}` : ""}`}</Text>
          </Pressable>
          {labels.map((label) => {
            const active = selectedLabels.has(label.name);
            return (
              <Pressable key={label.name} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggleLabel(label.name)}>
                <Text style={[styles.label, { borderColor: `#${label.color}` }, active && styles.labelActive]}>
                  {label.name} {label.count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {!data && !reviews.error && <Text style={[styles.subtle, styles.message]}>Asking GitHub…</Text>}
      {data && listed === 0 && <Text style={[styles.subtle, styles.message]}>Nothing waits for your review. ✓</Text>}
      {data && listed > 0 && shown.length === 0 && <Text style={[styles.subtle, styles.message]}>No pull request carries the selected labels.</Text>}
      <FlatList
        data={shown}
        keyExtractor={keyOf}
        renderItem={({ item }) => (
          <PullRequestRow pullRequest={item} theme={theme} onOpen={open.isPending ? null : open.mutate} opening={open.isPending && open.variables?.number === item.number} />
        )}
        ListFooterComponent={notListed > 0 ? <Text style={[styles.subtle, styles.message]}>{notListed} more on GitHub.</Text> : null}
      />
    </View>
  );
}

const SEARCH_ON_GITHUB = "is:pr is:open review-requested:@me sort:updated-desc";

function keyOf(pullRequest: PullRequest): string {
  return String(pullRequest.number);
}

function createStyles(colors: PluginScreenProps["theme"]["colors"], compact: boolean) {
  return {
    screen: { flex: 1, backgroundColor: colors.surface0 },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      flexWrap: "wrap" as const,
      gap: 10,
      paddingHorizontal: compact ? 12 : 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    heading: { color: colors.foreground, fontSize: 16, fontWeight: "700" as const },
    labels: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6, paddingHorizontal: compact ? 12 : 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    label: { fontSize: 12, color: colors.foregroundMuted, borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 2 },
    labelActive: { color: colors.accentForeground, backgroundColor: colors.accent, borderColor: colors.accent },
    spacer: { flex: 1 },
    subtle: { color: colors.foregroundMuted, fontSize: 12 },
    message: { padding: 16 },
    button: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: colors.surface2 },
    buttonText: { color: colors.foreground, fontSize: 12 },
    error: { margin: 12, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.statusDanger },
    errorText: { color: colors.statusDanger, fontFamily: "monospace", fontSize: 12 },
  };
}
