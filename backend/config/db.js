import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyFilePath = path.join(__dirname, "serviceAccountKey.json");

// Locally we read the gitignored key file; on Vercel (where that file can't
// exist) the same JSON is supplied via the FIREBASE_SERVICE_ACCOUNT_KEY env var.
const serviceAccount = existsSync(keyFilePath)
  ? JSON.parse(readFileSync(keyFilePath, "utf-8"))
  : JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

export { db };
