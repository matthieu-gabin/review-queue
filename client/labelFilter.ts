import { useSyncExternalStore } from "react";
import type { PullRequest } from "../shared/reviews";

// Module-level so the screen and the sidebar badge agree, and the choice survives closing the screen.
let selected: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

export function useLabelFilter(): [ReadonlySet<string>, (label: string) => void] {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => selected,
  );
  return [current, toggleLabel];
}

function toggleLabel(label: string) {
  const next = new Set(selected);
  if (next.has(label)) next.delete(label);
  else next.add(label);
  selected = next;
  listeners.forEach((listener) => listener());
}

/** No label selected means no filter; otherwise a pull request needs any one of the selected labels. */
export function filterByLabels(pullRequests: PullRequest[], labels: ReadonlySet<string>): PullRequest[] {
  if (labels.size === 0) return pullRequests;
  return pullRequests.filter((pullRequest) => pullRequest.labels.some((label) => labels.has(label.name)));
}

/** Every label in use, most frequent first, so the chips row stays short and stable. */
export function labelsOf(pullRequests: PullRequest[]): { name: string; color: string; count: number }[] {
  const counts = new Map<string, { name: string; color: string; count: number }>();
  for (const pullRequest of pullRequests) {
    for (const label of pullRequest.labels) {
      const entry = counts.get(label.name) ?? { name: label.name, color: label.color, count: 0 };
      entry.count += 1;
      counts.set(label.name, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
