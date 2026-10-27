"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { TicketScheduleMessage } from "@/lib/types";
import { buildJackpotTokenContext, listJackpotTokenHelp } from "@/lib/jackpot-tokens";

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
    games.find((g) => g.id === d.preview_game_id) ||
    games.find((g) => g.format === "jackpot" && g.enabled) ||
    games.find((g) => g.enabled) ||
    games[0];
  const activePromo = promotions.find((p) => p.active);

  const ctx = useMemo((): Record<string, string> => {
    const jpCtx = buildJackpotTokenContext(games, previewGame);
    return {
      date: new Date().toLocaleDateString(),
      draw_time: previewGame?.draw_time || "",
      game: previewGame?.name || "",
      game1: previewGame?.name || "",
      amount: "2.00",
      currency,
      retailer: shop?.name || "",
      ticket_id: "T00001234",
      promo: activePromo?.label || "",
      ...jpCtx,
    };
  }, [previewGame, shop, currency, activePromo, games]);

  const retailerBlock = fillTokens(
    d.retailer_template || "Shop #{number} · {name}\n{address}\nTel {phone}",
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

  function isInWindow(m: TicketScheduleMessage, now = new Date()) {
    const t = now.getTime();
    if (m.start) {
      const s = new Date(m.start).getTime();
      if (!Number.isNaN(s) && t < s) return false;
    }
    if (m.end) {
      const e = new Date(m.end).getTime();
      if (!Number.isNaN(e) && t > e) return false;
    }
    return true;
  }

  function scheduleAt(
    placement: string,
    relative?: "before_manual" | "after_manual" | "any"
  ) {
    return schedule
      .filter((m) => m.enabled && m.placement === placement)
      .filter((m) => isInWindow(m))
      .filter(
        (m) =>
          !m.game_ids?.length ||
          (previewGame && m.game_ids.includes(previewGame.id))
      )
      .filter((m) => {
        if (relative === "any" || relative == null) return true;
        const rel = m.relative_to_motd || "after_manual";
        return rel === relative;
      });
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
              value={d.font || "mono"}
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
              value={d.size || 13}
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
              min={20}
              max={120}
              className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
              value={d.logo_height || 40}
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
                updateTicketDesign({ paper_size: e.target.value as "58mm" | "80mm" | "A4" })
              }
            >
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
              <option value="A4">A4</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-indigo-700 sm:col-span-2">
            Preview game (controls ticket line + jackpot tokens)
            <select
              className="mt-1 h-10 w-full rounded-xl border-2 border-indigo-400 bg-[var(--key)] px-3 text-sm font-semibold"
              value={d.preview_game_id || previewGame?.id || ""}
              onChange={(e) => updateTicketDesign({ preview_game_id: e.target.value })}
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.format === "jackpot" && g.jackpot_current != null
                    ? ` · JP ${Number(g.jackpot_current).toLocaleString()}`
                    : g.format === "jackpot"
                      ? " · jackpot"
                      : ""}
                </option>
              ))}
            </select>
            <span className="mt-0.5 block text-[10px] font-normal text-[var(--mut)]">
              Switch games here to see how each ticket will look (jackpot pool, draw time, schedule
              messages filtered to that game).
            </span>
          </label>
          <label className="text-xs font-semibold text-[var(--mut)]">
            QR size (px)
            <input
              type="number"
              min={60}
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
              defaultValue={d.qr_prefix || ""}
              onBlur={(e) => updateTicketDesign({ qr_prefix: e.target.value })}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          {(
            [
              ["show_logo", "Logo"],
              ["show_name", "Name"],
              ["show_retailer", "Retailer"],
              ["show_datetime", "Date/time"],
              ["show_barcode", "Barcode (Code 128)"],
              ["show_qr", "QR Code"],
              ["show_jackpot", "Jackpot line"],
              ["bold_total", "Bold total"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={key === "show_qr" ? !!d[key] : d[key] !== false}
                onChange={(e) => updateTicketDesign({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        <label className="block text-[11px] font-semibold text-[var(--mut)]">
          Jackpot line text
          <input
            className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
            defaultValue={d.jackpot_text || "Jackpot: {currency} {jackpot}"}
            onBlur={(e) => updateTicketDesign({ jackpot_text: e.target.value })}
            placeholder="Jackpot: {currency} {jackpot}"
          />
          <span className="mt-0.5 block text-[10px] font-normal text-[var(--mut)]">
            Tokens: {"{currency} {jackpot} {prev_jackpot}"}
            {listJackpotTokenHelp(games).length
              ? " · " + listJackpotTokenHelp(games).join(" · ")
              : ""}
            . Set Preview game to a jackpot game (e.g. Lotto Mac) to see the progressive pool.
          </span>
        </label>

        <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--key)]/40 p-3">
          <div className="text-xs font-bold uppercase text-[var(--mut)]">
            Message of the day (manual)
          </div>
          <p className="text-[11px] text-[var(--mut)]">
            Always prints under TOTAL (or after promo). Schedule lines at the same placement can sit
            before or after this text. example: BBO and AZV included!
          </p>
          <textarea
            className="min-h-[64px] w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 py-2 text-sm"
            defaultValue={d.manual_text || ""}
            placeholder="Manual text of the day…"
            onBlur={(e) => updateTicketDesign({ manual_text: e.target.value })}
          />
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
            Tokens: {"{game} {jackpot} {prev_jackpot} {date} {draw_time} {currency} {promo}"}
            {listJackpotTokenHelp(games).length
              ? " · named: " + listJackpotTokenHelp(games).map((t) => t.split(" = ")[0]).join(" ")
              : ""}
            . Set start/end to limit when the message prints. Leave game filter empty = all games.
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
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-[10px] font-semibold text-[var(--mut)]">
                  Start (calendar + time)
                  <input
                    type="datetime-local"
                    className="mt-0.5 h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-xs"
                    defaultValue={m.start || ""}
                    onBlur={(e) => {
                      const next = schedule.map((x, i) =>
                        i === idx
                          ? { ...x, start: e.target.value || undefined }
                          : x
                      );
                      setSchedule(next);
                    }}
                  />
                </label>
                <label className="text-[10px] font-semibold text-[var(--mut)]">
                  End (calendar + time)
                  <input
                    type="datetime-local"
                    className="mt-0.5 h-8 w-full rounded-lg border border-[var(--line)] bg-[var(--key)] px-2 text-xs"
                    defaultValue={m.end || ""}
                    onBlur={(e) => {
                      const next = schedule.map((x, i) =>
                        i === idx
                          ? { ...x, end: e.target.value || undefined }
                          : x
                      );
                      setSchedule(next);
                    }}
                  />
                </label>
              </div>
              <div className="w-full">
                <div className="mb-1 text-[10px] font-semibold text-[var(--mut)]">
                  Games (empty = all)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {games.map((g) => {
                    const ids = m.game_ids || [];
                    const on = ids.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className={
                          "flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] " +
                          (on
                            ? "border-indigo-500 bg-indigo-500/15 font-bold text-indigo-700"
                            : "border-[var(--line)] text-[var(--mut)]")
                        }
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          onChange={() => {
                            const nextIds = on
                              ? ids.filter((x) => x !== g.id)
                              : [...ids, g.id];
                            const next = schedule.map((x, i) =>
                              i === idx ? { ...x, game_ids: nextIds } : x
                            );
                            setSchedule(next);
                          }}
                        />
                        {g.name}
                      </label>
                    );
                  })}
                </div>
              </div>
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

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase text-[var(--mut)]">
          Live ticket preview · {paper}
        </h3>
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
          {d.show_logo !== false && logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="mx-auto mb-2 object-contain"
              style={{ height: d.logo_height || 40 }}
            />
          ) : null}
          {d.show_name !== false ? (
            <div className="text-base font-extrabold">{d.header || brand.name}</div>
          ) : null}
          {d.show_retailer !== false ? (
            <div className="mt-1 whitespace-pre-line text-[11px] text-slate-600">{retailerBlock}</div>
          ) : null}
          {d.show_datetime !== false ? (
            <div className="text-[10px] text-slate-500">T00001234 · {ctx.date}</div>
          ) : null}
          <div className="my-2 border-t border-dashed border-slate-300" />
          {scheduleAt("header").map((m) => (
            <div key={m.id} className="mt-1 text-[11px] text-slate-700">
              {fillTokens(m.text, ctx)}
            </div>
          ))}
          <div className="text-left text-[12px]">
            <div className="flex justify-between border-b border-dotted border-slate-200 py-0.5">
              <span>
                <span className="font-bold">{previewGame?.name || "Game"}</span>
                <br />
                <span className="text-[11px]">
                  {previewGame?.format === "jackpot" ? "1 2 3 4 5 + 6" : "1234"} · Today
                  {previewGame?.draw_time ? ` · ${previewGame.draw_time}` : ""}
                </span>
              </span>
              <span className="font-semibold">
                {currency} 2.00
              </span>
            </div>
          </div>
          {scheduleAt("after_lines").map((m) => (
            <div key={m.id} className="mt-1 text-[11px] text-slate-700">
              {fillTokens(m.text, ctx)}
            </div>
          ))}
          {d.show_jackpot !== false && previewGame?.format === "jackpot" ? (
            <div className="mt-1 text-[11px] font-semibold">
              {fillTokens(d.jackpot_text || "Jackpot: {currency} {jackpot}", ctx)}
            </div>
          ) : null}
          {scheduleAt("before_total").map((m) => (
            <div key={m.id} className="mt-1 text-[11px] text-slate-700">
              {fillTokens(m.text, ctx)}
            </div>
          ))}
          <div className="mt-2 border-t border-dashed border-black pt-1 text-base font-extrabold">
            TOTAL {currency} 2.00
          </div>
          {(d.motd_placement || "after_total") === "after_total" ? (
            <>
              {scheduleAt("after_total", "before_manual").map((m) => (
                <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                  {fillTokens(m.text, ctx)}
                </div>
              ))}
              {d.manual_text &&
              (!(d.manual_text_game_ids || []).length ||
                (previewGame && (d.manual_text_game_ids || []).includes(previewGame.id))) ? (
                <div className="mt-1 text-[11px] text-slate-700">{fillTokens(d.manual_text, ctx)}</div>
              ) : null}
              {scheduleAt("after_total", "after_manual").map((m) => (
                <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                  {fillTokens(m.text, ctx)}
                </div>
              ))}
            </>
          ) : (
            scheduleAt("after_total").map((m) => (
              <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                {fillTokens(m.text, ctx)}
              </div>
            ))
          )}
          {activePromo ? (
            <div className="mt-2 rounded border border-dashed border-black p-2 text-center text-[11px]">
              <div className="font-extrabold">{activePromo.label}</div>
              <div>Qualified for promotion</div>
              <div className="font-mono text-sm font-black tracking-widest">123456</div>
            </div>
          ) : null}
          {(d.motd_placement || "after_total") === "after_promo" ? (
            <>
              {scheduleAt("after_promo", "before_manual").map((m) => (
                <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                  {fillTokens(m.text, ctx)}
                </div>
              ))}
              {d.manual_text &&
              (!(d.manual_text_game_ids || []).length ||
                (previewGame && (d.manual_text_game_ids || []).includes(previewGame.id))) ? (
                <div className="mt-1 text-[11px] text-slate-700">{fillTokens(d.manual_text, ctx)}</div>
              ) : null}
              {scheduleAt("after_promo", "after_manual").map((m) => (
                <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                  {fillTokens(m.text, ctx)}
                </div>
              ))}
            </>
          ) : (
            scheduleAt("after_promo").map((m) => (
              <div key={m.id} className="mt-1 text-[11px] text-slate-700">
                {fillTokens(m.text, ctx)}
              </div>
            ))
          )}
          {d.show_barcode !== false ? (
            <div className="mt-2 text-center text-[10px] tracking-widest text-slate-500">|||| T00001234 ||||</div>
          ) : null}
          {d.show_qr ? (
            <div className="mt-2 text-center text-[10px] text-slate-400">[QR]</div>
          ) : null}
          <div className="mt-2 text-[11px]">{d.footer || "Good luck!"}</div>
          {scheduleAt("footer").map((m) => (
            <div key={m.id} className="mt-1 text-[11px] text-slate-700">
              {fillTokens(m.text, ctx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
