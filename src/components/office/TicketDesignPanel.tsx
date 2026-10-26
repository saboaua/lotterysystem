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
        </div>

        {/* Message of the day (manual) */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--key)]/40 p-3 space-y-2">
          <div className="text-xs font-bold uppercase text-[var(--mut)]">
            Message of the day (manual)
          </div>
          <p className="text-[11px] text-[var(--mut)]">
            Always prints under TOTAL (or after promo). Schedule lines at the same placement can sit
            before or after this text (each on its own line). example: BBO and AZV included!
          </p>
          <textarea
            className="min-h-[64px] w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 py-2 text-sm"
            defaultValue={d.manual_text || ""}
            placeholder="Manual text of the day…"
            onBlur={(e) => updateTicketDesign({ manual_text: e.target.value })}
          />
          <div className="flex flex-wrap gap-3">
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Place MOTD
              <select
                className="ml-2 h-8 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-xs"
                value={d.motd_placement || "after_total"}
                onChange={(e) =>
                  updateTicketDesign({
                    motd_placement: e.target.value as "after_total" | "after_promo",
                  })
                }
              >
                <option value="after_total">After total</option>
                <option value="after_promo">After promo code</option>
              </select>
            </label>
          </div>
          <div className="text-[11px] font-semibold text-[var(--mut)]">Games (empty = all)</div>
          <div className="flex flex-wrap gap-2">
            {games.map((g) => {
              const ids = d.manual_text_game_ids || [];
              const on = ids.includes(g.id);
              return (
                <label
                  key={g.id}
                  className={`flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                    on
                      ? "border-indigo-500 bg-indigo-500/15 font-bold text-indigo-700"
                      : "border-[var(--line)] text-[var(--mut)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => {
                      const next = on ? ids.filter((x) => x !== g.id) : [...ids, g.id];
                      updateTicketDesign({ manual_text_game_ids: next });
                    }}
                  />
                  {g.name}
                </label>
              );
            })}
          </div>
        </div>

        {/* Scheduled messages */}
        <div className="space-y-2">
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
                    id: "sm" + Date.now(),
                    label: "Message",
                    text: "",
                    game_ids: [],
                    enabled: true,
                    placement: "after_lines",
                    relative_to_motd: "after_manual",
                  },
                ])
              }
              className="flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          <p className="text-[11px] text-[var(--mut)]">
            Tokens: {"{game} {jackpot} {date} {draw_time} {currency} {promo}"}. After total/promo:
            choose before or after manual text (manual is under total; schedule on its own line).
          </p>
          {schedule.map((m, idx) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--key)]/50 p-2"
            >
              <input
                className="h-8 min-w-[100px] flex-1 rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-xs"
                defaultValue={m.label}
                placeholder="Label"
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
                <option value="after_total">After total</option>
                <option value="after_promo">After promo code</option>
                <option value="footer">Footer</option>
              </select>
              {(m.placement === "after_total" || m.placement === "after_promo") && (
                <select
                  className="h-8 rounded-lg border border-[var(--line)] bg-[var(--key)] px-1 text-xs"
                  value={m.relative_to_motd || "after_manual"}
                  title="Order vs manual text"
                  onChange={(e) => {
                    const next = schedule.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            relative_to_motd: e.target.value as
                              | "before_manual"
                              | "after_manual",
                          }
                        : x
                    );
                    setSchedule(next);
                  }}
                >
                  <option value="before_manual">Before manual</option>
                  <option value="after_manual">After manual</option>
                </select>
              )}
              <label className="flex items-center gap-1 text-[11px]">
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
                onClick={() => setSchedule(schedule.filter((_, i) => i !== idx))}
                className="rounded-lg p-1 text-rose-500"
              >
                <Trash2 size={14} />
              </button>
              <textarea
                className="min-h-[48px] w-full rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 py-1 text-xs"
                defaultValue={m.text}
                placeholder="Message text…"
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

      {/* Live preview */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase text-[var(--mut)]">Preview</h3>
        <div
          className="mx-auto rounded-lg border border-dashed border-slate-300 bg-white p-3 text-black shadow-inner"
          style={{
            width: previewWidth,
            fontFamily:
              d.font === "serif"
                ? "Georgia, serif"
                : d.font === "sans"
                  ? "system-ui, sans-serif"
                  : "ui-monospace, monospace",
            fontSize: (d.size || 13) + "px",
            textAlign: d.align || "center",
          }}
        >
          {d.show_logo && logoSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="mx-auto mb-2 object-contain"
              style={{ height: d.logo_height || 40 }}
            />
          )}
          {d.show_name !== false && (
            <div className="text-base font-extrabold">{d.header || brand.name}</div>
          )}
          {d.show_retailer && (
            <div className="mt-1 whitespace-pre-line text-[11px] text-slate-600">{retailerBlock}</div>
          )}
          <div className="my-2 border-t border-dashed border-slate-300" />
          <div className="text-left text-[12px]">
            <div className="flex justify-between border-b border-dotted border-slate-200 py-0.5">
              <span>
                <span className="font-bold">{previewGame?.name || "Game"}</span>
                <br />
                <span className="text-[11px]">1234 · Today</span>
              </span>
              <span className="font-semibold">{currency} 2.00</span>
            </div>
          </div>
          <div className="mt-2 border-t border-dashed border-black pt-1 text-base font-extrabold">
            TOTAL {currency} 2.00
          </div>
          {/* after_total: schedule before_manual, then MOTD, then after_manual */}
          {(d.motd_placement || "after_total") === "after_total" &&
            schedule
              .filter((m) => m.enabled && m.placement === "after_total")
              .filter((m) => (m.relative_to_motd || "after_manual") === "before_manual")
              .map((m) => (
                <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                  {fillTokens(m.text, ctx)}
                </div>
              ))}
          {(d.motd_placement || "after_total") === "after_total" &&
            d.manual_text &&
            (!(d.manual_text_game_ids || []).length ||
              (previewGame && (d.manual_text_game_ids || []).includes(previewGame.id))) && (
              <div className="mt-2 text-[11px] text-slate-600">{fillTokens(d.manual_text, ctx)}</div>
            )}
          {(d.motd_placement || "after_total") === "after_total" &&
            schedule
              .filter((m) => m.enabled && m.placement === "after_total")
              .filter((m) => (m.relative_to_motd || "after_manual") === "after_manual")
              .map((m) => (
                <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                  {fillTokens(m.text, ctx)}
                </div>
              ))}
          {activePromo && (
            <div className="mt-2 border border-dashed border-black p-2 text-center text-[11px]">
              <div className="font-extrabold">{activePromo.label}</div>
              <div className="font-mono text-sm font-black tracking-widest">DEMOCODE</div>
            </div>
          )}
          {(d.motd_placement || "after_total") === "after_promo" &&
            schedule
              .filter((m) => m.enabled && m.placement === "after_promo")
              .filter((m) => (m.relative_to_motd || "after_manual") === "before_manual")
              .map((m) => (
                <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                  {fillTokens(m.text, ctx)}
                </div>
              ))}
          {(d.motd_placement || "after_total") === "after_promo" &&
            d.manual_text &&
            (!(d.manual_text_game_ids || []).length ||
              (previewGame && (d.manual_text_game_ids || []).includes(previewGame.id))) && (
              <div className="mt-2 text-[11px] text-slate-600">{fillTokens(d.manual_text, ctx)}</div>
            )}
          {(d.motd_placement || "after_total") === "after_promo" &&
            schedule
              .filter((m) => m.enabled && m.placement === "after_promo")
              .filter((m) => (m.relative_to_motd || "after_manual") === "after_manual")
              .map((m) => (
                <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                  {fillTokens(m.text, ctx)}
                </div>
              ))}
          <div className="mt-3 text-[11px] text-slate-500">{d.footer || "Good luck!"}</div>
        </div>
      </div>
    </div>
  );
}
