"use client";

import { useStore } from "@/lib/store";

export function ToastHost() {
  const { toasts } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-in rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-xl ${
            t.err ? "bg-rose-600" : "bg-slate-900"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
