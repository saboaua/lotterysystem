"use client";

/**
 * TEMPORARY — full file is in design/restore_sellscreen.js
 * Run from repo root:
 *   node design/restore_sellscreen.js
 * then commit src/components/SellScreen.tsx
 *
 * The redesigned UI includes: tactile keypad, quick wager amounts with Active pill,
 * violet bet pills, large digit display, MultiDraw stepper, Quick Pick / Replay / Scan / Add Play.
 */
export function SellScreen() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center bg-slate-50">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-lg font-bold text-slate-800">SellScreen restore needed</p>
        <p className="mt-3 text-sm text-slate-600">
          The full redesigned POS play-entry UI is packaged in the restore script.
        </p>
        <pre className="mt-4 rounded-lg bg-slate-900 p-4 text-left text-xs text-emerald-400">
{`node design/restore_sellscreen.js
git add src/components/SellScreen.tsx
git commit -m "ui: seller POS play entry matches mockup"`}
        </pre>
      </div>
    </div>
  );
}

export default SellScreen;
