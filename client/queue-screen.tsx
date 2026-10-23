import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { openReviewRpc, type PullRequest } from "../shared/reviews";
import { PullRequestRow } from "./pull-request-row";
import { timeAgo } from "./time";
import { useReviews } from "./useReviews";
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
  const listed = data?.pullRequests.length ?? 0;
  const notListed = data ? data.total - listed : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Reviews to do{data ? ` · ${data.total}` : ""}</Text>
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
      {!data && !reviews.error && <Text style={[styles.subtle, styles.message]}>Asking GitHub…</Text>}
      {data && listed === 0 && <Text style={[styles.subtle, styles.message]}>Nothing waits for your review. ✓</Text>}
      <FlatList
        data={data?.pullRequests ?? []}
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
    spacer: { flex: 1 },
    subtle: { color: colors.foregroundMuted, fontSize: 12 },
    message: { padding: 16 },
    button: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: colors.surface2 },
    buttonText: { color: colors.foreground, fontSize: 12 },
    error: { margin: 12, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.statusDanger },
    errorText: { color: colors.statusDanger, fontFamily: "monospace", fontSize: 12 },
  };
}
