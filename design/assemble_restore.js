#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const parts = [0,1,2].map(i => fs.readFileSync(path.join(dir, "rs"+i+".js"), "utf8"));
fs.writeFileSync(path.join(dir, "restore_sellscreen.js"), parts.join(""));
console.log("Assembled restore_sellscreen.js — now run: node design/restore_sellscreen.js");
