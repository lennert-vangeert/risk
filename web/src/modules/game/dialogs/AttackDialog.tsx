import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslate } from "@global/localization";
import {
  battle,
  type GameEvent,
  type GameState,
  type PlayerId,
  type TerritoryId,
} from "@engine/risk";

type Props = {
  state: GameState;
  attacker: PlayerId;
  from: TerritoryId;
  to: TerritoryId;
  dispatch: (e: GameEvent) => void;
  /** Called on close; passes the territory to keep attacking from (a conquest
   *  that left >= 2 armies) so the sweep can continue, else null. */
  onClose: (chainFrom: TerritoryId | null) => void;
};

export default function AttackDialog({
  state,
  attacker,
  from,
  to,
  dispatch,
  onClose,
}: Props) {
  const { t } = useTranslate("game");
  const fromArmies = state.territories[from].armies;
  const toArmies = state.territories[to].armies;
  const maxAtk = Math.min(3, Math.max(1, fromArmies - 1));
  const maxDef = Math.min(2, Math.max(1, toArmies));

  const [attackerDice, setAttackerDice] = useState(maxAtk);
  const [defenderDice, setDefenderDice] = useState(maxDef);
  const [attackerLosses, setAttackerLosses] = useState(0);

  const pairs = Math.min(attackerDice, defenderDice);
  const defenderLosses = Math.max(0, pairs - attackerLosses);
  const conquered = toArmies - defenderLosses <= 0;
  const maxMove = fromArmies - attackerLosses - 1;
  // You choose how many to move in: at least the dice you rolled, up to all but
  // one. Default to the minimum; bump it up to push your stack forward and snowball.
  const [movedIn, setMovedIn] = useState(attackerDice);

  const odds = battle(fromArmies, toArmies);

  const submit = () => {
    const base = {
      type: "Attack" as const,
      playerId: attacker,
      from,
      to,
      attackerDice: attackerDice as 1 | 2 | 3,
      defenderDice: defenderDice as 1 | 2,
      attackerLosses,
      defenderLosses,
      conquered,
    };
    const finalMovedIn = Math.min(Math.max(movedIn, attackerDice), maxMove);
    dispatch(conquered ? { ...base, movedIn: finalMovedIn } : base);
    // Keep the sweep going from the conquered region if it can still attack.
    onClose(conquered && finalMovedIn >= 2 ? to : null);
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={600}>
          {from.replace(/_/g, " ")} → {to.replace(/_/g, " ")}
        </Text>
        <Badge color="teal" variant="light">
          {t("advisor.odds", { pct: Math.round(odds.pConquer * 100) })}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">
        {t("attack.armies", { atk: fromArmies, def: toArmies })}
      </Text>

      <Group grow>
        <NumberInput
          label={t("attack.diceAttacker")}
          min={1}
          max={maxAtk}
          value={attackerDice}
          onChange={(v) => setAttackerDice(Number(v) || 1)}
        />
        <NumberInput
          label={t("attack.diceDefender")}
          min={1}
          max={maxDef}
          value={defenderDice}
          onChange={(v) => setDefenderDice(Number(v) || 1)}
        />
      </Group>

      <Group grow>
        <NumberInput
          label={t("attack.attackerLosses")}
          min={0}
          max={pairs}
          value={attackerLosses}
          onChange={(v) => setAttackerLosses(Math.min(pairs, Number(v) || 0))}
        />
        <NumberInput
          label={t("attack.defenderLosses")}
          value={defenderLosses}
          disabled
        />
      </Group>

      {conquered && (
        <>
          <Badge color="green" variant="light">
            {t("attack.captured")}
          </Badge>
          <NumberInput
            label={t("attack.moveIn")}
            min={attackerDice}
            max={Math.max(attackerDice, maxMove)}
            value={movedIn}
            onChange={(v) => setMovedIn(Number(v) || attackerDice)}
          />
        </>
      )}

      <Group justify="flex-end">
        <Button variant="default" onClick={() => onClose(null)}>
          {t("setup.cancel")}
        </Button>
        <Button variant="gradient" onClick={submit}>
          {t("attack.confirm")}
        </Button>
      </Group>
    </Stack>
  );
}
