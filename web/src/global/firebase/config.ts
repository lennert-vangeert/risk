import { initializeApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
} from "firebase/firestore";
import { IS_DEV } from "@global/env";

const USE_EMULATORS = IS_DEV;

// In emulator mode we talk to a "demo-" project, which needs no real credentials.
// In production the VITE_FIREBASE_* values come from web/.env (see .env.example).
const firebaseConfig: FirebaseOptions = USE_EMULATORS
  ? {
      projectId: "demo-firebase-seed",
      apiKey: "demo",
      authDomain: "localhost",
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// ignoreUndefinedProperties: optional event fields (e.g. Attack.movedIn on a
// non-conquering attack) are left undefined; Firestore rejects undefined values
// unless we tell it to skip them.
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});

if (USE_EMULATORS) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
