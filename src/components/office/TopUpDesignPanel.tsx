"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import type { TopUpDesign } from "@/lib/types";
import { fillTokens } from "@/lib/print-receipt";
import { getTopUpDesign } from "@/lib/topup";

const inp = "mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm";
const area = "mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 py-2 text-sm";
const lbl = "text-xs font-semibold text-[var(--mut)]";

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm font-semibold">
      <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function TopUpDesignPanel() {
  const { ticketDesign: d, updateTicketDesign, brand, retailers, selectedRetailerId, currency, toast } = useStore();
  const cfg = getTopUpDesign(d);
  const shop = retailers.find((r) => r.id === selectedRetailerId) || retailers[0];
  const [qa, setQa] = useState(cfg.quick_amounts.join(", "));

  const update = (patch: Partial<TopUpDesign>) => updateTicketDesign({ topup: { ...cfg, ...patch } });

  function commitAmounts() {
    const list = qa
      .split(/[,\s]+/)
      .map((x) => parseFloat(x))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 8);
    const next = list.length ? list : cfg.quick_amounts;
    update({ quick_amounts: next });
    setQa(next.join(", "));
  }

  const ctx: Record<string, string> = {
    website: cfg.website,
    code: "K7QM-9XTD",
    player_code: "••••4821",
    amount: "50.00",
    currency,
    retailer: shop?.name || "",
    date: new Date().toLocaleDateString(),
  };
  const fill = (t: string) => fillTokens(t, ctx);

  const paper = d.paper_size || "80mm";
  const previewWidth = paper === "58mm" ? 200 : paper === "A4" ? 320 : 280;
  const logoSrc = d.logo || brand.logo;
  const style: React.CSSProperties = {
    width: previewWidth,
    fontFamily: d.font === "serif" ? "Georgia, serif" : d.font === "sans" ? "system-ui, sans-serif" : "ui-monospace, monospace",
    fontSize: (d.size || 13) + "px",
    textAlign: "center",
  };

  const head = (
    <>
      {d.show_logo !== false && logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoSrc} alt="" className="mx-auto mb-2 object-contain" style={{ height: d.logo_height || 40 }} />
      ) : null}
      {d.show_name !== false && <div className="text-base font-extrabold">{d.header || brand.name}</div>}
      {d.show_retailer !== false && shop && (
        <div className="mt-0.5 text-[11px] text-slate-600">
          Shop #{shop.number} · {shop.name}
        </div>
      )}
      <div className="text-[10px] text-slate-500">TU1A2B3C · {new Date().toLocaleString()}</div>
      <div className="my-2 border-t border-dashed border-slate-300" />
    </>
  );

  const amountBox = (
    <div className="my-1.5 border-y border-dashed border-black py-1.5 text-2xl font-black">
      {currency} 50.00
    </div>
  );

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Wallet size={18} />
          </span>
          Top-up tickets
        </h2>
        <Toggle checked={cfg.enabled} onChange={(v) => update({ enabled: v })}>
          Top Up button enabled on seller POS
        </Toggle>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          {/* Rules */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--mut)]">Rules</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className={lbl}>
                Website shown to players
                <input className={inp} value={cfg.website} onChange={(e) => update({ website: e.target.value.trim() })} />
              </label>
              <label className={lbl}>
                Quick amounts ({currency})
                <input
                  className={inp}
                  value={qa}
                  onChange={(e) => setQa(e.target.value)}
                  onBlur={commitAmounts}
                  placeholder="10, 20, 50, 100"
                />
              </label>
              <label className={lbl}>
                Min / max amount
                <span className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                    value={cfg.min_amount}
                    onChange={(e) => update({ min_amount: parseFloat(e.target.value) || 1 })}
                  />
                  <input
                    type="number"
                    min={1}
                    className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                    value={cfg.max_amount}
                    onChange={(e) => update({ max_amount: parseFloat(e.target.value) || 1000 })}
                  />
                </span>
              </label>
              <label className={lbl}>
                Voucher code length (6–16)
                <input
                  type="number"
                  min={6}
                  max={16}
                  className={inp}
                  value={cfg.code_length}
                  onChange={(e) => update({ code_length: Math.min(16, Math.max(6, parseInt(e.target.value, 10) || 8)) })}
                />
              </label>
              <label className={lbl}>
                Code prefix (optional, max 4)
                <input
                  className={inp + " uppercase"}
                  maxLength={4}
                  value={cfg.code_prefix}
                  onChange={(e) => update({ code_prefix: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() })}
                />
              </label>
              <div className="flex flex-col justify-end">
                <Toggle checked={cfg.print_on_direct} onChange={(v) => update({ print_on_direct: v })}>
                  Print confirmation after adding to account
                </Toggle>
              </div>
            </div>
          </section>

          {/* Voucher */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--mut)]">
              1 · Voucher ticket (seller prints a top-up code)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={lbl}>
                Title
                <input className={inp} value={cfg.voucher_title} onChange={(e) => update({ voucher_title: e.target.value })} />
              </label>
              <label className={lbl}>
                Code label
                <input className={inp} value={cfg.voucher_code_label} onChange={(e) => update({ voucher_code_label: e.target.value })} />
              </label>
              <label className={lbl + " sm:col-span-2"}>
                Text printed below the code
                <textarea rows={2} className={area} value={cfg.voucher_text} onChange={(e) => update({ voucher_text: e.target.value })} />
              </label>
              <label className={lbl + " sm:col-span-2"}>
                Footer (optional)
                <input className={inp} value={cfg.voucher_footer} onChange={(e) => update({ voucher_footer: e.target.value })} />
              </label>
              <div className="sm:col-span-2">
                <Toggle checked={cfg.show_qr} onChange={(v) => update({ show_qr: v })}>
                  Print a QR code that opens the top-up page with the code filled in
                </Toggle>
                {cfg.show_qr && (
                  <label className={lbl}>
                    QR link (tokens {"{website}"} {"{code}"})
                    <input className={inp} value={cfg.qr_url_template} onChange={(e) => update({ qr_url_template: e.target.value })} />
                  </label>
                )}
              </div>
            </div>
          </section>

          {/* Credited */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--mut)]">
              2 · Confirmation ticket (player code was scanned and credited)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={lbl}>
                Title
                <input className={inp} value={cfg.credited_title} onChange={(e) => update({ credited_title: e.target.value })} />
              </label>
              <label className={lbl}>
                Footer (optional)
                <input className={inp} value={cfg.credited_footer} onChange={(e) => update({ credited_footer: e.target.value })} />
              </label>
              <label className={lbl + " sm:col-span-2"}>
                Confirmation text
                <textarea rows={2} className={area} value={cfg.credited_text} onChange={(e) => update({ credited_text: e.target.value })} />
              </label>
            </div>
          </section>

          <p className="text-[11px] text-[var(--mut)]">
            Tokens you can use in the texts: {"{website}"} {"{code}"} {"{amount}"} {"{currency}"} {"{retailer}"} {"{date}"}{" "}
            {"{player_code}"}. Header, logo, font and paper size come from the ticket design above.
          </p>
          <button
            type="button"
            onClick={() => toast("Top-up settings saved")}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white"
          >
            Save top-up settings
          </button>
        </div>

        {/* Live previews */}
        <div className="flex flex-col gap-4 xl:items-center">
          <div>
            <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--mut)]">Voucher preview</div>
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-black shadow-inner" style={style}>
              {head}
              <div className="text-base font-black tracking-wider">{cfg.voucher_title}</div>
              {amountBox}
              <div className="text-[11px]">{fill(cfg.voucher_code_label)}</div>
              <div className="my-1.5 border-2 border-black py-2 font-mono text-xl font-black tracking-[0.14em]">K7QM-9XTD</div>
              {d.show_barcode !== false && <div className="text-[10px] tracking-widest text-slate-500">|||| K7QM9XTD ||||</div>}
              {cfg.show_qr && <div className="mt-1 text-[10px] text-slate-400">[QR]</div>}
              <div className="mt-2 whitespace-pre-line text-[12px] font-semibold">{fill(cfg.voucher_text)}</div>
              {cfg.voucher_footer && <div className="mt-2 text-[11px] text-slate-700">{fill(cfg.voucher_footer)}</div>}
            </div>
          </div>
          <div>
            <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--mut)]">Confirmation preview</div>
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-black shadow-inner" style={style}>
              {head}
              <div className="text-base font-black tracking-wider">{cfg.credited_title}</div>
              {amountBox}
              <div className="text-[11px]">Player account</div>
              <div className="my-1 font-mono text-lg font-black tracking-widest">{ctx.player_code}</div>
              <div className="mt-2 whitespace-pre-line text-[12px] font-semibold">{fill(cfg.credited_text)}</div>
              {cfg.credited_footer && <div className="mt-2 text-[11px] text-slate-700">{fill(cfg.credited_footer)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopUpDesignPanel;
