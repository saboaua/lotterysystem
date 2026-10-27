#!/usr/bin/env node
/**
 * Assembles full SellScreen.tsx from design/sell_parts/part_*.txt
 * Run from repo root: node design/assemble_sellscreen.js
 */
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "sell_parts");
const parts = [0,1,2,3].map(i => fs.readFileSync(path.join(dir, `part_${i}.txt`), "utf8"));
const out = path.join(__dirname, "..", "src", "components", "SellScreen.tsx");
const content = parts.join("");
fs.writeFileSync(out, content);
console.log("Wrote", out, "(" + content.length + " bytes)");
if (!content.includes("Tactile keypad") || !content.includes("export default SellScreen")) {
  console.error("Assembly failed — missing markers");
  process.exit(1);
}
console.log("OK — git add src/components/SellScreen.tsx && git commit -m \"ui: seller POS play entry matches mockup\"");
