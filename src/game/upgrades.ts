// Tech-Tree: alles, wofür man im Späti Geld ausgeben kann. Preise und Wirkungen hier anpassen.

import { QUEUE } from './config';
import { PRODUCT_IDS, ProductId } from './products';
import { state } from './state';

export type Branch = 'sortiment' | 'laden' | 'service';

export interface Upgrade {
  id: string;
  branch: Branch;
  name: string;
  desc: string;
  cost: number;
  requires?: string[];  // andere Upgrades, die vorher gekauft sein müssen
  minRating?: number;   // nötige Beliebtheit
  product?: ProductId;  // schaltet eine Ware frei
}

export const BRANCHES: { id: Branch; name: string }[] = [
  { id: 'sortiment', name: 'Sortiment' },
  { id: 'laden', name: 'Laden' },
  { id: 'service', name: 'Service' },
];

export const UPGRADES: Upgrade[] = [
  { id: 'kaffee', branch: 'sortiment', product: 'kaffee', cost: 60, name: 'Kaffee', desc: 'Lockt morgens Omas und Bauarbeiter an.' },
  { id: 'mate', branch: 'sortiment', product: 'mate', cost: 90, name: 'Club-Mate', desc: 'Pflicht für Raver. Abends mehr Kundschaft.' },
  { id: 'schoki', branch: 'sortiment', product: 'schoki', cost: 80, requires: ['kaffee'], name: 'Schokolade', desc: 'Touristen lieben deutsche Schokolade.' },
  { id: 'pfeffi', branch: 'sortiment', product: 'pfeffi', cost: 150, requires: ['mate'], name: 'Pfeffi', desc: 'Der Klassiker für die Partynacht.' },
  { id: 'lotto', branch: 'sortiment', product: 'lotto', cost: 250, minRating: 3, name: 'Lottoscheine', desc: 'Omas kommen extra dafür. Teuer, aber lohnend.' },

  { id: 'fridge2', branch: 'laden', cost: 150, name: 'Zweiter Kühlschrank', desc: 'Doppelt so viel Platz im Lager.' },
  { id: 'neon', branch: 'laden', cost: 250, name: 'Neonschild', desc: 'Man sieht dich von der Kreuzung: +25 % Kunden.' },
  { id: 'bierbank', branch: 'laden', cost: 200, name: 'Bierbank vor der Tür', desc: 'Kunden bleiben länger und nehmen öfter ein zweites.' },
  { id: 'bigger', branch: 'laden', cost: 800, requires: ['fridge2'], name: 'Laden vergrößern', desc: 'Mehr Platz: Schlange bis 6, mehr Kunden gleichzeitig.' },

  { id: 'cardreader', branch: 'service', cost: 120, name: 'Kartenleser', desc: 'Kunden warten 50 % länger, bevor sie gehen.' },
  { id: 'radio', branch: 'service', cost: 80, name: 'Kofferradio', desc: 'Gute Stimmung: öfter Trinkgeld.' },
  { id: 'helper', branch: 'service', cost: 500, minRating: 3, name: 'Aushilfe', desc: 'Kassiert Laufkundschaft selbst, auch wenn die App zu ist. Kostet 20 € Lohn pro Tag.' },
];

export const HELPER_WAGE = 20;

export const has = (id: string) => state.unlocked.includes(id);

export const upgradeById = (id: string) => UPGRADES.find(u => u.id === id)!;

// Warum ein Upgrade noch nicht kaufbar ist, oder '' wenn es geht
export function blockedReason(u: Upgrade): string {
  if (has(u.id)) return 'Gekauft';
  const missing = (u.requires ?? []).filter(r => !has(r));
  if (missing.length) return `Braucht erst: ${missing.map(r => upgradeById(r).name).join(', ')}`;
  if (u.minRating && state.rating < u.minRating) return `Braucht Beliebtheit ${u.minRating}`;
  if (state.money < u.cost) return 'Zu wenig Geld';
  return '';
}

export function buy(u: Upgrade): boolean {
  if (blockedReason(u)) return false;
  state.money -= u.cost;
  state.unlocked.push(u.id);
  if (u.product) state.stock[u.product] ??= 0;
  return true;
}

// ---------- Wirkungen ----------
export const unlockedProducts = (): ProductId[] => PRODUCT_IDS.filter(p => p === 'bier' || has(p));
export const trafficFactor = () => (has('neon') ? 1.25 : 1) * (1 + 0.12 * (unlockedProducts().length - 1));
export const patienceFactor = () => (has('cardreader') ? 1.5 : 1) * (has('bierbank') ? 1.2 : 1);
export const secondItemChance = () => (has('bierbank') ? 0.2 : 0);
export const tipChance = () => (has('radio') ? 0.35 : 0.1);
export const stockCap = () => (has('fridge2') ? 60 : 30); // pro Ware
export const queueMax = () => QUEUE.max + (has('bigger') ? 2 : 0);
export const maxInShop = () => 8 + (has('bigger') ? 4 : 0);
