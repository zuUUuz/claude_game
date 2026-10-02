// Aufteilung des Raums: wo Möbel stehen und wo Kunden hinlaufen. Alles in Bildpixeln;
// x = Mitte, y = Fußlinie unterhalb der Wandkante (0 = direkt an der Wand).

import { has } from './upgrades';

export type FurnitureType = 'fridge' | 'counter' | 'shelf' | 'crate';
export interface Placed { type: FurnitureType; x: number; y: number }

export const LAYOUT = {
  door: { x: 288, y: 2 },
  fridgeSpots: [{ x: 110, y: 26 }, { x: 200, y: 26 }], // wo Kunden vor den Kühlschränken stehen
  shelfSpot: { x: 330, y: 140 },
  queue: { x: 232, y: 196 }, // erster Platz an der Kasse, die Schlange läuft schräg nach rechts unten
};

// Möbel je nach gekauften Upgrades; im Baumodus wird das später frei veränderbar
export function furnitureLayout(): Placed[] {
  return [
    { type: 'crate', x: 40, y: 40 },
    { type: 'fridge', x: 110, y: 3 },
    ...(has('fridge2') ? [{ type: 'fridge' as const, x: 200, y: 3 }] : []),
    { type: 'shelf', x: 330, y: 120 },
    { type: 'counter', x: 150, y: 190 },
  ];
}
