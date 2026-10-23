import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const checksSchema = z.enum(["success", "failure", "pending", "none"]);
export type Checks = z.infer<typeof checksSchema>;

const pullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  author: z.string(),
  branch: z.string(),
  isDraft: z.boolean(),
  hasConflicts: z.boolean(),
  /** GitHub's own verdict: null when nobody reviewed yet, else the latest decision. */
  reviewDecision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED"]).nullable(),
  checks: checksSchema,
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
  labels: z.array(z.object({ name: z.string(), color: z.string() })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PullRequest = z.infer<typeof pullRequestSchema>;

export const reviewsRpc = defineRpc({
  name: "reviews.list",
  input: z.object({}),
  output: z.object({
    repo: z.string(),
    viewer: z.string(),
    /** Every match, even past the page the list holds. */
    total: z.number(),
    pullRequests: z.array(pullRequestSchema),
    fetchedAt: z.string(),
  }),
});

/** Checks the pull request out into a Paseo worktree and starts the review agent there (see the pr-review plugin). */
export const openReviewRpc = defineRpc({
  name: "reviews.open",
  input: z.object({ number: z.number() }),
  output: z.object({ workspaceId: z.string(), created: z.boolean() }),
});
