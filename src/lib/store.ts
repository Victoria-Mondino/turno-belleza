import { getDb } from "./firebase-admin";
import type { Booking, Professional, Service } from "./types";

// ---------- Servicios ----------

export async function listServices(): Promise<Service[]> {
  const snap = await getDb().collection("services").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service);
}

export async function getService(id: string): Promise<Service | null> {
  const doc = await getDb().collection("services").doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as Service) : null;
}

export async function createService(input: Omit<Service, "id" | "active">): Promise<Service> {
  const data = { ...input, active: true };
  const ref = await getDb().collection("services").add(data);
  return { id: ref.id, ...data };
}

export async function updateService(id: string, patch: Partial<Omit<Service, "id">>): Promise<Service | null> {
  const ref = getDb().collection("services").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.update(patch);
  return { id, ...doc.data(), ...patch } as Service;
}

export async function deleteService(id: string): Promise<void> {
  await getDb().collection("services").doc(id).delete();
}

// ---------- Profesionales ----------

export async function listProfessionals(): Promise<Professional[]> {
  const snap = await getDb().collection("professionals").where("active", "==", true).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Professional);
}

// ---------- Turnos ----------

export async function listBookings(): Promise<Booking[]> {
  const snap = await getDb().collection("bookings").get();
  const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking);
  return bookings.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
}

export async function listBookingsForDate(date: string): Promise<Booking[]> {
  const snap = await getDb()
    .collection("bookings")
    .where("date", "==", date)
    .where("status", "==", "confirmado")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking);
}

export async function createBooking(input: Omit<Booking, "id" | "createdAt">): Promise<Booking> {
  const data = { ...input, createdAt: new Date().toISOString() };
  const ref = await getDb().collection("bookings").add(data);
  return { id: ref.id, ...data };
}

export async function updateBooking(id: string, patch: Partial<Omit<Booking, "id">>): Promise<Booking | null> {
  const ref = getDb().collection("bookings").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.update(patch);
  return { id, ...doc.data(), ...patch } as Booking;
}
