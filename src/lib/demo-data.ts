import type { BetType, Game, Retailer, AppUser } from "./types";

export const DEMO_GAMES: Game[] = [
  { id: "diario", name: "Diario", color: "#22c55e", format: "digit", digits: 4, draw_time: "13:00", cutoff: "12:45", enabled: true },
  { id: "corsow", name: "Corsow", color: "#f59e0b", format: "digit", digits: 4, draw_time: "17:00", cutoff: "16:45", enabled: true },
  { id: "super4", name: "Super-4", color: "#06b6d4", format: "digit", digits: 4, draw_time: "13:00", cutoff: "12:45", enabled: true },
  { id: "flamingo", name: "Flamingo", color: "#ec4899", format: "digit", digits: 4, draw_time: "14:00", cutoff: "13:45", enabled: true },
  { id: "lottomac", name: "Lotto Mac", color: "#64748b", format: "jackpot", main_count: 5, main_max: 30, mega_count: 1, mega_max: 10, draw_time: "18:45", cutoff: "18:15", enabled: true, jackpot_current: 150000 },
  { id: "zodiaco", name: "Zodiaco", color: "#1e3a8a", format: "zodiac", digits: 2, draw_time: "18:45", cutoff: "18:30", enabled: true },
  { id: "phillipsburg", name: "Phillipsburg", color: "#84cc16", format: "digit", digits: 4, draw_time: "14:00", cutoff: "13:45", enabled: true, draw_days: [1, 3, 5] },
  { id: "playwhe", name: "Play Whe", color: "#ef4444", format: "whe", draw_time: "10:00", cutoff: "09:45", enabled: true },
];

export const DEMO_BET_TYPES: BetType[] = [
  { key: "straight", label: "Straight", multiplier: 5000, enabled: true },
  { key: "box", label: "Box", multiplier: 200, enabled: true },
  { key: "front", label: "Front 3", multiplier: 500, enabled: true },
  { key: "back", label: "Back 3", multiplier: 500, enabled: true },
];

export const DEMO_RETAILERS: Retailer[] = [
  { id: "r001", number: "001", name: "Main Shop", first_name: "Carlos", last_name: "Croes", address: "Caya G. F. Betico Croes 45, Oranjestad", phone: "+297 582 1001", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.5264, lng: -70.0358 },
  { id: "r002", number: "002", name: "Lucky Shoco", first_name: "Maria", last_name: "Frans", address: "L.G. Smith Blvd 82, Oranjestad", phone: "+297 582 1002", commission_sell: 10, commission_redeem: 0, active: true, lat: 12.519, lng: -70.0365 },
  { id: "r003", number: "003", name: "Palm Beach Kiosk", first_name: "John", last_name: "Kelly", address: "J.E. Irausquin Blvd 230, Palm Beach", phone: "+297 586 2003", commission_sell: 12, commission_redeem: 2, active: true, lat: 12.5681, lng: -70.045 },
  { id: "r004", number: "004", name: "Noord Express", first_name: "Ana", last_name: "Wever", address: "Bubali 95, Noord", phone: "+297 586 2004", commission_sell: 10, commission_redeem: 1.5, active: true, lat: 12.566, lng: -70.032 },
  { id: "r005", number: "005", name: "Santa Cruz Mart", first_name: "Pedro", last_name: "Tromp", address: "Santa Cruz 12", phone: "+297 585 3005", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.508, lng: -69.98 },
  { id: "r006", number: "006", name: "Paradera Plaza", first_name: "Sofia", last_name: "Maduro", address: "Paradera 8", phone: "+297 585 3006", commission_sell: 11, commission_redeem: 2, active: true, lat: 12.535, lng: -69.995 },
  { id: "r007", number: "007", name: "San Nicolas Hub", first_name: "Luis", last_name: "Kock", address: "Bernardstraat 22, San Nicolas", phone: "+297 584 4007", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.436, lng: -69.908 },
  { id: "r008", number: "008", name: "Savaneta Corner", first_name: "Elena", last_name: "Geerman", address: "Savaneta 40", phone: "+297 584 4008", commission_sell: 10, commission_redeem: 1, active: true, lat: 12.452, lng: -69.938 },
  { id: "r009", number: "009", name: "Pos Chiquito Store", first_name: "Marco", last_name: "Oduber", address: "Pos Chiquito 5", phone: "+297 585 3009", commission_sell: 10, commission_redeem: 2, active: false, lat: 12.47, lng: -69.96 },
  { id: "r010", number: "010", name: "Eagle Beach Spot", first_name: "Nina", last_name: "Arends", address: "Eagle Beach 15", phone: "+297 587 5010", commission_sell: 12, commission_redeem: 2, active: true, lat: 12.545, lng: -70.057 },
  { id: "r011", number: "011", name: "Airport Express", first_name: "David", last_name: "Lopez", address: "Queen Beatrix Airport Arrivals", phone: "+297 582 1011", commission_sell: 8, commission_redeem: 1, active: true, lat: 12.5014, lng: -70.0152 },
  { id: "r012", number: "012", name: "Tanki Leendert Mini", first_name: "Rosa", last_name: "Dirksz", address: "Tanki Leendert 3", phone: "+297 585 3012", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.52, lng: -70.01 },
  { id: "r013", number: "013", name: "Piedra Plat Market", first_name: "Hugo", last_name: "Thiel", address: "Piedra Plat 7", phone: "+297 585 3013", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.49, lng: -69.97 },
  { id: "r014", number: "014", name: "Brasil Market", first_name: "Camila", last_name: "Silva", address: "Brasil 18, San Nicolas", phone: "+297 584 4014", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.44, lng: -69.92 },
  { id: "r015", number: "015", name: "Cero Colorado Kiosk", first_name: "Ivan", last_name: "Rasmijn", address: "Cero Colorado Rd", phone: "+297 584 4015", commission_sell: 9, commission_redeem: 1.5, active: false, lat: 12.425, lng: -69.88 },
  { id: "r016", number: "016", name: "Malmok Beach Shop", first_name: "Julia", last_name: "Werleman", address: "Malmok Beach", phone: "+297 586 2016", commission_sell: 11, commission_redeem: 2, active: true, lat: 12.595, lng: -70.05 },
  { id: "r017", number: "017", name: "Downtown Lottery", first_name: "Oscar", last_name: "Figaroa", address: "Wilhelminastraat 10, Oranjestad", phone: "+297 582 1017", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.518, lng: -70.033 },
  { id: "r018", number: "018", name: "Bushiri Port Shop", first_name: "Paula", last_name: "Ras", address: "Bushiri Port", phone: "+297 582 1018", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.515, lng: -70.04 },
  { id: "r019", number: "019", name: "Seroe Blanco Store", first_name: "Rico", last_name: "Thijsen", address: "Seroe Blanco 2", phone: "+297 585 3019", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.5, lng: -69.99 },
  { id: "r020", number: "020", name: "Wayaca Center", first_name: "Tina", last_name: "Croes", address: "Wayaca 9, Oranjestad", phone: "+297 582 1020", commission_sell: 10, commission_redeem: 2, active: true, lat: 12.51, lng: -70.025 },
];

export const DEMO_USERS: AppUser[] = [
  { id: "u-owner", email: "owner@shocolottery.aw", name: "Lottery Owner", role: "owner" },
  { id: "u-ret1", email: "main@shop.aw", name: "Carlos Croes", role: "retailer", retailer_id: "r001" },
  { id: "u-ret2", email: "lucky@shop.aw", name: "Maria Frans", role: "retailer", retailer_id: "r002" },
];

export const CURRENCY = "AWG";
export const BRAND_NAME = "Shoco Lottery POS";
export const BRAND_TAGLINE = "Aruba · Play responsibly";
