import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const settingsSchema = z.object({
  /** "owner/name" of the GitHub repository whose pull requests are listed. */
  repo: z.string().default("rogerhrgeneva/roger-platform"),
  /** The checkout whose Paseo project receives the review worktrees: separate from the one you develop in. */
  projectPath: z.string().default("/home/matthieu-gabin/Documents/repository/paseos-roger/roger-platform-review"),
  /** Draft pull requests still request a review; hide them until they are ready. */
  hideDrafts: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;

export const settingsDefinition = defineSettings({
  id: "review-queue",
  scope: "host",
  version: 1,
  schema: settingsSchema,
});
