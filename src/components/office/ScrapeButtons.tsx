"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

export function ScrapeButtons({ date }: { date: string }) {
  const { setResults, toast } = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(source: "indios" | "joeblack") {
    setBusy(source);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, date }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.error || "Scrape failed", true);
        return;
      }
      for (const r of data.results || []) {
        if (r.first || r.whe) {
          setResults({
            game_id: r.game_id,
            draw_date: r.draw_date || date,
            first: r.first || undefined,
            second: r.second || undefined,
            third: r.third || undefined,
            whe: r.whe || undefined,
            source: r.source || source,
          });
        }
      }
      toast(`Scraped ${source}: ${(data.results || []).length} row(s)`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Network error", true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
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
  );
}
