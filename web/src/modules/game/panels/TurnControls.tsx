import { Button, Paper, Stack, Text } from "@mantine/core";
import { useTranslate } from "@global/localization";
import type { GameEvent, GameState } from "@engine/risk";

export default function TurnControls({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (e: GameEvent) => void;
}) {
  const { t } = useTranslate("game");
  const cur = state.players.find((p) => p.id === state.turn.currentPlayerId);
  if (!cur || state.winnerId) return null;
  const mine = cur.isGoofball;
  const phase = state.turn.phase;

  const hint = (): string => {
    switch (phase) {
      case "setup_claim":
        return t("controls.claim", { name: cur.name });
      case "setup_deploy":
        return t("controls.deploy", {
          name: cur.name,
          count: state.setupArmiesRemaining[cur.id] ?? 0,
        });
      case "reinforce":
        return mine
          ? t("controls.reinforceMine", {
              count: state.turn.reinforcementsRemaining,
            })
          : t("controls.reinforceOpp", { name: cur.name });
      case "attack":
        return mine ? t("controls.attackMine") : t("controls.attackOpp", { name: cur.name });
      case "fortify":
        return mine ? t("controls.fortifyMine") : t("controls.fortifyOpp", { name: cur.name });
      case "game_over":
        return "";
    }
  };

  const canOpponentTrade =
    !mine && phase === "reinforce" && cur.cardCount >= 3;

  return (
    <Paper withBorder p="sm" radius="lg">
      <Stack gap="xs">
        <Text size="sm">{hint()}</Text>
        {canOpponentTrade && (
          <Button
            size="compact-xs"
            variant="light"
            onClick={() => dispatch({ type: "TradeInSet", playerId: cur.id })}
          >
            {t("controls.opponentTrade")}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
