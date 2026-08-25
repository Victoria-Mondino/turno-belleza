import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAvailableSlots } from "@/lib/availability";
import { getService, updateBooking } from "@/lib/store";
import { addMinutes, format } from "date-fns";

const Patch = z.object({
  status: z.enum(["confirmado", "cancelado"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = Patch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patch = parsed.data;

  // Reprogramar: hay que recalcular endTime y validar que el nuevo horario esté libre.
  if (patch.date && patch.startTime) {
    const bookings = await import("@/lib/store").then((m) => m.listBookings());
    const current = bookings.find((b) => b.id === id);
    if (!current) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const service = await getService(current.serviceId);
    const durationMin = service?.durationMin ?? current.durationMin;

    const slots = await getAvailableSlots(patch.date, durationMin);
    const slot = slots.find((s) => s.time === patch.startTime);
    if (!slot || !slot.available) {
      return NextResponse.json({ error: "Ese horario no está disponible" }, { status: 409 });
    }

    const start = new Date(`${patch.date}T${patch.startTime}:00`);
    const end = addMinutes(start, durationMin);
    const updated = await updateBooking(id, {
      date: patch.date,
      startTime: patch.startTime,
      endTime: format(end, "HH:mm"),
    });
    return NextResponse.json(updated);
  }

  const updated = await updateBooking(id, patch);
  if (!updated) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(updated);
}
