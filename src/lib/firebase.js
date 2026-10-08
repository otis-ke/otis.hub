import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { firebaseConfig } from "./config.js";

// Named app so it never collides with another Firebase app on the same origin
const app = getApps().find((a) => a.name === "otis-hub") || initializeApp(firebaseConfig, "otis-hub");
export const rtdb = getDatabase(app);
