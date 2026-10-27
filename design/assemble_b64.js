#!/usr/bin/env node
const fs=require("fs");const path=require("path");
const n=14;
let o="";
for(let i=0;i<n;i++){
  const b=fs.readFileSync(path.join(__dirname,"c"+i+".b64"),"utf8").trim();
  o+=Buffer.from(b,"base64").toString("utf8");
}
const d=path.join(__dirname,"..","src","components","SellScreen_full.tsx");
fs.writeFileSync(d,o);
console.log("Wrote",d,o.length,"keypad",o.includes("Select a game to open the keypad"),"no-clip",o.includes("shrink-0 space-y-2"));
