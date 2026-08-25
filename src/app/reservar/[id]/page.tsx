import { notFound } from "next/navigation";
import { getService, listProfessionals } from "@/lib/store";
import { BookingFlow } from "./booking-flow";

export default async function ReservarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getService(id);
  if (!service || !service.active) notFound();
  const professionals = await listProfessionals();

  return <BookingFlow service={service} professionals={professionals} />;
}
