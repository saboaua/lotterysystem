#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const partsDir = path.join(__dirname, "../src/components/sell/ss_parts");
const out = path.join(__dirname, "../src/components/SellScreenImpl.tsx");
const b64Path = path.join(partsDir, "sell.gz.b64");

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
  const files = fs
    .readdirSync(partsDir)
    .filter((f) => /^part\d+\.txt$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10);
      const nb = parseInt(b.replace(/\D/g, ""), 10);
      return na - nb;
    });
  if (!files.length) return null;
  return files.map((f) => fs.readFileSync(path.join(partsDir, f), "utf8")).join("");
}

let content = tryGzip() || tryParts();
if (!content) {
  console.error("No sell.gz.b64 or part*.txt found under", partsDir);
  process.exit(1);
}
if (!content.includes("function SellScreen") && !content.includes("export function SellScreen")) {
  console.error("Assembled content does not look like SellScreenImpl");
  process.exit(1);
}
fs.writeFileSync(out, content);
console.log("Assembled SellScreenImpl.tsx (%d chars)", content.length);
