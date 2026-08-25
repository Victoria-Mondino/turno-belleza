import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Faltan FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY en .env.local");
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const services = [
  { id: "lash-lifting", category: "Pestañas", name: "Lifting de pestañas", description: "Curvado y tinte natural sin extensiones. Dura hasta 6 semanas.", durationMin: 45, price: 8000, icon: "👁️", active: true },
  { id: "lash-ext", category: "Pestañas", name: "Extensiones pestaña x pestaña", description: "Aplicación individual para un volumen natural.", durationMin: 90, price: 15000, icon: "✨", active: true },
  { id: "brow-lam", category: "Cejas", name: "Laminado de cejas", description: "Cejas prolijas y peinadas hacia arriba por semanas.", durationMin: 40, price: 7000, icon: "🪄", active: true },
  { id: "brow-design", category: "Cejas", name: "Diseño y perfilado", description: "Depilación y diseño a medida según tu rostro.", durationMin: 25, price: 4500, icon: "✏️", active: true },
  { id: "nails-semi", category: "Uñas", name: "Esmaltado semipermanente", description: "Color de larga duración en manos.", durationMin: 50, price: 6500, icon: "💅", active: true },
  { id: "nails-builder", category: "Uñas", name: "Uñas esculpidas", description: "Extensión en gel con forma y largo a elección.", durationMin: 100, price: 13000, icon: "💎", active: true },
  { id: "hair-blow", category: "Cabello", name: "Brushing", description: "Peinado con secador para un look prolijo.", durationMin: 40, price: 6000, icon: "💇‍♀️", active: true },
  { id: "hair-color", category: "Cabello", name: "Color raíz a punta", description: "Coloración completa con productos profesionales.", durationMin: 120, price: 22000, icon: "🎨", active: true },
  { id: "makeup-social", category: "Maquillaje", name: "Maquillaje social", description: "Para eventos y salidas especiales.", durationMin: 60, price: 12000, icon: "💄", active: true },
];

const professionals = [
  { id: "p1", name: "Camila", active: true },
  { id: "p2", name: "Sofía", active: true },
];

for (const { id, ...data } of services) {
  await db.collection("services").doc(id).set(data);
}
for (const { id, ...data } of professionals) {
  await db.collection("professionals").doc(id).set(data);
}

console.log(`Sembrados ${services.length} servicios y ${professionals.length} profesionales en Firestore.`);
process.exit(0);
