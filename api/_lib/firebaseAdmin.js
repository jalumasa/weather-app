import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "fs";
import path from "path";

const keyFilePath = path.join(process.cwd(), "serviceAccountKey.json");

// Locally we read the gitignored key file; on Vercel (where that file never
// gets uploaded) the same JSON is supplied via the FIREBASE_SERVICE_ACCOUNT_KEY env var.
const serviceAccount = existsSync(keyFilePath)
  ? JSON.parse(readFileSync(keyFilePath, "utf-8"))
  : JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert(serviceAccount) });

export const db = getFirestore(app);
