// Spielstand: wird im Browser gespeichert, damit der Späti beim nächsten Öffnen weiterläuft.

import { BEER, RATING, START_MONEY, TIME } from './config';
import type { RegularMemory } from './regulars';

export interface GameState {
  version: 1;
  money: number;   // Euro
  minutes: number; // Spielzeit in Minuten seit Tag 1, 0 Uhr
  rating: number;  // Beliebtheit im Kiez, 0 bis 5
  beer: number;    // Flaschen im Lager
  regulars: Record<string, RegularMemory>; // Stammkunden, die du schon kennst
}

const SAVE_KEY = 'kiezkoenig-save';

export function newGame(): GameState {
  return { version: 1, money: START_MONEY, minutes: TIME.startMinutes, rating: RATING.start, beer: BEER.startStock, regulars: {} };
}

function load(): GameState {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved?.version === 1) return { ...newGame(), ...saved };
  } catch { /* kaputter oder gesperrter Speicher: neu anfangen */ }
  return newGame();
}

export const state: GameState = load();

export function saveGame() {
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
