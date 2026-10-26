"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { TicketScheduleMessage } from "@/lib/types";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function fillTokens(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{([a-z0-9_]+)\}/gi, (_, k) => (ctx[k] != null ? ctx[k] : "{" + k + "}"));
}

export function TicketDesignPanel() {
  const {
    ticketDesign: d,
    updateTicketDesign,
    brand,
    games,
    promotions,
    retailers,
    selectedRetailerId,
    currency,
    toast,
  } = useStore();

  const shop = retailers.find((r) => r.id === selectedRetailerId) || retailers[0];
  const previewGame =
    games.find((g) => g.id === d.preview_game_id) || games.find((g) => g.enabled) || games[0];
  const activePromo = promotions.find((p) => p.active);

  const ctx = useMemo(() => {
    const jack = previewGame?.jackpot_current != null ? String(previewGame.jackpot_current) : "-";
    return {
      date: new Date().toLocaleDateString(),
      draw_time: previewGame?.draw_time || "",
      game: previewGame?.name || "",
      game1: previewGame?.name || "",
      amount: "2.00",
      amount1: jack,
      jackpot: jack,
      currency,
      retailer: shop?.name || "",
      ticket_id: "T00001234",
      promo: activePromo?.label || "",
    };
  }, [previewGame, shop, currency, activePromo]);

  const retailerBlock = fillTokens(
    d.retailer_template ||
      "Shop #{number} · {name}\n{address}\nTel {phone}",
    {
      ...ctx,
      number: shop?.number || "",
      name: shop?.name || "",
      address: shop?.address || "",
      phone: shop?.phone || "",
    }
  );

  const schedule = d.schedule_messages || [];

  function setSchedule(next: TicketScheduleMessage[]) {
    updateTicketDesign({ schedule_messages: next });
  }

  const logoSrc = d.logo || brand.logo;
  const paper = d.paper_size || "80mm";
  const previewWidth = paper === "58mm" ? 200 : paper === "A4" ? 320 : 280;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm text-[15px]">
        <h2 className="text-xl font-bold">Ticket design</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[var(--mut)]">
            Header
            <input
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              defaultValue={d.header}
              onBlur={(e) => updateTicketDesign({ header: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            Footer
            <input
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              defaultValue={d.footer}
              onBlur={(e) => updateTicketDesign({ footer: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            Font
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d.font}
              onChange={(e) => updateTicketDesign({ font: e.target.value })}
            >
              <option value="mono">Monospace</option>
              <option value="sans">Sans</option>
              <option value="serif">Serif</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            Body size (px)
            <input
              type="number"
              min={10}
              max={28}
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d.size}
              onChange={(e) => updateTicketDesign({ size: parseInt(e.target.value, 10) || 13 })}
            />
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            Text align
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d.align || "center"}
              onChange={(e) =>
                updateTicketDesign({ align: e.target.value as "left" | "center" | "right" })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            Logo height (px)
            <input
              type="number"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d.logo_height}
              onChange={(e) =>
                updateTicketDesign({ logo_height: parseInt(e.target.value, 10) || 40 })
              }
            />
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            Paper size
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={paper}
              onChange={(e) =>
                updateTicketDesign({
                  paper_size: e.target.value as "58mm" | "80mm" | "A4",
                })
              }
            >
              <option value="58mm">58mm thermal</option>
              <option value="80mm">80mm thermal</option>
              <option value="A4">A4</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            Printer name (hint)
            <input
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              placeholder="e.g. Epson TM-T88"
              defaultValue={d.printer_name || ""}
              onBlur={(e) => updateTicketDesign({ printer_name: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            Preview game
            <select
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d.preview_game_id || previewGame?.id || ""}
              onChange={(e) => updateTicketDesign({ preview_game_id: e.target.value })}
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            QR size (px)
            <input
              type="number"
              min={64}
              max={200}
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d.qr_size || 100}
              onChange={(e) => updateTicketDesign({ qr_size: parseInt(e.target.value, 10) || 100 })}
            />
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            QR prefix (optional)
            <input
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              placeholder="https://check.example/"
              defaultValue={d.qr_prefix || ""}
              onBlur={(e) => updateTicketDesign({ qr_prefix: e.target.value })}
            />
          </label>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--key)]/40 p-3">
          <div className="mb-2 text-xs font-bold uppercase text-[var(--mut)]">Ticket logo</div>
          <div className="flex flex-wrap items-center gap-3">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="" style={{ height: d.logo_height }} className="object-contain" />
            ) : (
              <span className="text-xs text-[var(--mut)]">Using brand logo if set</span>
            )}
            <label className="cursor-pointer rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 400_000) return toast("Max 400KB", true);
                  updateTicketDesign({ logo: await fileToDataUrl(f), show_logo: true });
                }}
              />
            </label>
          </div>
        </div>

        <label className="block text-xs font-semibold text-[var(--mut)]">
          Retailer info under logo (tokens: {"{name} {number} {address} {phone} {date}"})
          <textarea
            className="mt-1 h-20 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] p-3 text-sm"
            defaultValue={
              d.retailer_template || "Shop #{number} · {name}\n{address}\nTel {phone}"
            }
            onBlur={(e) => updateTicketDesign({ retailer_template: e.target.value })}
          />
        </label>

        <label className="block text-xs font-semibold text-[var(--mut)]">
          Message of the day (shown below TOTAL / price)
          <textarea
            className="mt-1 h-16 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] p-3 text-sm"
            defaultValue={d.manual_text || ""}
            placeholder="Play responsibly · Good luck!"
            onBlur={(e) => updateTicketDesign({ manual_text: e.target.value })}
          />
        </label>

        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          {(
            [
              ["show_logo", "Logo"],
              ["show_name", "Name"],
              ["show_retailer", "Retailer"],
              ["show_datetime", "Date/time"],
              ["show_barcode", "Barcode (Code 128)"],
              ["show_qr", "QR Code"],
              ["bold_total", "Bold total"],
              ["show_jackpot", "Jackpot line"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!d[key]}
                onChange={(e) => updateTicketDesign({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="space-y-2 border-t border-[var(--line)] pt-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase text-[var(--mut)]">
              Scheduled ticket messages · placement
            </div>
            <button
              type="button"
              onClick={() =>
                setSchedule([
                  ...schedule,
                  {
                    id: `tm${Date.now().toString(36)}`,
                    label: "MOTD",
                    text: "Next {game} draw {draw_time} on {date}",
                    game_ids: [],
                    enabled: true,
                    placement: "after_lines",
                  },
                ])
              }
              className="flex items-center gap-1 rounded-full bg-indigo-600/15 px-3 py-1 text-xs font-bold text-indigo-600"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          <p className="text-[11px] text-[var(--mut)]">
            Tokens: {"{game} {jackpot} {date} {draw_time} {currency} {promo}"} — choose where each message appears.
          </p>
          {schedule.map((m, idx) => (
            <div key={m.id} className="space-y-2 rounded-xl border border-[var(--line)] p-2">
              <div className="flex gap-2">
                <input
                  className="h-8 flex-1 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-xs"
                  defaultValue={m.label}
                  onBlur={(e) => {
                    const next = schedule.map((x, i) =>
                      i === idx ? { ...x, label: e.target.value } : x
                    );
                    setSchedule(next);
                  }}
                />
                <select
                  className="h-8 rounded-lg border border-[var(--line)] bg-[var(--key)] px-1 text-xs"
                  value={m.placement}
                  onChange={(e) => {
                    const next = schedule.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            placement: e.target.value as TicketScheduleMessage["placement"],
                          }
                        : x
                    );
                    setSchedule(next);
                  }}
                >
                  <option value="header">Header</option>
                  <option value="after_lines">After lines</option>
                  <option value="before_total">Before total</option>
                  <option value="footer">Footer</option>
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={m.enabled}
                    onChange={(e) => {
                      const next = schedule.map((x, i) =>
                        i === idx ? { ...x, enabled: e.target.checked } : x
                      );
                      setSchedule(next);
                    }}
                  />
                  On
                </label>
                <button
                  type="button"
                  className="text-rose-600"
                  onClick={() => setSchedule(schedule.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <input
                className="h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-xs"
                defaultValue={m.text}
                onBlur={(e) => {
                  const next = schedule.map((x, i) =>
                    i === idx ? { ...x, text: e.target.value } : x
                  );
                  setSchedule(next);
                }}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => toast("Ticket design saved")}
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
        >
          Save design
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-slate-200/80 p-4 dark:bg-slate-950">
        <div className="mb-2 text-center text-[11px] font-bold uppercase text-slate-500">
          Live ticket preview · {paper}
        </div>
        <div
          className="mx-auto rounded-sm bg-white p-4 text-slate-900 shadow-lg"
          style={{
            width: previewWidth,
            fontFamily:
              d.font === "serif"
                ? "Georgia, serif"
                : d.font === "sans"
                  ? "system-ui, sans-serif"
                  : "ui-monospace, monospace",
            fontSize: d.size,
            textAlign: d.align,
          }}
        >
          {d.show_logo && logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="mx-auto mb-2 object-contain"
              style={{ height: d.logo_height }}
            />
          ) : null}
          {d.show_name && <div className="font-bold">{d.header || brand.name}</div>}
          {d.show_retailer && (
            <pre className="mt-1 whitespace-pre-wrap text-[11px] opacity-80">{retailerBlock}</pre>
          )}
          <div className="my-2 border-t border-dashed border-slate-300" />
          {schedule
            .filter((m) => m.enabled && m.placement === "header")
            .map((m) => (
              <div key={m.id} className="text-[11px]">
                {fillTokens(m.text, ctx)}
              </div>
            ))}
          <div className="my-1 text-left text-[11px]">
            <div className="font-bold">{previewGame?.name} · 4 Cifra</div>
            <div>
              1234 · {currency} 2.00 · {ctx.date}
            </div>
          </div>
          {schedule
            .filter((m) => m.enabled && m.placement === "after_lines")
            .map((m) => (
              <div key={m.id} className="text-[11px] italic">
                {fillTokens(m.text, ctx)}
              </div>
            ))}
          {d.show_jackpot && previewGame?.jackpot_current != null && (
            <div className="mt-1 text-[11px] font-semibold">
              {fillTokens(d.jackpot_text || "Jackpot: {currency} {jackpot}", ctx)}
            </div>
          )}
          {schedule
            .filter((m) => m.enabled && m.placement === "before_total")
            .map((m) => (
              <div key={m.id} className="text-[11px]">
                {fillTokens(m.text, ctx)}
              </div>
            ))}
          <div className="my-2 border-t border-dashed border-slate-300" />
          <div className={d.bold_total ? "text-base font-extrabold" : "font-bold"}>
            TOTAL {currency} 2.00
          </div>
          {d.manual_text && (
            <div className="mt-2 text-[11px] text-slate-600">{fillTokens(d.manual_text, ctx)}</div>
          )}
          {activePromo && (
            <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-center text-[11px]">
              <div className="font-bold text-amber-800">{activePromo.label}</div>
              <div className="mt-0.5">Qualified for promotion</div>
              <div className="mt-1 font-mono text-base font-black tracking-widest">CODE 482915</div>
              <div className="mt-0.5 text-amber-900/80">{activePromo.instruction}</div>
            </div>
          )}
          {d.show_barcode && (
            <div className="mt-2 flex justify-center gap-px">
              {Array.from({ length: 40 }).map((_, i) => (
                <span
                  key={i}
                  className="inline-block bg-slate-900"
                  style={{ width: (i * 7) % 3 === 0 ? 2 : 1, height: 32 }}
                />
              ))}
            </div>
          )}
          <div className="mt-1 font-mono text-[10px]">{ctx.ticket_id}</div>
          {d.show_qr && (
            <div className="mt-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  "https://api.qrserver.com/v1/create-qr-code/?size=" +
                  (d.qr_size || 100) +
                  "x" +
                  (d.qr_size || 100) +
                  "&data=" +
                  encodeURIComponent((d.qr_prefix || "") + ctx.ticket_id) +
                  "&margin=1"
                }
                width={d.qr_size || 100}
                height={d.qr_size || 100}
                alt="QR preview"
              />
            </div>
          )}
          <div className="mt-2 text-[11px] opacity-70">{d.footer}</div>
          {schedule
            .filter((m) => m.enabled && m.placement === "footer")
            .map((m) => (
              <div key={m.id} className="text-[11px]">
                {fillTokens(m.text, ctx)}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
