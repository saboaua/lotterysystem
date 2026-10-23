"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { useStore } from "@/lib/store";

export function SupportScreen() {
  const { supportTickets, selectedRetailerId, addSupport, toast, user } = useStore();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const mine =
    user?.role === "owner"
      ? supportTickets
      : supportTickets.filter((t) => t.retailer_id === selectedRetailerId);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-600">
          <LifeBuoy size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold">Support</h1>
          <p className="text-sm text-[var(--mut)]">
            {user?.role === "owner"
              ? "All retailer support tickets"
              : "Open a ticket for the lottery operator"}
          </p>
        </div>
      </div>

      {user?.role === "retailer" && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm">
          <h2 className="mb-3 font-bold">New ticket</h2>
          <input
            className="mb-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="mb-3 h-28 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 py-2 text-sm"
            placeholder="Describe the issue (printer, terminal, payout…)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            type="button"
            className="h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 font-semibold text-white"
            onClick={() => {
              if (!subject.trim()) return toast("Subject required", true);
              addSupport(subject.trim(), body.trim());
              setSubject("");
              setBody("");
            }}
          >
            Submit ticket
          </button>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-bold">Tickets</h2>
        {mine.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{t.subject}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  t.status === "open"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : t.status === "closed"
                      ? "bg-slate-500/15 text-slate-600"
                      : "bg-sky-500/15 text-sky-700"
                }`}
              >
                {t.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--mut)]">{t.body || "—"}</p>
            <p className="mt-1 text-[11px] text-[var(--mut)]">
              {t.id} · {t.created_at.slice(0, 16).replace("T", " ")}
            </p>
          </div>
        ))}
        {!mine.length && (
          <p className="py-8 text-center text-sm text-[var(--mut)]">No support tickets yet</p>
        )}
      </div>
    </div>
  );
}
