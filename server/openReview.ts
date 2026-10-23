import { realpath } from "node:fs/promises";
import type { PaseoApi, PaseoWorkspace } from "@getpaseo/client";

// Mirrors the pr-review plugin's contract (shared/review.ts there): the label ties the agent to its pull
// request so that plugin opens its panel, and the prompt is its skill.
const REVIEW_AGENT_LABEL = "pr-review";
const REVIEW_AGENT_PROVIDER = "claude/claude-opus-5-5";
const REVIEW_PROMPT = "/pr-review";

interface Input {
  repo: string;
  number: number;
  /** Root of the checkout whose Paseo project holds the review worktrees. */
  projectPath: string;
  paseo: PaseoApi;
}

/** Reuses the workspace already on this pull request, else cuts a worktree checking it out; either way a review agent runs there. */
export async function openReview({ repo, number, projectPath, paseo }: Input): Promise<{ workspaceId: string; created: boolean }> {
  const label = `${repo}#${number}`;
  const project = await findProject(projectPath, paseo);
  const { entries } = await paseo.workspaces.list();
  const existing = entries.find((workspace) => workspace.projectId === project.projectId && !workspace.archivingAt && isOnPullRequest(workspace, number));
  if (existing) {
    const agents = await paseo.agents.list();
    const running = agents.entries.some(({ agent }) => agent.workspaceId === existing.id && agent.labels?.[REVIEW_AGENT_LABEL] === label && !agent.archivedAt);
    if (!running) await paseo.workspaces.ref(existing.id).agents.create(reviewAgent(number, label));
    return { workspaceId: existing.id, created: false };
  }
  // The daemon answers once the worktree exists, so the agent can be created on the handle, which runs it in that directory.
  const workspace = await paseo.workspaces.create({
    source: { kind: "worktree", projectId: project.projectId, cwd: project.projectRootPath, action: "checkout", checkoutSource: { kind: "change_request", number } },
    title: `Review #${number}`,
  });
  await workspace.agents.create(reviewAgent(number, label));
  return { workspaceId: workspace.id, created: true };
}

function reviewAgent(number: number, label: string) {
  return {
    config: { provider: REVIEW_AGENT_PROVIDER, modeId: "auto" },
    title: `Review #${number}`,
    labels: { [REVIEW_AGENT_LABEL]: label },
    prompt: `${REVIEW_PROMPT} ${number}`,
  };
}

function isOnPullRequest(workspace: PaseoWorkspace, number: number): boolean {
  return workspace.githubRuntime?.pullRequest?.number === number;
}

/** The Paseo project rooted at `projectPath`, registered on first use so the checkout only has to exist on disk. */
async function findProject(projectPath: string, paseo: PaseoApi) {
  let root: string;
  try {
    root = await realpath(projectPath);
  } catch {
    throw new Error(`${projectPath} does not exist: clone the repository there, or change the path in the Review queue settings.`);
  }
  const registered = await projectAt(root, paseo);
  if (registered) return registered;
  await paseo.workspaces.open({ cwd: root });
  const created = await projectAt(root, paseo);
  if (created) return created;
  throw new Error(`Paseo did not register ${root} as a project.`);
}

async function projectAt(root: string, paseo: PaseoApi) {
  const { projects } = await paseo.projects.list();
  for (const project of projects) {
    const candidate = await realpath(project.projectRootPath).catch(() => null);
    if (candidate === root) return project;
  }
  return null;
}
