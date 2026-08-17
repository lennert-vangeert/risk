import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Button,
  Container,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslate } from "@global/localization";
import {
  areAdjacent,
  neighborsOf,
  TERRITORY_IDS,
  type GameState,
  type PlayerId,
  type TerritoryId,
} from "@engine/risk";
import { useGame } from "./useGame";
import RiskMap, { type MapMode } from "./board/RiskMap";
import PhaseBar from "./panels/PhaseBar";
import AdvisorPanel from "./panels/AdvisorPanel";
import CardTracker from "./panels/CardTracker";
import MissionsPanel from "./panels/MissionsPanel";
import HistoryPanel from "./panels/HistoryPanel";
import TurnControls from "./panels/TurnControls";
import AttackDialog from "./dialogs/AttackDialog";
import TerritoryInspector from "./dialogs/TerritoryInspector";
import EliminatePrompt from "./dialogs/EliminatePrompt";

const ownedCount = (state: GameState, playerId: PlayerId): number =>
  TERRITORY_IDS.reduce(
    (n, t) => (state.territories[t].ownerId === playerId ? n + 1 : n),
    0
  );

export default function GameScreen() {
  const { id = "" } = useParams();
  const { t } = useTranslate("game");
  const { game, state, loading, dispatch, undo, redo, canUndo, canRedo } =
    useGame(id);

  const [editMode, setEditMode] = useState(false);
  const [attackSource, setAttackSource] = useState<TerritoryId | null>(null);
  const [fortifySource, setFortifySource] = useState<TerritoryId | null>(null);
  const [attackTarget, setAttackTarget] = useState<{
    from: TerritoryId;
    to: TerritoryId;
  } | null>(null);
  const [fortifyTarget, setFortifyTarget] = useState<{
    from: TerritoryId;
    to: TerritoryId;
  } | null>(null);
  const [fortifyCount, setFortifyCount] = useState(1);
  const [editTarget, setEditTarget] = useState<TerritoryId | null>(null);
  const [victim, setVictim] = useState<PlayerId | null>(null);
  const [advisorHighlight, setAdvisorHighlight] = useState<TerritoryId[]>([]);

  // Detect a player who has lost their last territory (post-setup) → prompt.
  useEffect(() => {
    if (!state || victim) return;
    if (state.turn.phase === "setup_claim" || state.turn.phase === "setup_deploy")
      return;
    const dead = state.players.find(
      (p) => !p.eliminated && ownedCount(state, p.id) === 0
    );
    if (dead) setVictim(dead.id);
  }, [state, victim]);

  const cur = state?.turn.currentPlayerId ?? null;

  const legalHighlight = useMemo<TerritoryId[]>(() => {
    if (!state || !cur) return advisorHighlight;
    if (attackSource) {
      return neighborsOf(attackSource).filter((n) => {
        const o = state.territories[n].ownerId;
        return o !== null && o !== cur;
      });
    }
    if (fortifySource) {
      return neighborsOf(fortifySource).filter(
        (n) => state.territories[n].ownerId === cur
      );
    }
    return advisorHighlight;
  }, [state, cur, attackSource, fortifySource, advisorHighlight]);

  if (loading) {
    return (
      <Container size="xl">
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      </Container>
    );
  }

  if (!game || !state) {
    return (
      <Container size="xl">
        <Stack align="center" py="xl">
          <Text c="dimmed">{t("notFound")}</Text>
          <Button component={Link} to="../" variant="light">
            {t("backToList")}
          </Button>
        </Stack>
      </Container>
    );
  }

  const handleClick = (tid: TerritoryId) => {
    if (state.winnerId) return;
    if (editMode) {
      setEditTarget(tid);
      return;
    }
    if (!cur) return;
    const owner = state.territories[tid].ownerId;
    const armies = state.territories[tid].armies;

    switch (state.turn.phase) {
      case "setup_claim":
        if (owner === null)
          dispatch({ type: "ClaimTerritory", playerId: cur, territory: tid });
        break;
      case "setup_deploy":
        if (owner === cur)
          dispatch({
            type: "PlaceStartingArmies",
            playerId: cur,
            placements: { [tid]: 1 },
          });
        break;
      case "reinforce":
        if (owner === cur && state.turn.reinforcementsRemaining > 0)
          dispatch({
            type: "PlaceArmies",
            playerId: cur,
            placements: { [tid]: 1 },
          });
        break;
      case "attack":
        if (!attackSource) {
          if (owner === cur && armies >= 2) setAttackSource(tid);
        } else if (tid === attackSource) {
          setAttackSource(null);
        } else if (owner !== null && owner !== cur && areAdjacent(attackSource, tid)) {
          setAttackTarget({ from: attackSource, to: tid });
        } else if (owner === cur && armies >= 2) {
          setAttackSource(tid);
        }
        break;
      case "fortify":
        if (!fortifySource) {
          if (owner === cur && armies >= 2) setFortifySource(tid);
        } else if (tid === fortifySource) {
          setFortifySource(null);
        } else if (owner === cur) {
          setFortifyTarget({ from: fortifySource, to: tid });
          setFortifyCount(1);
        }
        break;
      case "game_over":
        break;
    }
  };

  const mapMode: MapMode = attackSource
    ? "attack-target"
    : fortifySource
      ? "fortify-target"
      : editMode
        ? "edit"
        : "view";

  return (
    <Container size="xl">
      <PhaseBar
        state={state}
        dispatch={dispatch}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700}>{game.name}</Text>
            <SegmentedControl
              size="xs"
              value={editMode ? "edit" : "play"}
              onChange={(v) => {
                setEditMode(v === "edit");
                setAttackSource(null);
                setFortifySource(null);
              }}
              data={[
                { value: "play", label: t("mode.play") },
                { value: "edit", label: t("mode.edit") },
              ]}
            />
          </Group>
          <RiskMap
            state={state}
            mode={mapMode}
            attackSource={attackSource ?? fortifySource}
            highlight={legalHighlight}
            onTerritoryClick={handleClick}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack>
            <TurnControls state={state} dispatch={dispatch} />
            <AdvisorPanel
              state={state}
              dispatch={dispatch}
              onAttack={(from, to) => setAttackTarget({ from, to })}
              onHighlight={setAdvisorHighlight}
            />
            <CardTracker state={state} dispatch={dispatch} />
            <MissionsPanel state={state} dispatch={dispatch} />
          </Stack>
        </Grid.Col>

        <Grid.Col span={12}>
          <HistoryPanel game={game} state={state} />
        </Grid.Col>
      </Grid>

      {/* Attack */}
      <Modal
        opened={!!attackTarget}
        onClose={() => {
          setAttackTarget(null);
          setAttackSource(null);
        }}
        title={t("attack.title")}
      >
        {attackTarget && cur && (
          <AttackDialog
            state={state}
            attacker={cur}
            from={attackTarget.from}
            to={attackTarget.to}
            dispatch={dispatch}
            onClose={(chainFrom) => {
              setAttackTarget(null);
              // On a conquest, keep attacking from the region just taken.
              setAttackSource(chainFrom);
            }}
          />
        )}
      </Modal>

      {/* Fortify count */}
      <Modal
        opened={!!fortifyTarget}
        onClose={() => {
          setFortifyTarget(null);
          setFortifySource(null);
        }}
        title={t("fortify.title")}
      >
        {fortifyTarget && cur && (
          <Stack>
            <Text size="sm">
              {fortifyTarget.from.replace(/_/g, " ")} →{" "}
              {fortifyTarget.to.replace(/_/g, " ")}
            </Text>
            <NumberInput
              label={t("fortify.count")}
              min={1}
              max={state.territories[fortifyTarget.from].armies - 1}
              value={fortifyCount}
              onChange={(v) => setFortifyCount(Number(v) || 1)}
            />
            <Group justify="flex-end">
              <Button
                variant="gradient"
                onClick={() => {
                  dispatch({
                    type: "Fortify",
                    playerId: cur,
                    from: fortifyTarget.from,
                    to: fortifyTarget.to,
                    count: fortifyCount,
                  });
                  setFortifyTarget(null);
                  setFortifySource(null);
                }}
              >
                {t("fortify.confirm")}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Territory correction */}
      <Modal
        opened={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={t("correction.title", {
          territory: editTarget ? editTarget.replace(/_/g, " ") : "",
        })}
      >
        {editTarget && (
          <TerritoryInspector
            state={state}
            territory={editTarget}
            dispatch={dispatch}
            onClose={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Elimination */}
      <Modal
        opened={!!victim}
        onClose={() => setVictim(null)}
        title={t("opponent.eliminatedTitle")}
      >
        {victim && (
          <EliminatePrompt
            state={state}
            victimId={victim}
            dispatch={dispatch}
            onClose={() => setVictim(null)}
          />
        )}
      </Modal>
    </Container>
  );
}
