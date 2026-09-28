// Zentrale Spielwerte. Balancing passiert hier.

export type Team = 'blue' | 'red';
export type UnitKind = 'infantry' | 'tank' | 'antitank' | 'recon';

export interface UnitStats {
  name: string;
  short: string;
  label: string; // kurzer Name für die Karten unten
  cost: number;
  hp: number;
  speed: number;
  range: number;
  vision: number;
  reload: number; // Sekunden zwischen Schüssen
  damage: { soft: number; armor: number };
  armored: boolean;
  radius: number; // Kollisionsradius
  blurb: string;
}

export const UNITS: Record<UnitKind, UnitStats> = {
  infantry: {
    name: 'Infanterie', short: 'INF', label: 'Infanterie', cost: 20, hp: 80, speed: 4.2, range: 20, vision: 30,
    reload: 1.1, damage: { soft: 7, armor: 1.5 }, armored: false, radius: 2.2,
    blurb: 'Billig, hält Städte',
  },
  tank: {
    name: 'Kampfpanzer', short: 'PZ', label: 'Panzer', cost: 60, hp: 260, speed: 7, range: 32, vision: 28,
    reload: 2.8, damage: { soft: 30, armor: 45 }, armored: true, radius: 2.6,
    blurb: 'Stark im offenen Feld',
  },
  antitank: {
    name: 'Panzerabwehr', short: 'PAK', label: 'PAK-Trupp', cost: 35, hp: 60, speed: 3.6, range: 30, vision: 26,
    reload: 3.6, damage: { soft: 5, armor: 70 }, armored: false, radius: 2.2,
    blurb: 'Knackt Panzer',
  },
  recon: {
    name: 'Aufklärer', short: 'AUF', label: 'Aufklärer', cost: 25, hp: 90, speed: 12, range: 18, vision: 58,
    reload: 0.6, damage: { soft: 4, armor: 1 }, armored: true, radius: 2.2,
    blurb: 'Sieht weit, deckt auf',
  },
};

export const UNIT_ORDER: UnitKind[] = ['infantry', 'tank', 'antitank', 'recon'];

export const TEAM = {
  blue: { name: 'Nordbund', color: 0x3f7fd9, dark: 0x24477a, css: '#4f8ee6' },
  red: { name: 'Südpakt', color: 0xd9602f, dark: 0x7a3218, css: '#e0703f' },
} as const;

export const MATCH = {
  duration: 240, // Sekunden
  scoreToWin: 400,
  overtimeFrom: 60, // letzte Sekunden zählen doppelt
  startSupply: 90,
  baseIncome: 2.2, // Nachschub pro Sekunde
  pointIncome: 0.7,
  comebackIncome: 0.8, // Extra-Nachschub pro Punkt, den der Gegner mehr hält
  unitCap: 18,
  pointScore: 1, // Punkte pro Sekunde je gehaltenem Punkt
  captureRadius: 13,
  captureSpeed: 22, // Prozent pro Sekunde und Einheit (gedeckelt)
  townCover: 0.5, // Infanterie in Städten nimmt nur halben Schaden
};

export const MAP = { width: 170, depth: 230 };
