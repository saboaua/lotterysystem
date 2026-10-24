"use client";

import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Game, Retailer } from "@/lib/types";
import { PromosPanel } from "./office/PromosPanel";
import { ResultsPanel } from "./office/ResultsPanel";

type Sub =
  | "games"
  | "brand"
  | "ticket"
  | "promos"
  | "results"
  | "reports"
  | "retailers";

const TABS: { id: Sub; label: string }[] = [
  { id: "games", label: "Games & schedule" },
  { id: "brand", label: "Branding & message" },
  { id: "ticket", label: "Ticket design" },
  { id: "promos", label: "Promotions" },
  { id: "results", label: "Results & holidays" },
  { id: "reports", label: "Reports" },
  { id: "retailers", label: "Retailers" },
];

export function OfficeScreen() {
  const [sub, setSub] = useState<Sub>("games");

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm ${
              sub === t.id
                ? "bg-indigo-600 text-white"
                : "bg-[var(--card)] text-[var(--ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {sub === "games" && <GamesPanel />}
        {sub === "brand" && <BrandPanel />}
        {sub === "ticket" && <TicketDesignPanel />}
        {sub === "promos" && <PromosPanel />}
        {sub === "results" && <ResultsPanel />}
        {sub === "reports" && <ReportsPanel />}
        {sub === "retailers" && <RetailersPanel />}
      </div>
    </div>
  );
}

function GamesPanel() {
  const { games, betTypes, updateGame, updateBetType, addGame, deleteGame, toast, currency } =
    useStore();
  const [openId, setOpenId] = useState<string | null>(games[0]?.id ?? null);

  function onAddGame() {
    const id = `game_${Date.now().toString(36)}`;
    const g: Game = {
      id,
      name: "New game",
      color: "#6366f1",
      format: "digit",
      digits: 4,
      draw_time: "13:00",
      cutoff: "12:45",
      enabled: true,
      bet_types: ["4_cifra", "3_cifra", "2_cifra_3ch", "4_skina", "3_skina", "2_cifra_bf", "2_cifra_b"],
    };
    addGame(g);
    setOpenId(id);
    toast("Game added");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Games & schedule</h2>
          <p className="text-xs text-[var(--mut)]">Tap a row to expand. Format controls digits, zodiac, Play Whe, or jackpot.</p>
        </div>
        <button type="button" onClick={onAddGame} className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          <Plus size={16} /> Add game
        </button>
      </div>
      <div className="space-y-2">
        {games.map((g) => {
          const open = openId === g.id;
          return (
            <div key={g.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
              <button type="button" onClick={() => setOpenId(open ? null : g.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: g.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{g.name}</span>
                  <span className="text-[11px] text-[var(--mut)]">
                    {g.format === "digit" ? `${g.digits}-digit` : g.format === "jackpot" ? `JP ${g.main_count}/${g.main_max}` : g.format}
                    {" "}· draw {g.draw_time} · cut {g.cutoff}
                    {g.jackpot_current != null ? ` · pool ${currency} ${g.jackpot_current.toLocaleString()}` : ""}
                    {g.sessions?.length ? ` · ${g.sessions.map((s) => s.label).join("/")}` : ""}
                  </span>
                </span>
                <span className="text-[var(--mut)]">{open ? "▲" : "▼"}</span>
              </button>
              {open && (
                <div className="space-y-4 border-t border-[var(--line)] bg-[var(--key)]/40 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-[11px] font-semibold text-[var(--mut)]">Name
                      <input className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm" defaultValue={g.name} onBlur={(e) => updateGame(g.id, { name: e.target.value })} />
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">Format
                      <select className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm" value={g.format} onChange={(e) => updateGame(g.id, { format: e.target.value as typeof g.format })}>
                        <option value="digit">Digit number</option>
                        <option value="zodiac">Zodiac</option>
                        <option value="whe">Play Whe</option>
                        <option value="jackpot">Jackpot</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                      <input type="checkbox" checked={g.enabled} onChange={(e) => updateGame(g.id, { enabled: e.target.checked })} /> Show on sell
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">Draw time
                      <input className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm" defaultValue={g.draw_time} onBlur={(e) => updateGame(g.id, { draw_time: e.target.value })} />
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">Cut-off
                      <input className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm" defaultValue={g.cutoff} onBlur={(e) => updateGame(g.id, { cutoff: e.target.value })} />
                    </label>
                    <label className="text-[11px] font-semibold text-[var(--mut)]">Color
                      <input type="color" className="mt-1 h-10 w-full rounded-xl border border-[var(--line)]" value={g.color} onChange={(e) => updateGame(g.id, { color: e.target.value })} />
                    </label>
                  </div>
                  {g.format === "digit" && (
                    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--card)]">
                      <table className="w-full text-left text-xs">
                        <thead><tr className="border-b border-[var(--line)] text-[var(--mut)]"><th className="px-3 py-2">Bet</th><th className="px-3 py-2">×</th><th className="px-3 py-2">On</th></tr></thead>
                        <tbody>
                          {betTypes.filter((b) => ["4_cifra","3_cifra","2_cifra_3ch","4_skina","3_skina","2_cifra_bf","2_cifra_b"].includes(b.key)).map((b) => (
                            <tr key={b.key} className="border-b border-[var(--line)] last:border-0">
                              <td className="px-3 py-2 font-semibold">{b.label}</td>
                              <td className="px-3 py-2"><input type="number" className="h-8 w-20 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2" defaultValue={b.multiplier} onBlur={(e) => updateBetType(b.key, { multiplier: parseFloat(e.target.value) || 1 })} /></td>
                              <td className="px-3 py-2"><input type="checkbox" checked={b.enabled} onChange={(e) => updateBetType(b.key, { enabled: e.target.checked })} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => toast("Game saved")} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Save</button>
                    <button type="button" onClick={() => { deleteGame(g.id); setOpenId(null); toast("Game deleted"); }} className="rounded-full bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-600">Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrandPanel() {
  const { brand, updateBrand, toast } = useStore();
  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
      <h2 className="text-lg font-bold">Branding & message</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Lottery name" defaultValue={brand.name} onBlur={(v) => updateBrand({ name: v })} />
        <Field label="Tagline" defaultValue={brand.tagline} onBlur={(v) => updateBrand({ tagline: v })} />
        <label className="text-[11px] font-semibold text-[var(--mut)] sm:col-span-2">LED message
          <input className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm" defaultValue={brand.led_message} onBlur={(e) => updateBrand({ led_message: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={brand.led_on} onChange={(e) => updateBrand({ led_on: e.target.checked })} /> LED on
        </label>
        <label className="text-[11px] font-semibold text-[var(--mut)]">LED color
          <input type="color" className="mt-1 h-10 w-full rounded-xl border border-[var(--line)]" value={brand.led_color} onChange={(e) => updateBrand({ led_color: e.target.value })} />
        </label>
      </div>
      <button type="button" onClick={() => toast("Branding saved")} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Save</button>
    </div>
  );
}

function TicketDesignPanel() {
  const { ticketDesign: d, updateTicketDesign, toast } = useStore();
  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
      <h2 className="text-lg font-bold">Ticket design</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Header" defaultValue={d.header} onBlur={(v) => updateTicketDesign({ header: v })} />
        <Field label="Footer" defaultValue={d.footer} onBlur={(v) => updateTicketDesign({ footer: v })} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        {([["show_logo","Logo"],["show_name","Name"],["show_retailer","Retailer"],["show_barcode","Barcode"],["show_qr","QR"],["bold_total","Bold total"]] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input type="checkbox" checked={!!d[key]} onChange={(e) => updateTicketDesign({ [key]: e.target.checked })} />{label}
          </label>
        ))}
      </div>
      <button type="button" onClick={() => toast("Design saved")} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Save</button>
    </div>
  );
}

function ReportsPanel() {
  const { soldTickets, retailers, currency, user, selectedRetailerId, salesToday, ticketsToday, unpaidPrizes } = useStore();
  const isOwner = user?.role === "owner";
  const list = isOwner ? soldTickets : soldTickets.filter((t) => t.retailer_id === selectedRetailerId);
  const sold = list.filter((t) => t.status !== "cancelled");
  const sales = sold.reduce((s, t) => s + t.total, 0);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h2 className="text-lg font-bold">Reports</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Tickets" value={String(sold.length)} />
        <Kpi label={`Sales (${currency})`} value={sales.toFixed(2)} />
        <Kpi label="Today" value={`${ticketsToday} / ${salesToday.toFixed(2)}`} />
        <Kpi label="Unpaid prizes" value={unpaidPrizes.toFixed(2)} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-[var(--line)] text-[var(--mut)]"><th className="px-3 py-2">Ticket</th><th className="px-3 py-2">Shop</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Promo</th></tr></thead>
          <tbody>
            {list.slice(0, 50).map((t) => (
              <tr key={t.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-3 py-2 font-mono font-semibold">{t.id}</td>
                <td className="px-3 py-2">{retailers.find((r) => r.id === t.retailer_id)?.name || t.retailer_id}</td>
                <td className="px-3 py-2">{currency} {t.total.toFixed(2)}</td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2 font-mono">{t.promo_code || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RetailersPanel() {
  const { retailers, updateRetailer, addRetailer, toast } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Retailers</h2>
        <button type="button" onClick={() => { const r = addRetailer({ number: String(retailers.length + 1).padStart(3, "0"), name: "New shop", commission_sell: 10, commission_redeem: 2, active: true }); setOpenId(r.id); toast("Retailer added"); }} className="flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          <Plus size={16} /> Add
        </button>
      </div>
      <ArubaMap retailers={retailers} onSelect={setOpenId} />
      <div className="space-y-2">
        {retailers.map((r) => {
          const open = openId === r.id;
          return (
            <div key={r.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
              <button type="button" onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-600">#{r.number}</span>
                <span className="min-w-0 flex-1 text-sm font-bold">{r.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.active ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-600"}`}>{r.active ? "Active" : "Off"}</span>
              </button>
              {open && (
                <div className="grid gap-3 border-t border-[var(--line)] bg-[var(--key)]/40 px-4 py-4 sm:grid-cols-2">
                  <Field label="Name" defaultValue={r.name} onBlur={(v) => updateRetailer(r.id, { name: v })} />
                  <Field label="Phone" defaultValue={r.phone || ""} onBlur={(v) => updateRetailer(r.id, { phone: v })} />
                  <Field label="Sell %" defaultValue={String(r.commission_sell)} onBlur={(v) => updateRetailer(r.id, { commission_sell: parseFloat(v) || 0 })} />
                  <Field label="Redeem %" defaultValue={String(r.commission_redeem)} onBlur={(v) => updateRetailer(r.id, { commission_redeem: parseFloat(v) || 0 })} />
                  <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                    <input type="checkbox" checked={r.active} onChange={(e) => updateRetailer(r.id, { active: e.target.checked })} /> Active
                  </label>
                  <button type="button" onClick={() => toast("Saved")} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white sm:col-span-2">Save</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, defaultValue, value, onChange, onBlur }: { label: string; defaultValue?: string; value?: string; onChange?: (v: string) => void; onBlur?: (v: string) => void }) {
  return (
    <label className="text-[11px] font-semibold text-[var(--mut)]">{label}
      <input className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm text-[var(--ink)]" defaultValue={defaultValue} value={value} onChange={onChange ? (e) => onChange(e.target.value) : undefined} onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined} />
    </label>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
      <div className="text-[10px] uppercase text-[var(--mut)]">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
    </div>
  );
}

function ArubaMap({ retailers, onSelect }: { retailers: Retailer[]; onSelect: (id: string) => void }) {
  const nOn = retailers.filter((r) => r.active).length;
  const toXY = (lat?: number, lng?: number) => {
    if (lat == null || lng == null) return { x: 150, y: 100 };
    return { x: ((lng + 70.1) / 0.25) * 280 + 40, y: ((12.62 - lat) / 0.22) * 180 + 20 };
  };
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm">
      <svg viewBox="0 0 360 220" className="h-auto w-full">
        <rect width="360" height="220" rx="12" fill="var(--key)" />
        <text x="180" y="24" textAnchor="middle" fontSize="12" fill="var(--mut)">Aruba retailers</text>
        {retailers.map((r) => {
          const { x, y } = toXY(r.lat, r.lng);
          return (
            <g key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={7} fill={r.active ? "#22c55e" : "#f43f5e"} stroke="#fff" strokeWidth={1.5} />
              <title>#{r.number} {r.name}</title>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-4 text-[11px] text-[var(--mut)]">
        <span className="flex items-center gap-1"><MapPin size={12} className="text-emerald-500" /> Active ({nOn})</span>
        <span>Total {retailers.length}</span>
      </div>
    </div>
  );
}
