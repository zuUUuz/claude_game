// Alle Spielwerte und Texte. Balancing und neue Inhalte passieren hier.

export type ProductId = 'bier' | 'mate' | 'schoki' | 'kaffee' | 'pfeffi';

export interface Product {
  id: ProductId;
  name: string;
  icon: string;
  buy: number; // Einkaufspreis beim Großhandel
  base: number; // fairer Verkaufspreis
  color: number; // Farbe im Kühlschrank/Regal
}

export const PRODUCTS: Record<ProductId, Product> = {
  bier: { id: 'bier', name: 'Bier', icon: '🍺', buy: 0.6, base: 1.6, color: 0x8a5a1c },
  mate: { id: 'mate', name: 'Mate', icon: '🧉', buy: 0.8, base: 2.2, color: 0xe8b631 },
  schoki: { id: 'schoki', name: 'Schoki', icon: '🍫', buy: 0.5, base: 1.5, color: 0x7b3fa0 },
  kaffee: { id: 'kaffee', name: 'Kaffee', icon: '☕', buy: 0.3, base: 1.8, color: 0x5a3a24 },
  pfeffi: { id: 'pfeffi', name: 'Pfeffi', icon: '🥃', buy: 0.4, base: 1.9, color: 0x3fae6a },
};
export const PRODUCT_ORDER: ProductId[] = ['bier', 'mate', 'schoki', 'kaffee', 'pfeffi'];

// Nachfrage je Stunde (20 Uhr … 5 Uhr). Wert = Gewicht für die Produktwahl.
export const DEMAND: Record<number, Partial<Record<ProductId, number>>> = {
  20: { bier: 5, schoki: 2, mate: 1 },
  21: { bier: 6, schoki: 1, mate: 2 },
  22: { bier: 8, mate: 2, pfeffi: 1 },
  23: { bier: 7, mate: 3, pfeffi: 2 },
  0: { bier: 4, mate: 4, pfeffi: 4 },
  1: { mate: 5, pfeffi: 5, bier: 3, schoki: 1 },
  2: { mate: 5, pfeffi: 4, schoki: 3 },
  3: { mate: 4, schoki: 4, pfeffi: 2 },
  4: { schoki: 2, kaffee: 3, mate: 2 },
  5: { kaffee: 8, schoki: 2 },
};
// Kunden pro Spielstunde, Stoßzeiten um 22 Uhr und 1 Uhr
export const TRAFFIC: Record<number, number> = { 20: 5, 21: 7, 22: 10, 23: 8, 0: 6, 1: 9, 2: 6, 3: 4, 4: 3, 5: 6 };

export const NIGHT = {
  realSeconds: 180, // eine Nacht dauert drei echte Minuten
  startHour: 20,
  hours: 10,
  rent: 55, // Miete pro Nacht
  patience: 11, // Sekunden, die ein Kunde wartet
  startCash: 120,
  startStock: { bier: 24, mate: 10, schoki: 10, kaffee: 8, pfeffi: 6 } as Record<ProductId, number>,
};

export type UpgradeId = 'fridge' | 'bench' | 'neon' | 'register' | 'radio';
export interface Upgrade { id: UpgradeId; name: string; desc: string; price: number; }
export const UPGRADES: Upgrade[] = [
  { id: 'neon', name: 'Neonschild', desc: '+20 % Kundschaft. Man sieht dich schon von der Kreuzung.', price: 160 },
  { id: 'bench', name: 'Bierbank', desc: 'Leute bleiben draußen sitzen und holen Nachschub: +30 % Bier.', price: 120 },
  { id: 'fridge', name: 'Zweiter Kühlschrank', desc: 'Doppelt so viel Platz im Lager.', price: 200 },
  { id: 'register', name: 'Kartenleser', desc: 'Schneller kassieren: Kunden warten 40 % länger.', price: 150 },
  { id: 'radio', name: 'Kofferradio', desc: 'Gute Stimmung: +15 % Trinkgeld.', price: 90 },
];

export const CAPACITY = { base: 80, fridge: 80 };

// ---------- Stammkunden-Ereignisse ----------
// Jede Wahl verändert Geld, Ruf (0–100) oder Lager und hat eine Folge-Zeile.
export interface Choice {
  label: string;
  cash?: number;
  rep?: number;
  stock?: Partial<Record<ProductId, number>>;
  debt?: number; // Techno-Tobi zahlt vielleicht später
  risk?: { chance: number; cash: number; text: string }; // z. B. Ordnungsamt
  boost?: number; // mehr Kundschaft in der nächsten Nacht
  result: string;
}
export interface Encounter {
  id: string;
  who: string;
  tag: string;
  hours: number[];
  text: string;
  choices: [Choice, Choice];
  minNight?: number;
  needs?: UpgradeId;
}

export const ENCOUNTERS: Encounter[] = [
  {
    id: 'tobi', who: 'Techno-Tobi', tag: 'Stammkunde', hours: [1, 2, 3],
    text: 'Digga, drei Mate, der Club macht gleich auf. Kann ich anschreiben? Morgen zahl ich doppelt, Ehrenwort.',
    choices: [
      { label: 'Anschreiben', stock: { mate: -3 }, rep: 4, debt: 13, result: 'Tobi umarmt dich über die Theke. Mal sehen, ob er wiederkommt.' },
      { label: 'Nur gegen Bares', rep: -3, result: 'Tobi murmelt was von „früher war hier alles besser“ und zieht ab.' },
    ],
  },
  {
    id: 'tourist', who: 'Tourist aus Ohio', tag: 'Laufkundschaft', hours: [21, 22, 23, 0],
    text: '„One Späti beer please! This is so authentic! How much?“',
    choices: [
      { label: 'Normaler Preis', stock: { bier: -1 }, cash: 1.6, rep: 2, result: '„Wow, so cheap!“ Er macht ein Selfie mit dir.' },
      { label: 'Touri-Preis: 5 €', stock: { bier: -1 }, cash: 5, rep: -4, result: 'Er zahlt strahlend. Die Stammkunden an der Bierbank schütteln den Kopf.' },
    ],
  },
  {
    id: 'teen', who: 'Jugendlicher mit Kapuze', tag: 'Verdächtig', hours: [20, 21, 22],
    text: 'Ein Sixpack, bitte. Ausweis? Äh, hab ich zuhause. Ich bin 19, echt.',
    choices: [
      { label: 'Verkaufen', stock: { bier: -6 }, cash: 11, risk: { chance: 0.4, cash: -120, text: 'Das Ordnungsamt stand gegenüber. 120 € Bußgeld.' }, result: 'Er verschwindet schnell um die Ecke.' },
      { label: 'Ohne Ausweis nix', rep: 3, result: 'Er zieht beleidigt ab. Die Oma von oben nickt dir anerkennend zu.' },
    ],
  },
  {
    id: 'gerda', who: 'Oma Gerda', tag: 'Stammkundin seit 1987', hours: [20, 21],
    text: 'Einen Lottoschein und eine Schoki, Kindchen. Hast du schon gehört? Nebenan soll so ein Bio-Café aufmachen.',
    choices: [
      { label: 'Zuhören und plaudern', stock: { schoki: -1 }, cash: 1.5, rep: 5, result: 'Zehn Minuten Kiez-Tratsch. Gerda erzählt es allen weiter: Du bist ein Guter.' },
      { label: 'Freundlich abkürzen', stock: { schoki: -1 }, cash: 1.5, result: 'Gerda seufzt. „Früher hatte man noch Zeit.“' },
    ],
  },
  {
    id: 'nachbar', who: 'Nachbar im Bademantel', tag: 'Genervt', hours: [0, 1, 2], minNight: 2, needs: 'bench',
    text: 'Es ist ein Uhr nachts! Die Leute auf deiner Bierbank grölen seit Stunden. Mach das leiser, sonst ruf ich die Polizei.',
    choices: [
      { label: 'Bierbank räumen', rep: -2, cash: -10, result: 'Die Bank ist leer, die Kundschaft auch. Aber Ruhe im Haus.' },
      { label: '„Ist halt Berlin“', risk: { chance: 0.35, cash: -80, text: 'Die Polizei kam doch. 80 € wegen Ruhestörung.' }, rep: 2, result: 'Der Nachbar knallt das Fenster zu. Die Bierbank jubelt.' },
    ],
  },
  {
    id: 'pfand', who: 'Pfand-Paul', tag: 'Sammler', hours: [3, 4, 5],
    text: 'Moin Chef. Hab zwei Tüten Pfand. Tauschst du mir die gegen Kaffee und nen Zehner?',
    choices: [
      { label: 'Klar, Paul', cash: -6, stock: { kaffee: -1 }, rep: 4, boost: 0.3, result: 'Paul erzählt dir, wo morgen ein Straßenfest ist. Mehr Kundschaft!' },
      { label: 'Heute nicht', rep: -1, result: 'Paul zuckt mit den Schultern und schiebt weiter.' },
    ],
  },
];
