// Der Laden in Bewegung: Uhr, Kunden kommen, holen Bier, stellen sich an, werden kassiert oder gehen.

import { BEER, CHOICE_CHANCE, QUEUE, RATING, TIME, TRAFFIC, WALK_SPEED } from './config';
import { CUSTOMERS, CustomerType, Choice, Question, pick, pickType } from './customers';
import { REGULARS, Beat, regularById, newMemory } from './regulars';
import { state, hour, day } from './state';

// Wege im Raum, in Bildpixeln; y zählt ab der Wandkante nach unten (wie bei den Möbeln)
const DOOR = { x: 288, y: 2 };
const FRIDGE_SPOT = { x: 208, y: 24 };
const queueSlot = (i: number) => ({ x: 262 + i * 30, y: 114 });
const MAX_IN_SHOP = 8;

type Phase = 'toFridge' | 'queue' | 'leaving';

export interface Customer {
  id: number;
  type: CustomerType;
  name: string;
  x: number;
  y: number;
  target: { x: number; y: number };
  phase: Phase;
  patience: number; // verbleibende Wartezeit in Spielminuten
  step: number;     // für die Laufanimation
  bubble?: { text: string; until: number };
  regularId?: string; // gesetzt bei Stammkunden
}

export interface Checkout {
  customer: Customer;
  line?: string;
  question?: Question;
  beat?: Beat; // Begegnung eines Stammkunden
}

let nextId = 1;
let spawnBudget = 0;
let clock = 0; // echte Sekunden, für Sprechblasen

export const customers: Customer[] = [];
const queue: Customer[] = [];
let reserved = 0; // Flaschen, die Kunden schon aus dem Kühlschrank genommen haben
const regularSeenDay: Record<string, number> = {}; // Stammkunden kommen höchstens einmal am Tag rein

const changeRating = (delta: number) => { state.rating = Math.min(5, Math.max(0, state.rating + delta)); };
const say = (c: Customer, text: string) => { c.bubble = { text, until: clock + 3.5 }; };

function leave(c: Customer) {
  c.phase = 'leaving';
  c.target = { ...DOOR };
  const i = queue.indexOf(c);
  if (i >= 0) {
    queue.splice(i, 1);
    reserved--;
    queue.forEach((q, n) => { q.target = queueSlot(n); });
  }
}

function spawn(type: CustomerType = pickType(hour(state.minutes)), name = pick(CUSTOMERS[type].names), regularId?: string) {
  customers.push({
    id: nextId++, type, name, regularId,
    x: DOOR.x, y: DOOR.y, target: { ...FRIDGE_SPOT },
    phase: 'toFridge', patience: QUEUE.patienceMinutes, step: 0,
  });
}

// Stammkunden: kommen einmal am Tag irgendwann in ihrem Zeitfenster
function spawnRegulars(gameMinutes: number) {
  const today = day(state.minutes), h = hour(state.minutes);
  for (const r of REGULARS) {
    const [from, to] = r.hours;
    const inWindow = from <= to ? h >= from && h < to : h >= from || h < to;
    if (!inWindow || regularSeenDay[r.id] === today || (state.regulars[r.id]?.lastDay ?? 0) === today) continue;
    if (customers.length >= MAX_IN_SHOP || customers.some(c => c.regularId === r.id)) continue;
    const windowMinutes = (((to - from) + 24) % 24 || 24) * 60;
    if (Math.random() < (gameMinutes * 1.5) / windowMinutes) {
      regularSeenDay[r.id] = today;
      spawn(r.type, r.name, r.id);
    }
  }
}

// Kunde steht am Kühlschrank: Bier nehmen und anstellen, oder enttäuscht gehen
function atFridge(c: Customer) {
  if (state.beer - reserved <= 0) {
    say(c, pick(CUSTOMERS[c.type].noBeer));
    changeRating(RATING.noBeer);
    leave(c);
    return;
  }
  if (queue.length >= QUEUE.max) {
    say(c, 'Viel zu voll hier.');
    changeRating(RATING.queueFull);
    leave(c);
    return;
  }
  reserved++;
  queue.push(c);
  c.phase = 'queue';
  c.target = queueSlot(queue.length - 1);
}

const arrived = (c: Customer) => c.x === c.target.x && c.y === c.target.y;

// speed: 0 = Pause, 1 = normal, TIME.fastFactor = Vorspulen
export function update(dt: number, speed: number) {
  clock += dt;
  if (speed === 0) return;
  const gameMinutes = dt * TIME.minutesPerSecond * speed;
  state.minutes += gameMinutes;

  // Neue Kunden: je nach Uhrzeit und Beliebtheit
  const perHour = TRAFFIC[hour(state.minutes)] * (0.4 + (state.rating / 5) * 1.2);
  spawnBudget += (perHour / 60) * gameMinutes;
  if (spawnBudget >= 1) {
    spawnBudget -= 1;
    if (customers.length < MAX_IN_SHOP) spawn();
  }
  spawnRegulars(gameMinutes);

  const walk = WALK_SPEED * speed * dt;
  for (const c of [...customers]) {
    // Laufen
    const dx = c.target.x - c.x, dy = c.target.y - c.y, dist = Math.hypot(dx, dy);
    if (dist > 0) {
      const s = Math.min(walk, dist);
      c.x = dist <= walk ? c.target.x : c.x + (dx / dist) * s;
      c.y = dist <= walk ? c.target.y : c.y + (dy / dist) * s;
      c.step += s * 0.25;
    }
    if (c.phase === 'toFridge' && arrived(c)) atFridge(c);
    if (c.phase === 'leaving' && arrived(c)) customers.splice(customers.indexOf(c), 1);
    // Warten in der Schlange
    if (c.phase === 'queue') {
      c.patience -= gameMinutes;
      if (c.patience <= 0) {
        say(c, pick(CUSTOMERS[c.type].gaveUp));
        changeRating(RATING.gaveUp);
        leave(c);
      }
    }
  }
}

// Wer steht vorne an der Kasse und ist bereit?
export function frontCustomer(): Customer | undefined {
  const c = queue[0];
  return c && arrived(c) ? c : undefined;
}

export function startCheckout(): Checkout | undefined {
  const customer = frontCustomer();
  if (!customer) return undefined;
  if (customer.regularId) {
    const regular = regularById(customer.regularId);
    const memory = state.regulars[regular.id] ??= newMemory();
    const beat = regular.beats.find(b => b.when(memory));
    return beat
      ? { customer, beat, question: { text: beat.text, choices: beat.choices } }
      : { customer, line: pick(regular.greetings(memory)) };
  }
  const kind = CUSTOMERS[customer.type];
  return Math.random() < CHOICE_CHANCE
    ? { customer, question: pick(kind.questions) }
    : { customer, line: pick(kind.lines) };
}

export function finishCheckout(checkout: Checkout, choice?: Choice) {
  const c = checkout.customer;
  if (choice?.sell !== false) {
    // Zusätzliche Flaschen nur, soweit nicht schon für andere Kunden in der Schlange reserviert
    const extra = Math.max(0, Math.min(choice?.sellExtra ?? 0, state.beer - reserved));
    if (!choice?.unpaid) state.money += BEER.price;
    state.money += extra * BEER.price;
    state.beer -= 1 + extra;
    changeRating(RATING.served);
  }
  state.money += choice?.money ?? 0;
  changeRating(choice?.rating ?? 0);
  if (choice) say(c, choice.result);
  if (c.regularId) remember(c.regularId, checkout, choice);
  // leave() gibt die reservierte Flasche frei: verkauft (Bestand schon gesenkt) oder zurück ins Regal
  leave(c);
}

// Stammkunde merkt sich den Besuch und deine Antwort
function remember(id: string, checkout: Checkout, choice?: Choice) {
  const memory = state.regulars[id] ??= newMemory();
  memory.lastDay = day(state.minutes);
  memory.friendship = Math.min(5, Math.max(0, memory.friendship + (choice?.friendship ?? 0)));
  Object.assign(memory.flags, choice?.set);
  if (checkout.beat) memory.done.push(checkout.beat.id);
  memory.last = choice ? `${checkout.question?.text} Du: „${choice.label}“` : checkout.line ?? '';
}

// Kunden, die ihre Sprechblase gerade zeigen
export const bubbleVisible = (c: Customer) => !!c.bubble && c.bubble.until > clock;

export function orderBeer(): boolean {
  const cost = BEER.orderAmount * BEER.buyPrice;
  if (state.money < cost) return false;
  state.money -= cost;
  state.beer += BEER.orderAmount;
  return true;
}

// Laden leeren, z. B. nach „Spielstand zurücksetzen“
export function reset() {
  customers.length = 0;
  queue.length = 0;
  reserved = 0;
  spawnBudget = 0;
  for (const id in regularSeenDay) delete regularSeenDay[id];
}
