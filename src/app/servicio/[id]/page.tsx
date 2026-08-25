import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { getService } from "@/lib/store";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);
}

export default async function ServiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getService(id);
  if (!service || !service.active) notFound();

  return (
    <>
      <AppHeader title={service.category} showBack />
      <main className="flex-1 px-5 pb-28 pt-5">
        <div className="mx-auto flex max-w-md flex-col gap-5">
          <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-rose-soft text-5xl">
            {service.icon}
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">{service.name}</h2>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{service.description}</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 rounded-2xl border border-line bg-surface p-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-faint">Duración</p>
              <p className="mt-1 font-display text-lg font-semibold text-ink">{service.durationMin} min</p>
            </div>
            <div className="flex-1 rounded-2xl border border-line bg-surface p-4">
              <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-faint">Precio</p>
              <p className="mt-1 font-display text-lg font-semibold text-rose-dark">{formatPrice(service.price)}</p>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 p-4 backdrop-blur">
        <Link
          href={`/reservar/${service.id}`}
          className="mx-auto block max-w-md rounded-full bg-rose py-4 text-center font-semibold text-white active:bg-rose-dark"
        >
          Reservar
        </Link>
      </div>
    </>
  );
}
