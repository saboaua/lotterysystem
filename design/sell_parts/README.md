# SellScreen restore parts

The full redesigned `src/components/SellScreen.tsx` (POS digit play-entry UI matching the mockup) is split into 4 parts to avoid large-file push limits.

**Restore:**

```bash
node design/assemble_sellscreen.js
git add src/components/SellScreen.tsx
git commit -m "ui: seller POS play entry matches mockup"
```

After restore you can delete this folder and the assembler if desired.
