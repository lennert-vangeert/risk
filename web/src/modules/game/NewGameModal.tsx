import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  TextInput,
  SegmentedControl,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAuth } from "@global/firebase/useAuth";
import { useTranslate } from "@global/localization";
import {
  PLAYER_COLORS,
  STANDARD_MISSIONS,
  eliminateColorMission,
  createInitialGame,
  type Mission,
  type NewPlayerInput,
  type PlayerColor,
  type WinCondition,
} from "@engine/risk";
import { createGame } from "@services/games";

type Draft = { name: string; color: PlayerColor };

const defaultPlayers = (count: number): Draft[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `Player ${i + 1}`,
    color: PLAYER_COLORS[i],
  }));

export default function NewGameModal({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { t, tL } = useTranslate("game");
  const navigate = useNavigate();

  const [name, setName] = useState("New game");
  const [count, setCount] = useState(4);
  const [players, setPlayers] = useState<Draft[]>(defaultPlayers(4));
  const [meIndex, setMeIndex] = useState(0);
  const [winCondition, setWinCondition] =
    useState<WinCondition>("world_domination");
  const [missionId, setMissionId] = useState<string>(STANDARD_MISSIONS[0].id);
  const [submitting, setSubmitting] = useState(false);

  const setCountSafe = (n: number) => {
    const c = Math.max(3, Math.min(6, n));
    setCount(c);
    setPlayers((prev) => {
      const next = defaultPlayers(c);
      for (let i = 0; i < Math.min(prev.length, c); i++) next[i] = prev[i];
      return next;
    });
    if (meIndex >= c) setMeIndex(0);
  };

  const missionOptions = [
    ...STANDARD_MISSIONS.map((m) => ({
      value: m.id,
      label: t(`missionCatalog.${m.id}`),
    })),
    ...players
      .filter((_, i) => i !== meIndex)
      .map((p) => ({
        value: `eliminate_${p.color}`,
        label: t("missionEliminate", { color: t(`color.${p.color}`) }),
      })),
  ];

  const resolveMission = (): Mission | null => {
    if (winCondition !== "secret_mission") return null;
    const std = STANDARD_MISSIONS.find((m) => m.id === missionId);
    if (std) return std;
    const color = missionId.replace("eliminate_", "") as PlayerColor;
    return eliminateColorMission(color);
  };

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const playerInputs: NewPlayerInput[] = players.map((p, i) => ({
        id: `p${i}`,
        name: p.name.trim() || `Player ${i + 1}`,
        color: p.color,
        turnOrder: i,
        isGoofball: i === meIndex,
      }));
      const initialState = createInitialGame({
        players: playerInputs,
        winCondition,
        goofballMission: resolveMission(),
      });
      const id = await createGame(user.uid, {
        name: name.trim() || "New game",
        playerCount: count,
        winCondition,
        initialState,
      });
      onDone();
      navigate(tL(`/app/games/${id}`));
    } catch {
      notifications.show({ color: "red", message: t("notifications.error") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack>
      <TextInput
        label={t("setup.name")}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      <NumberInput
        label={t("setup.playerCount")}
        min={3}
        max={6}
        value={count}
        onChange={(v) => setCountSafe(Number(v) || 3)}
      />

      <Stack gap="xs">
        <Text fw={600} size="sm">
          {t("setup.players")}
        </Text>
        {players.map((p, i) => (
          <Group key={i} gap="xs" wrap="nowrap">
            <TextInput
              style={{ flex: 1 }}
              value={p.name}
              onChange={(e) =>
                setPlayers((prev) =>
                  prev.map((x, j) =>
                    j === i ? { ...x, name: e.currentTarget.value } : x
                  )
                )
              }
            />
            <Select
              w={130}
              value={p.color}
              data={PLAYER_COLORS.map((c) => ({
                value: c,
                label: t(`color.${c}`),
              }))}
              onChange={(v) =>
                v &&
                setPlayers((prev) =>
                  prev.map((x, j) =>
                    j === i ? { ...x, color: v as PlayerColor } : x
                  )
                )
              }
            />
            <Switch
              label={t("setup.me")}
              checked={meIndex === i}
              onChange={() => setMeIndex(i)}
            />
          </Group>
        ))}
      </Stack>

      <div>
        <Text fw={600} size="sm" mb={4}>
          {t("setup.winCondition")}
        </Text>
        <SegmentedControl
          fullWidth
          value={winCondition}
          onChange={(v) => setWinCondition(v as WinCondition)}
          data={[
            { value: "world_domination", label: t("setup.worldDomination") },
            { value: "secret_mission", label: t("setup.secretMission") },
          ]}
        />
      </div>

      {winCondition === "secret_mission" && (
        <Select
          label={t("setup.assignMission")}
          data={missionOptions}
          value={missionId}
          onChange={(v) => v && setMissionId(v)}
        />
      )}

      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onDone}>
          {t("setup.cancel")}
        </Button>
        <Button variant="gradient" loading={submitting} onClick={submit}>
          {t("setup.create")}
        </Button>
      </Group>
    </Stack>
  );
}
