"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { BUSINESS } from "@/lib/business";
import { CATEGORIES } from "@/lib/types";
import type { Booking, Category, Professional, Service, Slot } from "@/lib/types";

function waLink(numero: string, mensaje: string) {
  const clean = numero.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(mensaje)}`;
}

type Tab = "turnos" | "servicios";

export function AdminClient({
  bookings,
  services,
  professionals,
}: {
  bookings: Booking[];
  services: Service[];
  professionals: Professional[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("turnos");

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(interval);
  }, [router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3.5 backdrop-blur">
        <h1 className="font-display text-lg font-semibold text-ink">Panel admin</h1>
        <button onClick={logout} className="text-sm font-semibold text-ink-faint">
          Salir
        </button>
      </header>

      <nav className="flex gap-2 border-b border-line px-4 py-3">
        <TabButton active={tab === "turnos"} onClick={() => setTab("turnos")}>
          Turnos
        </TabButton>
        <TabButton active={tab === "servicios"} onClick={() => setTab("servicios")}>
          Servicios
        </TabButton>
      </nav>

      <main className="flex-1 px-4 pb-16 pt-4">
        {tab === "turnos" && (
          <BookingsTab bookings={bookings} professionals={professionals} onChanged={() => router.refresh()} />
        )}
        {tab === "servicios" && <ServicesTab services={services} onChanged={() => router.refresh()} />}
      </main>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-rose text-white" : "bg-nude text-ink-faint"}`}
    >
      {children}
    </button>
  );
}

function BookingsTab({
  bookings,
  professionals,
  onChanged,
}: {
  bookings: Booking[];
  professionals: Professional[];
  onChanged: () => void;
}) {
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  async function cancelBooking(id: string) {
    if (!confirm("¿Cancelar este turno?")) return;
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelado" }),
    });
    onChanged();
  }

  if (bookings.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-faint">Todavía no hay turnos reservados.</p>;
  }

  const recent = [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const cardProps = {
    reschedulingId,
    onReschedule: (id: string) => setReschedulingId(reschedulingId === id ? null : id),
    onCancel: cancelBooking,
    onRescheduleDone: () => {
      setReschedulingId(null);
      onChanged();
    },
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-faint">Recientes primero</h2>
        <div className="flex flex-col gap-3">
          {recent.map((b) => (
            <BookingCard key={b.id} booking={b} {...cardProps} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-faint">Calendario</h2>
        <DayGridCalendar bookings={bookings} professionals={professionals} {...cardProps} />
      </section>
    </div>
  );
}

const DAY_COLORS = [
  { bg: "bg-rose-soft", border: "border-rose", text: "text-rose-dark" },
  { bg: "bg-gold-soft", border: "border-gold", text: "text-ink" },
  { bg: "bg-good/15", border: "border-good", text: "text-good" },
  { bg: "bg-nude", border: "border-ink-faint", text: "text-ink-soft" },
];

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function addDaysISO(dateISO: string, delta: number) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return format(d, "yyyy-MM-dd");
}

function DayGridCalendar({
  bookings,
  professionals,
  reschedulingId,
  onReschedule,
  onCancel,
  onRescheduleDone,
}: {
  bookings: Booking[];
  professionals: Professional[];
  reschedulingId: string | null;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
  onRescheduleDone: () => void;
}) {
  const [viewDate, setViewDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dayBookings = bookings.filter((b) => b.date === viewDate && b.status === "confirmado");

  const columns: { id: string; name: string }[] = professionals.map((p) => ({ id: p.id, name: p.name }));
  if (dayBookings.some((b) => b.professionalId === "any")) {
    columns.push({ id: "any", name: "Cualquiera" });
  }

  const [openH, openM] = BUSINESS.hours.open.split(":").map(Number);
  const [closeH] = BUSINESS.hours.close.split(":").map(Number);
  const startMin = openH * 60 + openM;
  const endMin = closeH * 60;
  const pxPerMin = 1.3;
  const gridHeight = (endMin - startMin) * pxPerMin;
  const hours: number[] = [];
  for (let h = openH; h <= closeH; h++) hours.push(h);

  const selected = dayBookings.find((b) => b.id === selectedId);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setViewDate((d) => addDaysISO(d, -1))}
          className="rounded-full bg-nude px-3 py-1.5 text-sm font-bold text-ink-soft"
        >
          ‹
        </button>
        <p className="font-display text-sm font-semibold capitalize text-ink">
          {format(new Date(`${viewDate}T00:00:00`), "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <button
          onClick={() => setViewDate((d) => addDaysISO(d, 1))}
          className="rounded-full bg-nude px-3 py-1.5 text-sm font-bold text-ink-soft"
        >
          ›
        </button>
      </div>

      {columns.length === 0 ? (
        <p className="text-sm text-ink-faint">No hay profesionales para mostrar.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <div className="flex" style={{ minWidth: columns.length * 150 + 44 }}>
            <div className="w-11 shrink-0 border-r border-line pt-7">
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ height: 60 * pxPerMin }}
                  className="-translate-y-2 pr-1.5 text-right text-[0.65rem] text-ink-faint"
                >
                  {h}:00
                </div>
              ))}
            </div>
            {columns.map((col, i) => {
              const colBookings = dayBookings.filter((b) => b.professionalId === col.id);
              const color = DAY_COLORS[i % DAY_COLORS.length];
              return (
                <div key={col.id} className="relative flex-1 border-r border-line last:border-r-0" style={{ minWidth: 150 }}>
                  <p className="truncate border-b border-line bg-surface px-2 py-1.5 text-center text-xs font-bold text-ink-soft">
                    {col.name}
                  </p>
                  <div className="relative" style={{ height: gridHeight }}>
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-line/60"
                        style={{ top: (h * 60 - startMin) * pxPerMin }}
                      />
                    ))}
                    {colBookings.map((b) => {
                      const top = (timeToMinutes(b.startTime) - startMin) * pxPerMin;
                      const height = Math.max((timeToMinutes(b.endTime) - timeToMinutes(b.startTime)) * pxPerMin, 26);
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedId(b.id)}
                          className={`absolute inset-x-1 overflow-hidden rounded-lg border-l-4 ${color.bg} ${color.border} px-1.5 py-1 text-left`}
                          style={{ top, height }}
                        >
                          <p className={`truncate text-[0.68rem] font-bold leading-tight ${color.text}`}>
                            {b.startTime} {b.customerName}
                          </p>
                          <p className="truncate text-[0.63rem] leading-tight text-ink-soft">{b.serviceName}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
          <BookingCard
            booking={selected}
            reschedulingId={reschedulingId}
            onReschedule={onReschedule}
            onCancel={onCancel}
            onRescheduleDone={onRescheduleDone}
          />
          <button
            onClick={() => setSelectedId(null)}
            className="mt-2 text-xs font-semibold text-ink-faint underline underline-offset-2"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking: b,
  reschedulingId,
  onReschedule,
  onCancel,
  onRescheduleDone,
}: {
  booking: Booking;
  reschedulingId: string | null;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
  onRescheduleDone: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold capitalize text-ink">
            {format(new Date(`${b.date}T00:00:00`), "EEE d MMM", { locale: es })} · {b.startTime}hs
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {b.serviceName} · {b.professionalName}
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            {b.customerName} · {b.customerPhone}
          </p>
          {b.notes && <p className="mt-1 text-xs text-ink-faint">Notas: {b.notes}</p>}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
            b.status === "confirmado" ? "bg-good/15 text-good" : "bg-nude text-ink-faint"
          }`}
        >
          {b.status}
        </span>
      </div>

      {b.status === "confirmado" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={waLink(
              b.customerPhone,
              `Hola ${b.customerName}! Te escribimos de ${BUSINESS.name} para confirmar tu turno de ${b.serviceName} el ${b.date} a las ${b.startTime}hs.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-good/15 px-3.5 py-1.5 text-xs font-bold text-good"
          >
            WhatsApp
          </a>
          <button
            onClick={() => onReschedule(b.id)}
            className="rounded-full bg-nude px-3.5 py-1.5 text-xs font-bold text-ink-soft"
          >
            Reprogramar
          </button>
          <button onClick={() => onCancel(b.id)} className="rounded-full bg-danger/10 px-3.5 py-1.5 text-xs font-bold text-danger">
            Cancelar
          </button>
        </div>
      )}

      {reschedulingId === b.id && <RescheduleForm booking={b} onDone={onRescheduleDone} />}
    </div>
  );
}

function RescheduleForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [date, setDate] = useState(booking.date);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSlots(d: string) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/availability?serviceId=${booking.serviceId}&date=${d}`);
    const data = await res.json();
    setSlots(data);
    setLoading(false);
  }

  useEffect(() => {
    loadSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pick(time: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, startTime: time }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Ese horario no está disponible.");
      return;
    }
    onDone();
  }

  return (
    <div className="mt-3 rounded-xl bg-nude/60 p-3">
      <input
        type="date"
        value={date}
        min={format(new Date(), "yyyy-MM-dd")}
        onChange={(e) => {
          setDate(e.target.value);
          loadSlots(e.target.value);
        }}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none"
      />
      {loading && <p className="mt-2 text-xs text-ink-faint">Buscando horarios…</p>}
      {!loading && (
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {slots.map((s) => (
            <button
              key={s.time}
              disabled={!s.available || saving}
              onClick={() => pick(s.time)}
              className={`rounded-lg py-1.5 text-xs font-semibold ${
                !s.available ? "bg-surface text-ink-faint/50 line-through" : "bg-surface text-ink hover:bg-rose hover:text-white"
              }`}
            >
              {s.time}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function ServicesTab({ services, onChanged }: { services: Service[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {services.map((s) => (
        <ServiceRow key={s.id} service={s} onChanged={onChanged} />
      ))}

      {adding ? (
        <NewServiceForm
          onDone={() => {
            setAdding(false);
            onChanged();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button onClick={() => setAdding(true)} className="rounded-2xl border border-dashed border-line py-3 text-sm font-semibold text-ink-faint">
          + Agregar servicio
        </button>
      )}
    </div>
  );
}

function ServiceRow({ service, onChanged }: { service: Service; onChanged: () => void }) {
  const [price, setPrice] = useState(String(service.price));
  const [duration, setDuration] = useState(String(service.durationMin));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: Number(price), durationMin: Number(duration) }),
    });
    setSaving(false);
    onChanged();
  }

  async function toggleActive() {
    await fetch(`/api/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !service.active }),
    });
    onChanged();
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${service.name}"?`)) return;
    await fetch(`/api/services/${service.id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className={`rounded-2xl border border-line bg-surface p-4 ${!service.active ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-faint">{service.category}</p>
          <p className="font-display text-base font-semibold text-ink">
            {service.icon} {service.name}
          </p>
        </div>
        <button onClick={toggleActive} className="text-xs font-semibold text-ink-faint underline underline-offset-2">
          {service.active ? "Ocultar" : "Activar"}
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-ink-faint">Precio</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm outline-none"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-ink-faint">Duración (min)</span>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-2.5 py-1.5 text-sm outline-none"
          />
        </label>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={saving} className="flex-1 rounded-full bg-rose py-2 text-xs font-bold text-white disabled:opacity-50">
          Guardar
        </button>
        <button onClick={remove} className="rounded-full bg-danger/10 px-4 py-2 text-xs font-bold text-danger">
          Eliminar
        </button>
      </div>
    </div>
  );
}

function NewServiceForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState("30");
  const [price, setPrice] = useState("0");
  const [icon, setIcon] = useState("💅");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, name, description, durationMin: Number(durationMin), price: Number(price), icon }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Revisá los datos del servicio.");
      return;
    }
    onDone();
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-2.5">
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="rounded-lg border border-line bg-bg px-2.5 py-2 text-sm">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del servicio"
          className="rounded-lg border border-line bg-bg px-2.5 py-2 text-sm"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          className="rounded-lg border border-line bg-bg px-2.5 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Ícono" className="w-16 rounded-lg border border-line bg-bg px-2.5 py-2 text-sm" />
          <input
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder="Min"
            className="flex-1 rounded-lg border border-line bg-bg px-2.5 py-2 text-sm"
          />
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Precio"
            className="flex-1 rounded-lg border border-line bg-bg px-2.5 py-2 text-sm"
          />
        </div>
        {error && <p className="text-xs font-medium text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={submit} disabled={saving || !name} className="flex-1 rounded-full bg-rose py-2 text-xs font-bold text-white disabled:opacity-50">
            {saving ? "Guardando…" : "Guardar servicio"}
          </button>
          <button onClick={onCancel} className="rounded-full bg-nude px-4 py-2 text-xs font-bold text-ink-faint">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
