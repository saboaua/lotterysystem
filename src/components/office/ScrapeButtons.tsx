"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

export function ScrapeButtons({ date }: { date: string }) {
  const { setResults, toast, games } = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(source: "indios" | "joeblack" | "demo") {
    setBusy(source);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source === "demo" ? "all" : source, date }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.error || "Scrape failed", true);
        return;
      }
      let n = 0;
      for (const r of data.results || []) {
        const known = games.some((g) => g.id === r.game_id);
        if (!known) continue;
        if (r.first || r.whe != null) {
          setResults({
            game_id: r.game_id,
            draw_date: r.draw_date || date,
            session: r.session || undefined,
            first: r.first || undefined,
            second: r.second || undefined,
            third: r.third || undefined,
            whe: r.whe || undefined,
            source: r.source || source,
          });
          n++;
        }
      }
      toast(
        data.demo
          ? `Imported ${n} demo result(s) for ${date}`
          : `Scraped ${source}: ${n} result(s)`
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Network error", true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("demo")}
          className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy === "demo" ? "Importing…" : "Import winning numbers (demo)"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("indios")}
          className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy === "indios" ? "Fetching…" : "Scrape Indios"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("joeblack")}
          className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy === "joeblack" ? "Fetching…" : "Scrape JoeBlack"}
        </button>
      </div>
      <p className="text-[11px] text-[var(--mut)]">
        Without SCRAPE_INDIOS_URL / SCRAPE_JOEBLACK_URL env vars, demo numbers are generated so you can
        run draw calculation reports offline.
      </p>
    </div>
  );
}
