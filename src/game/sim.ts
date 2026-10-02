// Der Laden in Bewegung: Uhr, Kunden kommen, holen Ware, stellen sich an, werden kassiert oder gehen.

import { CHOICE_CHANCE, QUEUE, RATING, TIME, TRAFFIC, WALK_SPEED } from './config';
import { CUSTOMERS, CustomerType, Choice, Question, pick, pickType } from './customers';
import { REGULARS, Beat, regularById, newMemory } from './regulars';
import { PRODUCTS, ProductId } from './products';
import { state, hour, day, formatMoney } from './state';
import { newDayGoals, updateGoals, endDay, messages } from './goals';
import {
  has, unlockedProducts, trafficFactor, patienceFactor, secondItemChance, tipChance, stockCap, queueMax, maxInShop, HELPER_WAGE,
} from './upgrades';
import { LAYOUT } from './layout';

const MAX_TIP = 0.6;
const HELPER_DELAY = 10; // Spielminuten, die die Aushilfe wartet, bevor sie selbst kassiert

type Phase = 'toPickup' | 'queue' | 'leaving';

export interface Customer {
  id: number;
  type: CustomerType;
  name: string;
  product: ProductId;
  x: number;
  y: number;
  target: { x: number; y: number };
  phase: Phase;
  patience: number;  // verbleibende Wartezeit in Spielminuten
  frontWait: number; // wie lange er schon vorne an der Kasse steht
  step: number;      // für die Laufanimation
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
const reserved: Partial<Record<ProductId, number>> = {}; // schon aus dem Regal genommen, noch nicht bezahlt
const regularSeenDay: Record<string, number> = {};   // Stammkunden kommen höchstens einmal am Tag rein

const changeRating = (delta: number) => { state.rating = Math.min(5, Math.max(0, state.rating + delta)); };
const say = (c: Customer, text: string) => { c.bubble = { text, until: clock + 3.5 }; };
export const freeStock = (p: ProductId) => (state.stock[p] ?? 0) - (reserved[p] ?? 0);
const queueSlot = (i: number) => ({ x: LAYOUT.queue.x + i * 28, y: LAYOUT.queue.y + i * 10 });

function leave(c: Customer) {
  c.phase = 'leaving';
  c.target = { ...LAYOUT.door };
  const i = queue.indexOf(c);
  if (i >= 0) {
    queue.splice(i, 1);
    reserved[c.product] = (reserved[c.product] ?? 1) - 1;
    queue.forEach((q, n) => { q.target = queueSlot(n); });
  }
}

function angry(c: Customer, text: string, delta: number) {
  say(c, text);
  changeRating(delta);
  state.today.angry++;
  leave(c);
}

// Welche Ware ein Kunde will: nach Vorliebe seines Typs, unter allen freigeschalteten
function chooseProduct(type: CustomerType): ProductId {
  const options = unlockedProducts();
  const weights = options.map(p => PRODUCTS[p].fans[type] ?? 0.3);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (const [i, w] of weights.entries()) { if ((r -= w) < 0) return options[i]; }
  return 'bier';
}

function pickupSpot(p: ProductId) {
  const place = PRODUCTS[p].place;
  if (place === 'shelf') return { ...LAYOUT.shelfSpot };
  if (place === 'counter') return queueSlot(Math.min(queue.length, queueMax() - 1));
  const fridges = has('fridge2') ? LAYOUT.fridgeSpots : LAYOUT.fridgeSpots.slice(0, 1);
  return { ...pick(fridges) };
}

function spawn(type: CustomerType = pickType(hour(state.minutes)), name = pick(CUSTOMERS[type].names), regularId?: string) {
  const product = regularId ? 'bier' : chooseProduct(type);
  customers.push({
    id: nextId++, type, name, regularId, product,
    x: LAYOUT.door.x, y: LAYOUT.door.y, target: pickupSpot(product),
    phase: 'toPickup', patience: QUEUE.patienceMinutes * patienceFactor() * (regularId ? 2 : 1), frontWait: 0, step: 0,
  });
}

// Stammkunden: kommen einmal am Tag irgendwann in ihrem Zeitfenster
function spawnRegulars(gameMinutes: number) {
  const today = day(state.minutes), h = hour(state.minutes);
  for (const r of REGULARS) {
    const [from, to] = r.hours;
    const inWindow = from <= to ? h >= from && h < to : h >= from || h < to;
    if (!inWindow || regularSeenDay[r.id] === today || (state.regulars[r.id]?.lastDay ?? 0) === today) continue;
    if (customers.length >= maxInShop() || customers.some(c => c.regularId === r.id)) continue;
    const windowMinutes = (((to - from) + 24) % 24 || 24) * 60;
    if (Math.random() < (gameMinutes * 1.5) / windowMinutes) {
      regularSeenDay[r.id] = today;
      spawn(r.type, r.name, r.id);
    }
  }
}

// Kunde hat seine Ware erreicht: nehmen und anstellen, oder enttäuscht gehen
function atPickup(c: Customer) {
  if (freeStock(c.product) <= 0) {
    const text = c.product === 'bier' ? pick(CUSTOMERS[c.type].noBeer) : `Kein ${PRODUCTS[c.product].name}? Schade.`;
    angry(c, text, RATING.noBeer);
    return;
  }
  if (queue.length >= queueMax()) {
    say(c, 'Viel zu voll hier.');
    changeRating(RATING.queueFull);
    leave(c);
    return;
  }
  reserved[c.product] = (reserved[c.product] ?? 0) + 1;
  queue.push(c);
  c.phase = 'queue';
  c.target = queueSlot(queue.length - 1);
}

const arrived = (c: Customer) => c.x === c.target.x && c.y === c.target.y;

// Neuer Spieltag: Bilanz, Lohn der Aushilfe, neue Ziele
function dayChange(oldDay: number, newDay: number) {
  endDay(oldDay);
  if (has('helper')) {
    state.money -= HELPER_WAGE;
    messages.push(`Lohn für die Aushilfe: −${formatMoney(HELPER_WAGE)}`);
  }
  newDayGoals(newDay);
}

// speed: 0 = Pause, 1 = normal, TIME.fastFactor = Vorspulen
export function update(dt: number, speed: number) {
  clock += dt;
  if (!state.goals.length) newDayGoals(day(state.minutes));
  if (speed === 0) return;
  const gameMinutes = dt * TIME.minutesPerSecond * speed;
  const before = day(state.minutes);
  state.minutes += gameMinutes;
  if (day(state.minutes) !== before) dayChange(before, day(state.minutes));

  // Neue Kunden: je nach Uhrzeit, Beliebtheit und Upgrades
  const perHour = TRAFFIC[hour(state.minutes)] * (0.4 + (state.rating / 5) * 1.2) * trafficFactor();
  spawnBudget += (perHour / 60) * gameMinutes;
  if (spawnBudget >= 1) {
    spawnBudget -= 1;
    if (customers.length < maxInShop()) spawn();
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
    if (c.phase === 'toPickup' && arrived(c)) atPickup(c);
    if (c.phase === 'leaving' && arrived(c)) customers.splice(customers.indexOf(c), 1);
    // Warten in der Schlange
    if (c.phase === 'queue') {
      c.patience -= gameMinutes;
      if (c.patience <= 0) angry(c, pick(CUSTOMERS[c.type].gaveUp), RATING.gaveUp);
    }
  }

  // Aushilfe kassiert Laufkundschaft, wenn du zu lange brauchst; Stammkunden warten auf dich
  const front = frontCustomer();
  if (front) {
    front.frontWait += gameMinutes;
    if (has('helper') && !front.regularId && front.frontWait >= HELPER_DELAY) {
      finishCheckout({ customer: front });
      say(front, 'Danke!');
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
  // Sprüche über Bier nur, wenn der Kunde auch Bier kauft
  const fits = (text: string) => customer.product === 'bier' || !/bier/i.test(text);
  const lines = kind.lines.filter(fits);
  const questions = kind.questions.filter(q => fits(q.text));
  return Math.random() < CHOICE_CHANCE && questions.length
    ? { customer, question: pick(questions) }
    : { customer, line: pick(lines.length ? lines : kind.lines) };
}

export function finishCheckout(checkout: Checkout, choice?: Choice) {
  const c = checkout.customer;
  const product = PRODUCTS[c.product];
  let earned = 0;
  if (choice?.sell !== false) {
    // Zusätzliche Stücke nur, soweit nicht für andere Kunden in der Schlange reserviert
    const wanted = (choice?.sellExtra ?? 0) + (Math.random() < secondItemChance() ? 1 : 0);
    const extra = Math.max(0, Math.min(wanted, freeStock(c.product)));
    if (!choice?.unpaid) earned += product.price;
    earned += extra * product.price;
    if (Math.random() < tipChance()) earned += Math.round(Math.random() * MAX_TIP * 10) / 10;
    state.stock[c.product] = (state.stock[c.product] ?? 0) - 1 - extra;
    state.today.sold[c.product] = (state.today.sold[c.product] ?? 0) + 1 + extra;
    state.today.served++;
    changeRating(RATING.served);
  }
  earned += choice?.money ?? 0;
  state.money += earned;
  state.today.revenue += Math.max(0, earned);
  changeRating(choice?.rating ?? 0);
  if (choice) say(c, choice.result);
  if (c.regularId) remember(c.regularId, checkout, choice);
  // leave() gibt die reservierte Ware frei: verkauft (Bestand schon gesenkt) oder zurück ins Regal
  leave(c);
  updateGoals();
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

// Nachbestellen: so viel wie bestellt, aber nur bis das Lager voll ist
export function orderAmount(p: ProductId) {
  return Math.max(0, Math.min(PRODUCTS[p].orderAmount, stockCap() - (state.stock[p] ?? 0)));
}
export function order(p: ProductId): boolean {
  const amount = orderAmount(p);
  const cost = amount * PRODUCTS[p].buyPrice;
  if (!amount || state.money < cost) return false;
  state.money -= cost;
  state.stock[p] = (state.stock[p] ?? 0) + amount;
  return true;
}

// Während die App zu war: die Aushilfe hat weiterverkauft (höchstens 8 Stunden, nur was im Lager war)
export function offlineEarnings(): { hours: number; customers: number; revenue: number } | null {
  if (!has('helper')) return null;
  const hours = Math.min(8, (Date.now() - state.lastSeen) / 3_600_000);
  if (hours < 0.05) return null;
  const count = Math.floor(hours * 4 * trafficFactor() * (0.4 + (state.rating / 5) * 1.2));
  let served = 0, revenue = 0;
  for (let i = 0; i < count; i++) {
    const available = unlockedProducts().filter(p => (state.stock[p] ?? 0) > 0);
    if (!available.length) break;
    const p = pick(available);
    state.stock[p] = (state.stock[p] ?? 0) - 1;
    state.money += PRODUCTS[p].price;
    revenue += PRODUCTS[p].price;
    served++;
  }
  return { hours, customers: served, revenue };
}

// Laden leeren, z. B. nach „Spielstand zurücksetzen“
export function reset() {
  customers.length = 0;
  queue.length = 0;
  for (const p in reserved) delete reserved[p as ProductId];
  spawnBudget = 0;
  for (const id in regularSeenDay) delete regularSeenDay[id];
}
