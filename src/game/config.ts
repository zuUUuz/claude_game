// Alle Stellschrauben fürs Spielgefühl an einem Ort. Nach dem Ausprobieren hier nachjustieren.

export const TIME = {
  minutesPerSecond: 2, // Spielminuten pro echter Sekunde: ein Tag dauert so etwa 12 Minuten
  fastFactor: 4,       // Vorspulen
  startMinutes: 8 * 60, // Spielstart: Tag 1, 8 Uhr
};

// Preise, Einkaufspreise und Bestellmengen der Waren stehen in products.ts, Upgrades in upgrades.ts
export const START_STOCK = 24; // Bier zum Start
export const LOW_STOCK = 5;    // ab hier warnt das Schild oben

export const START_MONEY = 50;

export const QUEUE = {
  max: 4,               // mehr passen nicht an die Kasse
  patienceMinutes: 60,  // so lange (Spielzeit) wartet ein Kunde in der Schlange
};

export const RATING = {
  start: 2.5,
  served: 0.01,     // pro bedientem Kunden
  gaveUp: -0.15,    // Kunde ist aus der Schlange gegangen
  noBeer: -0.1,     // Kunde wollte Bier, aber es war alle
  queueFull: -0.02, // Kunde kam rein, Schlange voll
};

// Wie oft ein Kunde beim Kassieren eine Frage mit zwei Antworten stellt
export const CHOICE_CHANCE = 0.25;

// Kunden pro Spielstunde, nach Uhrzeit (0 bis 23 Uhr), bei mittlerer Beliebtheit
export const TRAFFIC = [
  2, 1, 1, 0.5, 0.5, 1, 2, 4, 5, 4, 3, 4,
  5, 4, 4, 5, 6, 7, 8, 8, 7, 7, 6, 4,
];

// Laufgeschwindigkeit der Kunden in Bildpixeln pro echter Sekunde (bei normalem Tempo)
export const WALK_SPEED = 45;
