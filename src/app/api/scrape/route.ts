import { NextRequest, NextResponse } from "next/server";

/**
 * Result importers (Indios / JoeBlack style).
 * When SCRAPE_*_URL is unset, returns demo winning numbers so draw-calc still works offline.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const source = String(body.source || "").toLowerCase();
    const date = String(body.date || new Date().toISOString().slice(0, 10));

    if (source === "indios") {
      const data = await scrapeIndios(date);
      return NextResponse.json({ ok: true, source, date, results: data, demo: !process.env.SCRAPE_INDIOS_URL });
    }
    if (source === "joeblack" || source === "joe_black") {
      const data = await scrapeJoeBlack(date);
      return NextResponse.json({ ok: true, source, date, results: data, demo: !process.env.SCRAPE_JOEBLACK_URL });
    }
    if (source === "demo" || source === "all") {
      const a = await scrapeIndios(date);
      const b = await scrapeJoeBlack(date);
      return NextResponse.json({
        ok: true,
        source: "all",
        date,
        results: [...a, ...b],
        demo: true,
      });
    }
    return NextResponse.json(
      { ok: false, error: "Unknown source. Use indios, joeblack, or demo." },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scrape failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function demoDigits(seed: string): [string, string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = String(h % 10000).padStart(4, "0");
  const b = String((h >> 3) % 10000).padStart(4, "0");
  const c = String((h >> 7) % 10000).padStart(4, "0");
  return [a, b, c];
}

async function scrapeIndios(date: string) {
  const url = process.env.SCRAPE_INDIOS_URL || "";
  if (!url) {
    const [first, second, third] = demoDigits(`indios-${date}`);
    return [
      { game_id: "diario", draw_date: date, first, second, third, source: "indios-demo" },
      { game_id: "super4", draw_date: date, first: second, second: third, third: first, source: "indios-demo" },
      { game_id: "flamingo", draw_date: date, first: third, second: first, third: second, source: "indios-demo" },
    ];
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "ShocoLotteryPOS/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Indios HTTP ${res.status}`);
  const html = await res.text();
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
    const [first, second, third] = demoDigits(`joe-${date}`);
    return [
      { game_id: "corsow", draw_date: date, first, second, third, source: "joeblack-demo" },
      { game_id: "philb", draw_date: date, first: second, second: third, third: first, source: "joeblack-demo", session: "pm" },
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
