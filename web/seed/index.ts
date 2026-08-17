import { GeoPoint, Timestamp } from "firebase-admin/firestore";
import { db } from "./firestore";
import { seedAdmin, seedUsers, SEED_PASSWORD, type SeedUser } from "./auth";
import { CAR_FIXTURES } from "./fixtures/cars";
import { buildSeededGame } from "./fixtures/games";

const DAY_MS = 24 * 60 * 60 * 1000;

const clearCollection = async (name: string): Promise<void> => {
  const snap = await db.collection(name).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
};

const seedCars = async (owners: SeedUser[]): Promise<number> => {
  await clearCollection("cars");
  const now = Date.now();

  for (let i = 0; i < CAR_FIXTURES.length; i++) {
    const { lat, lng, soldDaysAgo, ...data } = CAR_FIXTURES[i];
    const owner = owners[i % owners.length];

    await db.collection("cars").add({
      ...data,
      ownerId: owner.uid,
      location: new GeoPoint(lat, lng),
      soldAt:
        soldDaysAgo == null
          ? null
          : Timestamp.fromMillis(now - soldDaysAgo * DAY_MS),
      // Stagger createdAt so the "newest first" ordering is visible.
      createdAt: Timestamp.fromMillis(now - i * DAY_MS),
      updatedAt: Timestamp.fromMillis(now - i * DAY_MS),
    });
  }

  return CAR_FIXTURES.length;
};

/**
 * A single demo Risk game, owned by the given user. Uses a fixed doc id + set()
 * so re-seeding refreshes the demo without clearing games you created yourself.
 */
const seedGames = async (owner: SeedUser): Promise<number> => {
  const state = buildSeededGame();
  const now = Date.now();
  await db.collection("games").doc("seed-demo").set({
    ownerId: owner.uid,
    schemaVersion: state.schemaVersion,
    rev: 0,
    name: "Demo — 4-player standoff",
    status: "active",
    playerCount: 4,
    winCondition: state.config.winCondition,
    currentPlayerId: state.turn.currentPlayerId,
    currentPhase: state.turn.phase,
    winnerId: state.winnerId,
    turnNumber: state.turn.turnNumber,
    initialState: state,
    events: [],
    redoStack: [],
    cachedState: state,
    createdAt: Timestamp.fromMillis(now),
    updatedAt: Timestamp.fromMillis(now),
  });
  return 1;
};

const main = async (): Promise<void> => {
  const bootstrapOnly = process.argv.includes("--bootstrap");

  if (bootstrapOnly) {
    const admin = await seedAdmin();
    console.log(`✓ Bootstrapped admin user: ${admin.email}`);
    return;
  }

  const users = await seedUsers();
  const carCount = await seedCars(users);
  const gameCount = await seedGames(users[0]);

  console.log(
    `✓ Seeded ${users.length} users, ${carCount} cars and ${gameCount} game.`
  );
  console.log(`  Demo game owner: ${users[0].email}`);
  console.log(`  Logins: ${users.map((u) => u.email).join(", ")}`);
  console.log(`  Password: ${SEED_PASSWORD}`);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
