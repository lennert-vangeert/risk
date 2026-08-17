import { ActionIcon, Badge, Button, Group, Paper, Progress, Stack, Text } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useTranslate } from "@global/localization";
import {
  deckAccounting,
  enumerateSets,
  nextSetValue,
  ownedTerritories,
  setTerritoryMatch,
  type Card,
  type GameEvent,
  type GameState,
  type TerritoryId,
} from "@engine/risk";
import { colorNameForPlayer } from "../ownerColors";

const cardLabel = (c: Card): string =>
  c.kind === "wild" ? "★" : c.territory.replace(/_/g, " ");

export default function CardTracker({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (e: GameEvent) => void;
}) {
  const { t } = useTranslate("game");
  const acct = deckAccounting(state);
  const goof = state.players.find((p) => p.isGoofball);
  const opponents = state.players.filter((p) => !p.isGoofball);

  const isGoofballReinforce =
    !!goof &&
    state.turn.currentPlayerId === goof.id &&
    state.turn.phase === "reinforce";
  const sets = goof ? enumerateSets(state.cards.goofballHand) : [];
  const mandatory = !!goof && goof.cardCount >= 5;

  const tradeBest = () => {
    if (!goof || sets.length === 0) return;
    const owned = new Set<TerritoryId>(ownedTerritories(state, goof.id));
    const set = sets[0];
    const match = setTerritoryMatch(set, owned);
    dispatch({
      type: "TradeInSet",
      playerId: goof.id,
      cards: set as [Card, Card, Card],
      matchTerritory: match ?? undefined,
    });
  };

  const total = acct.total;
  const seg = (v: number, color: string, label: string) => ({
    value: (v / total) * 100,
    color,
    label,
  });

  return (
    <Paper withBorder p="sm" radius="lg">
      <Text fw={700} mb="xs">
        {t("cards.title")}
      </Text>

      <Progress.Root size="xl" mb={4}>
        <Progress.Section {...seg(acct.inGoofballHand, "teal", "")} />
        <Progress.Section {...seg(acct.inOpponentHands, "orange", "")} />
        <Progress.Section {...seg(acct.knownDiscard + acct.unknownDiscard, "gray", "")} />
      </Progress.Root>
      <Group gap="xs" mb="sm">
        <Badge size="xs" color="teal" variant="light">
          {t("cards.hand")}: {acct.inGoofballHand}
        </Badge>
        <Badge size="xs" color="orange" variant="light">
          {t("cards.opponents")}: {acct.inOpponentHands}
        </Badge>
        <Badge size="xs" color="gray" variant="light">
          {t("cards.deck")}: {acct.drawDeckRemaining}
        </Badge>
      </Group>

      {goof && (
        <Stack gap={4} mb="sm">
          <Group gap={4}>
            {state.cards.goofballHand.length === 0 ? (
              <Text size="xs" c="dimmed">
                {t("cards.emptyHand")}
              </Text>
            ) : (
              state.cards.goofballHand.map((c, i) => (
                <Badge
                  key={i}
                  variant={sets.length > 0 ? "gradient" : "light"}
                  size="sm"
                >
                  {cardLabel(c)}
                </Badge>
              ))
            )}
          </Group>
          <Group justify="space-between">
            <Badge variant="light" color="grape">
              {t("cards.nextSet", { value: nextSetValue(state) })}
            </Badge>
            <Button
              size="compact-xs"
              variant={mandatory ? "filled" : "light"}
              color={mandatory ? "red" : undefined}
              disabled={sets.length === 0 || !isGoofballReinforce}
              onClick={tradeBest}
            >
              {mandatory ? t("cards.mustTrade") : t("cards.tradeIn")}
            </Button>
          </Group>
        </Stack>
      )}

      <Stack gap={4}>
        {opponents.map((opp) => (
          <Group key={opp.id} justify="space-between">
            <Badge color={colorNameForPlayer(state, opp.id)} variant="light">
              {opp.name}
            </Badge>
            <Group gap={4}>
              <ActionIcon
                size="sm"
                variant="subtle"
                aria-label="-"
                disabled={opp.cardCount <= 0}
                onClick={() =>
                  dispatch({
                    type: "SetOpponentCardCount",
                    playerId: opp.id,
                    count: Math.max(0, opp.cardCount - 1),
                  })
                }
              >
                <IconMinus size={14} />
              </ActionIcon>
              <Text size="sm" w={16} ta="center">
                {opp.cardCount}
              </Text>
              <ActionIcon
                size="sm"
                variant="subtle"
                aria-label="+"
                onClick={() => dispatch({ type: "DrawCard", playerId: opp.id })}
              >
                <IconPlus size={14} />
              </ActionIcon>
            </Group>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}
