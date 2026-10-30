"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Newspaper, Pin, X } from "lucide-react";
import type { BrandSettings, Bulletin } from "@/lib/types";
import { arubaToday } from "@/lib/dates";
import { LEVELS, livePosts, safeUrl, timeAgo } from "@/lib/bulletins";

interface Props {
  brand: BrandSettings;
  retailerId?: string;
  /** Who is looking: closed / read state is remembered per user on this device. */
  userKey: string;
  /** Back-office preview: always open, nothing is stored. */
  preview?: boolean;
  /** Preview only: pretend today is this date (YYYY-MM-DD). */
  previewToday?: string;
}

type Marks = Record<string, string>; // post id → updated_at of the version the seller closed / saw

const read = (key: string): Marks => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") as Marks;
  } catch {
    return {};
  }
};
const write = (key: string, v: Marks) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full / blocked: the board still works, it just won't remember */
  }
};

/**
 * Seller bulletin board. Replaces the scrolling ticker:
 *  - static, readable cards (no moving text) with level colours, pinned first, urgent on top
 *  - collapsed to one slim bar; opens by itself only for unread urgent / important posts
 *  - sellers can close posts; a post edited later reappears; closed posts can be restored
 *  - urgent posts need an explicit "Got it"
 */
export function BulletinBoard({ brand, retailerId, userKey, preview = false, previewToday }: Props) {
  const dKey = `bulletin:closed:${userKey}`;
  const sKey = `bulletin:seen:${userKey}`;
  const [today, setToday] = useState(previewToday || arubaToday());
  const [closed, setClosed] = useState<Marks>({});
  const [seen, setSeen] = useState<Marks>({});
  const [open, setOpen] = useState<boolean | null>(null); // null = decide automatically
  const [full, setFull] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(preview);

  useEffect(() => {
    if (previewToday) setToday(previewToday);
  }, [previewToday]);

  useEffect(() => {
    if (preview) return;
    setClosed(read(dKey));
    setSeen(read(sKey));
    setReady(true);
    const id = setInterval(() => setToday(arubaToday()), 60_000);
    return () => clearInterval(id);
  }, [preview, dKey, sKey]);

  const all = useMemo(() => livePosts(brand, retailerId, today), [brand, retailerId, today]);
  const visible = all.filter((p) => closed[p.id] !== p.updated_at);
  const closedCount = all.length - visible.length;
  const unread = visible.filter((p) => seen[p.id] !== p.updated_at);
  const attention = unread.some((p) => p.level === "urgent" || p.level === "important");
  const expanded = preview ? true : open ?? attention;

  const markSeen = useCallback(
    (posts: Bulletin[]) => {
      if (preview || !posts.length) return;
      setSeen((prev) => {
        const next = { ...prev };
        for (const p of posts) next[p.id] = p.updated_at;
        write(sKey, next);
        return next;
      });
    },
    [preview, sKey]
  );

  // Opening the board counts as reading what is on it.
  useEffect(() => {
    if (expanded && unread.length) markSeen(unread);
  }, [expanded, unread, markSeen]);

  function close(p: Bulletin) {
    if (preview) return;
    setClosed((prev) => {
      const next = { ...prev, [p.id]: p.updated_at };
      write(dKey, next);
      return next;
    });
  }
  function closeAll() {
    if (preview) return;
    setClosed((prev) => {
      const next = { ...prev };
      for (const p of visible) if (p.level !== "urgent" && p.dismissible !== false) next[p.id] = p.updated_at;
      write(dKey, next);
      return next;
    });
  }
  function restore() {
    setClosed({});
    write(dKey, {});
    setOpen(true);
  }

  if (!ready) return null;

  // Nothing to show: a slim line only when the seller closed something and may want it back.
  if (!visible.length) {
    if (closedCount === 0 || preview) {
      return preview ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
          No live posts for this retailer today.
        </div>
      ) : null;
    }
    return (
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-slate-50 px-3 py-1 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-900">
        <span className="inline-flex items-center gap-1.5">
          <Newspaper size={12} /> Bulletin board · you&apos;re all caught up
        </span>
        <button type="button" onClick={restore} className="font-bold text-indigo-600 hover:underline dark:text-indigo-400">
          Show closed ({closedCount})
        </button>
      </div>
    );
  }

  const top = visible[0];
  const topMeta = LEVELS[top.level];

  return (
    <section
      aria-label="Bulletin board"
      className={
        preview
          ? "overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
          : "relative z-10 shrink-0 border-b border-slate-200/80 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
      }
    >
      {/* Slim bar */}
      <button
        type="button"
        onClick={() => !preview && setOpen(!expanded)}
        aria-expanded={expanded}
        aria-controls="bulletin-panel"
        className="flex w-full min-h-[40px] items-center gap-2.5 px-3 py-1.5 text-left"
      >
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-white dark:bg-slate-950">
          <Newspaper size={12} className="text-indigo-300" strokeWidth={2.5} />
          <span className="text-[10px] font-extrabold uppercase tracking-wide">Bulletin board</span>
        </span>
        {unread.length > 0 && (
          <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
            {unread.length} new
          </span>
        )}
        {!expanded && (
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            <span aria-hidden>{topMeta.icon}</span>
            <span className="truncate">{top.title || top.body}</span>
            {visible.length > 1 && <span className="shrink-0 text-xs font-bold text-slate-400">+{visible.length - 1} more</span>}
          </span>
        )}
        {expanded && <span className="flex-1 text-xs text-slate-500">{visible.length} post{visible.length === 1 ? "" : "s"}</span>}
        {!preview && (expanded ? <ChevronUp size={16} className="shrink-0 text-slate-400" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />)}
      </button>

      {expanded && (
        <div id="bulletin-panel" className="px-3 pb-3">
          <ul className="grid max-h-[min(46vh,24rem)] gap-2 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => {
              const meta = LEVELS[p.level];
              const url = safeUrl(p.link_url);
              const urgent = p.level === "urgent";
              const canClose = urgent || p.dismissible !== false;
              const long = p.body.length > 140;
              const showAll = full[p.id];
              return (
                <li
                  key={p.id}
                  role={urgent ? "alert" : undefined}
                  className={`relative overflow-hidden rounded-xl border p-3 pl-4 shadow-sm motion-safe:animate-[fadeIn_.25s_ease-out] ${meta.card}`}
                >
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${meta.bar}`} aria-hidden />
                  <div className="flex items-start gap-2">
                    <span className="text-lg leading-none" aria-hidden>
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${meta.chip}`}>
                          {meta.label}
                        </span>
                        {p.pinned && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500">
                            <Pin size={10} /> Pinned
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{timeAgo(p.updated_at)}</span>
                      </div>
                      {p.title && <h4 className="mt-1 text-sm font-extrabold leading-snug text-slate-900 dark:text-white">{p.title}</h4>}
                      {p.body && (
                        <p
                          className={`mt-0.5 whitespace-pre-line text-[13px] leading-snug text-slate-700 dark:text-slate-200 ${
                            long && !showAll ? "line-clamp-3" : ""
                          }`}
                        >
                          {p.body}
                        </p>
                      )}
                      {long && (
                        <button
                          type="button"
                          onClick={() => setFull((f) => ({ ...f, [p.id]: !showAll }))}
                          className="mt-0.5 text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {showAll ? "Show less" : "Read more"}
                        </button>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-slate-900 px-2.5 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900"
                          >
                            {p.link_label || "Open"} <ExternalLink size={11} />
                          </a>
                        )}
                        {urgent && (
                          <button
                            type="button"
                            onClick={() => close(p)}
                            className="inline-flex min-h-[32px] items-center rounded-lg bg-rose-600 px-3 text-[11px] font-extrabold text-white hover:bg-rose-700"
                          >
                            Got it
                          </button>
                        )}
                      </div>
                    </div>
                    {canClose && !urgent && (
                      <button
                        type="button"
                        onClick={() => close(p)}
                        aria-label={`Close: ${p.title || "post"}`}
                        title="Close"
                        className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-black/5 hover:text-slate-700 dark:hover:bg-white/10"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {!preview && (
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                {closedCount > 0 && (
                  <button type="button" onClick={restore} className="font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                    Show closed ({closedCount})
                  </button>
                )}
              </span>
              <span className="flex items-center gap-3">
                {visible.some((p) => p.level !== "urgent" && p.dismissible !== false) && (
                  <button type="button" onClick={closeAll} className="font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                    Close all
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                  Minimise
                </button>
              </span>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
}

export default BulletinBoard;
