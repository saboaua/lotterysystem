"use client";

import { useState, type FormEvent } from "react";
import { Building2, Store } from "lucide-react";
import { DEMO_USERS } from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured, signInWithPassword } from "@/lib/auth";

/** Offline demo passwords (used when Supabase is not configured, or as fallback). */
const DEMO_PASSWORDS: Record<string, string> = {
  "owner@shocolottery.aw": "owner123",
  "main@shop.aw": "retailer123",
  "lucky@shop.aw": "retailer123",
};

export function LoginScreen() {
  const { loginAs, setUserFromAuth, brand, toast } = useStore();
  const [mode, setMode] = useState<"pick" | "owner" | "retailer">("pick");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const owners = DEMO_USERS.filter((u) => u.role === "owner");
  const retailers = DEMO_USERS.filter((u) => u.role === "retailer");

  /** Set user only — home page redirects after state commits (avoids race). */
  function enterAs(userId: string) {
    loginAs(userId);
  }

  function tryDemoPassword(emailIn: string, passwordIn: string): boolean {
    const key = emailIn.trim().toLowerCase();
    const expected = DEMO_PASSWORDS[key];
    if (!expected || passwordIn !== expected) return false;
    const u = DEMO_USERS.find((x) => x.email.toLowerCase() === key);
    if (!u) return false;
    if (mode === "owner" && u.role !== "owner") {
      toast("This account is not an owner", true);
      return true;
    }
    if (mode === "retailer" && u.role !== "retailer") {
      toast("This account is not a retailer", true);
      return true;
    }
    loginAs(u.id);
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const em = email.trim();
    const pw = password;
    if (!em || !pw) {
      toast("Enter email and password", true);
      return;
    }

    setBusy(true);

    // Always try demo credentials first (works offline)
    if (tryDemoPassword(em, pw)) {
      setBusy(false);
      return;
    }

    if (isSupabaseConfigured) {
      const res = await signInWithPassword(em, pw);
      setBusy(false);
      if (!res.ok) {
        toast(res.error, true);
        return;
      }
      if (mode === "owner" && res.user.role !== "owner") {
        toast("This account is not an owner", true);
        return;
      }
      if (mode === "retailer" && res.user.role !== "retailer") {
        toast("This account is not a retailer", true);
        return;
      }
      setUserFromAuth(res.user);
      toast(`Signed in as ${res.user.name || res.user.email}`);
      return;
    }

    setBusy(false);
    toast("Wrong email or password", true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-extrabold text-white shadow-lg">
            SL
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{brand.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{brand.tagline}</p>
        </div>

        {mode === "pick" && (
          <div className="space-y-4">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400">Choose sign-in</p>
            <button
              type="button"
              onClick={() => {
                setMode("retailer");
                setEmail("");
                setPassword("");
              }}
              className="flex w-full items-start gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-5 text-left transition hover:border-emerald-400 hover:shadow-md dark:border-emerald-900 dark:bg-emerald-950/40"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow">
                <Store size={22} />
              </span>
              <span>
                <span className="block text-lg font-extrabold text-slate-900 dark:text-white">Retailer</span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                  Shop terminal — sell tickets only
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("owner");
                setEmail("owner@shocolottery.aw");
                setPassword("");
              }}
              className="flex w-full items-start gap-4 rounded-2xl border-2 border-violet-200 bg-violet-50/80 p-5 text-left transition hover:border-violet-400 hover:shadow-md dark:border-violet-900 dark:bg-violet-950/40"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow">
                <Building2 size={22} />
              </span>
              <span>
                <span className="block text-lg font-extrabold text-slate-900 dark:text-white">Owner</span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                  Back office — games, retailers, results, reports
                </span>
              </span>
            </button>
          </div>
        )}

        {mode === "retailer" && (
          <div className="space-y-4">
            <button type="button" onClick={() => setMode("pick")} className="text-xs font-semibold text-slate-500 hover:text-indigo-600">
              ← Change role
            </button>
            <h2 className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">Retailer terminal</h2>
            <p className="text-sm text-slate-500">Sell tickets at your shop. No back-office access.</p>

            <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="Shop email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in as retailer"}
              </button>
              <p className="text-center text-[11px] text-slate-400">
                Demo: main@shop.aw / retailer123
              </p>
            </form>

            <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">Or one-tap demo</p>
            <div className="space-y-2">
              {retailers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => enterAs(u.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left transition hover:border-emerald-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Retailer
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "owner" && (
          <div className="space-y-4">
            <button type="button" onClick={() => setMode("pick")} className="text-xs font-semibold text-slate-500 hover:text-indigo-600">
              ← Change role
            </button>
            <h2 className="text-lg font-extrabold text-violet-700 dark:text-violet-400">Owner back office</h2>
            <p className="text-sm text-slate-500">Manage games, retailers, results, promotions and reports.</p>

            <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900 dark:bg-violet-950/20">
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="Owner email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in as owner"}
              </button>
              <p className="text-center text-[11px] text-slate-500">
                Demo: <span className="font-mono font-semibold">owner@shocolottery.aw</span> /{" "}
                <span className="font-mono font-semibold">owner123</span>
              </p>
            </form>

            <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">Or one-tap demo</p>
            <div className="space-y-2">
              {owners.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => enterAs(u.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left transition hover:border-violet-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                    Owner
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-slate-400">
          Retailer → sell only · Owner → back office only
        </p>
      </div>
    </div>
  );
}
