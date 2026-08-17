import { useState } from "react";
import { Button, Group, MultiSelect, NumberInput, Stack, Text } from "@mantine/core";
import { useTranslate } from "@global/localization";
import {
  TERRITORY_IDS,
  type Card,
  type GameEvent,
  type GameState,
  type PlayerId,
  type TerritoryId,
} from "@engine/risk";

/** Prompt fired when a player loses their last territory. */
export default function EliminatePrompt({
  state,
  victimId,
  dispatch,
  onClose,
}: {
  state: GameState;
  victimId: PlayerId;
  dispatch: (e: GameEvent) => void;
  onClose: () => void;
}) {
  const { t } = useTranslate("game");
  const victim = state.players.find((p) => p.id === victimId)!;
  const byId = state.turn.currentPlayerId ?? victimId;
  const eliminator = state.players.find((p) => p.id === byId)!;
  const isGoofballEliminator = eliminator.isGoofball;

  const [count, setCount] = useState(victim.cardCount);
  const [picked, setPicked] = useState<string[]>([]);

  const buildCard = (value: string): Card =>
    value === "wild1" || value === "wild2"
      ? { kind: "wild", id: value }
      : {
          kind: "territory",
          territory: value as TerritoryId,
          symbol: state.config.cardSymbolByTerritory[value as TerritoryId],
        };

  const confirm = () => {
    if (isGoofballEliminator) {
      const receivedCards = picked.map(buildCard);
      dispatch({
        type: "EliminatePlayer",
        playerId: victimId,
        byPlayerId: byId,
        cardsTransferred: receivedCards.length,
        receivedCards,
      });
    } else {
      dispatch({
        type: "EliminatePlayer",
        playerId: victimId,
        byPlayerId: byId,
        cardsTransferred: count,
      });
    }
    onClose();
  };

  const cardOptions = [
    { value: "wild1", label: "★ Wild 1" },
    { value: "wild2", label: "★ Wild 2" },
    ...TERRITORY_IDS.map((tid) => ({ value: tid, label: tid.replace(/_/g, " ") })),
  ];

  return (
    <Stack>
      <Text>{t("opponent.eliminatedBody", { victim: victim.name, by: eliminator.name })}</Text>
      {isGoofballEliminator ? (
        <MultiSelect
          label={t("opponent.receivedCards")}
          data={cardOptions}
          value={picked}
          onChange={setPicked}
          searchable
        />
      ) : (
        <NumberInput
          label={t("opponent.cardsTransferred")}
          min={0}
          value={count}
          onChange={(v) => setCount(Number(v) || 0)}
        />
      )}
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {t("setup.cancel")}
        </Button>
        <Button variant="gradient" color="red" onClick={confirm}>
          {t("opponent.confirmEliminate")}
        </Button>
      </Group>
    </Stack>
  );
}
