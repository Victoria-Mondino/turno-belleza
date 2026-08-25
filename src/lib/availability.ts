import { addMinutes, format, isBefore } from "date-fns";
import { BUSINESS } from "./business";
import { getBusyRanges } from "./google-calendar";
import { listBookingsForDate } from "./store";
import type { Slot } from "./types";

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Turnos de a un cliente por vez (una sola "silla" compartida entre profesionales).
 * Si más adelante el salón atiende varias clientas en simultáneo, esto necesita
 * pasar a disponibilidad por profesional en lugar de una sola línea de tiempo global.
 */
export async function getAvailableSlots(dateISO: string, durationMin: number): Promise<Slot[]> {
  const dayStart = new Date(`${dateISO}T00:00:00`);
  if (BUSINESS.closedWeekdays.includes(dayStart.getDay())) return [];

  const openTime = new Date(`${dateISO}T${BUSINESS.hours.open}:00`);
  const closeTime = new Date(`${dateISO}T${BUSINESS.hours.close}:00`);

  const [existingBookings, busyRanges] = await Promise.all([
    listBookingsForDate(dateISO),
    getBusyRanges(dateISO),
  ]);

  const busy = [
    ...existingBookings.map((b) => ({
      start: new Date(`${b.date}T${b.startTime}:00`),
      end: new Date(`${b.date}T${b.endTime}:00`),
    })),
    ...busyRanges,
  ];

  const now = new Date();
  const slots: Slot[] = [];
  let cursor = openTime;
  while (addMinutes(cursor, durationMin) <= closeTime) {
    const slotEnd = addMinutes(cursor, durationMin);
    const blocked = busy.some((r) => overlaps(cursor, slotEnd, r.start, r.end));
    slots.push({ time: format(cursor, "HH:mm"), available: !blocked && !isBefore(cursor, now) });
    cursor = addMinutes(cursor, BUSINESS.slotStepMin);
  }
  return slots;
}
