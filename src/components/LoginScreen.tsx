"use client";

import { DEMO_USERS } from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";

export function LoginScreen() {
  const { loginAs, brand } = useStore();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] p-6">
      <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--card)] p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-extrabold text-white shadow-lg">
            SL
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{brand.name}</h1>
          <p className="mt-1 text-sm text-[var(--mut)]">{brand.tagline}</p>
        </div>

        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-[var(--mut)]">
          Demo sign-in (tablet POS)
        </p>

        <div className="space-y-2">
          {DEMO_USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => loginAs(u.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--key)] px-4 py-3.5 text-left transition hover:border-indigo-400 hover:shadow-md"
            >
              <div>
                <div className="font-bold">{u.name}</div>
                <div className="text-xs text-[var(--mut)]">{u.email}</div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  u.role === "owner"
                    ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {u.role === "owner" ? "Owner" : "Retailer"}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--mut)]">
          {isSupabaseConfigured
            ? "Supabase is configured — replace demo login with Auth."
            : "Running in demo mode. Add NEXT_PUBLIC_SUPABASE_URL + ANON_KEY for production."}
        </p>
        <p className="mt-2 text-center text-[11px] text-[var(--mut)]">
          Owner → Sell + Reports + full Back office · Retailer → Sell + Reports + Support only
        </p>
      </div>
    </div>
  );
}
