#!/usr/bin/env node
const fs=require("fs");const path=require("path");
let o="";
for(let i=0;i<7;i++)o+=fs.readFileSync(path.join(__dirname,"chunk_"+i+".txt"),"utf8");
const d=path.join(__dirname,"..","src","components","SellScreen_full.tsx");
fs.writeFileSync(d,o);
console.log("Wrote",d,o.length);
console.log("keypad gate",o.includes("Select a game to open the keypad"));
console.log("openReplay",o.includes("openReplay"));
console.log("no-clip",o.includes("shrink-0 space-y-2"));
