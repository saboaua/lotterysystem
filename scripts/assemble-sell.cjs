#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "../src/components/sell/ss_parts");
const out = path.join(__dirname, "../src/components/SellScreenImpl.tsx");
if (!fs.existsSync(dir)) {
  console.error("Missing", dir);
  process.exit(1);
}
const parts = fs
  .readdirSync(dir)
  .filter((f) => /^part\d+\.txt$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
if (!parts.length) {
  console.error("No part files in", dir);
  process.exit(1);
}
const content = parts.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("");
fs.writeFileSync(out, content);
console.log("Assembled SellScreenImpl.tsx (%d chars) from %s", content.length, parts.join("+"));
