import {
  CAPACITY, DEMAND, ENCOUNTERS, Encounter, NIGHT, PRODUCTS, PRODUCT_ORDER, ProductId, TRAFFIC, UPGRADES, UpgradeId, Choice,
} from './data';

// ---------- Dauerhafter Spielstand (wird zwischen den Nächten gespeichert) ----------
export interface Save {
  version: 1;
  night: number;
  cash: number;
  rep: number; // Kiez-Ruf 0–100
  stock: Record<ProductId, number>;
  prices: Record<ProductId, number>;
  upgrades: UpgradeId[];
  debt: number; // offene Rechnung von Techno-Tobi
  boost: number; // mehr Kundschaft in der nächsten Nacht
  lastEncounters: string[];
  best: number; // bester Nachtgewinn
}

export function newSave(): Save {
  const prices = {} as Record<ProductId, number>;
  PRODUCT_ORDER.forEach(p => { prices[p] = PRODUCTS[p].base; });
  return {
    version: 1, night: 1, cash: NIGHT.startCash, rep: 50, stock: { ...NIGHT.startStock }, prices,
    upgrades: [], debt: 0, boost: 0, lastEncounters: [], best: 0,
  };
}

const SAVE_KEY = 'noch-offen-save-v1';
export function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const s = raw ? JSON.parse(raw) : null;
    return s && s.version === 1 ? s : null;
  } catch { return null; }
}
export function storeSave(s: Save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* Speicher gesperrt, Spiel läuft trotzdem */ }
}
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* egal */ } }

export const has = (s: Save, u: UpgradeId) => s.upgrades.includes(u);
export const capacity = (s: Save) => CAPACITY.base + (has(s, 'fridge') ? CAPACITY.fridge : 0);
export const stockTotal = (s: Save) => PRODUCT_ORDER.reduce((n, p) => n + s.stock[p], 0);

// Wie Kunden auf den Preis reagieren
export function priceMood(p: ProductId, price: number): 'günstig' | 'fair' | 'teuer' | 'Wucher' {
  const r = price / PRODUCTS[p].base;
  if (r < 0.9) return 'günstig';
  if (r <= 1.2) return 'fair';
  if (r <= 1.55) return 'teuer';
  return 'Wucher';
}

// ---------- Eine laufende Nacht ----------
export type CustomerState = 'arriving' | 'waiting' | 'serving' | 'gone';
export interface Customer {
  id: number;
  want: ProductId;
  state: CustomerState;
  arriveIn: number;
  patience: number;
  maxPatience: number;
  serveLeft: number;
  encounter: Encounter | null;
  look: string; // Aussehen für die 3D-Figur
  mood: 'happy' | 'angry' | 'neutral';
  bench: boolean; // setzt sich danach auf die Bierbank
}

export interface Popup { text: string; tone: 'good' | 'bad' | 'info'; at: number; customerId?: number; }

export interface NightReport {
  revenue: number; tips: number; served: number; lost: number; refused: number;
  rent: number; fines: { text: string; cash: number }[]; debtPaid: number; debtText: string;
  eventCash: number; repStart: number; profit: number;
}

let nextId = 1;
const LOOKS = ['hipster', 'student', 'worker', 'raver', 'suit', 'jogger'];

export class Night {
  t = 0;
  customers: Customer[] = [];
  popups: Popup[] = [];
  report: NightReport;
  pendingEncounter: Customer | null = null;
  done = false;
  private spawnAcc = 0;
  private scheduled: { at: number; enc: Encounter }[] = [];
  private riskHits: { text: string; cash: number }[] = [];

  constructor(public save: Save) {
    this.report = { revenue: 0, tips: 0, served: 0, lost: 0, refused: 0, rent: NIGHT.rent, fines: [], debtPaid: 0, debtText: '', eventCash: 0, repStart: save.rep, profit: 0 };
    // Tobi zahlt (vielleicht) seine Schulden
    if (save.debt > 0) {
      if (Math.random() < 0.65) {
        save.cash += save.debt;
        this.report.debtPaid = save.debt;
        this.report.debtText = `Techno-Tobi hat seine Schulden bezahlt: +${save.debt.toFixed(2)} €`;
      } else this.report.debtText = 'Techno-Tobi hat sich nicht blicken lassen. Das Geld ist weg.';
      save.debt = 0;
    }
    this.scheduleEncounters();
  }

  get hour(): number { return (NIGHT.startHour + Math.floor(this.t / this.hourLen)) % 24; }
  get hourFloat(): number { return NIGHT.startHour + this.t / this.hourLen; }
  get hourLen(): number { return NIGHT.realSeconds / NIGHT.hours; }
  get clock(): string {
    const h = this.hourFloat, hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 6) * 10;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  get queue(): Customer[] { return this.customers.filter(c => c.state === 'waiting' || c.state === 'serving'); }
  get serving(): Customer | undefined { return this.customers.find(c => c.state === 'serving'); }

  private scheduleEncounters() {
    const s = this.save;
    const pool = ENCOUNTERS.filter(e => (e.minNight ?? 1) <= s.night && (!e.needs || has(s, e.needs)) && !s.lastEncounters.includes(e.id));
    const count = Math.min(pool.length, s.night === 1 ? 2 : 2 + (Math.random() < 0.4 ? 1 : 0));
    const picks: Encounter[] = [];
    while (picks.length < count) {
      const e = pool[Math.floor(Math.random() * pool.length)];
      if (!picks.includes(e)) picks.push(e);
    }
    for (const enc of picks) {
      const h = enc.hours[Math.floor(Math.random() * enc.hours.length)];
      const idx = (h - NIGHT.startHour + 24) % 24;
      this.scheduled.push({ at: (idx + 0.2 + Math.random() * 0.6) * this.hourLen, enc });
    }
    s.lastEncounters = picks.map(p => p.id);
  }

  private pickWant(): ProductId {
    const table = { ...DEMAND[this.hour] };
    if (has(this.save, 'bench') && table.bier) table.bier *= 1.3;
    const entries = Object.entries(table) as [ProductId, number][];
    let r = Math.random() * entries.reduce((n, [, w]) => n + w, 0);
    for (const [p, w] of entries) { r -= w; if (r <= 0) return p; }
    return entries[0][0];
  }

  private spawn(encounter: Encounter | null = null) {
    const patience = NIGHT.patience * (has(this.save, 'register') ? 1.4 : 1) * (0.8 + Math.random() * 0.4);
    const want = encounter ? 'bier' : this.pickWant();
    this.customers.push({
      id: nextId++, want, state: 'arriving', arriveIn: 3.4 + Math.random() * 0.8,
      patience, maxPatience: patience, serveLeft: 0, encounter,
      look: encounter ? encounter.id : LOOKS[Math.floor(Math.random() * LOOKS.length)],
      mood: 'neutral', bench: false,
    });
  }

  private pop(text: string, tone: Popup['tone'], customerId?: number) {
    this.popups.push({ text, tone, at: this.t, customerId });
  }

  private leave(c: Customer, mood: Customer['mood']) {
    c.state = 'gone';
    c.mood = mood;
  }

  // Spieler tippt einen wartenden Kunden an
  serve(id: number) {
    if (this.pendingEncounter || this.done) return;
    const c = this.customers.find(x => x.id === id);
    if (!c || c.state !== 'waiting') return;
    if (this.serving) return; // an der Kasse steht schon jemand
    const s = this.save;
    if (s.stock[c.want] <= 0) {
      this.pop(`${PRODUCTS[c.want].name} ausverkauft!`, 'bad', c.id);
      this.report.lost++;
      s.rep = Math.max(0, s.rep - 0.8);
      this.leave(c, 'angry');
      return;
    }
    const mood = priceMood(c.want, s.prices[c.want]);
    if (mood === 'Wucher' || (mood === 'teuer' && Math.random() < 0.35)) {
      this.pop(mood === 'Wucher' ? 'Wucher! Ich geh zur Tanke.' : 'Zu teuer, lass mal.', 'bad', c.id);
      this.report.refused++;
      s.rep = Math.max(0, s.rep - (mood === 'Wucher' ? 1.5 : 0.5));
      this.leave(c, 'angry');
      return;
    }
    c.state = 'serving';
    c.serveLeft = has(s, 'register') ? 0.55 : 0.9;
  }

  private finishServe(c: Customer) {
    const s = this.save;
    const price = s.prices[c.want];
    const mood = priceMood(c.want, price);
    const patienceShare = Math.max(0, c.patience / c.maxPatience);
    let tip = price * 0.25 * patienceShare * (has(s, 'radio') ? 1.15 : 1) * (0.6 + s.rep / 100 * 0.8);
    if (mood === 'günstig') tip *= 1.5;
    if (mood === 'teuer') tip = 0;
    tip = Math.round(tip * 10) / 10;
    s.stock[c.want]--;
    s.cash += price + tip;
    this.report.revenue += price;
    this.report.tips += tip;
    this.report.served++;
    s.rep = Math.min(100, s.rep + (mood === 'günstig' ? 0.6 : mood === 'fair' ? 0.3 : 0));
    this.pop(`+${(price + tip).toFixed(2)} €`, 'good', c.id);
    c.bench = c.want === 'bier' && has(s, 'bench') && Math.random() < 0.5;
    this.leave(c, 'happy');
  }

  choose(choice: Choice) {
    const c = this.pendingEncounter;
    if (!c) return;
    const s = this.save;
    if (choice.stock) {
      for (const [p, n] of Object.entries(choice.stock) as [ProductId, number][]) s.stock[p] = Math.max(0, s.stock[p] + n);
    }
    if (choice.cash) { s.cash += choice.cash; this.report.eventCash += choice.cash; }
    if (choice.rep) s.rep = Math.max(0, Math.min(100, s.rep + choice.rep));
    if (choice.debt) s.debt += choice.debt;
    if (choice.boost) s.boost += choice.boost;
    if (choice.risk && Math.random() < choice.risk.chance) this.riskHits.push({ text: choice.risk.text, cash: choice.risk.cash });
    this.pop(choice.result, 'info', c.id);
    this.pendingEncounter = null;
    this.leave(c, choice.rep && choice.rep < 0 ? 'angry' : 'happy');
  }

  update(dt: number) {
    if (this.done || this.pendingEncounter) return;
    this.t += dt;
    const s = this.save;

    // Neue Kundschaft
    const nightOver = this.t >= NIGHT.realSeconds;
    if (!nightOver) {
      const repFactor = 0.7 + s.rep / 100 * 0.6;
      const rate = TRAFFIC[this.hour] / this.hourLen * (has(s, 'neon') ? 1.2 : 1) * (1 + s.boost) * repFactor;
      this.spawnAcc += rate * dt;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        if (this.customers.filter(c => c.state !== 'gone').length >= 6) { this.report.lost++; continue; }
        this.spawn();
      }
      for (const sch of this.scheduled.filter(x => x.at <= this.t)) { this.spawn(sch.enc); }
      this.scheduled = this.scheduled.filter(x => x.at > this.t);
    }

    for (const c of this.customers) {
      if (c.state === 'arriving') {
        c.arriveIn -= dt;
        if (c.arriveIn <= 0) {
          c.state = 'waiting';
          if (c.encounter) { this.pendingEncounter = c; return; }
        }
      } else if (c.state === 'waiting') {
        c.patience -= dt;
        if (c.patience <= 0) {
          this.pop('Dauert mir zu lange!', 'bad', c.id);
          this.report.lost++;
          s.rep = Math.max(0, s.rep - 1.2);
          this.leave(c, 'angry');
        }
      } else if (c.state === 'serving') {
        c.serveLeft -= dt;
        if (c.serveLeft <= 0) this.finishServe(c);
      }
    }
    this.customers = this.customers.filter(c => c.state !== 'gone');
    this.popups = this.popups.filter(p => this.t - p.at < 2.2);

    if (nightOver && this.customers.length === 0) this.finish();
  }

  private finish() {
    this.done = true;
    const s = this.save;
    s.cash -= NIGHT.rent;
    for (const f of this.riskHits) { s.cash += f.cash; this.report.fines.push(f); }
    const r = this.report;
    r.profit = r.revenue + r.tips + r.eventCash + r.debtPaid - r.rent + r.fines.reduce((n, f) => n + f.cash, 0);
    s.best = Math.max(s.best, r.profit);
    s.boost = 0;
    s.night++;
  }
}

// ---------- Zwischen den Nächten ----------
export function buyStock(s: Save, p: ProductId, amount: number): boolean {
  const cost = PRODUCTS[p].buy * amount;
  if (s.cash < cost || stockTotal(s) + amount > capacity(s)) return false;
  s.cash -= cost;
  s.stock[p] += amount;
  return true;
}

export function buyUpgrade(s: Save, id: UpgradeId): boolean {
  const u = UPGRADES.find(x => x.id === id)!;
  if (has(s, id) || s.cash < u.price) return false;
  s.cash -= u.price;
  s.upgrades.push(id);
  return true;
}
