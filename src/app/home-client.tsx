"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BUSINESS } from "@/lib/business";
import { CATEGORIES, type Service } from "@/lib/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);
}

export function HomeClient({ services }: { services: Service[] }) {
  const availableCategories = CATEGORIES.filter((c) => services.some((s) => s.category === c));
  const [active, setActive] = useState(availableCategories[0]);

  const filtered = useMemo(() => services.filter((s) => s.category === active), [services, active]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-widest text-rose-dark">Reservas</p>
            <h1 className="font-display text-xl font-semibold text-ink">{BUSINESS.name}</h1>
          </div>
          <Link
            href="/admin"
            aria-label="Panel de administración"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-nude text-ink-soft"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3.5 17c1-3.2 3.6-5 6.5-5s5.5 1.8 6.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        <nav className="mt-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active === cat ? "bg-rose text-white" : "bg-nude text-ink-faint"
              }`}
            >
              {cat}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 pb-10 pt-4">
        <div className="flex flex-col gap-3">
          {filtered.map((service) => (
            <Link
              key={service.id}
              href={`/servicio/${service.id}`}
              className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5 shadow-sm active:bg-nude/40"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-rose-soft text-2xl">
                {service.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{service.name}</span>
                <span className="mt-0.5 block text-sm text-ink-faint">{service.durationMin} min</span>
              </span>
              <span className="shrink-0 font-display text-base font-semibold text-rose-dark">
                {formatPrice(service.price)}
              </span>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-faint">No hay servicios en esta categoría todavía.</p>
          )}
        </div>
      </main>
    </>
  );
}
