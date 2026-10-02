// Tagesziele: jeden Tag zwei kleine Aufgaben mit Belohnung. Neue Ziel-Arten unten in TEMPLATES ergänzen.

import { pick } from './customers';
import { PRODUCTS } from './products';
import { state, Goal, emptyDay, formatMoney } from './state';
import { unlockedProducts } from './upgrades';

// Meldungen für die Anzeige (z. B. „Ziel geschafft!“); die Oberfläche holt sie ab
export const messages: string[] = [];

const changeRating = (delta: number) => { state.rating = Math.min(5, Math.max(0, state.rating + delta)); };

type Template = (day: number) => Goal;
const TEMPLATES: Template[] = [
  d => {
    const p = PRODUCTS[pick(unlockedProducts())];
    const target = Math.min(40, (p.id === 'bier' ? 10 : 5) + d * 2);
    return { id: `sell-${p.id}`, text: `Verkaufe ${target} × ${p.name}`, target, progress: 0, reward: { money: Math.round(target * 0.6) }, done: false };
  },
  d => {
    const target = Math.min(60, 12 + d * 3);
    return { id: 'serve', text: `Bediene ${target} Kunden`, target, progress: 0, reward: { money: 10 + d * 2 }, done: false };
  },
  () => ({ id: 'calm', text: 'Kein Kunde geht heute wütend', target: 1, progress: 0, reward: { rating: 0.3 }, done: false, atDayEnd: true }),
  d => {
    const target = Math.min(300, 25 + d * 10);
    return { id: 'revenue', text: `Mach ${target} € Umsatz`, target, progress: 0, reward: { money: 5, rating: 0.2 }, done: false };
  },
];

const rewardText = (g: Goal) => [g.reward.money && `+${formatMoney(g.reward.money)}`, g.reward.rating && 'Beliebtheit ↑'].filter(Boolean).join(', ');

function complete(g: Goal) {
  g.done = true;
  state.money += g.reward.money ?? 0;
  changeRating(g.reward.rating ?? 0);
  messages.push(`Ziel geschafft: ${g.text}! ${rewardText(g)}`);
}

export function newDayGoals(day: number) {
  const pool = [...TEMPLATES];
  const goals: Goal[] = [];
  while (goals.length < 2 && pool.length) {
    const goal = pool.splice(Math.floor(Math.random() * pool.length), 1)[0](day);
    if (!goals.some(g => g.id === goal.id)) goals.push(goal);
  }
  state.goals = goals;
  state.today = emptyDay();
}

// Fortschritt nach jedem Verkauf
export function updateGoals() {
  for (const g of state.goals) {
    if (g.done || g.atDayEnd) continue;
    if (g.id.startsWith('sell-')) g.progress = state.today.sold[g.id.slice(5) as keyof typeof PRODUCTS] ?? 0;
    if (g.id === 'serve') g.progress = state.today.served;
    if (g.id === 'revenue') g.progress = Math.floor(state.today.revenue);
    if (g.progress >= g.target) complete(g);
  }
}

// Um Mitternacht: Tagesend-Ziele prüfen, Tagesbilanz melden
export function endDay(day: number) {
  for (const g of state.goals) {
    if (g.atDayEnd && !g.done && state.today.angry === 0) { g.progress = 1; complete(g); }
  }
  const t = state.today;
  messages.push(`Tag ${day} vorbei: ${t.served} Kunden, ${formatMoney(t.revenue)} Umsatz, ${t.angry} wütend gegangen.`);
}
