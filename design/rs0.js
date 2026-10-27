#!/usr/bin/env node
/** Restores full redesigned SellScreen.tsx. Run: node design/restore_sellscreen.js */
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const chunks = [
  "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",
  "RHMyYc7O2LEq3t
