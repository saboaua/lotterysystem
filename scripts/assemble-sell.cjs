#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const b64Path = path.join(__dirname, "../src/components/sell/ss_parts/sell.gz.b64");
const out = path.join(__dirname, "../src/components/SellScreenImpl.tsx");
if (!fs.existsSync(b64Path)) {
  console.error("Missing", b64Path);
  process.exit(1);
}
const b64 = fs.readFileSync(b64Path, "utf8").replace(/\s+/g, "");
const buf = Buffer.from(b64, "base64");
const content = zlib.gunzipSync(buf).toString("utf8");
fs.writeFileSync(out, content);
console.log("Assembled SellScreenImpl.tsx (%d chars) from sell.gz.b64", content.length);
