import type { Ticket, TicketDesign, BrandSettings, Retailer, Game, BetType, Promotion, TicketScheduleMessage } from "./types";
import { formatLineTitle } from "./line-title";
import { buildJackpotTokenContext } from "./jackpot-tokens";
import { buildGameTokenContext } from "./game-tokens";

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

export function encodeCode128(text: string): string {
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

export function fillTokens(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{([a-z0-9_]+)\}/gi, (_, k) => {
    const v = ctx[k] != null ? ctx[k] : ctx[String(k).toLowerCase()];
    return v != null ? v : "{" + k + "}";
  });
}

export function qrImageUrl(payload: string, size = 120): string {
  return (
    "https://api.qrserver.com/v1/create-qr-code/?size=" +
    size +
    "x" +
    size +
    "&data=" +
    encodeURIComponent(payload)
  );
}
