#!/usr/bin/env node
/**
 * Applies POS behavior updates to SellScreen_full.tsx:
 * 1. Keypad/play entry only visible after selecting a game
 * 2. Replay opens serial-number popup → replayTicket()
 * 3. Scan Ticket opens serial-number popup → check winner
 *
 * Run from repo root: node design/patch_sell_behaviors.js
 */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "src", "components", "SellScreen_full.tsx");
let c = fs.readFileSync(file, "utf8");

if (c.includes("Select a game to open the keypad") && c.includes("submitReplay")) {
  console.log("Already patched — nothing to do.");
  process.exit(0);
}

// --- 1) store hooks ---
{
  const old = `  const {
    games,
    fastPlayGames,
    betTypes,
    currency,
    lines,
    addLine,
    removeLine,
    clearLines,
    sellTicket,
    selectedRetailerId,
    retailers,
    total,
    toast,
    brand,
    ticketDesign,
  } = useStore();`;
  const neu = `  const {
    games,
    fastPlayGames,
    betTypes,
    currency,
    lines,
    addLine,
    removeLine,
    clearLines,
    sellTicket,
    selectedRetailerId,
    retailers,
    total,
    toast,
    brand,
    ticketDesign,
    soldTickets,
    replayTicket,
  } = useStore();`;
  if (!c.includes(old)) { console.error("FAIL: store destructure not found"); process.exit(1); }
  c = c.replace(old, neu);
}

// --- 2) modal state ---
{
  const old = `  const [sellTab, setSellTab] = useState<"lottery" | "fast_play">("lottery");`;
  const neu = `  const [sellTab, setSellTab] = useState<"lottery" | "fast_play">("lottery");
  const [modal, setModal] = useState<null | "replay" | "scan">(null);
  const [serialInput, setSerialInput] = useState("");
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    message: string;
    ticket?: (typeof soldTickets)[0];
  } | null>(null);`;
  if (!c.includes(old)) { console.error("FAIL: sellTab state not found"); process.exit(1); }
  c = c.replace(old, neu);
}

// --- 3) handlers after copyLast ---
{
  const old = `  function copyLast() {
    if (!lastPlay) {
      toast("No last play", true);
      return;
    }
    setNum(lastPlay.num);
    setAmt(lastPlay.amt);
    setBt(lastPlay.bt);
    setField("num");
    toast("Last play copied");
  }`;
  const neu = `  function copyLast() {
    if (!lastPlay) {
      toast("No last play", true);
      return;
    }
    setNum(lastPlay.num);
    setAmt(lastPlay.amt);
    setBt(lastPlay.bt);
    setField("num");
    toast("Last play copied");
  }

  function openReplay() {
    setSerialInput("");
    setScanResult(null);
    setModal("replay");
  }

  function openScan() {
    setSerialInput("");
    setScanResult(null);
    setModal("scan");
  }

  function submitReplay() {
    const id = serialInput.trim().toUpperCase();
    if (!id) {
      toast("Enter ticket serial number", true);
      return;
    }
    const t = soldTickets.find((x) => x.id === id);
    if (!t) {
      toast("Ticket not found", true);
      return;
    }
    if (t.status === "cancelled") {
      toast("Ticket was cancelled", true);
      return;
    }
    replayTicket(id);
    setModal(null);
    setSerialInput("");
  }

  function submitScan() {
    const id = serialInput.trim().toUpperCase();
    if (!id) {
      toast("Enter ticket serial number", true);
      return;
    }
    const t = soldTickets.find((x) => x.id === id);
    if (!t) {
      setScanResult({ ok: false, message: "Ticket not found" });
      return;
    }
    if (t.status === "paid") {
      setScanResult({
        ok: true,
        message: \`Already paid · prize \${currency} \${(t.prize ?? 0).toFixed(2)}\`,
        ticket: t,
      });
    } else if (t.status === "won") {
      setScanResult({
        ok: true,
        message: \`Winner · claim \${currency} \${(t.prize ?? 0).toFixed(2)}\`,
        ticket: t,
      });
    } else if (t.status === "cancelled") {
      setScanResult({ ok: false, message: "Ticket was cancelled", ticket: t });
    } else {
      setScanResult({
        ok: true,
        message: \`Not a winner · sold \${currency} \${t.total.toFixed(2)}\`,
        ticket: t,
      });
    }
  }`;
  if (!c.includes(old)) { console.error("FAIL: copyLast not found"); process.exit(1); }
  c = c.replace(old, neu);
}

// --- 4) wire Replay / Scan buttons ---
c = c.replace(
  `onClick={copyLast}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  <RotateCcw size={16} strokeWidth={2.5} />
                  Replay
                </button>
                <button
                  type="button"
                  onClick={() => toast("Scan ticket — connect a barcode scanner", true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 active:scale-[0.98]"
                >
                  <Ticket size={16} strokeWidth={2.5} />
                  Scan Ticket
                </button>`,
  `onClick={openReplay}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  <RotateCcw size={16} strokeWidth={2.5} />
                  Replay
                </button>
                <button
                  type="button"
                  onClick={openScan}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 active:scale-[0.98]"
                >
                  <Ticket size={16} strokeWidth={2.5} />
                  Scan Ticket
                </button>`
);

// --- 5) gate keypad behind game selection ---
{
  const start = `            {/* Draw target + multi-draw — matches POS mockup */}`;
  const si = c.indexOf(start);
  if (si < 0) { console.error("FAIL: draw target marker not found"); process.exit(1); }
  const actionIdx = c.indexOf(`            {/* Action row — Quick Pick / Replay / Scan + Add Play */}`, si);
  if (actionIdx < 0) { console.error("FAIL: action row not found"); process.exit(1); }
  let ei = c.indexOf(`\n          </>\n        )}`, actionIdx);
  if (ei < 0) { console.error("FAIL: lottery close not found"); process.exit(1); }
  const body = c.slice(si, ei);
  const gated = `            {/* Replay / Scan always available */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openReplay}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
              >
                <RotateCcw size={16} strokeWidth={2.5} />
                Replay
              </button>
              <button
                type="button"
                onClick={openScan}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 active:scale-[0.98]"
              >
                <Ticket size={16} strokeWidth={2.5} />
                Scan Ticket
              </button>
            </div>

            {!primary ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-sm font-semibold text-slate-500">Select a game to open the keypad</p>
                <p className="mt-1 text-xs text-slate-400">Choose one or more games above to enter numbers and stake</p>
              </div>
            ) : (
              <>
` + body + `
              </>
            )}`;
  c = c.slice(0, si) + gated + c.slice(ei);
}

// --- 6) modal overlay before export ---
{
  const marker = `      </aside>
    </div>
  );
}

export default SellScreen;`;
  if (!c.includes(marker)) { console.error("FAIL: end marker not found"); process.exit(1); }
  const modal = `
      {/* Replay / Scan ticket modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {modal === "replay" ? "Replay ticket" : "Scan ticket — check winner"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-slate-500">
              {modal === "replay"
                ? "Enter or scan the ticket serial number to load its plays onto the current ticket."
                : "Enter or scan the ticket serial number to check if it is a winner."}
            </p>
            <input
              type="text"
              autoFocus
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (modal === "replay") submitReplay();
                  else submitScan();
                }
              }}
              placeholder="e.g. T00001001"
              className="mb-3 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-lg font-bold tracking-wide text-slate-900 outline-none ring-violet-400 focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            {modal === "scan" && scanResult && (
              <div
                className={
                  "mb-3 rounded-xl border p-4 text-center " +
                  (scanResult.ok && scanResult.message.startsWith("Winner")
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : scanResult.ok
                      ? "border-slate-200 bg-slate-50 text-slate-800"
                      : "border-rose-200 bg-rose-50 text-rose-900")
                }
              >
                <p className="text-base font-bold">{scanResult.message}</p>
                {scanResult.ticket && (
                  <div className="mt-2 text-left text-xs opacity-80">
                    <p>Status: {scanResult.ticket.status}</p>
                    <p>Plays: {scanResult.ticket.lines.length}</p>
                    <p>Sold: {new Date(scanResult.ticket.created_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => (modal === "replay" ? submitReplay() : submitScan())}
                className={
                  "flex-1 rounded-xl py-3 text-sm font-bold text-white " +
                  (modal === "replay" ? "bg-blue-600 hover:bg-blue-700" : "bg-violet-700 hover:bg-violet-800")
                }
              >
                {modal === "replay" ? "Load plays" : "Check ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
`;
  c = c.replace(marker, modal + marker);
}

fs.writeFileSync(file, c);
console.log("Patched", file, "(" + c.length + " bytes)");
console.log("OK — git add src/components/SellScreen_full.tsx && git commit -m \"ui: keypad gated, replay/scan serial modals\"");
