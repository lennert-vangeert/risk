import { useEffect, useState } from "react";
import { subscribeGames, type GameWithId } from "@services/games";

/** Live list of the signed-in user's games (most recent first). */
export const useGames = (uid: string | undefined) => {
  const [games, setGames] = useState<GameWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setGames([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeGames(uid, (next) => {
      setGames(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { games, loading };
};
