import { NextRequest, NextResponse } from "next/server";

/**
 * HACS parity: scrape_indios / scrape_joeblack style fetchers.
 * These are best-effort HTML scrapers; sites change — prefer manual entry when they break.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const source = String(body.source || "").toLowerCase();
    const date = String(body.date || new Date().toISOString().slice(0, 10));

    if (source === "indios") {
      const data = await scrapeIndios(date);
      return NextResponse.json({ ok: true, source, date, results: data });
    }
    if (source === "joeblack" || source === "joe_black") {
      const data = await scrapeJoeBlack(date);
      return NextResponse.json({ ok: true, source, date, results: data });
    }
    return NextResponse.json(
      { ok: false, error: "Unknown source. Use indios or joeblack." },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scrape failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function scrapeIndios(date: string) {
  // Placeholder structure matching HACS results_source — operator replaces URL/selectors
  // when the live site layout is confirmed.
  const url = process.env.SCRAPE_INDIOS_URL || "";
  if (!url) {
    return [
      {
        game_id: "diario",
        draw_date: date,
        first: null,
        second: null,
        third: null,
        note: "Set SCRAPE_INDIOS_URL env to enable live fetch",
      },
    ];
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "ShocoLotteryPOS/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Indios HTTP ${res.status}`);
  const html = await res.text();
  // Minimal parse: look for 4-digit sequences near known labels (operator-tunable)
  const matches = [...html.matchAll(/\b(\d{4})\b/g)].map((m) => m[1]);
  return [
    {
      game_id: "diario",
      draw_date: date,
      first: matches[0] || null,
      second: matches[1] || null,
      third: matches[2] || null,
      source: "indios",
      raw_count: matches.length,
    },
  ];
}

async function scrapeJoeBlack(date: string) {
  const url = process.env.SCRAPE_JOEBLACK_URL || "";
  if (!url) {
    return [
      {
        game_id: "corsow",
        draw_date: date,
        first: null,
        note: "Set SCRAPE_JOEBLACK_URL env to enable live fetch",
      },
    ];
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "ShocoLotteryPOS/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`JoeBlack HTTP ${res.status}`);
  const html = await res.text();
  const matches = [...html.matchAll(/\b(\d{4})\b/g)].map((m) => m[1]);
  return [
    {
      game_id: "corsow",
      draw_date: date,
      first: matches[0] || null,
      second: matches[1] || null,
      third: matches[2] || null,
      source: "joeblack",
      raw_count: matches.length,
    },
  ];
}
