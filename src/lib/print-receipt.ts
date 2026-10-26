import type { Ticket, TicketDesign, BrandSettings, Retailer, Game, Promotion } from "./types";

/** Code 128B pattern table (start B = 104, stop = 106). Values are bar/space widths. */
const CODE128_PATTERNS: string[] = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112",
];

function encodeCode128(text: string): string {
  const START_B = 104;
  const STOP = 106;
  let checksum = START_B;
  const codes: number[] = [START_B];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) - 32;
    if (c < 0 || c > 95) continue;
    codes.push(c);
    checksum += c * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(STOP);
  const parts: string[] = [];
  for (const code of codes) {
    const pat = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
    for (let i = 0; i < pat.length; i++) {
      const w = parseInt(pat[i], 10);
      const isBar = i % 2 === 0;
      if (isBar) parts.push("<i style=\"width:" + w + "px\"></i>");
      else parts.push("<b style=\"width:" + w + "px\"></b>");
    }
  }
  return parts.join("");
}

function fillTokens(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{([a-z0-9_]+)\}/gi, (_, k) => (ctx[k] != null ? ctx[k] : "{" + k + "}"));
}

function qrImageUrl(payload: string, size = 120): string {
  return (
    "https://api.qrserver.com/v1/create-qr-code/?size=" +
    size +
    "x" +
    size +
    "&data=" +
    encodeURIComponent(payload) +
    "&margin=1"
  );
}

/** Open a print window matching the back-office ticket preview. */
export function printReceipt(opts: {
  ticket: Ticket;
  brand: BrandSettings;
  design: TicketDesign;
  retailer?: Retailer;
  games: Game[];
  currency: string;
  promotions?: Promotion[];
}) {
  const { ticket, brand, design, retailer, games, currency, promotions = [] } = opts;
  const w = window.open("", "_blank", "width=420,height=720");
  if (!w) return;

  const gameName = (id: string) => games.find((g) => g.id === id)?.name || id;
  const betLabel = (key: string) => key.replace(/_/g, " ");
  const align = design.align || "center";
  const paper = design.paper_size || "80mm";
  const paperCss =
    paper === "58mm" ? "58mm auto" : paper === "A4" ? "A4" : "80mm auto";
  const bodyWidth =
    paper === "58mm" ? "48mm" : paper === "A4" ? "180mm" : (design.width || 72) + "mm";

  const primaryGameId = ticket.lines[0]?.game;
  const primaryGame = games.find((g) => g.id === primaryGameId);
  const activePromo =
    (ticket.promo_id && promotions.find((p) => p.id === ticket.promo_id)) ||
    promotions.find((p) => p.active);

  const ctx: Record<string, string> = {
    date: new Date(ticket.created_at).toLocaleDateString(),
    draw_time: primaryGame?.draw_time || "",
    game: primaryGame?.name || "",
    game1: primaryGame?.name || "",
    amount: ticket.total.toFixed(2),
    amount1:
      primaryGame?.jackpot_current != null ? String(primaryGame.jackpot_current) : "-",
    jackpot:
      primaryGame?.jackpot_current != null ? String(primaryGame.jackpot_current) : "-",
    prev_jackpot:
      primaryGame?.jackpot_previous != null
        ? String(primaryGame.jackpot_previous)
        : primaryGame?.jackpot_current != null
          ? String(primaryGame.jackpot_current)
          : "-",
    currency,
    retailer: retailer?.name || "",
    ticket_id: ticket.id,
    promo: ticket.promo_code || activePromo?.label || "",
  };

  const logoSrc = design.logo || brand.logo;
  const logoHtml =
    design.show_logo && logoSrc
      ? '<img src="' +
        logoSrc +
        '" alt="" style="height:' +
        (design.logo_height || 40) +
        'px;object-fit:contain;display:block;margin:0 auto 6px;" />'
      : "";

  const retailerTpl =
    design.retailer_template || "Shop #{number} · {name}\n{address}\nTel {phone}";
  const retailerBlock =
    design.show_retailer && retailer
      ? fillTokens(retailerTpl, {
          ...ctx,
          number: retailer.number || "",
          name: retailer.name || "",
          address: retailer.address || "",
          phone: retailer.phone || "",
        })
          .split("\n")
          .map((l) => '<div class="mut">' + l + "</div>")
          .join("")
      : "";

  const ticketGameIds = new Set(ticket.lines.map((l) => l.game));
  const schedule = (design.schedule_messages || []).filter((m) => m.enabled);
  const place = (placement: string) =>
    schedule
      .filter((m) => m.placement === placement)
      .filter(
        (m) =>
          !m.game_ids?.length || m.game_ids.some((id) => ticketGameIds.has(id))
      )
      .map((m) => '<div class="msg">' + fillTokens(m.text, ctx) + "</div>")
      .join("");

  const linesHtml = ticket.lines
    .map((l) => {
      return (
        '<div class="line"><div class="line-main"><span class="line-game">' +
        gameName(l.game) +
        " · " +
        betLabel(l.bet_type) +
        '</span><span class="line-num">' +
        l.number +
        (l.session ? " · " + l.session : "") +
        (l.date ? " · " + l.date : "") +
        '</span></div><span class="line-amt">' +
        currency +
        " " +
        l.amount.toFixed(2) +
        "</span></div>"
      );
    })
    .join("");

  const promoHtml = ticket.promo_code
    ? '<div class="promo"><div class="promo-label">' +
      (activePromo?.label || "FREE PLAY") +
      '</div><div class="promo-qualified">Qualified for promotion</div><div class="promo-code">' +
      ticket.promo_code +
      '</div><div class="promo-inst">' +
      (activePromo?.instruction || "Check at /check") +
      "</div></div>"
    : "";

  const motdApplies =
    !!design.manual_text &&
    design.manual_text.trim() &&
    (!(design.manual_text_game_ids || []).length ||
      (design.manual_text_game_ids || []).some((id) => ticketGameIds.has(id)));

  const motdHtml = motdApplies
    ? '<div class="motd">' + fillTokens(design.manual_text!, ctx) + "</div>"
    : "";

  const motdPlacement = design.motd_placement || "after_total";

  const jackpotHtml =
    design.show_jackpot && primaryGame?.jackpot_current != null
      ? '<div class="jackpot">' +
        fillTokens(design.jackpot_text || "Jackpot: {currency} {jackpot}", ctx) +
        "</div>"
      : "";

  const barcodeHtml =
    design.show_barcode !== false
      ? '<div class="barcode">' +
        encodeCode128(ticket.id) +
        '</div><div class="mut bc-text">' +
        ticket.id +
        "</div>"
      : "";

  const qrSize = design.qr_size || 100;
  const qrPayload = (design.qr_prefix || "") + ticket.id;
  const qrHtml = design.show_qr
    ? '<div class="qr"><img src="' +
      qrImageUrl(qrPayload, qrSize) +
      '" width="' +
      qrSize +
      '" height="' +
      qrSize +
      '" alt="QR" /></div>'
    : "";

  const fontFamily =
    design.font === "serif"
      ? "Georgia, serif"
      : design.font === "sans"
        ? "system-ui, -apple-system, sans-serif"
        : "ui-monospace, SFMono-Regular, Menlo, monospace";

  const baseSize = design.size || 13;

  const html =
    "<!DOCTYPE html><html><head><title>" +
    ticket.id +
    "</title><meta charset=\"utf-8\"/><style>" +
    "@page { margin: 3mm; size: " +
    paperCss +
    "; } * { box-sizing: border-box; } body { font-family: " +
    fontFamily +
    "; font-size: " +
    baseSize +
    "px; width: " +
    bodyWidth +
    "; max-width: 100%; margin: 0 auto; color: #000; text-align: " +
    align +
    "; padding: " +
    (design.padding ?? 4) +
    "px; line-height: 1.25; } h1 { font-size: 1.25em; margin: 0 0 4px; font-weight: 800; } .mut { color: #333; font-size: 0.88em; } .msg { font-size: 0.9em; margin: 3px 0; } .line { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin: " +
    (design.line_gap ?? 3) +
    "px 0; text-align: left; border-bottom: 1px dotted #ccc; padding-bottom: 2px; } .line-main { flex: 1; min-width: 0; } .line-game { display: block; font-weight: 700; font-size: 0.95em; } .line-num { display: block; font-size: 0.9em; } .line-amt { font-weight: 600; white-space: nowrap; } .total { font-weight: " +
    (design.bold_total ? "800" : "600") +
    "; font-size: 1.2em; margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; } .motd { margin-top: 8px; font-size: 0.92em; color: #222; } .promo { margin: 10px 0; border: 1.5px dashed #000; padding: 8px 6px; text-align: center; } .promo-label { font-weight: 800; font-size: 1.05em; letter-spacing: 0.04em; } .promo-qualified { margin-top: 2px; font-size: 0.95em; } .promo-code { margin-top: 4px; font-family: ui-monospace, monospace; font-weight: 900; font-size: 1.45em; letter-spacing: 0.12em; } .promo-inst { margin-top: 3px; font-size: 0.85em; color: #333; } .barcode { display: flex; justify-content: center; align-items: stretch; height: 42px; margin: 10px 0 2px; gap: 0; } .barcode i { display: block; background: #000; height: 100%; } .barcode b { display: block; background: transparent; height: 100%; } .bc-text { letter-spacing: 0.08em; } .qr { margin: 8px auto; text-align: center; } .qr img { display: inline-block; } .footer { margin-top: 10px; font-size: 0.88em; } .jackpot { margin-top: 4px; font-weight: 600; font-size: 0.9em; } .divider { border-top: 1px dashed #999; margin: 6px 0; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }" +
    "</style></head><body>" +
    logoHtml +
    (design.show_name !== false ? "<h1>" + (design.header || brand.name) + "</h1>" : "") +
    retailerBlock +
    (design.show_datetime !== false
      ? '<div class="mut">' +
        ticket.id +
        " · " +
        new Date(ticket.created_at).toLocaleString() +
        "</div>"
      : '<div class="mut">' + ticket.id + "</div>") +
    '<div class="divider"></div>' +
    place("header") +
    '<div style="margin:6px 0">' +
    linesHtml +
    "</div>" +
    place("after_lines") +
    jackpotHtml +
    place("before_total") +
    '<div class="total">TOTAL ' +
    currency +
    " " +
    ticket.total.toFixed(2) +
    "</div>" +
    (motdPlacement === "after_total" ? motdHtml : "") +
    place("after_total") +
    promoHtml +
    (motdPlacement === "after_promo" ? motdHtml : "") +
    place("after_promo") +
    barcodeHtml +
    qrHtml +
    '<div class="footer">' +
    (design.footer || "Good luck!") +
    "</div>" +
    place("footer") +
    "<script>window.onload=function(){setTimeout(function(){window.print();},350);};</script></body></html>";

  w.document.write(html);
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
    handlers.onTicket(cleaned.startsWith("T") ? cleaned : "T" + cleaned.padStart(8, "0"));
  } else {
    handlers.onUnknown?.(cleaned);
  }
}
