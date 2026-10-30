"use client";

import { useState, type FormEvent } from "react";
import { Mail, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { changeEmail, updateMyProfile, type ProfileDetails } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isSupabaseConfigured } from "@/lib/supabase";

const input =
  "mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800";
const label = "block text-[11px] font-semibold text-slate-500";
const card = "space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900";

/** "My profile": name, last name, phone, address and login email for the signed-in user. */
export function MyProfileCard() {
  const { user, patchUser, toast } = useStore();
  const [first, ...rest] = (user?.name || "").split(" ");
  const [d, setD] = useState<ProfileDetails>({
    first_name: user?.first_name ?? first ?? "",
    last_name: user?.last_name ?? rest.join(" "),
    phone: user?.phone ?? "",
    address_line: user?.address_line ?? "",
    city: user?.city ?? "",
    country: user?.country ?? "",
    postal_code: user?.postal_code ?? "",
  });
  const [busy, setBusy] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [pw, setPw] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const set = (k: keyof ProfileDetails) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!d.first_name.trim() && !d.last_name.trim()) return toast("Enter your name", true);
    setBusy(true);
    if (isSupabaseConfigured) {
      const res = await updateMyProfile(d);
      if (res.ok === false) {
        setBusy(false);
        return toast(res.error, true);
      }
    }
    const fullName = [d.first_name.trim(), d.last_name.trim()].filter(Boolean).join(" ") || user.name;
    patchUser({ ...d, name: fullName });
    void logAudit({
      action: "update",
      entity: "account",
      entity_id: user.id,
      summary: `${fullName} updated their profile details`,
    });
    setBusy(false);
    toast("Profile saved");
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const target = newEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) return toast("Enter a valid email address", true);
    if (target === user.email.toLowerCase()) return toast("That is already your email", true);
    setEmailBusy(true);
    const res = await changeEmail(user.email, pw, target);
    setEmailBusy(false);
    if (res.ok === false) return toast(res.error, true);
    void logAudit({
      action: "update",
      entity: "account",
      entity_id: user.id,
      summary: `${user.name || user.email} requested an email change to ${target}`,
    });
    setNewEmail("");
    setPw("");
    toast(`Confirmation sent to ${target}. Your login email changes after you confirm it.`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className={card}>
        <h3 className="flex items-center gap-2 text-base font-bold">
          <UserRound size={17} /> My profile
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            First name
            <input className={input} value={d.first_name} onChange={set("first_name")} autoComplete="given-name" />
          </label>
          <label className={label}>
            Last name
            <input className={input} value={d.last_name} onChange={set("last_name")} autoComplete="family-name" />
          </label>
          <label className={label}>
            Phone
            <input className={input} value={d.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" />
          </label>
          <label className={label}>
            Postal code
            <input className={input} value={d.postal_code} onChange={set("postal_code")} autoComplete="postal-code" />
          </label>
          <label className={label + " sm:col-span-2"}>
            Address
            <input className={input} value={d.address_line} onChange={set("address_line")} autoComplete="street-address" />
          </label>
          <label className={label}>
            City / district
            <input className={input} value={d.city} onChange={set("city")} autoComplete="address-level2" />
          </label>
          <label className={label}>
            Country
            <input className={input} value={d.country} onChange={set("country")} autoComplete="country-name" />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
        {!isSupabaseConfigured && <p className="text-xs text-slate-500">Demo mode: saved on this device only.</p>}
      </form>

      <form onSubmit={submitEmail} className={card}>
        <h3 className="flex items-center gap-2 text-base font-bold">
          <Mail size={17} /> Login email
        </h3>
        <div className="text-sm">
          <div className="text-slate-500">Current email</div>
          <div className="font-bold">{user?.email}</div>
        </div>
        {!isSupabaseConfigured ? (
          <p className="text-sm text-slate-500">Demo mode: the email can only be changed when Supabase is connected.</p>
        ) : (
          <>
            <label className={label}>
              New email
              <input
                type="email"
                className={input}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className={label}>
              Current password (to confirm it&apos;s you)
              <input type="password" className={input} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
            </label>
            <button
              type="submit"
              disabled={emailBusy || !newEmail || !pw}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
            >
              {emailBusy ? "Sending…" : "Send confirmation"}
            </button>
            <p className="text-xs text-slate-500">
              A confirmation link is emailed to the new address (and to the old one). The login email changes only after
              you confirm, until then keep signing in with the current email.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
