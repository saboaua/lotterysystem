#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "sf_parts");
const n = 20;
const parts = [];
for (let i = 0; i < n; i++) {
  const name = "p" + String(i).padStart(2, "0") + ".txt";
  parts.push(fs.readFileSync(path.join(dir, name), "utf8"));
}
const out = path.join(__dirname, "..", "src", "components", "SellScreen_full.tsx");
const content = parts.join("");
fs.writeFileSync(out, content);
console.log("Wrote", out, content.length);
if (!content.includes("Select a game to open the keypad")) {
  console.error("FAIL: missing gate");
  process.exit(1);
}
if (!content.includes("submitReplay") || !content.includes("submitScan")) {
  console.error("FAIL: missing handlers");
  process.exit(1);
}
console.log("OK — commit SellScreen_full.tsx");
