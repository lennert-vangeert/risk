import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useAuth } from "@global/firebase/useAuth";
import { useTranslate } from "@global/localization";
import { deleteGame, type GameWithId } from "@services/games";
import { useGames } from "./useGames";
import NewGameModal from "./NewGameModal";

export default function GamesListPage() {
  const { user } = useAuth();
  const { t, tL } = useTranslate("game");
  const { games, loading } = useGames(user?.uid);
  const [opened, { open, close }] = useDisclosure(false);

  const remove = async (g: GameWithId) => {
    try {
      await deleteGame(g.id);
      notifications.show({ color: "green", message: t("notifications.deleted") });
    } catch {
      notifications.show({ color: "red", message: t("notifications.error") });
    }
  };

  return (
    <Container size="lg">
      <Group justify="space-between" mb="xl">
        <Title order={2}>{t("title")}</Title>
        <Button leftSection={<IconPlus size={16} />} variant="gradient" onClick={open}>
          {t("newGame")}
        </Button>
      </Group>

      {loading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : games.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t("empty")}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {games.map((g) => (
            <Card key={g.id} shadow="sm" padding="md" component={Link} to={tL(`/app/games/${g.id}`)}>
              <Group justify="space-between">
                <Text fw={700} ff="heading">
                  {g.name}
                </Text>
                <Badge variant="light">{t(`status.${g.status}`)}</Badge>
              </Group>
              <Text size="sm" c="dimmed" mt="xs">
                {t("list.players", { count: g.playerCount })} · {t("list.turn", { n: g.turnNumber })}
              </Text>
              <Group justify="flex-end" mt="md">
                <ActionIcon
                  variant="light"
                  color="red"
                  aria-label={t("actions.delete")}
                  onClick={(e) => {
                    e.preventDefault();
                    void remove(g);
                  }}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={opened} onClose={close} title={t("setup.title")} size="lg">
        <NewGameModal onDone={close} />
      </Modal>
    </Container>
  );
}
