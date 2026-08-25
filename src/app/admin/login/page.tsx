"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Contraseña incorrecta.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <h1 className="font-display text-xl font-semibold text-ink">Panel de administración</h1>
        <p className="mt-1 text-sm text-ink-faint">Ingresá la contraseña del negocio.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          className="mt-5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-[0.95rem] outline-none focus:border-rose"
        />
        {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-full bg-rose py-3.5 font-semibold text-white disabled:opacity-50 active:bg-rose-dark"
        >
          {submitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
