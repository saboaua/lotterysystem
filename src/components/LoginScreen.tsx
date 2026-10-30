"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Building2, Eye, EyeOff, Lock, Mail, Store } from "lucide-react";
import { DEMO_USERS } from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { friendlyAuthError, isSupabaseConfigured, signInWithPassword } from "@/lib/auth";
import { applyThemePreset } from "@/lib/theme";

/** Offline demo passwords — only used when Supabase env is not set. */
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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const owners = DEMO_USERS.filter((u) => u.role === "owner");
  const retailers = DEMO_USERS.filter((u) => u.role === "retailer");

  useEffect(() => {
    setError(null);
    setShowPassword(false);
  }, [mode]);

  useEffect(() => {
    applyThemePreset(brand.theme_id);
  }, [brand.theme_id]);

  function fail(message: string) {
    setError(message);
    setPassword("");
    setBusy(false);
    requestAnimationFrame(() => {
      passwordRef.current?.focus();
      errorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  function enterAs(userId: string) {
    if (isSupabaseConfigured) {
      setError(
        "Demo accounts are disabled while Supabase is connected. Sign in with email and password."
      );
      return;
    }
    setError(null);
    loginAs(userId);
  }

  function tryDemoPassword(emailIn: string, passwordIn: string): "ok" | "bad" | "role" {
    const key = emailIn.trim().toLowerCase();
    const expected = DEMO_PASSWORDS[key];
    if (!expected || passwordIn !== expected) return "bad";
    const u = DEMO_USERS.find((x) => x.email.toLowerCase() === key);
    if (!u) return "bad";
    if (mode === "owner" && u.role !== "owner") {
      fail("This account is not an owner / back-office account.");
      return "role";
    }
    if (mode === "retailer" && u.role !== "retailer") {
      fail("This account is not a retailer.");
      return "role";
    }
    loginAs(u.id);
    return "ok";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const em = email.trim();
    const pw = password;
    if (!em || !pw) {
      fail("Enter your email and password.");
      return;
    }

    setBusy(true);

    if (isSupabaseConfigured) {
      const res = await signInWithPassword(em, pw);
      if (!res.ok) {
        fail(res.error || "Invalid email or password");
        return;
      }
      if (mode === "owner" && res.user.role === "retailer") {
        fail("This account is not a back-office account.");
        return;
      }
      if (mode === "retailer" && res.user.role !== "retailer") {
        fail("This account is not a retailer.");
        return;
      }
      setBusy(false);
      setUserFromAuth(res.user);
      toast(`Signed in as ${res.user.name || res.user.email}`);
      return;
    }

    const demo = tryDemoPassword(em, pw);
    if (demo === "ok") {
      setBusy(false);
      return;
    }
    if (demo === "role") return;
    fail(friendlyAuthError("Invalid login credentials"));
  }

  const accent =
    mode === "owner"
      ? {
          ring: "focus:ring-violet-500/30 focus:border-violet-500",
          btn: "bg-violet-600 hover:bg-violet-700",
          title: "text-violet-700 dark:text-violet-400",
          border: "border-violet-200 dark:border-violet-900",
          panel: "bg-violet-50/50 dark:bg-violet-950/20",
        }
      : {
          ring: "focus:ring-emerald-500/30 focus:border-emerald-500",
          btn: "bg-emerald-600 hover:bg-emerald-700",
          title: "text-emerald-700 dark:text-emerald-400",
          border: "border-emerald-200 dark:border-emerald-900",
          panel: "bg-emerald-50/40 dark:bg-emerald-950/20",
        };

  const initials = (brand.name || "SL")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "SL";

  const formFields = (
      <form onSubmit={onSubmit} className={`space-y-3 rounded-2xl border p-4 ${accent.border} ${accent.panel}`} noValidate>
        {error && (
          <div
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Sign-in failed</p>
              <p className="mt-0.5 text-[13px] leading-snug opacity-90">{error}</p>
            </div>
          </div>
        )}

        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Email
          <div className="relative mt-1">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="email"
              required
              autoComplete="username"
              inputMode="email"
              placeholder={mode === "owner" ? "Owner email" : "Shop email"}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              className={
                "h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none transition dark:bg-slate-800 " +
                (error
                  ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  : `border-slate-300 dark:border-slate-600 focus:ring-2 ${accent.ring}`)
              }
            />
          </div>
        </label>

        <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Password
          <div className="relative mt-1">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              className={
                "h-11 w-full rounded-xl border bg-white pl-10 pr-11 text-sm outline-none transition dark:bg-slate-800 " +
                (error
                  ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  : `border-slate-300 dark:border-slate-600 focus:ring-2 ${accent.ring}`)
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={busy}
          className={`h-11 w-full rounded-xl text-sm font-bold text-white transition disabled:opacity-60 ${accent.btn}`}
        >
          {busy ? "Signing in…" : mode === "owner" ? "Sign in as owner" : "Sign in as retailer"}
        </button>

        <p className="text-center text-[11px] text-slate-500">
          {isSupabaseConfigured ? (
            mode === "owner" ? (
              <>
                Account must exist in Supabase Auth with{" "}
                <code className="font-mono">profiles.role = owner</code>
              </>
            ) : (
              <>Must exist in Supabase Auth + profiles (role=retailer)</>
            )
          ) : mode === "owner" ? (
            <>
              Demo: <span className="font-mono font-semibold">owner@shocolottery.aw</span> /{" "}
              <span className="font-mono font-semibold">owner123</span>
            </>
          ) : (
            <>Demo: main@shop.aw / retailer123</>
          )}
        </p>
      </form>
  );

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200/80 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        <div className="mb-8 text-center">
          {brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logo}
              alt={brand.name || "Logo"}
              className="mx-auto mb-3 h-16 w-16 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-lg dark:border-slate-700"
            />
          ) : (
            <div
              className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl text-xl font-extrabold text-white shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent, #7c3aed), var(--accent-hover, #6d28d9))",
              }}
            >
              {initials}
            </div>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {brand.login_welcome?.trim() || brand.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {brand.login_subtitle?.trim() || brand.tagline}
          </p>
        </div>

        {mode === "pick" && (
          <div className="space-y-4">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400">
              Choose sign-in
            </p>
            <button
              type="button"
              onClick={() => {
                setMode("retailer");
                setEmail("");
                setPassword("");
                setError(null);
              }}
              className="flex w-full items-start gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-5 text-left transition hover:border-emerald-400 hover:shadow-md dark:border-emerald-900 dark:bg-emerald-950/40"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow">
                <Store size={22} />
              </span>
              <span>
                <span className="block text-lg font-extrabold text-slate-900 dark:text-white">
                  Retailer
                </span>
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
                setError(null);
              }}
              className="flex w-full items-start gap-4 rounded-2xl border-2 border-violet-200 bg-violet-50/80 p-5 text-left transition hover:border-violet-400 hover:shadow-md dark:border-violet-900 dark:bg-violet-950/40"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow">
                <Building2 size={22} />
              </span>
              <span>
                <span className="block text-lg font-extrabold text-slate-900 dark:text-white">
                  Owner
                </span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                  Back office — games, retailers, results, reports
                </span>
              </span>
            </button>
          </div>
        )}

        {mode === "retailer" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMode("pick")}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600"
            >
              ← Change role
            </button>
            <h2 className={`text-lg font-extrabold ${accent.title}`}>Retailer terminal</h2>
            <p className="text-sm text-slate-500">Sell tickets at your shop. No back-office access.</p>
            {formFields}
            {!isSupabaseConfigured && (
              <>
                <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                  Or one-tap demo
                </p>
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
              </>
            )}
          </div>
        )}

        {mode === "owner" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMode("pick")}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600"
            >
              ← Change role
            </button>
            <h2 className={`text-lg font-extrabold ${accent.title}`}>Owner back office</h2>
            <p className="text-sm text-slate-500">
              Manage games, retailers, results, promotions and reports.
            </p>
            {formFields}
            {!isSupabaseConfigured && (
              <>
                <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                  Or one-tap demo
                </p>
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
              </>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-slate-400">
          Retailer → sell only · Owner → back office only
          {isSupabaseConfigured ? " · Live mode: Supabase Auth required" : ""}
        </p>
      </div>
    </div>
  );
}
