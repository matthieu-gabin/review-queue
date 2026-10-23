import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import type { RpcOutput } from "@getpaseo/plugin";
import type { Checks, PullRequest, reviewsRpc } from "../shared/reviews";
import { resolveStacks, type OpenPullRequest, type StackPlace } from "./stacks";

const execFileAsync = promisify(execFile);
// The daemon's PATH may not carry the shell's additions, so look where package managers put gh first.
const GH = [`/opt/homebrew/bin/gh`, `/usr/local/bin/gh`, `/usr/bin/gh`].find(existsSync) ?? "gh";
const PAGE_SIZE = 50;

const QUERY = `query($q: String!, $first: Int!) {
  viewer { login }
  search(query: $q, type: ISSUE, first: $first) {
    issueCount
    nodes {
      ... on PullRequest {
        number title url isDraft mergeable createdAt updatedAt headRefName baseRefName
        additions deletions changedFiles reviewDecision
        author { login }
        labels(first: 20) { nodes { name color } }
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
      }
    }
  }
}`;

// Every open pull request, so a layer's stack can be read from the base branches even when the other layers do not ask for my review.
const OPEN_QUERY = `query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef { name }
    pullRequests(states: OPEN, first: 100, after: $after) {
      nodes { number headRefName baseRefName }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;
const MAX_OPEN_PAGES = 5;

interface SearchNode {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
  createdAt: string;
  updatedAt: string;
  headRefName: string;
  baseRefName: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  reviewDecision: PullRequest["reviewDecision"];
  author: { login: string } | null;
  labels: { nodes: { name: string; color: string }[] };
  commits: { nodes: { commit: { statusCheckRollup: { state: string } | null } }[] };
}

interface SearchResult {
  data: {
    viewer: { login: string };
    search: { issueCount: number; nodes: SearchNode[] };
  };
}

/** Open pull requests of `repo` that request the signed-in gh user's review, most recently updated first. */
export async function listReviewRequests({ repo, hideDrafts }: { repo: string; hideDrafts: boolean }): Promise<RpcOutput<typeof reviewsRpc>> {
  const terms = [`repo:${repo}`, "is:pr", "is:open", "review-requested:@me", "sort:updated-desc"];
  if (hideDrafts) terms.push("draft:false");
  const output = await gh(["api", "graphql", "-f", `query=${QUERY}`, "-f", `q=${terms.join(" ")}`, "-F", `first=${PAGE_SIZE}`]);
  const { data }: SearchResult = JSON.parse(output);
  const stacks = await openStacks(repo);
  return {
    repo,
    viewer: data.viewer.login,
    total: data.search.issueCount,
    pullRequests: data.search.nodes.map((node) => toPullRequest(node, stacks.get(node.number) ?? null)),
    fetchedAt: new Date().toISOString(),
  };
}

async function openStacks(repo: string): Promise<Map<number, StackPlace>> {
  const [owner, name] = repo.split("/");
  const open: OpenPullRequest[] = [];
  let defaultBranch = "main";
  let after: string | null = null;
  for (let page = 0; page < MAX_OPEN_PAGES; page += 1) {
    const args = ["api", "graphql", "-f", `query=${OPEN_QUERY}`, "-f", `owner=${owner}`, "-f", `name=${name}`];
    if (after) args.push("-f", `after=${after}`);
    const { data } = JSON.parse(await gh(args));
    defaultBranch = data.repository.defaultBranchRef?.name ?? defaultBranch;
    open.push(...data.repository.pullRequests.nodes);
    if (!data.repository.pullRequests.pageInfo.hasNextPage) break;
    after = data.repository.pullRequests.pageInfo.endCursor;
  }
  return resolveStacks(open, defaultBranch);
}

function toPullRequest(node: SearchNode, stack: StackPlace | null): PullRequest {
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    author: node.author?.login ?? "ghost",
    branch: node.headRefName,
    baseBranch: node.baseRefName,
    stack,
    isDraft: node.isDraft,
    hasConflicts: node.mergeable === "CONFLICTING",
    reviewDecision: node.reviewDecision,
    checks: toChecks(node.commits.nodes[0]?.commit.statusCheckRollup?.state),
    additions: node.additions,
    deletions: node.deletions,
    changedFiles: node.changedFiles,
    labels: node.labels.nodes,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

function toChecks(state: string | undefined): Checks {
  switch (state) {
    case "SUCCESS":
      return "success";
    case "FAILURE":
    case "ERROR":
      return "failure";
    case "PENDING":
    case "EXPECTED":
      return "pending";
    default:
      return "none";
  }
}

async function gh(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(GH, args, { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    const stderr = typeof error === "object" && error && "stderr" in error ? String(error.stderr).trim() : "";
    const notFound = typeof error === "object" && error && "code" in error && error.code === "ENOENT";
    if (notFound) throw new Error("gh is not installed: install the GitHub CLI and run `gh auth login`.");
    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  }
}
