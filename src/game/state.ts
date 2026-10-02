// Spielstand: wird im Browser gespeichert, damit der Späti beim nächsten Öffnen weiterläuft.

import { RATING, START_MONEY, START_STOCK, TIME } from './config';
import type { RegularMemory } from './regulars';
import type { ProductId } from './products';

export interface Goal {
  id: string;
  text: string;
  target: number;
  progress: number;
  reward: { money?: number; rating?: number };
  done: boolean;
  atDayEnd?: boolean; // wird erst um Mitternacht geprüft (z. B. „keiner geht wütend“)
}

export interface DayStats {
  sold: Partial<Record<ProductId, number>>;
  served: number;
  angry: number;
  revenue: number;
}

export interface GameState {
  version: 2;
  money: number;   // Euro
  minutes: number; // Spielzeit in Minuten seit Tag 1, 0 Uhr
  rating: number;  // Beliebtheit im Kiez, 0 bis 5
  stock: Partial<Record<ProductId, number>>; // Ware im Lager, nur freigeschaltete
  unlocked: string[];                        // gekaufte Upgrades aus dem Tech-Tree
  regulars: Record<string, RegularMemory>;   // Stammkunden, die du schon kennst
  goals: Goal[];   // Tagesziele von heute
  today: DayStats;
  lastSeen: number; // echte Zeit (ms) des letzten Speicherns, für Offline-Einnahmen
}

const SAVE_KEY = 'kiezkoenig-save';

export const emptyDay = (): DayStats => ({ sold: {}, served: 0, angry: 0, revenue: 0 });

export function newGame(): GameState {
  return {
    version: 2, money: START_MONEY, minutes: TIME.startMinutes, rating: RATING.start,
    stock: { bier: START_STOCK }, unlocked: [], regulars: {}, goals: [], today: emptyDay(), lastSeen: Date.now(),
  };
}

function load(): GameState {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved?.version === 2) return { ...newGame(), ...saved };
    // Alter Spielstand (nur Bier): übernehmen
    if (saved?.version === 1) {
      const { beer, ...rest } = saved;
      return { ...newGame(), ...rest, version: 2, stock: { bier: beer ?? START_STOCK } };
    }
  } catch { /* kaputter oder gesperrter Speicher: neu anfangen */ }
  return newGame();
}

export const state: GameState = load();

export function saveGame() {
  state.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* Speicher gesperrt, Spiel läuft trotzdem */ }
}

export function resetGame() {
  Object.assign(state, newGame());
  saveGame();
}

export const day = (minutes: number) => Math.floor(minutes / 1440) + 1;
export const hour = (minutes: number) => Math.floor(minutes / 60) % 24;

export const formatMoney = (euro: number) =>
  `${euro.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const formatTime = (minutes: number) =>
  `${String(hour(minutes)).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`;
export const formatRating = (rating: number) =>
  rating.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
