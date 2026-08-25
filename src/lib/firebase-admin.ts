import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (dbInstance) return dbInstance;

  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Faltan las variables de Firebase (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) en .env.local"
      );
    }
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  dbInstance = getFirestore();
  dbInstance.settings({ ignoreUndefinedProperties: true });
  return dbInstance;
}
