"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { changePassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isSupabaseConfigured } from "@/lib/supabase";

function strength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) return { score: 1, label: "Too short", color: "bg-rose-500" };
  if (score <= 2) return { score: 2, label: "Weak", color: "bg-amber-500" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-lime-500" };
  return { score: 4, label: "Strong", color: "bg-emerald-500" };
}

const input =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-11 text-sm dark:border-slate-600 dark:bg-slate-800";

/** "Change my password" for the signed-in user. */
export function ChangePasswordCard() {
  const { user, toast } = useStore();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const st = strength(next);
  const mismatch = again.length > 0 && next !== again;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (next.length < 8) return toast("New password must be at least 8 characters", true);
    if (next !== again) return toast("The new passwords do not match", true);
    if (next === current) return toast("Choose a password different from the current one", true);
    setBusy(true);
    const res = await changePassword(user.email, current, next);
    setBusy(false);
    if (res.ok === false) return toast(res.error, true);
    void logAudit({ action: "update", entity: "account", entity_id: user.id, summary: `${user.name || user.email} changed their own password` });
    setCurrent("");
    setNext("");
    setAgain("");
    toast("Password changed");
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <h3 className="flex items-center gap-2 text-base font-bold">
        <KeyRound size={17} /> Change password
      </h3>
      {!isSupabaseConfigured ? (
        <p className="text-sm text-slate-500">Demo mode: passwords can only be changed when Supabase is connected.</p>
      ) : (
        <>
          <label className="block text-[11px] font-semibold text-slate-500">
            Current password
            <div className="relative mt-1">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                className={input}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
          </label>
          <label className="block text-[11px] font-semibold text-slate-500">
            New password (at least 8 characters)
            <div className="relative mt-1">
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                className={input}
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide passwords" : "Show passwords"}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {next && (
            <div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={"h-1.5 flex-1 rounded-full " + (i <= st.score ? st.color : "bg-slate-200 dark:bg-slate-700")} />
                ))}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-slate-500">{st.label}</div>
            </div>
          )}
          <label className="block text-[11px] font-semibold text-slate-500">
            Repeat new password
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              className={input + (mismatch ? " border-rose-400" : "")}
              value={again}
              onChange={(e) => setAgain(e.target.value)}
            />
            {mismatch && <span className="mt-0.5 block text-[11px] text-rose-600">Passwords do not match</span>}
          </label>
          <button
            type="submit"
            disabled={busy || !current || !next || !again}
            className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Update password"}
          </button>
        </>
      )}
    </form>
  );
}
