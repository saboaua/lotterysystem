"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Download, LogIn, LogOut, Pencil, Plus, RefreshCw, ScrollText, Trash2, Ticket, Shield } from "lucide-react";
import { AUDIT_ACTIONS, fetchAudit, type AuditEntry } from "@/lib/audit";
import { isSupabaseConfigured } from "@/lib/supabase";

const PAGE = 100;

function iconFor(action: string) {
  switch (action) {
    case "login":
      return <LogIn size={14} className="text-emerald-600" />;
    case "logout":
      return <LogOut size={14} className="text-slate-500" />;
    case "create":
      return <Plus size={14} className="text-indigo-600" />;
    case "delete":
      return <Trash2 size={14} className="text-rose-600" />;
    case "staff":
      return <Shield size={14} className="text-violet-600" />;
    case "cancel_ticket":
    case "redeem_ticket":
    case "topup":
      return <Ticket size={14} className="text-amber-600" />;
    default:
      return <Pencil size={14} className="text-sky-600" />;
  }
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "America/Aruba",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function csvCell(v: unknown) {
  const t = v == null ? "" : String(v);
  return `"${t.replace(/"/g, '""')}"`;
}

export function AuditPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(
    async (append = false, before?: string) => {
      setLoading(true);
      setError("");
      const res = await fetchAudit({ search, action, entity, from, to, before, limit: PAGE });
      setLoading(false);
      if (res.ok === false) {
        setError(res.error);
        return;
      }
      setEntries((prev) => (append ? [...prev, ...res.entries] : res.entries));
      setMore(res.entries.length === PAGE);
    },
    [search, action, entity, from, to]
  );

  useEffect(() => {
    const t = setTimeout(() => void load(false), 250);
    return () => clearTimeout(t);
  }, [load]);

  function exportCsv() {
    const head = ["Time", "User", "Email", "Role", "Action", "Area", "Record", "Summary"];
    const rows = entries.map((e) => [
      e.at,
      e.actor_name,
      e.actor_email,
      e.actor_role,
      AUDIT_ACTIONS[e.action] || e.action,
      e.entity,
      e.entity_id,
      e.summary,
    ]);
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const field =
    "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-3 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ScrollText size={20} /> Audit trail
          </h2>
          <p className="text-xs text-slate-500">
            Who signed in and what was changed. Entries cannot be edited or deleted.
            {!isSupabaseConfigured && " (Demo mode: stored in this browser only.)"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load(false)}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold dark:border-slate-600"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!entries.length}
            className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input
          className={field + " lg:col-span-2"}
          placeholder="Search user, record or text…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={field} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(AUDIT_ACTIONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className={field} value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All areas</option>
          {["game", "bet type", "draw result", "holiday", "promotion", "branding", "ticket design", "fast play game", "retailer", "ticket", "topup", "staff", "role"].map(
            (e) => (
              <option key={e} value={e}>
                {e}
              </option>
            )
          )}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" className={field + " min-w-0 flex-1"} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
          <input type="date" className={field + " min-w-0 flex-1"} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Could not load the audit trail: {error}. Make sure supabase/v2_audit_roles_ranking.sql has been run and you have the
          &quot;Audit trail&quot; permission.
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400 dark:border-slate-700">
              <th className="px-3 py-2.5">Time (Aruba)</th>
              <th className="px-3 py-2.5">User</th>
              <th className="px-3 py-2.5">Action</th>
              <th className="px-3 py-2.5">What happened</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const changes = (e.details as { changes?: Record<string, { from: unknown; to: unknown }> } | undefined)?.changes;
              const expandable = !!changes && Object.keys(changes).length > 0;
              const isOpen = open === e.id;
              return (
                <Fragment key={e.id}>
                  <tr
                    className={
                      "border-b border-slate-100 align-top last:border-0 dark:border-slate-800 " +
                      (expandable ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : "")
                    }
                    onClick={() => expandable && setOpen(isOpen ? null : e.id)}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{fmt(e.at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold">{e.actor_name || "—"}</div>
                      <div className="text-[11px] text-slate-400">{e.actor_role}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold dark:bg-slate-800">
                        {iconFor(e.action)}
                        {AUDIT_ACTIONS[e.action] || e.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {e.summary}
                      {expandable && <span className="ml-2 text-[11px] font-bold text-indigo-500">{isOpen ? "hide" : "details"}</span>}
                    </td>
                  </tr>
                  {isOpen && changes && (
                    <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                      <td colSpan={4} className="px-3 py-3">
                        <div className="grid gap-1.5 text-xs">
                          {Object.entries(changes).map(([k, v]) => (
                            <div key={k} className="flex flex-wrap items-baseline gap-2">
                              <span className="w-36 shrink-0 font-bold text-slate-600 dark:text-slate-300">{k}</span>
                              <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-rose-700 line-through dark:bg-rose-950/40">
                                {JSON.stringify(v.from)}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-700 dark:bg-emerald-950/40">
                                {JSON.stringify(v.to)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && entries.length === 0 && !error && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-400">
                  No entries match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        {loading ? (
          <span className="text-sm text-slate-400">Loading…</span>
        ) : (
          more && (
            <button
              type="button"
              onClick={() => void load(true, entries[entries.length - 1]?.at)}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold dark:border-slate-600"
            >
              Load older entries
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default AuditPanel;
