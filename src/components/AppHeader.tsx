"use client";

import { useRouter } from "next/navigation";

export function AppHeader({ title, showBack = false }: { title: string; showBack?: boolean }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3.5 backdrop-blur">
      {showBack && (
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:bg-nude"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 4.5 6.5 10l6 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <h1 className="font-display text-[1.05rem] font-semibold text-ink">{title}</h1>
    </header>
  );
}
