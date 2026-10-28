import type { BrandSettings, Retailer, TicketDesign, TopUp } from "./types";
import { encodeCode128, fillTokens, qrImageUrl } from "./print-receipt";
import { getTopUpDesign, maskPlayerCode } from "./topup";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const multiline = (s: string) => esc(s).replace(/\n/g, "<br/>");

/**
 * Prints a top-up ticket.
 *  - voucher: shows the code the player enters on the website
 *  - direct:  confirmation that the scanned player account was credited
 */
export function printTopUp(opts: {
  topUp: TopUp;
  brand: BrandSettings;
  design: TicketDesign;
  retailer?: Retailer;
  currency: string;
  reprint?: boolean;
  /** A window already opened inside the click handler (avoids popup blockers after async work). */
  win?: Window | null;
}) {
  const { topUp, brand, design, retailer, currency, reprint } = opts;
  const cfg = getTopUpDesign(design);
  const w = opts.win || window.open("", "_blank", "width=420,height=720");
  if (!w) return false;

  const paper = design.paper_size || "80mm";
  const paperCss = paper === "58mm" ? "58mm auto" : paper === "A4" ? "A4" : "80mm auto";
  const bodyWidth = paper === "58mm" ? "48mm" : paper === "A4" ? "180mm" : (design.width || 72) + "mm";
  const fontFamily =
    design.font === "serif"
      ? "Georgia, serif"
      : design.font === "sans"
        ? "system-ui, -apple-system, sans-serif"
        : "ui-monospace, SFMono-Regular, Menlo, monospace";

  const ctx: Record<string, string> = {
    website: cfg.website,
    code: topUp.code || "",
    player_code: topUp.player_code ? maskPlayerCode(topUp.player_code) : "",
    amount: topUp.amount.toFixed(2),
    currency,
    retailer: retailer?.name || "",
    date: new Date(topUp.created_at).toLocaleString(),
  };
  const fill = (t: string) => multiline(fillTokens(t, ctx));
  const voucher = topUp.kind === "voucher";

  const logoSrc = design.logo || brand.logo;
  const logoHtml =
    design.show_logo && logoSrc
      ? `<img src="${logoSrc}" alt="" style="height:${design.logo_height || 40}px;object-fit:contain;display:block;margin:0 auto 6px;" />`
      : "";
  const retailerHtml =
    design.show_retailer && retailer
      ? fillTokens(design.retailer_template || "Shop #{number} · {name}\n{address}\nTel {phone}", {
          ...ctx,
          number: retailer.number || "",
          name: retailer.name || "",
          address: retailer.address || "",
          phone: retailer.phone || "",
        })
          .split("\n")
          .map((l) => `<div class="mut">${esc(l)}</div>`)
          .join("")
      : "";

  const qrPayload = fillTokens(cfg.qr_url_template, ctx);
  const body =
    (voucher
      ? `<div class="code-label">${fill(cfg.voucher_code_label)}</div>` +
        `<div class="code">${esc(topUp.code || "")}</div>` +
        (design.show_barcode !== false && topUp.code
          ? `<div class="barcode">${encodeCode128(topUp.code.replace(/-/g, ""))}</div>`
          : "") +
        (cfg.show_qr
          ? `<div class="qr"><img src="${qrImageUrl(qrPayload, design.qr_size || 100)}" width="${design.qr_size || 100}" height="${design.qr_size || 100}" alt="QR"/></div>`
          : "") +
        `<div class="msg">${fill(cfg.voucher_text)}</div>` +
        (cfg.voucher_footer ? `<div class="foot">${fill(cfg.voucher_footer)}</div>` : "")
      : `<div class="code-label">Player account</div>` +
        `<div class="code small">${esc(ctx.player_code)}</div>` +
        `<div class="msg ok">${fill(cfg.credited_text)}</div>` +
        (cfg.credited_footer ? `<div class="foot">${fill(cfg.credited_footer)}</div>` : ""));

  const html =
    `<!DOCTYPE html><html><head><title>${esc(topUp.id)}</title><meta charset="utf-8"/><style>` +
    `@page{margin:3mm;size:${paperCss};} *{box-sizing:border-box;} ` +
    `body{font-family:${fontFamily};font-size:${design.size || 13}px;width:${bodyWidth};max-width:100%;margin:0 auto;color:#000;text-align:center;padding:${design.padding ?? 4}px;line-height:1.3;} ` +
    `h1{font-size:1.25em;margin:0 0 4px;font-weight:800;} .mut{color:#333;font-size:.88em;} ` +
    `.title{font-weight:900;font-size:1.3em;letter-spacing:.06em;margin-top:6px;} ` +
    `.amount{font-weight:900;font-size:1.7em;margin:6px 0;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:6px 0;} ` +
    `.code-label{font-size:.9em;margin-top:6px;} ` +
    `.code{font-family:ui-monospace,monospace;font-weight:900;font-size:1.9em;letter-spacing:.14em;margin:6px 0;border:2px solid #000;padding:8px 4px;} .code.small{font-size:1.2em;} ` +
    `.msg{margin:8px 0;font-size:1em;font-weight:600;} .msg.ok{font-size:1.05em;} .foot{margin-top:8px;font-size:.85em;color:#222;} ` +
    `.reprint{display:inline-block;margin-top:4px;border:1px solid #000;padding:1px 6px;font-size:.8em;font-weight:800;letter-spacing:.1em;} ` +
    `.barcode{display:flex;justify-content:center;align-items:stretch;height:42px;margin:8px 0;} .barcode i{display:block;background:#000;height:100%;} .barcode b{display:block;background:transparent;height:100%;} ` +
    `.qr{margin:8px auto;} .divider{border-top:1px dashed #999;margin:6px 0;} ` +
    `@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}` +
    `</style></head><body>` +
    logoHtml +
    (design.show_name !== false ? `<h1>${esc(design.header || brand.name)}</h1>` : "") +
    retailerHtml +
    `<div class="mut">${esc(topUp.id)} · ${esc(new Date(topUp.created_at).toLocaleString())}</div>` +
    `<div class="divider"></div>` +
    `<div class="title">${esc(voucher ? cfg.voucher_title : cfg.credited_title)}</div>` +
    (reprint ? `<div class="reprint">REPRINT</div>` : "") +
    `<div class="amount">${esc(currency)} ${topUp.amount.toFixed(2)}</div>` +
    body +
    `<script>window.onload=function(){setTimeout(function(){window.print();},350);};</script></body></html>`;

  w.document.write(html);
  w.document.close();
  return true;
}
