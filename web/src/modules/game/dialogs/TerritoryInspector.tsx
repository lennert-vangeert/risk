import { useState } from "react";
import { Button, Group, NumberInput, Select, Stack } from "@mantine/core";
import { useTranslate } from "@global/localization";
import type {
  GameEvent,
  GameState,
  PlayerId,
  TerritoryId,
} from "@engine/risk";

export default function TerritoryInspector({
  state,
  territory,
  dispatch,
  onClose,
}: {
  state: GameState;
  territory: TerritoryId;
  dispatch: (e: GameEvent) => void;
  onClose: () => void;
}) {
  const { t } = useTranslate("game");
  const ts = state.territories[territory];
  const [ownerId, setOwnerId] = useState<PlayerId | null>(ts.ownerId);
  const [armies, setArmies] = useState(ts.armies);

  const save = () => {
    dispatch({ type: "EditTerritory", territory, ownerId, armies });
    onClose();
  };

  return (
    <Stack>
      <Select
        label={t("correction.owner")}
        data={[
          { value: "__none__", label: t("correction.none") },
          ...state.players.map((p) => ({ value: p.id, label: p.name })),
        ]}
        value={ownerId ?? "__none__"}
        onChange={(v) => setOwnerId(v === "__none__" ? null : v)}
      />
      <NumberInput
        label={t("correction.armies")}
        min={0}
        value={armies}
        onChange={(v) => setArmies(Number(v) || 0)}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {t("setup.cancel")}
        </Button>
        <Button variant="gradient" onClick={save}>
          {t("correction.save")}
        </Button>
      </Group>
    </Stack>
  );
}
