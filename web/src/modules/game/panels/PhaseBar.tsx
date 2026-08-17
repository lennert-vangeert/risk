import { Badge, Button, Group, Paper, Text } from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { useTranslate } from "@global/localization";
import type { GameEvent, GameState } from "@engine/risk";
import { colorNameForPlayer } from "../ownerColors";

type Props = {
  state: GameState;
  dispatch: (e: GameEvent) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export default function PhaseBar({
  state,
  dispatch,
  undo,
  redo,
  canUndo,
  canRedo,
}: Props) {
  const { t } = useTranslate("game");
  const current = state.players.find((p) => p.id === state.turn.currentPlayerId);
  const phase = state.turn.phase;

  const canAdvance =
    phase === "attack" ||
    phase === "fortify" ||
    (phase === "reinforce" && state.turn.reinforcementsRemaining === 0);

  const advanceLabel =
    phase === "reinforce"
      ? t("phase.toAttack")
      : phase === "attack"
        ? t("phase.toFortify")
        : t("phase.endTurn");

  return (
    <Paper withBorder p="sm" radius="lg" mb="sm">
      <Group justify="space-between">
        <Group gap="sm">
          {state.winnerId ? (
            <Badge size="lg" color="green" variant="filled">
              {t("phase.winner", {
                name:
                  state.players.find((p) => p.id === state.winnerId)?.name ?? "",
              })}
            </Badge>
          ) : (
            <>
              <Badge
                size="lg"
                color={colorNameForPlayer(state, current?.id ?? null)}
                variant="filled"
              >
                {current
                  ? current.isGoofball
                    ? t("phase.yourTurn")
                    : t("phase.whoseTurn", { name: current.name })
                  : ""}
              </Badge>
              <Text fw={600}>{t(`phase.${phase}`)}</Text>
              {phase === "reinforce" && (
                <Text c="dimmed" size="sm">
                  {t("phase.armiesToPlace", {
                    count: state.turn.reinforcementsRemaining,
                  })}
                </Text>
              )}
              <Text c="dimmed" size="sm">
                {t("phase.turnNumber", { n: state.turn.turnNumber })}
              </Text>
            </>
          )}
        </Group>

        <Group gap="xs">
          <Button
            variant="light"
            size="xs"
            leftSection={<IconArrowBackUp size={14} />}
            disabled={!canUndo}
            onClick={undo}
          >
            {t("history.undo")}
          </Button>
          <Button
            variant="light"
            size="xs"
            leftSection={<IconArrowForwardUp size={14} />}
            disabled={!canRedo}
            onClick={redo}
          >
            {t("history.redo")}
          </Button>
          {!state.winnerId &&
            phase !== "setup_claim" &&
            phase !== "setup_deploy" && (
              <Button
                size="xs"
                variant="gradient"
                disabled={!canAdvance}
                onClick={() => dispatch({ type: "AdvancePhase" })}
              >
                {advanceLabel}
              </Button>
            )}
        </Group>
      </Group>
    </Paper>
  );
}
