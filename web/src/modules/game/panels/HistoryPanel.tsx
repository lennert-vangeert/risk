import { Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { useTranslate } from "@global/localization";
import type { GameState } from "@engine/risk";
import type { GameWithId } from "@services/games";
import { describeEvent } from "../eventLabels";

export default function HistoryPanel({
  game,
  state,
}: {
  game: GameWithId;
  state: GameState;
}) {
  const { t } = useTranslate("game");
  const recent = game.events.slice(-30).reverse();

  return (
    <Paper withBorder p="sm" radius="lg">
      <Text fw={700} mb="xs">
        {t("history.title")}
      </Text>
      {recent.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t("history.empty")}
        </Text>
      ) : (
        <ScrollArea h={160}>
          <Stack gap={2}>
            {recent.map((e, i) => {
              const { key, params } = describeEvent(state, e);
              return (
                <Text key={game.events.length - i} size="xs" c="dimmed">
                  {t(key, params)}
                </Text>
              );
            })}
          </Stack>
        </ScrollArea>
      )}
    </Paper>
  );
}
