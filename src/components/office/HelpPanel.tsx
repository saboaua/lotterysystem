"use client";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Sign-in roles",
    body: [
      "Owner → Back office only (this screen). Demo: owner@shocolottery.aw / owner123",
      "Retailer → Sell terminal only. Demo: main@shop.aw / retailer123",
    ],
  },
  {
    title: "Games & schedule",
    body: [
      "Expand a game to edit name, format, color, draw time and cut-off.",
      "Upload a logo — it appears on the retailer sell tiles.",
      "Weekdays: toggle which days the game is on sale.",
      "Number games (digit / zodiac / Play Whe): set min and max stake.",
      "Jackpot games use a fixed stake amount (no min/max range).",
      "Add draw sessions for multiple draws on the same day (e.g. AM / PM).",
    ],
  },
  {
    title: "Branding & bulletin board",
    body: [
      "Upload the office/login logo under Branding & bulletin.",
      "The bulletin board replaces the scrolling ticker on sell screens: sellers see a slim bar that opens to news cards.",
      "Each post has a headline, message, type (Info, Update, Promotion, Important, Urgent), optional dates and button link.",
      "Pin posts to the top, choose who sees them (all or selected retailers), and decide if sellers may close them.",
      "Important and Urgent posts stay open on the sell screen until the seller presses Got it (switch “Seller must acknowledge” on or off for any post). Editing a post shows it again to sellers who already acknowledged the old version.",
      "The live preview on the right shows exactly what a seller sees, for any retailer and date.",
    ],
  },
  {
    title: "Ticket design",
    body: [
      "Adjust header, footer, font, logo height and toggles (barcode, QR, retailer block).",
      "Retailer template under the logo supports {name} {number} {address} {phone} {date}.",
      "Message of the day prints under the plays.",
      "Scheduled ticket lines support {game} {game1} {amount1} {jackpot} {date} {draw_time} {currency} {promo}.",
      "Every game has a ticket shortcut (set under Games & schedule → Ticket token): {dia} prints Diario, {dia_time} its draw time. Not case-sensitive.",
      "Scope a scheduled line to specific games; leave empty for all.",
      "Live preview updates on the right — includes active promo sample.",
    ],
  },
  {
    title: "Results, holidays & draw calculation",
    body: [
      "Calendar shows game colours per day; holidays and no-draw days are marked.",
      "Import Aruba holidays for the current year with one click.",
      "Import winning numbers (demo) or scrape Indios / JoeBlack when URLs are configured.",
      "Saved results appear in the Draw calculation list — use them for settlement reports.",
      "Enter results manually per game / session / date when needed.",
    ],
  },
  {
    title: "Retailers & map",
    body: [
      "Each shop needs latitude and longitude to appear on the OpenStreetMap view.",
      "Pins are clickable; open a shop to edit commission, address and coordinates.",
      "Use openstreetmap.org to look up lat/lng, then paste into the form.",
    ],
  },
  {
    title: "Promotions",
    body: [
      "Define min plays / games / amount so qualifying tickets print a promo code.",
      "Customers can validate codes on the public /check page.",
    ],
  },
  {
    title: "Sell terminal (retailer)",
    body: [
      "Game logos from back office show on sell tiles.",
      "Add plays, multi-draw, Hold/Recall, Send & Print.",
      "News for sellers is managed under Branding & bulletin (bulletin board).",
    ],
  },
];

export function HelpPanel() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">Help & how-to</h2>
        <p className="text-xs text-[var(--mut)]">
          Complete guide to owner back-office features.
        </p>
      </div>
      {SECTIONS.map((s) => (
        <details
          key={s.title}
          className="group rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-sm open:shadow-md"
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold marker:content-none">
            <span className="flex items-center justify-between">
              {s.title}
              <span className="text-[var(--mut)] group-open:rotate-180">▼</span>
            </span>
          </summary>
          <ul className="space-y-2 border-t border-[var(--line)] px-4 py-3 text-sm text-[var(--mut)]">
            {s.body.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
