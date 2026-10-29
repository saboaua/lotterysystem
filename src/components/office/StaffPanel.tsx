"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PERMISSION_MODULES } from "@/lib/permissions";
import {
  deleteRole,
  listRoles,
  listStaff,
  saveRole,
  staffAction,
  type StaffMember,
  type StaffRole,
} from "@/lib/staff-api";

const card = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900";
const input =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-800";
const btn = "rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50";

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export function StaffPanel() {
  const { toast, user } = useStore();
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Partial<StaffRole> & { name: string; permissions: string[] }) | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", staff_role_id: "" });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([listRoles(), listStaff()]);
    if (r.ok) setRoles(r.data);
    else toast(`Could not load roles: ${r.error}`, true);
    if (s.ok) setStaff(s.data);
    else toast(`Could not load staff: ${s.error}`, true);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isSupabaseConfigured) void refresh();
    else setLoading(false);
  }, [refresh]);

  if (user?.role !== "owner") {
    return <div className={card + " text-sm text-slate-500"}>Only the owner can manage staff and roles.</div>;
  }
  if (!isSupabaseConfigured) {
    return (
      <div className={card + " text-sm text-slate-500"}>
        Staff accounts and roles are stored in Supabase. Connect Supabase to use this screen.
      </div>
    );
  }

  const roleName = (id: string | null) => roles.find((r) => r.id === id)?.name || "—";

  function togglePerm(mod: string, kind: "view" | "edit") {
    if (!editing) return;
    const set = new Set(editing.permissions);
    const view = `${mod}:view`;
    const edit = `${mod}:edit`;
    if (kind === "view") {
      if (set.has(view)) {
        set.delete(view);
        set.delete(edit);
      } else set.add(view);
    } else if (set.has(edit)) set.delete(edit);
    else {
      set.add(edit);
      set.add(view);
    }
    setEditing({ ...editing, permissions: [...set] });
  }

  async function submitRole() {
    if (!editing) return;
    if (!editing.name.trim()) return toast("Give the role a name", true);
    setBusy(true);
    const res = await saveRole({
      id: editing.id,
      name: editing.name,
      description: editing.description || "",
      permissions: editing.permissions,
    });
    setBusy(false);
    if (res.ok === false) return toast(`Role not saved: ${res.error}`, true);
    toast("Role saved");
    setEditing(null);
    void refresh();
  }

  async function removeRole(role: StaffRole) {
    const inUse = staff.filter((s) => s.staff_role_id === role.id).length;
    if (!window.confirm(`Delete role "${role.name}"?${inUse ? ` ${inUse} staff member(s) will lose access until reassigned.` : ""}`)) return;
    const res = await deleteRole(role);
    if (res.ok === false) return toast(`Could not delete: ${res.error}`, true);
    toast("Role deleted");
    void refresh();
  }

  async function createStaff() {
    if (!form.staff_role_id) return toast("Choose a role", true);
    setBusy(true);
    const res = await staffAction({ action: "create", ...form });
    setBusy(false);
    if (res.ok === false) return toast(res.error, true);
    toast(`Account created for ${form.name}. Share the password securely.`);
    setForm({ name: "", email: "", password: "", staff_role_id: "" });
    setAdding(false);
    void refresh();
  }

  async function act(body: Record<string, unknown>, ok: string) {
    const res = await staffAction(body);
    if (res.ok === false) return toast(res.error, true);
    toast(ok);
    void refresh();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Staff accounts */}
      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Users size={18} /> Staff accounts
          </h2>
          <button
            type="button"
            onClick={() => {
              setAdding((a) => !a);
              setForm((f) => ({ ...f, password: f.password || genPassword() }));
            }}
            className={btn + " flex items-center gap-1.5 bg-indigo-600 text-white"}
          >
            <UserPlus size={15} /> Add staff
          </button>
        </div>

        {adding && (
          <div className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-slate-500">
              Full name
              <input className={input + " mt-1"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-[11px] font-semibold text-slate-500">
              Email (login)
              <input
                type="email"
                className={input + " mt-1"}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="text-[11px] font-semibold text-slate-500">
              Password (min 8)
              <div className="mt-1 flex gap-2">
                <input
                  className={input + " font-mono"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, password: genPassword() })}
                  className="shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-600"
                >
                  Generate
                </button>
              </div>
            </label>
            <label className="text-[11px] font-semibold text-slate-500">
              Role
              <select
                className={input + " mt-1"}
                value={form.staff_role_id}
                onChange={(e) => setForm({ ...form, staff_role_id: e.target.value })}
              >
                <option value="">Choose a role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" disabled={busy} onClick={createStaff} className={btn + " bg-emerald-600 text-white"}>
                Create account
              </button>
              <button type="button" onClick={() => setAdding(false)} className={btn + " bg-slate-200 text-slate-700"}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="text-sm text-slate-500">No staff accounts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2.5 pr-3 font-semibold">{m.name || "—"}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{m.email}</td>
                    <td className="py-2.5 pr-3">
                      <select
                        className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs dark:border-slate-600 dark:bg-slate-800"
                        value={m.staff_role_id ?? ""}
                        onChange={(e) => act({ action: "update", user_id: m.id, staff_role_id: e.target.value }, "Role updated")}
                      >
                        {!m.staff_role_id && <option value="">No role</option>}
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[11px] font-bold " +
                          (m.active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")
                        }
                      >
                        {m.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => act({ action: "update", user_id: m.id, active: !m.active }, m.active ? "Account disabled" : "Account enabled")}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold dark:border-slate-600"
                        >
                          {m.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          title="Reset password"
                          onClick={() => {
                            const pw = window.prompt(`New password for ${m.name || m.email} (min 8 characters):`, genPassword());
                            if (pw) void act({ action: "reset_password", user_id: m.id, password: pw }, "Password reset. Share it securely.");
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold dark:border-slate-600"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          type="button"
                          title="Delete account"
                          onClick={() => {
                            if (window.confirm(`Delete the account for ${m.name || m.email}? This cannot be undone.`))
                              void act({ action: "delete", user_id: m.id }, "Account deleted");
                          }}
                          className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-rose-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Roles */}
      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Shield size={18} /> Roles & permissions
          </h2>
          <button
            type="button"
            onClick={() => setEditing({ name: "", description: "", permissions: [] })}
            className={btn + " flex items-center gap-1.5 bg-indigo-600 text-white"}
          >
            <Plus size={15} /> New role
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {roles.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.description || "No description"}</div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing({ ...r })}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold dark:border-slate-600"
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => removeRole(r)} className="rounded-lg border border-rose-200 px-2 py-1 text-rose-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {PERMISSION_MODULES.filter((m) => r.permissions.includes(`${m.key}:view`)).map((m) => (
                  <span
                    key={m.key}
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-bold " +
                      (r.permissions.includes(`${m.key}:edit`)
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600")
                    }
                  >
                    {m.label}
                    {r.permissions.includes(`${m.key}:edit`) ? " · edit" : " · view"}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                {staff.filter((s) => s.staff_role_id === r.id).length} staff member(s)
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-slate-500">
                Role name
                <input className={input + " mt-1"} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label className="text-[11px] font-semibold text-slate-500">
                Description
                <input
                  className={input + " mt-1"}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </label>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="py-1.5 pr-3">Area</th>
                    <th className="w-16 py-1.5 text-center">View</th>
                    <th className="w-16 py-1.5 text-center">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((m) => (
                    <tr key={m.key} className="border-t border-slate-200/70 dark:border-slate-700">
                      <td className="py-2 pr-3">
                        <div className="font-semibold">{m.label}</div>
                        <div className="text-[11px] text-slate-500">{m.description}</div>
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-indigo-600"
                          checked={editing.permissions.includes(`${m.key}:view`)}
                          onChange={() => togglePerm(m.key, "view")}
                        />
                      </td>
                      <td className="text-center">
                        {m.viewOnly ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-indigo-600"
                            checked={editing.permissions.includes(`${m.key}:edit`)}
                            onChange={() => togglePerm(m.key, "edit")}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Edit includes view. Staff never see Staff &amp; roles; that stays with the owner. Rights are enforced by
              the database, not just hidden in the screen.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={busy} onClick={submitRole} className={btn + " bg-emerald-600 text-white"}>
                Save role
              </button>
              <button type="button" onClick={() => setEditing(null)} className={btn + " bg-slate-200 text-slate-700"}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {roles.length > 0 && editing === null && (
          <p className="mt-3 text-[11px] text-slate-400">
            Currently assigned: {staff.map((s) => `${s.name || s.email} → ${roleName(s.staff_role_id)}`).join(" · ") || "nobody yet"}
          </p>
        )}
      </section>
    </div>
  );
}
