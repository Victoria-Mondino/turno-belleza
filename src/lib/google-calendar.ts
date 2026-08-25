import { google } from "googleapis";
import type { Booking } from "./types";

export interface BusyRange {
  start: Date;
  end: Date;
}

const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || "America/Argentina/Buenos_Aires";

/** Offset como "-03:00" para la zona horaria del negocio en una fecha dada. */
function getUtcOffset(dateISO: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(`${dateISO}T12:00:00Z`));
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = raw.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return "+00:00";
  const [, sign, hh, mm] = match;
  return `${sign}${hh.padStart(2, "0")}:${(mm ?? "00").padStart(2, "0")}`;
}

function getAuth() {
  const email = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
  const key = process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return null;
  return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/calendar"] });
}

/** Sin credenciales configuradas todavía: no bloquea ningún horario. */
export async function getBusyRanges(dateISO: string): Promise<BusyRange[]> {
  const auth = getAuth();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!auth || !calendarId) return [];

  const calendar = google.calendar({ version: "v3", auth });
  const offset = getUtcOffset(dateISO, BUSINESS_TIMEZONE);
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: `${dateISO}T00:00:00${offset}`,
      timeMax: `${dateISO}T23:59:59${offset}`,
      items: [{ id: calendarId }],
    },
  });
  const busy = res.data.calendars?.[calendarId]?.busy ?? [];
  return busy
    .filter((b) => b.start && b.end)
    .map((b) => ({ start: new Date(b.start as string), end: new Date(b.end as string) }));
}

/** Sin credenciales configuradas todavía: no crea nada y devuelve null. */
export async function createCalendarEvent(booking: Booking): Promise<string | null> {
  const auth = getAuth();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!auth || !calendarId) return null;

  const calendar = google.calendar({ version: "v3", auth });
  const timeZone = BUSINESS_TIMEZONE;
  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `${booking.serviceName} — ${booking.customerName}`,
      description: [
        `Servicio: ${booking.serviceName}`,
        `Profesional: ${booking.professionalName}`,
        `Cliente: ${booking.customerName}`,
        `Teléfono: ${booking.customerPhone}`,
        `Notas: ${booking.notes || "-"}`,
      ].join("\n"),
      start: { dateTime: `${booking.date}T${booking.startTime}:00`, timeZone },
      end: { dateTime: `${booking.date}T${booking.endTime}:00`, timeZone },
    },
  });
  return event.data.id ?? null;
}
