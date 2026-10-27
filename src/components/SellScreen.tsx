"use client";

/**
 * TEMPORARY STUB
 *
 * The full redesigned SellScreen (POS digit play-entry UI matching the mockup:
 * tactile keypad, quick wager grid with Active pill, violet bet pills, large
 * digit display, MultiDraw stepper, Quick Pick / Replay / Scan / Add Play)
 * is ready. Large-file push via the API was truncated, so restore as follows:
 *
 * Option A (recommended): Ask the assistant to "give me the full SellScreen.tsx"
 * and paste/replace this file, then commit.
 *
 * Option B: The file exists in the conversation artifacts as SellScreen.tsx (34KB).
 */
export function SellScreen() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center bg-slate-50">
      <div className="max-w-lg rounded-2xl border border-violet-200 bg-white p-8 shadow-sm">
        <p className="text-lg font-bold text-slate-800">SellScreen — restore needed</p>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Full redesigned POS play-entry UI is ready in the chat. Ask the assistant to
          output or re-push the complete <code className="text-violet-600">SellScreen.tsx</code>
          (or download from the conversation artifacts).
        </p>
        <p className="mt-4 text-xs text-slate-400">
          After replacing this file: git add src/components/SellScreen.tsx && git commit
        </p>
      </div>
    </div>
  );
}

export default SellScreen;
