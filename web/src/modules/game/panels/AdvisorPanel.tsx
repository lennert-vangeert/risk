import { Alert, Badge, Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconBulb, IconAlertTriangle } from "@tabler/icons-react";
import { useTranslate } from "@global/localization";
import { advise, type GameEvent, type GameState, type TerritoryId } from "@engine/risk";

type Props = {
  state: GameState;
  dispatch: (e: GameEvent) => void;
  onAttack: (from: TerritoryId, to: TerritoryId) => void;
  onHighlight: (ts: TerritoryId[]) => void;
};

export default function AdvisorPanel({ state, dispatch, onAttack, onHighlight }: Props) {
  const { t } = useTranslate("game");
  const advice = advise(state);
  const goof = state.players.find((p) => p.isGoofball);
  const isGoofballTurn = !!goof && state.turn.currentPlayerId === goof.id;

  const apply = (r: (typeof advice.recommendations)[number]) => {
    switch (r.kind) {
      case "place":
        dispatch({
          type: "PlaceArmies",
          playerId: goof!.id,
          placements: { [r.territory]: r.armies },
        });
        break;
      case "attack":
        onAttack(r.from, r.to);
        break;
      case "fortify":
        dispatch({
          type: "Fortify",
          playerId: goof!.id,
          from: r.from,
          to: r.to,
          count: r.count,
        });
        break;
      case "trade_in":
        dispatch({
          type: "TradeInSet",
          playerId: goof!.id,
          cards: r.cards,
          matchTerritory: r.matchTerritory,
        });
        break;
      case "defend":
      case "stop":
        break;
    }
  };

  const hoverTargets = (r: (typeof advice.recommendations)[number]): TerritoryId[] => {
    if (r.kind === "attack") return [r.from, r.to];
    if (r.kind === "place") return [r.territory];
    if (r.kind === "fortify") return [r.from, r.to];
    if (r.kind === "defend") return [r.territory];
    return [];
  };

  return (
    <Paper withBorder p="sm" radius="lg">
      <Group gap="xs" mb="xs">
        <IconBulb size={18} />
        <Text fw={700}>{t("advisor.title")}</Text>
      </Group>

      {advice.flags.length > 0 && (
        <Stack gap={4} mb="sm">
          {advice.flags.slice(0, 3).map((f, i) => (
            <Alert
              key={i}
              color="orange"
              variant="light"
              p="xs"
              icon={<IconAlertTriangle size={14} />}
            >
              <Text size="xs">{t(`reasons.${f.reasonKey}`, f.reasonParams)}</Text>
            </Alert>
          ))}
        </Stack>
      )}

      {advice.recommendations.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t("advisor.empty")}
        </Text>
      ) : (
        <Stack gap="sm">
          {advice.recommendations.slice(0, 6).map((r, i) => (
            <Group
              key={i}
              justify="space-between"
              wrap="nowrap"
              gap="xs"
              align="flex-start"
              onMouseEnter={() => onHighlight(hoverTargets(r))}
              onMouseLeave={() => onHighlight([])}
            >
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={i === 0 ? 700 : 500} lineClamp={2}>
                  {t(`reasons.${r.reasonKey}`, r.reasonParams)}
                </Text>
                {r.kind === "attack" && (
                  <Badge size="xs" variant="light" color="teal" mt={4}>
                    {t("advisor.odds", { pct: Math.round(r.pConquer * 100) })}
                  </Badge>
                )}
              </Box>
              {isGoofballTurn && r.kind !== "stop" && r.kind !== "defend" && (
                <Button
                  size="compact-xs"
                  variant="light"
                  style={{ flexShrink: 0 }}
                  onClick={() => apply(r)}
                >
                  {t("advisor.apply")}
                </Button>
              )}
            </Group>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
