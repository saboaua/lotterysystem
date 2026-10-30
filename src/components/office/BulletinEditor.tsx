"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Eye, Newspaper, Pin, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Bulletin, BulletinLevel } from "@/lib/types";
import { arubaToday } from "@/lib/dates";
import { BulletinBoard } from "@/components/BulletinBoard";
import {
  BULLETIN_TEMPLATES,
  needsAck,
  LEVELS,
  LEVEL_ORDER,
  newBulletin,
  safeUrl,
  sortPosts,
  statusOf,
  type BulletinStatus,
} from "@/lib/bulletins";

const TITLE_MAX = 60;
const BODY_MAX = 280;

const STATUS_STYLE: Record<BulletinStatus, string> = {
  live: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-sky-100 text-sky-700",
  expired: "bg-slate-200 text-slate-600",
  off: "bg-slate-100 text-slate-500",
};
const STATUS_LABEL: Record<BulletinStatus, string> = {
  live: "Live",
  scheduled: "Scheduled",
  expired: "Expired",
  off: "Off",
};

const field =
  "mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm";

export function BulletinEditor() {
  const { brand, updateBrand, retailers, toast } = useStore();
  const [posts, setPosts] = useState<Bulletin[]>(brand.bulletins || []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [previewRetailer, setPreviewRetailer] = useState("");
  const [previewDate, setPreviewDate] = useState(arubaToday());
  const [previewDark, setPreviewDark] = useState(false);
  const lastCommitted = useRef(JSON.stringify(brand.bulletins || []));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Bulletin[] | null>(null);
  const today = arubaToday();

  // Pick up changes that arrive from Supabase (another device / tab).
  useEffect(() => {
    const incoming = JSON.stringify(brand.bulletins || []);
    if (incoming !== lastCommitted.current && !pending.current) {
      lastCommitted.current = incoming;
      setPosts(brand.bulletins || []);
    }
  }, [brand.bulletins]);

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) {
      lastCommitted.current = JSON.stringify(pending.current);
      updateBrand({ bulletins: pending.current });
      pending.current = null;
    }
  }
  // Save what is typed when leaving the screen.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => flushRef.current(), []);

  function commit(next: Bulletin[]) {
    setPosts(next);
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  }

  function patch(id: string, p: Partial<Bulletin>, touch = false) {
    commit(
      posts.map((x) =>
        x.id === id ? { ...x, ...p, ...(touch ? { updated_at: new Date().toISOString() } : {}) } : x
      )
    );
  }

  function add(over: Partial<Bulletin> = {}) {
    const n = newBulletin(over);
    commit([n, ...posts]);
    setOpenId(n.id);
  }

  function duplicate(p: Bulletin) {
    const rest: Partial<Bulletin> = { ...p };
    delete rest.id;
    const n = newBulletin({ ...rest, title: `${p.title} (copy)`, pinned: false, updated_at: new Date().toISOString() });
    commit([n, ...posts]);
    setOpenId(n.id);
  }

  function remove(p: Bulletin) {
    if (!window.confirm(`Delete "${p.title || "this post"}"?`)) return;
    commit(posts.filter((x) => x.id !== p.id));
    if (openId === p.id) setOpenId(null);
    toast("Post deleted");
  }

  const ordered = useMemo(() => sortPosts(posts), [posts]);
  const liveCount = posts.filter((p) => statusOf(p, today) === "live").length;
  const previewBrand = useMemo(() => ({ ...brand, bulletins: posts }), [brand, posts]);
  const boardOn = brand.bulletin_on !== false;
  const activeRetailers = retailers.filter((r) => (r.status ?? (r.active ? "active" : "disabled")) === "active");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Newspaper size={18} /> Bulletin board
            </h2>
            <p className="text-xs text-[var(--mut)]">
              News for the seller screen. Sellers can close posts; {liveCount} live now.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-indigo-600"
              checked={boardOn}
              onChange={(e) => updateBrand({ bulletin_on: e.target.checked })}
            />
            Show on sell screens
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => add()}
            className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus size={15} /> New post
          </button>
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--mut)]">Quick start</span>
          {BULLETIN_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => add({ level: t.level, title: t.title, body: t.body })}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-bold hover:bg-[var(--key)]"
            >
              {LEVELS[t.level].icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Posts */}
        <div className="space-y-2">
          {ordered.map((p) => {
            const st = statusOf(p, today);
            const open = openId === p.id;
            const meta = LEVELS[p.level];
            return (
              <div key={p.id} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : p.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={open}
                >
                  <span className="text-xl" aria-hidden>
                    {meta.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold">{p.title || "Untitled post"}</span>
                      {p.pinned && <Pin size={12} className="shrink-0 text-slate-400" />}
                    </span>
                    <span className="block truncate text-xs text-[var(--mut)]">{p.body || "No message yet"}</span>
                  </span>
                  {needsAck(p) && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800" title="Seller must press Got it">
                      Acknowledge
                    </span>
                  )}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${STATUS_STYLE[st]}`}>
                    {STATUS_LABEL[st]}
                  </span>
                  {open ? <ChevronUp size={16} className="shrink-0 text-slate-400" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
                </button>

                {open && (
                  <div className="space-y-3 border-t border-[var(--line)] px-4 py-4">
                    <label className="block text-[11px] font-semibold text-[var(--mut)]">
                      Headline
                      <input
                        className={field + " h-10"}
                        maxLength={TITLE_MAX}
                        value={p.title}
                        onChange={(e) => patch(p.id, { title: e.target.value }, true)}
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-[var(--mut)]">
                      Message
                      <textarea
                        className={field + " min-h-[88px] py-2"}
                        maxLength={BODY_MAX}
                        value={p.body}
                        onChange={(e) => patch(p.id, { body: e.target.value }, true)}
                      />
                      <span className="mt-0.5 block text-right text-[10px]">
                        {p.body.length}/{BODY_MAX}
                      </span>
                    </label>

                    <div>
                      <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">Importance</div>
                      <div className="flex flex-wrap gap-1.5">
                        {LEVEL_ORDER.map((lv: BulletinLevel) => (
                          <button
                            key={lv}
                            type="button"
                            onClick={() => patch(p.id, { level: lv }, true)}
                            className={
                              "rounded-full px-3 py-1.5 text-xs font-bold transition " +
                              (p.level === lv ? LEVELS[lv].chip : "border border-[var(--line)] hover:bg-[var(--key)]")
                            }
                          >
                            {LEVELS[lv].icon} {LEVELS[lv].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label
                      className={
                        "flex items-start gap-3 rounded-xl border p-3 text-sm " +
                        (needsAck(p)
                          ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/20"
                          : "border-[var(--line)]")
                      }
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 accent-indigo-600"
                        checked={needsAck(p)}
                        onChange={(e) => patch(p.id, { require_ack: e.target.checked })}
                      />
                      <span>
                        <span className="block font-bold">Seller must acknowledge</span>
                        <span className="block text-xs text-[var(--mut)]">
                          The post stays open on the sell screen until the seller presses “Got it”. On by default for
                          Important and Urgent; you can switch it on for any type or off for these two.
                        </span>
                      </span>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Show from
                        <input type="date" className={field + " h-10"} value={p.start || ""} onChange={(e) => patch(p.id, { start: e.target.value || undefined })} />
                      </label>
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Hide after
                        <input type="date" className={field + " h-10"} value={p.end || ""} onChange={(e) => patch(p.id, { end: e.target.value || undefined })} />
                      </label>
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Button text (optional)
                        <input className={field + " h-10"} maxLength={24} placeholder="Read more" value={p.link_label || ""} onChange={(e) => patch(p.id, { link_label: e.target.value }, true)} />
                      </label>
                      <label className="text-[11px] font-semibold text-[var(--mut)]">
                        Link (https://…)
                        <input
                          className={field + " h-10 " + (p.link_url && !safeUrl(p.link_url) ? "border-rose-400" : "")}
                          value={p.link_url || ""}
                          onChange={(e) => patch(p.id, { link_url: e.target.value }, true)}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={p.enabled} onChange={(e) => patch(p.id, { enabled: e.target.checked })} />
                        Published
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={!!p.pinned} onChange={(e) => patch(p.id, { pinned: e.target.checked })} />
                        Pin to top
                      </label>
                      <label
                        className={"flex items-center gap-2 " + (needsAck(p) ? "opacity-50" : "")}
                        title={needsAck(p) ? "Not used: sellers acknowledge this post with Got it" : undefined}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-indigo-600"
                          disabled={needsAck(p)}
                          checked={p.dismissible !== false && !needsAck(p)}
                          onChange={(e) => patch(p.id, { dismissible: e.target.checked })}
                        />
                        Sellers can close it
                      </label>
                    </div>

                    <div>
                      <div className="mb-1 text-[11px] font-semibold text-[var(--mut)]">Who sees it</div>
                      <label className="mr-4 inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`aud-${p.id}`}
                          checked={!p.retailer_ids?.length}
                          onChange={() => patch(p.id, { retailer_ids: undefined })}
                        />
                        All retailers
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`aud-${p.id}`}
                          checked={!!p.retailer_ids?.length}
                          onChange={() => patch(p.id, { retailer_ids: activeRetailers.length ? [activeRetailers[0].id] : undefined })}
                        />
                        Selected retailers
                      </label>
                      {!!p.retailer_ids?.length && (
                        <div className="mt-2 grid max-h-40 gap-1 overflow-auto rounded-xl border border-[var(--line)] p-2 sm:grid-cols-2">
                          {activeRetailers.map((r) => {
                            const on = p.retailer_ids!.includes(r.id);
                            return (
                              <label key={r.id} className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  className="accent-indigo-600"
                                  checked={on}
                                  onChange={() => {
                                    const set = new Set(p.retailer_ids);
                                    if (on) set.delete(r.id);
                                    else set.add(r.id);
                                    patch(p.id, { retailer_ids: set.size ? [...set] : undefined });
                                  }}
                                />
                                <span className="truncate">
                                  {r.number} · {r.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 border-t border-[var(--line)] pt-3">
                      <button type="button" onClick={() => duplicate(p)} className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-bold">
                        <Copy size={13} /> Duplicate
                      </button>
                      <button type="button" onClick={() => remove(p)} className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!posts.length && (
            <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--mut)]">
              No posts yet. Use “New post” or a quick start above.
            </div>
          )}

          <div className="rounded-2xl bg-[var(--key)]/60 p-4 text-xs leading-relaxed text-[var(--mut)]">
            <div className="mb-1 font-bold text-[var(--ink)]">Tips for a good bulletin board</div>
            One message per post, headline under 60 characters, and say what the seller should do. Set “Hide after” so old
            news disappears by itself. Keep Urgent for things that stop sales; Important and Urgent stay open until the seller presses “Got it”. Edit a post and it shows again to sellers who
            closed the old version. For something that must be seen this minute, use Broadcast instead.
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-2 lg:self-start">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Eye size={15} /> Seller view (live preview)
              </h3>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--mut)]">
                <input type="checkbox" checked={previewDark} onChange={(e) => setPreviewDark(e.target.checked)} /> Dark
              </label>
            </div>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-[var(--mut)]">
                As retailer
                <select className={field + " h-9"} value={previewRetailer} onChange={(e) => setPreviewRetailer(e.target.value)}>
                  <option value="">Everyone (all posts)</option>
                  {activeRetailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number} · {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-semibold text-[var(--mut)]">
                On date
                <input type="date" className={field + " h-9"} value={previewDate} onChange={(e) => setPreviewDate(e.target.value || arubaToday())} />
              </label>
            </div>
            <div className={previewDark ? "dark rounded-2xl bg-slate-900 p-3" : "rounded-2xl bg-white p-3 ring-1 ring-slate-200"}>
              {boardOn ? (
                <BulletinBoard brand={previewBrand} retailerId={previewRetailer || undefined} userKey="preview" preview previewToday={previewDate} />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
                  The bulletin board is switched off for sell screens.
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[var(--mut)]">
              Sellers see a slim bar that opens to these cards. Changes save automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
