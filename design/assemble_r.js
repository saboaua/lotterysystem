#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const parts = [0,1,2,3,4,5,6,7].map(i => fs.readFileSync(path.join(dir, "r"+i+".txt"), "utf8"));
fs.writeFileSync(path.join(dir, "restore_sellscreen.js"), parts.join(""));
console.log("Assembled restore_sellscreen.js");
console.log("Now run: node design/restore_sellscreen.js");
