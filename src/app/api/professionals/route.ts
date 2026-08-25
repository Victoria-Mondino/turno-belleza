import { NextResponse } from "next/server";
import { listProfessionals } from "@/lib/store";

export async function GET() {
  const professionals = await listProfessionals();
  return NextResponse.json(professionals);
}
