import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { deleteService, updateService } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";

const ServicePatch = z.object({
  category: z.enum(CATEGORIES).optional(),
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  durationMin: z.number().int().positive().optional(),
  price: z.number().nonnegative().optional(),
  icon: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = ServicePatch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const service = await updateService(id, parsed.data);
  if (!service) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(service);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  await deleteService(id);
  return NextResponse.json({ ok: true });
}
