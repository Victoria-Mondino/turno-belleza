import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
