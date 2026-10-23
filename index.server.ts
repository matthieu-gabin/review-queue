import type { PluginServerContext } from "@getpaseo/plugin/server";
import { listReviewRequests } from "./server/github";
import { openReview } from "./server/openReview";
import { openReviewRpc, reviewsRpc } from "./shared/reviews";
import { settingsDefinition, settingsSchema } from "./shared/settings";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(settingsDefinition);
  server.handle(reviewsRpc, async () => {
    const state = await settings.read();
    // Invalid stored settings (an older shape, a hand edit) fall back to the defaults rather than blocking the list.
    const values = state.status === "ready" ? state.values : settingsSchema.parse({});
    return listReviewRequests(values);
  });
  server.handle(openReviewRpc, async ({ number }, { paseo }) => {
    const state = await settings.read();
    const { repo, projectPath } = state.status === "ready" ? state.values : settingsSchema.parse({});
    return openReview({ repo, number, projectPath, paseo });
  });
  return () => {};
}
