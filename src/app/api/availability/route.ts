import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";
import { getService } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!date || !serviceId) {
    return NextResponse.json({ error: "Faltan parámetros: date y serviceId" }, { status: 400 });
  }

  const service = await getService(serviceId);
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  const slots = await getAvailableSlots(date, service.durationMin);
  return NextResponse.json(slots);
}
