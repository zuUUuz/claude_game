// Kundentypen: wann sie kommen, wie sie aussehen und was sie sagen.
// Neue Sprüche einfach in die Listen schreiben.

export type CustomerType = 'oma' | 'raver' | 'tourist' | 'bauarbeiter';

export interface Choice {
  label: string;
  money?: number;      // zusätzlich zum Bierpreis, z. B. -1 für einen geliehenen Euro
  rating?: number;
  sell?: boolean;      // false: Kunde kauft am Ende doch nichts
  unpaid?: boolean;    // Bier geht raus, aber ohne zu bezahlen (angeschrieben)
  sellExtra?: number;  // so viele Flaschen zusätzlich, soweit im Lager
  friendship?: number; // nur bei Stammkunden: Herzen dazu oder weg
  set?: Record<string, boolean>; // nur bei Stammkunden: daran erinnert er sich später
  result: string;      // was der Kunde danach sagt
}

export interface Question {
  text: string;
  choices: [Choice, Choice];
}

export interface Look {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  accent: string; // Mütze, Helm, Glitzer …
}

export interface CustomerKind {
  label: string;
  names: string[];
  weight: (hour: number) => number; // wie wahrscheinlich dieser Typ zu dieser Uhrzeit kommt
  look: Look;
  lines: string[];      // kurze Sprüche beim Kassieren
  questions: Question[]; // ab und zu: Frage mit zwei Antworten
  gaveUp: string[];     // beim Gehen, wenn die Schlange zu lang dauert
  noBeer: string[];     // wenn kein Bier mehr da ist
}

const between = (hour: number, from: number, to: number) =>
  from <= to ? hour >= from && hour < to : hour >= from || hour < to;

export const CUSTOMERS: Record<CustomerType, CustomerKind> = {
  oma: {
    label: 'Oma',
    names: ['Oma Gerda', 'Frau Kowalski', 'Oma Hilde', 'Frau Schulze'],
    weight: h => (between(h, 7, 18) ? 3 : 0.2),
    look: { skin: '#f0c8a0', hair: '#d8d4d0', top: '#7a4f9a', bottom: '#4a3a5a', accent: '#c0392b' },
    lines: [
      'Junge, früher hat das Bier 80 Pfennig gekostet.',
      'Für meinen Mann. Der kann ja nicht mehr so gut laufen.',
      'Haben Sie das gehört? Nebenan macht so ein Bio-Café auf.',
      'Ein Bierchen zum Kreuzworträtsel, das gönn ich mir.',
      'Sie sind aber dünn geworden. Essen Sie auch genug?',
    ],
    questions: [
      {
        text: 'Kindchen, können Sie mir das Bier bis zur Haustür tragen? Dritter Stock.',
        choices: [
          { label: 'Na klar, Frau Nachbarin', rating: 0.2, result: 'Wie lieb! Das erzähl ich im ganzen Haus.' },
          { label: 'Ich kann den Laden nicht allein lassen', result: 'Ach ja, die jungen Leute. Immer beschäftigt.' },
        ],
      },
      {
        text: 'Ich hab nur einen Fünfzig-Euro-Schein. Können Sie den wechseln?',
        choices: [
          { label: 'Kein Problem', rating: 0.1, result: 'Danke schön, der Bäcker konnte das nämlich nicht.' },
          { label: 'Nur bis 20 Euro', sell: false, rating: -0.05, result: 'Dann komm ich morgen wieder. Mit Kleingeld.' },
        ],
      },
    ],
    gaveUp: ['Unverschämt, diese Warterei!', 'Dann geh ich halt zum Edeka.'],
    noBeer: ['Kein Bier? In einem Späti?!', 'Na so was. Früher gab es immer Bier.'],
  },
  raver: {
    label: 'Raver',
    names: ['Techno-Tobi', 'Lea mit Glitzer', 'DJ Kalle', 'Mia aus Neukölln'],
    weight: h => (between(h, 19, 5) ? 4 : between(h, 5, 9) ? 1.5 : 0.2),
    look: { skin: '#e8b890', hair: '#f4e06a', top: '#1e1b26', bottom: '#2a2a3a', accent: '#ff4fa3' },
    lines: [
      'Ein Bier. Und… welcher Tag ist heute eigentlich?',
      'Berghain hat mich abgewiesen. Schon wieder.',
      'Bester Späti im Kiez, ich schwör.',
      'Wegbier für die Schlange vorm Club.',
      'Die Musik in meinem Kopf hört einfach nicht auf.',
    ],
    questions: [
      {
        text: 'Digga, haste mal nen Euro? Ich zahl\'s morgen zurück, Ehrenwort.',
        choices: [
          { label: 'Klar, Kumpel', money: -1, rating: 0.15, result: 'Ehrenmann! Ich vergess dir das nie.' },
          { label: 'Hier wird nicht angeschrieben', result: 'Okay, okay. Respekt.' },
        ],
      },
      {
        text: 'Kann ich kurz mein Handy bei dir laden? 1 Prozent, ich muss die Gästeliste zeigen.',
        choices: [
          { label: 'Na logo', rating: 0.1, result: 'Du rettest meine Nacht!' },
          { label: 'Steckdose ist kaputt', result: 'Na toll. Dann halt aus dem Gedächtnis.' },
        ],
      },
    ],
    gaveUp: ['Mein Uber ist da, ciao.', 'Zu lange, Bruder. Die Party wartet nicht.'],
    noBeer: ['Kein Bier?! Was ist das hier, ein Bioladen?', 'Alter. Wie kann ein Späti kein Bier haben.'],
  },
  tourist: {
    label: 'Tourist',
    names: ['Tourist aus Ohio', 'Backpackerin aus Lyon', 'Reisegruppe-Rainer', 'Tourist aus Tokio'],
    weight: h => (between(h, 11, 23) ? 2.5 : 0.3),
    look: { skin: '#f4c9a8', hair: '#8a5a2b', top: '#3a7bd5', bottom: '#d9c79a', accent: '#d9412b' },
    lines: [
      'Is this the famous Späti? Can I take a photo?',
      'One beer please! So authentic!',
      'Excuse me, where is the Brandenburger Tor?',
      'In Ohio we don\'t have this. Amazing.',
      'Ich spreche ein bisschen Deutsch. Bier, bitte. Danke schön!',
    ],
    questions: [
      {
        text: 'How much is the beer? I have only dollars, is that okay?',
        choices: [
          { label: 'Normaler Preis, in Euro bitte', rating: 0.1, result: 'Oh, so cheap! I love Berlin!' },
          { label: 'Touri-Preis: 5 Euro', money: 3.5, rating: -0.2, result: 'Wow, okay! Here you go!' },
        ],
      },
      {
        text: 'Can you recommend a good club for tonight?',
        choices: [
          { label: 'Geheimtipp verraten', rating: 0.1, result: 'Thank you so much, I will tell all my friends!' },
          { label: 'Ins Hotel zurück', result: 'Haha, you are funny. Typical Berlin!' },
        ],
      },
    ],
    gaveUp: ['Sorry, my tour bus is leaving!', 'Too long, I go to the next one.'],
    noBeer: ['No beer? In Germany?!', 'This is not authentic at all.'],
  },
  bauarbeiter: {
    label: 'Bauarbeiter',
    names: ['Bauarbeiter Uwe', 'Polier Detlef', 'Azubi Kevin', 'Kranführerin Sandra'],
    weight: h => (between(h, 6, 10) ? 3 : between(h, 15, 18) ? 3 : 0.3),
    look: { skin: '#d9a07a', hair: '#5a3a24', top: '#f28c28', bottom: '#3a4a6a', accent: '#f7c948' },
    lines: [
      'Feierabendbier. Hab ich mir verdient.',
      'Die Baustelle da vorne? Noch zwei Jahre. Mindestens.',
      'Eins für jetzt, eins für nachher.',
      'Frühstück ist die wichtigste Mahlzeit des Tages.',
      'Wir bauen da drüben Luxuswohnungen. Keine Ahnung, wer die bezahlen soll.',
    ],
    questions: [
      {
        text: 'Ich nehm ne ganze Runde für die Kollegen mit. Gibt\'s Mengenrabatt?',
        choices: [
          { label: '10 Prozent für die Baustelle', money: -0.15, rating: 0.15, result: 'Fairer Laden! Wir kommen wieder.' },
          { label: 'Preis ist Preis', result: 'Na gut. Trotzdem guter Laden.' },
        ],
      },
      {
        text: 'Darf ich mein Fahrrad kurz an deinen Laden lehnen?',
        choices: [
          { label: 'Klar, ich pass auf', rating: 0.1, result: 'Danke, Chef!' },
          { label: 'Lieber nicht', result: 'Na schön, dann eben am Laternenpfahl.' },
        ],
      },
    ],
    gaveUp: ['Die Pause ist gleich vorbei, ich muss.', 'Keine Zeit, der Beton wird hart.'],
    noBeer: ['Kein Bier? Ich hab Feierabend!', 'Das ist ja schlimmer als auf der Baustelle.'],
  },
};

export const CUSTOMER_TYPES = Object.keys(CUSTOMERS) as CustomerType[];

export const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

// Zufälliger Kundentyp passend zur Uhrzeit
export function pickType(hour: number): CustomerType {
  const weights = CUSTOMER_TYPES.map(t => CUSTOMERS[t].weight(hour));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (const [i, w] of weights.entries()) { if ((r -= w) < 0) return CUSTOMER_TYPES[i]; }
  return CUSTOMER_TYPES[0];
}

// Platzhalter-Figur aus Rechtecken, bis die KI-Figuren kommen. x = Mitte, footY = Fußlinie.
export function drawPerson(ctx: CanvasRenderingContext2D, type: CustomerType, x: number, footY: number, step: number) {
  const { skin, hair, top, bottom, accent } = CUSTOMERS[type].look;
  const ink = '#1a1014';
  const box = (color: string, left: number, topY: number, w: number, h: number) => {
    ctx.fillStyle = ink;
    ctx.fillRect(x + left - 1, footY - topY - 1, w + 2, h + 2);
    ctx.fillStyle = color;
    ctx.fillRect(x + left, footY - topY, w, h);
  };
  const legSwing = Math.round(Math.sin(step) * 3);
  // Beine
  box(bottom, -9, 40 - Math.max(0, legSwing), 8, 40 - Math.max(0, legSwing));
  box(bottom, 1, 40 - Math.max(0, -legSwing), 8, 40 - Math.max(0, -legSwing));
  // Rock bei der Oma
  if (type === 'oma') box(bottom, -12, 48, 24, 20);
  // Körper und Arme
  box(top, -12, 78, 24, 40);
  box(top, -16, 76, 5, 30);
  box(top, 11, 76, 5, 30);
  box(skin, -16, 47, 5, 5);
  box(skin, 11, 47, 5, 5);
  // Kopf
  box(skin, -9, 100, 18, 21);
  ctx.fillStyle = ink;
  ctx.fillRect(x - 5, footY - 91, 2, 3);
  ctx.fillRect(x + 3, footY - 91, 2, 3);
  // Haare und Typ-Merkmal
  if (type === 'oma') { box(hair, -10, 104, 20, 7); box(hair, -5, 110, 10, 6); }
  if (type === 'raver') { box(hair, -10, 106, 20, 9); ctx.fillStyle = accent; ctx.fillRect(x - 7, footY - 86, 3, 2); ctx.fillRect(x + 5, footY - 86, 3, 2); box('#111', -8, 93, 16, 4); }
  if (type === 'tourist') { box(accent, -11, 106, 22, 8); box(accent, 3, 99, 12, 3); box('#222', -6, 64, 12, 8); }
  if (type === 'bauarbeiter') { box(accent, -11, 108, 22, 10); box(accent, -12, 99, 24, 3); box('#f7f0d0', -12, 66, 24, 4); }
}
