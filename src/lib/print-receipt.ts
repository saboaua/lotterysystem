import type { Ticket, TicketDesign, BrandSettings, Retailer, Game } from "./types";

/** Open a print window with a thermal-style receipt (HACS parity). */
export function printReceipt(opts: {
  ticket: Ticket;
  brand: BrandSettings;
  design: TicketDesign;
  retailer?: Retailer;
  games: Game[];
  currency: string;
}) {
  const { ticket, brand, design, retailer, games, currency } = opts;
  const w = window.open("", "_blank", "width=360,height=640");
  if (!w) return;

  const gameName = (id: string) => games.find((g) => g.id === id)?.name || id;
  const align = design.align || "center";
  const lines = ticket.lines
    .map(
      (l) =>
        `<div class="line"><span>${gameName(l.game)} ${l.bet_type} ${l.number}</span><span>${currency} ${l.amount.toFixed(2)}</span></div>`
    )
    .join("");

  const promo = ticket.promo_code
    ? `<div class="promo"><b>${ticket.promo_code}</b><br/>Check at /check</div>`
    : "";

  // Simple Code 39-like visual bars from ticket id digits
  const bars = ticket.id
    .replace(/\D/g, "")
    .split("")
    .map((d) => `<i style="width:${2 + (Number(d) % 3)}px"></i>`)
    .join("");

  w.document.write(`<!DOCTYPE html><html><head><title>${ticket.id}</title>
<style>
  @page { margin: 4mm; size: 80mm auto; }
  body { font-family: ${design.font === "mono" ? "ui-monospace, monospace" : "system-ui, sans-serif"};
    font-size: ${design.size || 12}px; width: ${design.width || 72}ch; max-width: 100%;
    margin: 0 auto; color: #000; text-align: ${align}; }
  h1 { font-size: 1.2em; margin: 0 0 4px; }
  .mut { color: #444; font-size: 0.9em; }
  .line { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; text-align: left; }
  .total { font-weight: ${design.bold_total ? "800" : "600"}; font-size: 1.15em; margin-top: 8px;
    border-top: 1px dashed #000; padding-top: 6px; }
  .barcode { display: flex; justify-content: center; gap: 1px; height: 36px; margin: 10px 0; align-items: stretch; }
  .barcode i { display: block; background: #000; height: 100%; }
  .promo { margin-top: 10px; border: 1px dashed #000; padding: 6px; }
  .footer { margin-top: 10px; font-size: 0.85em; }
</style></head><body>
  ${design.show_name !== false ? `<h1>${brand.name}</h1>` : ""}
  ${design.header ? `<div>${design.header}</div>` : ""}
  <div class="mut">${ticket.id} · ${new Date(ticket.created_at).toLocaleString()}</div>
  ${design.show_retailer && retailer ? `<div class="mut">#${retailer.number} ${retailer.name}</div>` : ""}
  <div style="margin:8px 0">${lines}</div>
  <div class="total">TOTAL ${currency} ${ticket.total.toFixed(2)}</div>
  ${promo}
  ${design.show_barcode !== false ? `<div class="barcode">${bars}</div><div class="mut">${ticket.id}</div>` : ""}
  <div class="footer">${design.footer || "Good luck!"}</div>
  <script>window.onload=()=>{window.print();}</script>
</body></html>`);
  w.document.close();
}

/** Handle barcode scanner input (ends with Enter). */
export function handleScan(
  code: string,
  handlers: {
    onTicket: (id: string) => void;
    onUnknown?: (code: string) => void;
  }
) {
  const cleaned = code.trim().toUpperCase();
  if (/^T\d{6,}$/.test(cleaned) || /^\d{6,}$/.test(cleaned)) {
    handlers.onTicket(cleaned.startsWith("T") ? cleaned : `T${cleaned.padStart(8, "0")}`);
  } else {
    handlers.onUnknown?.(cleaned);
  }
}
