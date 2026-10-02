// Stammkunden: feste Figuren, die wiederkommen und sich an deine Antworten erinnern.
// Jede Figur hat eine Reihe von Begegnungen (höchstens eine pro Spieltag) und danach Grüße.

import type { CustomerType, Choice } from './customers';

// Was sich das Spiel pro Stammkunde merkt (wird mit dem Spielstand gespeichert)
export interface RegularMemory {
  friendship: number;            // 0 bis 5 Herzen
  done: string[];                // erledigte Begegnungen
  flags: Record<string, boolean>; // Erinnerungen an deine Antworten
  lastDay: number;               // Spieltag des letzten Besuchs
  last: string;                  // zuletzt Passiertes, fürs Kiez-Panel
}

export interface Beat {
  id: string;
  when: (m: RegularMemory) => boolean; // ob diese Begegnung jetzt dran sein kann
  text: string;
  choices: [Choice, Choice];
}

export interface Regular {
  id: string;
  name: string;
  type: CustomerType;
  intro: string;              // kurze Beschreibung fürs Kiez-Panel
  hours: [number, number];    // kommt zwischen diesen Uhrzeiten (über Mitternacht möglich)
  beats: Beat[];
  greetings: (m: RegularMemory) => string[]; // wenn gerade keine Begegnung dran ist
}

const did = (m: RegularMemory, id: string) => m.done.includes(id);

export const REGULARS: Regular[] = [
  {
    id: 'tobi',
    name: 'Techno-Tobi',
    type: 'raver',
    intro: 'Wohnt quasi im Club gegenüber. Ständig pleite, aber herzlich.',
    hours: [19, 3],
    beats: [
      {
        id: 'kennenlernen',
        when: m => !did(m, 'kennenlernen'),
        text: 'Na? Neu hier? Ich bin Tobi. Ich wohn quasi im Club gegenüber. Ein Bier, bitte.',
        choices: [
          { label: 'Willkommen, Tobi!', friendship: 1, result: 'Nice. Ich glaub, wir werden Freunde.' },
          { label: '1,50 bitte.', result: 'Okay… sehr geschäftlich hier.' },
        ],
      },
      {
        id: 'euro',
        when: m => did(m, 'kennenlernen') && !did(m, 'euro'),
        text: 'Digga, mir fehlt grad Kleingeld. Kannst du mir das Bier vorstrecken? Morgen zahl ich, Ehrenwort.',
        choices: [
          { label: 'Klar, Kumpel', unpaid: true, friendship: 1, set: { geliehen: true }, result: 'Ehrenmann! Ich vergess dir das nie.' },
          { label: 'Nur gegen Bares', sell: false, friendship: -1, set: { abgelehnt: true }, result: 'Okay. Kein Ding. …Ist schon ein Ding.' },
        ],
      },
      {
        id: 'zurueck',
        when: m => !!m.flags.geliehen && !did(m, 'zurueck'),
        text: 'Ey Chef! Hier, das Bier von gestern. Plus Zinsen! Siehste, auf Tobi ist Verlass.',
        choices: [
          { label: 'Danke, Tobi', money: 3, friendship: 1, result: 'Ehrensache.' },
          { label: 'Lass stecken, Kumpel', friendship: 2, rating: 0.2, result: 'Du bist echt der Beste. Das erzähl ich im Club.' },
        ],
      },
      {
        id: 'beleidigt',
        when: m => !!m.flags.abgelehnt && !did(m, 'beleidigt'),
        text: 'Ah, der Geizhals. Ein Bier. Bar. Wie du\'s magst.',
        choices: [
          { label: 'Sorry wegen gestern', friendship: 1, result: 'Schon gut. War ja auch dreist von mir.' },
          { label: 'Regeln sind Regeln', result: 'Jaja. Regeln.' },
        ],
      },
      {
        id: 'gaesteliste',
        when: m => m.friendship >= 2 && !did(m, 'gaesteliste'),
        text: 'Ich leg Samstag auf! Soll ich dich auf die Gästeliste setzen? Dann bring ich die Crew nach der Party zu dir.',
        choices: [
          { label: 'Ich bin dabei!', friendship: 1, rating: 0.2, set: { crew: true }, result: 'Legendär! Die Crew kommt danach rum.' },
          { label: 'Ich hab Nachtschicht', result: 'Schade. Dann bring ich dir wenigstens ein Foto vom Pult mit.' },
        ],
      },
      {
        id: 'crew',
        when: m => !!m.flags.crew && !did(m, 'crew'),
        text: 'Die Crew ist da! Wir haben Durst, Chef. Zehn Bier!',
        choices: [
          { label: 'Zehn Bier, kommt sofort', sellExtra: 9, friendship: 1, rating: 0.3, result: 'Der beste Späti der Stadt! Wuhuu!' },
          { label: 'Nur eins pro Person', rating: -0.1, result: 'Spießer! …Okay, eins.' },
        ],
      },
    ],
    greetings: m => m.friendship >= 4
      ? ['Chef! Das Übliche!', 'Mein Lieblingsspäti. Ein Bier, Bruder.', 'Na, Kumpel? Läuft der Laden?']
      : m.friendship >= 2
        ? ['Na, Chef? Ein Bier, wie immer.', 'Tobi ist wieder da!']
        : ['Ein Bier.', 'Hm. Bier, bitte.'],
  },
];

export const regularById = (id: string) => REGULARS.find(r => r.id === id)!;

export const newMemory = (): RegularMemory => ({ friendship: 0, done: [], flags: {}, lastDay: 0, last: '' });
