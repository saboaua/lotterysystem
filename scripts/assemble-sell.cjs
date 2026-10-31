#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const https = require("https");

const partsDir = path.join(__dirname, "../src/components/sell/ss_parts");
const out = path.join(__dirname, "../src/components/SellScreenImpl.tsx");
const b64Path = path.join(partsDir, "sell.gz.b64");
const printReceiptPath = path.join(__dirname, "../src/lib/print-receipt.ts");

const FALLBACK_SELL =
  "https://raw.githubusercontent.com/saboaua/lotterysystem/6cfa204826ef25726a2069fc3e3b46ef4283377e/src/components/SellScreen.tsx";
const FALLBACK_PRINT =
  "https://raw.githubusercontent.com/saboaua/lotterysystem/6cfa204826ef25726a2069fc3e3b46ef4283377e/src/lib/print-receipt.ts";

function tryGzip() {
  if (!fs.existsSync(b64Path)) return null;
  try {
    const b64 = fs.readFileSync(b64Path, "utf8").replace(/\s+/g, "");
    if (b64.length < 500) return null;
    const buf = Buffer.from(b64, "base64");
    return zlib.gunzipSync(buf).toString("utf8");
  } catch (e) {
    console.warn("gzip assemble failed:", e.message);
    return null;
  }
}

function tryParts() {
  if (!fs.existsSync(partsDir)) return null;
  const files = fs
    .readdirSync(partsDir)
    .filter((f) => /^part\d+\.txt$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10);
      const nb = parseInt(b.replace(/\D/g, ""), 10);
      return na - nb;
    });
  if (!files.length) return null;
  const content = files.map((f) => fs.readFileSync(path.join(partsDir, f), "utf8")).join("");
  if (content.length < 20000) return null;
  return content;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode + " for " + url));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function patchRestored(src) {
  if (src.includes("BulletinBoard")) return src;

  let out = src;

  if (!out.includes('from "@/components/BulletinBoard"')) {
    out = out.replace(
      'import { getTopUpDesign } from "@/lib/topup";',
      'import { getTopUpDesign } from "@/lib/topup";\nimport { BulletinBoard } from "@/components/BulletinBoard";\nimport { HolidayDrawCard } from "@/components/sell/HolidayDrawCard";\nimport { LineTitle } from "@/components/sell/LineTitle";'
    );
  }

  if (!out.includes("holidays,")) {
    out = out.replace(
      "    soldTickets,\n    replayTicket,\n  } = useStore();",
      "    soldTickets,\n    replayTicket,\n    holidays,\n    user,\n  } = useStore();"
    );
  }

  const marker =
    '      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:p-4">\n        <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-sm dark:bg-slate-900">';
  const insert =
    '      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:p-4">\n        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">\n          {user && (\n            <BulletinBoard brand={brand} retailerId={selectedRetailerId} userKey={user.id} />\n          )}\n          <HolidayDrawCard holidays={holidays} games={games} />\n        </div>\n        <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-sm dark:bg-slate-900">';
  if (out.includes(marker)) out = out.replace(marker, insert);

  const oldTitle =
    '                  <div className="font-bold">\n                    {games.find((g) => g.id === l.game)?.name || l.game} · {l.bet_type}\n                  </div>';
  const newTitle =
    '                  <div className="font-bold">\n                    <LineTitle gameId={l.game} betTypeKey={l.bet_type} games={games} betTypes={betTypes} />\n                  </div>';
  if (out.includes(oldTitle)) out = out.replace(oldTitle, newTitle);

  return out;
}

async function ensurePrintReceipt() {
  let need = true;
  if (fs.existsSync(printReceiptPath)) {
    const cur = fs.readFileSync(printReceiptPath, "utf8");
    if (cur.includes("export function printReceipt") && cur.includes("document.write") && cur.length > 5000) {
      need = false;
    }
  }
  if (!need) return;
  console.log("Restoring print-receipt.ts from commit 6cfa204...");
  const content = await fetchUrl(FALLBACK_PRINT);
  fs.writeFileSync(printReceiptPath, content);
  console.log("Restored print-receipt.ts (%d chars)", content.length);
}

async function main() {
  let content = tryGzip() || tryParts();
  if (!content) {
    console.log("Fetching full SellScreen from commit 6cfa204...");
    content = await fetchUrl(FALLBACK_SELL);
    content = patchRestored(content);
  }
  if (!content.includes("function SellScreen") && !content.includes("export function SellScreen")) {
    console.error("Assembled content does not look like SellScreenImpl");
    process.exit(1);
  }
  fs.writeFileSync(out, content);
  console.log("Assembled SellScreenImpl.tsx (%d chars)", content.length);
  await ensurePrintReceipt();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
