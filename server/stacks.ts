export interface OpenPullRequest {
  number: number;
  headRefName: string;
  baseRefName: string;
}

export interface StackPlace {
  position: number;
  size: number;
}

/**
 * Where each open pull request sits in its stack, read from the base branches alone: a layer's base is the
 * layer under it, and the first layer's base is the default branch. Position counts from the bottom.
 */
export function resolveStacks(pullRequests: OpenPullRequest[], defaultBranch: string): Map<number, StackPlace> {
  const byHead = new Map(pullRequests.map((pullRequest) => [pullRequest.headRefName, pullRequest]));
  const childrenOf = new Map<string, OpenPullRequest[]>();
  for (const pullRequest of pullRequests) childrenOf.set(pullRequest.baseRefName, [...(childrenOf.get(pullRequest.baseRefName) ?? []), pullRequest]);

  const depth = (pullRequest: OpenPullRequest, seen: Set<number>): number => {
    const parent = byHead.get(pullRequest.baseRefName);
    if (!parent || seen.has(parent.number)) return 1;
    return 1 + depth(parent, new Set(seen).add(parent.number));
  };
  const height = (pullRequest: OpenPullRequest, seen: Set<number>): number => {
    const children = (childrenOf.get(pullRequest.headRefName) ?? []).filter((child) => !seen.has(child.number));
    return 1 + Math.max(0, ...children.map((child) => height(child, new Set(seen).add(child.number))));
  };

  const places = new Map<number, StackPlace>();
  for (const pullRequest of pullRequests) {
    const stacked = pullRequest.baseRefName !== defaultBranch || (childrenOf.get(pullRequest.headRefName) ?? []).length > 0;
    if (!stacked) continue;
    const position = depth(pullRequest, new Set([pullRequest.number]));
    places.set(pullRequest.number, { position, size: position + height(pullRequest, new Set([pullRequest.number])) - 1 });
  }
  return places;
}
