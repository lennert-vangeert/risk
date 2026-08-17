import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslate } from "@global/localization";
import {
  progress,
  STANDARD_MISSIONS,
  eliminateColorMission,
  type GameEvent,
  type GameState,
  type Mission,
  type PlayerColor,
} from "@engine/risk";
import { colorNameForPlayer } from "../ownerColors";

export default function MissionsPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (e: GameEvent) => void;
}) {
  const { t } = useTranslate("game");
  const goof = state.players.find((p) => p.isGoofball);
  const opponents = state.players.filter((p) => !p.isGoofball && !p.eliminated);

  const [oppId, setOppId] = useState<string | null>(opponents[0]?.id ?? null);
  const [missionId, setMissionId] = useState<string>(STANDARD_MISSIONS[0].id);

  if (state.config.winCondition !== "secret_mission") return null;

  const missionOptions = [
    ...STANDARD_MISSIONS.map((m) => ({
      value: m.id,
      label: t(`missionCatalog.${m.id}`),
    })),
    ...state.players
      .filter((p) => p.id !== oppId)
      .map((p) => ({
        value: `eliminate_${p.color}`,
        label: t("missionEliminate", { color: t(`color.${p.color}`) }),
      })),
  ];

  const resolve = (id: string): Mission => {
    const std = STANDARD_MISSIONS.find((m) => m.id === id);
    if (std) return std;
    return eliminateColorMission(id.replace("eliminate_", "") as PlayerColor);
  };

  const logSuspicion = () => {
    if (!oppId) return;
    dispatch({
      type: "LogSuspectedMission",
      playerId: oppId,
      suspected: { mission: resolve(missionId), confidence: "medium" },
    });
  };

  const goofProgress = goof && state.missions.goofball
    ? progress(state, goof.id, state.missions.goofball)
    : null;

  return (
    <Paper withBorder p="sm" radius="lg">
      <Text fw={700} mb="xs">
        {t("missions.title")}
      </Text>

      {goofProgress && state.missions.goofball && (
        <Stack gap={4} mb="sm">
          <Text size="sm">
            {t(`missionCatalog.${state.missions.goofball.id}`)}
          </Text>
          <Progress value={goofProgress.ratio * 100} color="teal" />
          <Text size="xs" c="dimmed">
            {goofProgress.label}
          </Text>
        </Stack>
      )}

      <Text size="xs" fw={600} c="dimmed" mb={4}>
        {t("missions.suspected")}
      </Text>
      <Stack gap={2} mb="sm">
        {state.players.map((p) =>
          (state.missions.suspected[p.id] ?? []).map((sm, i) => (
            <Group key={`${p.id}-${i}`} gap="xs">
              <Badge size="xs" color={colorNameForPlayer(state, p.id)} variant="light">
                {p.name}
              </Badge>
              <Text size="xs">{t(`missionCatalog.${sm.mission.id}`)}</Text>
            </Group>
          ))
        )}
      </Stack>

      <Stack gap={4}>
        <Group grow gap="xs">
          <Select
            size="xs"
            data={opponents.map((p) => ({ value: p.id, label: p.name }))}
            value={oppId}
            onChange={setOppId}
          />
          <Select
            size="xs"
            data={missionOptions}
            value={missionId}
            onChange={(v) => v && setMissionId(v)}
          />
        </Group>
        <Button size="compact-xs" variant="light" onClick={logSuspicion}>
          {t("missions.logSuspected")}
        </Button>
      </Stack>
    </Paper>
  );
}
