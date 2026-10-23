import type { PluginTheme } from "@getpaseo/plugin";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { PullRequest } from "../shared/reviews";
import { timeAgo } from "./time";
import { openExternal } from "./web";

interface Props {
  pullRequest: PullRequest;
  theme: PluginTheme;
  /** Checks the pull request out and starts its review; null while another one is being opened. */
  onOpen: ((pullRequest: PullRequest) => void) | null;
  opening: boolean;
}

export function PullRequestRow({ pullRequest, theme, onOpen, opening }: Props) {
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const tags = pullRequestTags(pullRequest, theme.colors);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Review pull request ${pullRequest.number}`}
      disabled={onOpen === null}
      onPress={() => onOpen?.(pullRequest)}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
        styles.row,
        (hovered || pressed) && styles.rowHovered,
      ]}
    >
      <View style={styles.titleLine}>
        <Text style={styles.number}>#{pullRequest.number}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {pullRequest.title}
        </Text>
        <Text style={[styles.checks, { color: checksColor(pullRequest.checks, theme.colors) }]}>{CHECKS_GLYPH[pullRequest.checks]}</Text>
        {opening ? (
          <Text style={[styles.meta, { color: theme.colors.statusWarning }]}>Checking out…</Text>
        ) : (
          <Pressable accessibilityRole="link" accessibilityLabel={`Open pull request ${pullRequest.number} on GitHub`} onPress={() => openExternal(pullRequest.url)}>
            <Text style={styles.github}>GitHub ↗</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.metaLine}>
        <Text style={styles.meta}>{pullRequest.author}</Text>
        <Text style={styles.meta}>·</Text>
        <Text style={[styles.meta, styles.branch]} numberOfLines={1}>
          {pullRequest.branch}
          {pullRequest.stack ? ` → ${pullRequest.baseBranch}` : ""}
        </Text>
        <Text style={styles.meta}>·</Text>
        <Text style={[styles.meta, { color: theme.colors.statusSuccess }]}>+{pullRequest.additions}</Text>
        <Text style={[styles.meta, { color: theme.colors.statusDanger }]}>−{pullRequest.deletions}</Text>
        <Text style={styles.meta}>
          {pullRequest.changedFiles} file{pullRequest.changedFiles === 1 ? "" : "s"}
        </Text>
        <Text style={styles.meta}>·</Text>
        <Text style={styles.meta}>opened {timeAgo(pullRequest.createdAt)} ago, updated {timeAgo(pullRequest.updatedAt)} ago</Text>
      </View>
      {tags.length + pullRequest.labels.length > 0 && (
        <View style={styles.tagLine}>
          {tags.map((tag) => (
            <Text key={tag.text} style={[styles.tag, { color: tag.color, borderColor: tag.color }]}>
              {tag.text}
            </Text>
          ))}
          {pullRequest.labels.map((label) => (
            <Text key={label.name} style={[styles.label, { borderColor: `#${label.color}` }]}>
              {label.name}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const CHECKS_GLYPH = { success: "✓", failure: "✗", pending: "●", none: "" } as const;

function checksColor(checks: PullRequest["checks"], colors: PluginTheme["colors"]): string {
  if (checks === "success") return colors.statusSuccess;
  if (checks === "failure") return colors.statusDanger;
  return colors.statusWarning;
}

function pullRequestTags(pullRequest: PullRequest, colors: PluginTheme["colors"]): { text: string; color: string }[] {
  const tags: { text: string; color: string }[] = [];
  if (pullRequest.stack) tags.push({ text: `Stack ${pullRequest.stack.position}/${pullRequest.stack.size}`, color: colors.accent });
  if (pullRequest.isDraft) tags.push({ text: "Draft", color: colors.foregroundMuted });
  if (pullRequest.hasConflicts) tags.push({ text: "Conflicts", color: colors.statusDanger });
  if (pullRequest.reviewDecision === "CHANGES_REQUESTED") tags.push({ text: "Changes requested", color: colors.statusWarning });
  if (pullRequest.reviewDecision === "APPROVED") tags.push({ text: "Approved", color: colors.statusSuccess });
  return tags;
}

function createStyles(colors: PluginTheme["colors"]) {
  return {
    row: { paddingVertical: 10, paddingHorizontal: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowHovered: { backgroundColor: colors.surface1 },
    titleLine: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8 },
    number: { color: colors.foregroundMuted, fontVariant: ["tabular-nums" as const], paddingTop: 1 },
    title: { color: colors.foreground, fontWeight: "600" as const, flex: 1 },
    checks: { width: 16, textAlign: "center" as const, fontWeight: "700" as const },
    github: { color: colors.accent, fontSize: 12 },
    metaLine: { flexDirection: "row" as const, flexWrap: "wrap" as const, alignItems: "center" as const, gap: 6 },
    meta: { color: colors.foregroundMuted, fontSize: 12 },
    branch: { fontFamily: "monospace", maxWidth: 320 },
    tagLine: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6, marginTop: 2 },
    tag: { fontSize: 11, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, fontWeight: "600" as const },
    label: { fontSize: 11, color: colors.foregroundMuted, borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  };
}
