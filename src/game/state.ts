// Spielstand. Vorerst feste Beispielwerte für die Anzeige; die echte Spiellogik kommt in einem späteren Schritt.

export interface GameState {
  money: number;      // Euro
  day: number;
  minutes: number;    // Uhrzeit in Minuten ab Mitternacht
  rating: number;     // Beliebtheit im Kiez, 0 bis 5 Sterne
  lowStock: string[]; // Waren, die knapp werden
}

export const state: GameState = {
  money: 250,
  day: 1,
  minutes: 18 * 60,
  rating: 2,
  lowStock: ['Club-Mate'],
};

export const formatMoney = (euro: number) => `${euro.toLocaleString('de-DE')} €`;
export const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
