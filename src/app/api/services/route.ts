import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createService, listServices } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";

export async function GET() {
  const services = await listServices();
  return NextResponse.json(services.filter((s) => s.active));
}

const ServiceInput = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().min(2),
  description: z.string().default(""),
  durationMin: z.number().int().positive(),
  price: z.number().nonnegative(),
  icon: z.string().min(1).default("💅"),
});

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = ServiceInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const service = await createService(parsed.data);
  return NextResponse.json(service, { status: 201 });
}
