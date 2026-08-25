"use client";

import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BUSINESS } from "@/lib/business";
import type { Professional, Service, Slot } from "@/lib/types";

type Step = "professional" | "calendar" | "form" | "confirm" | "success";

interface NotifyResult {
  sent: boolean;
  fallback: { business: string; client: string };
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);
}

export function BookingFlow({ service, professionals }: { service: Service; professionals: Professional[] }) {
  const [step, setStep] = useState<Step>("professional");

  const [professionalId, setProfessionalId] = useState("any");
  const [professionalName, setProfessionalName] = useState("Cualquiera disponible");

  const days = useMemo(
    () =>
      Array.from({ length: BUSINESS.daysAhead }, (_, i) => addDays(new Date(), i)).filter(
        (d) => !BUSINESS.closedWeekdays.includes(d.getDay())
      ),
    []
  );
  const [selectedDate, setSelectedDate] = useState<Date>(days[0]);
  const dateISO = format(selectedDate, "yyyy-MM-dd");

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "calendar") return;
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedTime(null);
    fetch(`/api/availability?serviceId=${service.id}&date=${dateISO}`)
      .then((r) => r.json())
      .then((data: Slot[]) => {
        if (!cancelled) setSlots(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, dateISO, service.id]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotifyResult | null>(null);

  function goToForm() {
    if (!selectedTime) return;
    setStep("form");
  }

  function validateForm(): string | null {
    if (name.trim().length < 2) return "Ingresá tu nombre.";
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    if (!/^\+\d{8,15}$/.test(cleanPhone)) {
      return "Ingresá tu teléfono en formato internacional, ej: +54 9 11 1234-5678.";
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return "El email no parece válido.";
    return null;
  }

  function goToConfirm() {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setStep("confirm");
  }

  async function confirmBooking() {
    if (!selectedTime) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          professionalId,
          professionalName,
          date: dateISO,
          startTime: selectedTime,
          customerName: name.trim(),
          customerPhone: phone.replace(/[^\d+]/g, ""),
          customerEmail: email.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setSubmitError("Ese horario se acaba de ocupar. Elegí otro.");
          setStep("calendar");
        } else {
          setSubmitError("No pudimos registrar el turno. Probá de nuevo.");
        }
        return;
      }
      setNotification(data.notification as NotifyResult);
      setStep("success");
    } catch {
      setSubmitError("No pudimos conectar con el servidor. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "success" && selectedTime) {
    return <SuccessScreen service={service} dateISO={dateISO} time={selectedTime} notification={notification} />;
  }

  const titles: Record<Step, string> = {
    professional: "Elegí profesional",
    calendar: "Elegí horario",
    form: "Tus datos",
    confirm: "Confirmá tu turno",
    success: "¡Listo!",
  };

  return (
    <>
      <AppHeader title={titles[step]} showBack />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-28 pt-5">
        <div className="mb-5 rounded-xl bg-nude px-3.5 py-2.5 text-sm text-ink-soft">
          {service.name} · {service.durationMin} min · <span className="font-semibold text-ink">{formatPrice(service.price)}</span>
        </div>

        {step === "professional" && (
          <ProfessionalStep
            professionals={professionals}
            selectedId={professionalId}
            onSelect={(id, pname) => {
              setProfessionalId(id);
              setProfessionalName(pname);
            }}
          />
        )}

        {step === "calendar" && (
          <CalendarStep
            days={days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            slots={slots}
            loading={loadingSlots}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
          />
        )}

        {step === "form" && (
          <FormStep
            name={name}
            phone={phone}
            email={email}
            notes={notes}
            error={formError}
            onChange={{ name: setName, phone: setPhone, email: setEmail, notes: setNotes }}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            service={service}
            professionalName={professionalName}
            dateISO={dateISO}
            time={selectedTime ?? ""}
            name={name}
            phone={phone}
            error={submitError}
          />
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          {step === "professional" && (
            <button
              onClick={() => setStep("calendar")}
              className="w-full rounded-full bg-rose py-4 font-semibold text-white active:bg-rose-dark"
            >
              Continuar
            </button>
          )}
          {step === "calendar" && (
            <button
              disabled={!selectedTime}
              onClick={goToForm}
              className="w-full rounded-full bg-rose py-4 font-semibold text-white disabled:opacity-40 active:bg-rose-dark"
            >
              Confirmar horario
            </button>
          )}
          {step === "form" && (
            <button onClick={goToConfirm} className="w-full rounded-full bg-rose py-4 font-semibold text-white active:bg-rose-dark">
              Revisar reserva
            </button>
          )}
          {step === "confirm" && (
            <button
              disabled={submitting}
              onClick={confirmBooking}
              className="w-full rounded-full bg-rose py-4 font-semibold text-white disabled:opacity-50 active:bg-rose-dark"
            >
              {submitting ? "Confirmando…" : "Confirmar turno"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function ProfessionalStep({
  professionals,
  selectedId,
  onSelect,
}: {
  professionals: Professional[];
  selectedId: string;
  onSelect: (id: string, name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <button
        onClick={() => onSelect("any", "Cualquiera disponible")}
        className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${
          selectedId === "any" ? "border-gold bg-gold-soft" : "border-line bg-surface"
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-lg">✨</span>
        <span className="flex-1">
          <span className="block font-semibold text-ink">Cualquiera disponible</span>
          <span className="block text-sm text-ink-faint">Te asignamos la profesional con horario libre</span>
        </span>
      </button>
      {professionals.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id, p.name)}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${
            selectedId === p.id ? "border-rose bg-rose-soft" : "border-line bg-surface"
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nude font-display font-semibold text-ink">
            {p.name.charAt(0)}
          </span>
          <span className="font-semibold text-ink">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

function CalendarStep({
  days,
  selectedDate,
  onSelectDate,
  slots,
  loading,
  selectedTime,
  onSelectTime,
}: {
  days: Date[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  slots: Slot[];
  loading: boolean;
  selectedTime: string | null;
  onSelectTime: (t: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {days.map((d) => {
          const active = isSameDay(d, selectedDate);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelectDate(d)}
              className={`flex shrink-0 flex-col items-center rounded-2xl px-3.5 py-2.5 ${
                active ? "bg-rose text-white" : "bg-nude text-ink-soft"
              }`}
            >
              <span className="text-[0.65rem] font-bold uppercase tracking-wide opacity-80">
                {format(d, "EEE", { locale: es })}
              </span>
              <span className="font-display text-base font-semibold">{format(d, "d")}</span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold capitalize text-ink-soft">
          {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
        </p>

        {loading && <p className="py-8 text-center text-sm text-ink-faint">Buscando horarios…</p>}

        {!loading && slots.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-faint">Cerrado este día. Elegí otra fecha.</p>
        )}

        {!loading && slots.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                disabled={!slot.available}
                onClick={() => onSelectTime(slot.time)}
                className={`rounded-xl py-3 text-sm font-semibold ${
                  !slot.available
                    ? "bg-nude/60 text-ink-faint/50 line-through"
                    : selectedTime === slot.time
                      ? "bg-rose text-white"
                      : "bg-nude text-ink"
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FormStep({
  name,
  phone,
  email,
  notes,
  error,
  onChange,
}: {
  name: string;
  phone: string;
  email: string;
  notes: string;
  error: string | null;
  onChange: { name: (v: string) => void; phone: (v: string) => void; email: (v: string) => void; notes: (v: string) => void };
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Nombre y apellido" required>
        <input
          value={name}
          onChange={(e) => onChange.name(e.target.value)}
          placeholder="Ej: Martina Gómez"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[0.95rem] outline-none focus:border-rose"
        />
      </Field>
      <Field label="Teléfono (WhatsApp)" required hint="Formato internacional, ej: +54 9 11 1234-5678">
        <input
          value={phone}
          onChange={(e) => onChange.phone(e.target.value)}
          placeholder="+54 9 11 1234-5678"
          inputMode="tel"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[0.95rem] outline-none focus:border-rose"
        />
      </Field>
      <Field label="Email" hint="Opcional">
        <input
          value={email}
          onChange={(e) => onChange.email(e.target.value)}
          placeholder="tu@email.com"
          type="email"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[0.95rem] outline-none focus:border-rose"
        />
      </Field>
      <Field label="Notas" hint="Opcional — alergias, pedidos especiales, etc.">
        <textarea
          value={notes}
          onChange={(e) => onChange.notes(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-[0.95rem] outline-none focus:border-rose"
        />
      </Field>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label} {required && <span className="text-rose-dark">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

function ConfirmStep({
  service,
  professionalName,
  dateISO,
  time,
  name,
  phone,
  error,
}: {
  service: Service;
  professionalName: string;
  dateISO: string;
  time: string;
  name: string;
  phone: string;
  error: string | null;
}) {
  const date = new Date(`${dateISO}T00:00:00`);
  return (
    <div className="flex flex-col gap-3">
      <SummaryRow label="Servicio" value={`${service.name} · ${service.durationMin} min`} />
      <SummaryRow label="Profesional" value={professionalName} />
      <SummaryRow label="Fecha" value={format(date, "EEEE d 'de' MMMM", { locale: es })} />
      <SummaryRow label="Hora" value={`${time} hs`} />
      <SummaryRow label="Nombre" value={name} />
      <SummaryRow label="Teléfono" value={phone} />
      {error && <p className="mt-1 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 font-display text-base font-semibold capitalize text-ink">{value}</p>
    </div>
  );
}

function SuccessScreen({
  service,
  dateISO,
  time,
  notification,
}: {
  service: Service;
  dateISO: string;
  time: string;
  notification: NotifyResult | null;
}) {
  const date = new Date(`${dateISO}T00:00:00`);
  return (
    <>
      <AppHeader title="¡Listo!" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-5 pb-10 pt-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-good/15 text-3xl text-good">✓</div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-ink">Turno confirmado</h2>
        <p className="mt-2 text-[0.95rem] capitalize text-ink-soft">
          {service.name} el {format(date, "EEEE d 'de' MMMM", { locale: es })} a las {time}hs
        </p>

        {notification && !notification.sent && (
          <a
            href={notification.fallback.client}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-good py-4 font-semibold text-white"
          >
            Confirmar por WhatsApp
          </a>
        )}
        {notification?.sent && (
          <p className="mt-8 rounded-2xl bg-nude px-4 py-3 text-sm text-ink-soft">Te enviamos la confirmación por WhatsApp.</p>
        )}

        <a href="/" className="mt-4 text-sm font-semibold text-ink-faint underline underline-offset-4">
          Volver al inicio
        </a>
      </main>
    </>
  );
}
