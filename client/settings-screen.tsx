import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useSettings } from "@getpaseo/plugin/client";
import { SettingsAction, SettingsInput, SettingsSection, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { settingsDefinition } from "../shared/settings";
import { REVIEWS_QUERY_KEY } from "./useReviews";

export function SettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(settingsDefinition);
  const queryClient = useQueryClient();
  const [repo, setRepo] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);

  if (settings.status === "loading") return null;
  if (settings.status === "error" || settings.status === "invalid") {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: theme.colors.statusDanger }}>{settings.error}</Text>
        <SettingsAction label="Settings" actionLabel="Reset to defaults" onPress={() => settings.reset()} />
      </View>
    );
  }

  const { values, revision } = settings;
  const save = async (patch: Partial<typeof values>) => {
    const saved = await settings.save({ ...values, ...patch }, revision);
    if (saved) void queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
  };
  const repoChanged = repo !== null && repo.trim() !== values.repo;
  const pathChanged = projectPath !== null && projectPath.trim() !== values.projectPath;

  return (
    <SettingsSection title="Review queue" info="Pull requests of this repository that request your GitHub review, through the gh CLI.">
      <SettingsInput label="Repository" hint="owner/name" initialValue={values.repo} onChangeText={setRepo} error={settings.saveError} />
      <SettingsInput label="Review checkout" hint="Path of a separate clone; its Paseo project receives one worktree per reviewed pull request" initialValue={values.projectPath} onChangeText={setProjectPath} />
      <SettingsAction
        label="Apply changes"
        actionLabel={settings.saving ? "Saving…" : "Save"}
        disabled={!(repoChanged || pathChanged) || settings.saving}
        onPress={() => save({ repo: (repo ?? values.repo).trim(), projectPath: (projectPath ?? values.projectPath).trim() })}
      />
      <SettingsSwitch label="Hide drafts" hint="Drafts still request a review; hide them until they are marked ready." value={values.hideDrafts} onValueChange={(hideDrafts) => save({ hideDrafts })} disabled={settings.saving} />
    </SettingsSection>
  );
}
