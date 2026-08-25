import { addMinutes, format } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAvailableSlots } from "@/lib/availability";
import { createCalendarEvent } from "@/lib/google-calendar";
import { createBooking, getService, listBookings } from "@/lib/store";
import { notifyBooking } from "@/lib/whatsapp";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const bookings = await listBookings();
  return NextResponse.json(bookings);
}

const BookingInput = z.object({
  serviceId: z.string(),
  professionalId: z.string().default("any"),
  professionalName: z.string().default("Cualquiera disponible"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = BookingInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const service = await getService(data.serviceId);
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  // Se revalida la disponibilidad acá (no solo en el cliente) para evitar
  // que dos personas reserven el mismo horario al mismo tiempo.
  const slots = await getAvailableSlots(data.date, service.durationMin);
  const slot = slots.find((s) => s.time === data.startTime);
  if (!slot || !slot.available) {
    return NextResponse.json({ error: "Ese horario ya no está disponible, elegí otro" }, { status: 409 });
  }

  const start = new Date(`${data.date}T${data.startTime}:00`);
  const end = addMinutes(start, service.durationMin);

  const bookingDraft = {
    serviceId: service.id,
    serviceName: service.name,
    durationMin: service.durationMin,
    professionalId: data.professionalId,
    professionalName: data.professionalName,
    date: data.date,
    startTime: data.startTime,
    endTime: format(end, "HH:mm"),
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail || undefined,
    notes: data.notes || undefined,
    status: "confirmado" as const,
  };

  const calendarEventId = await createCalendarEvent({ ...bookingDraft, id: "", createdAt: "" });
  const booking = await createBooking({
    ...bookingDraft,
    calendarEventId: calendarEventId ?? undefined,
  });

  const notification = await notifyBooking(booking);

  return NextResponse.json({ booking, notification }, { status: 201 });
}
