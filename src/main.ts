import './ui/style.css';
import { buildRoom, drawScene, footShadow, Room, SCREEN_WIDTH } from './game/room';
import { state, saveGame, resetGame, day, formatMoney, formatTime, formatRating } from './game/state';
import { LOW_STOCK, QUEUE, TIME } from './game/config';
import { PRODUCTS } from './game/products';
import { BRANCHES, UPGRADES, blockedReason, buy, has, stockCap, unlockedProducts, HELPER_WAGE } from './game/upgrades';
import { messages } from './game/goals';
import { CUSTOMERS, drawPerson, Choice } from './game/customers';
import * as sim from './game/sim';
import { REGULARS } from './game/regulars';
import { fillIcons } from './ui/icons';

const VERSION = '0.6.0';
const $ = (id: string) => document.getElementById(id)!;

// ---------- Bildschirme wechseln ----------
const screens = ['menu', 'play', 'settings', 'debug'] as const;
type Screen = typeof screens[number];
function show(name: Screen) {
  screens.forEach(s => { $(`screen-${s}`).hidden = s !== name; });
  if (name === 'debug') renderDebug();
  if (name === 'play') openShop();
  else saveGame();
}
$('btn-play').addEventListener('click', () => show('play'));
$('btn-settings').addEventListener('click', () => show('settings'));
$('btn-debug').addEventListener('click', () => show('debug'));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => show('menu')));

// ---------- Späti: Raum füllt den ganzen Bildschirm ----------
const canvas = $('room') as HTMLCanvasElement;
const roomScroll = $('room-scroll');
const stage = $('stage');
let room: Room | null = null;
let scale = 1;

// Vergrößerung so, dass ein Bildschirm breit Raum genau die Breite füllt; der Boden reicht bis ganz unten.
// Der Faktor ist meist nicht ganzzahlig, bei der hohen Pixeldichte heutiger Handys fällt das aber nicht auf.
async function layoutRoom() {
  scale = roomScroll.clientWidth / SCREEN_WIDTH;
  room = await buildRoom(Math.ceil(roomScroll.clientHeight / scale));
  const { width, height } = room.background;
  stage.style.width = `${width * scale}px`;
  stage.style.height = `${height * scale}px`;
  // Bei einem breiteren Raum (später durch Upgrades) mittig starten
  roomScroll.scrollLeft = (roomScroll.scrollWidth - roomScroll.clientWidth) / 2;
}
window.addEventListener('resize', () => { if (!$('screen-play').hidden) layoutRoom(); });

let offlineChecked = false;
async function openShop() {
  await layoutRoom();
  // Einmal pro Start: hat die Aushilfe verdient, während die App zu war?
  if (!offlineChecked) {
    offlineChecked = true;
    const off = sim.offlineEarnings();
    if (off && off.customers > 0) {
      openPanel('offline');
      $('panel-text').textContent = `Deine Aushilfe hat ${off.customers} Kunden bedient und ${formatMoney(off.revenue)} eingenommen (in ${off.hours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Stunden, höchstens 8). Lohn: ${formatMoney(HELPER_WAGE)} pro Spieltag.`;
      saveGame();
    }
  }
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}

// ---------- Tempo: Tipp auf die Uhr wechselt normal → schnell → Pause ----------
const SPEEDS = [1, TIME.fastFactor, 0];
const SPEED_LABEL = ['▶', '▶▶', 'Pause'];
let speedIndex = 0;
$('hud-clock').addEventListener('click', () => { speedIndex = (speedIndex + 1) % SPEEDS.length; });

// ---------- Spielschleife ----------
let lastFrame = 0;
let talking: sim.Checkout | null = null;
let lastSave = 0;

function frame(now: number) {
  if ($('screen-play').hidden) return;
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const paused = talking || !$('panel').hidden;
  sim.update(dt, paused ? 0 : SPEEDS[speedIndex]);
  if (room) drawScene(canvas, room, sim.customers.map(personDrawable));
  renderHud();
  renderBubbles();
  renderCheckoutButton();
  if (now - lastSave > 5000) { saveGame(); lastSave = now; }
  requestAnimationFrame(frame);
}

function personDrawable(c: sim.Customer) {
  return {
    y: c.y,
    draw: (ctx: CanvasRenderingContext2D, wallH: number) => {
      const footY = Math.round(wallH + c.y);
      const x = Math.round(c.x);
      footShadow(ctx, x, footY - 1, 26);
      drawPerson(ctx, c.type, x, footY, c.step);
      if (c.regularId) drawHeart(ctx, x, footY - 128);
      // Geduld als kleiner Balken über dem Kopf, nur in der Schlange
      if (c.phase === 'queue') {
        const left = Math.max(0, c.patience / QUEUE.patienceMinutes);
        ctx.fillStyle = '#1a1014';
        ctx.fillRect(x - 13, footY - 116, 26, 5);
        ctx.fillStyle = left > 0.5 ? '#5fbf5a' : left > 0.25 ? '#f7c948' : '#d9412b';
        ctx.fillRect(x - 12, footY - 115, Math.round(24 * left), 3);
      }
    },
  };
}

// Kleines Pixel-Herz über Stammkunden
const HEART = ['.pp.pp.', 'ppppppp', 'ppppppp', '.ppppp.', '..ppp..', '...p...'];
function drawHeart(ctx: CanvasRenderingContext2D, x: number, top: number) {
  ctx.fillStyle = '#1a1014';
  ctx.fillRect(x - 5, top - 1, 9, 8);
  ctx.fillStyle = '#ff4fa3';
  HEART.forEach((row, y) => [...row].forEach((p, i) => { if (p === 'p') ctx.fillRect(x - 4 + i, top + y, 1, 1); }));
}

const hearts = (n: number) => '♥'.repeat(n) + '♡'.repeat(5 - n);

// ---------- Sprechblasen über den Köpfen ----------
const bubbleLayer = $('bubbles');
const bubbleEls = new Map<number, HTMLElement>();
function renderBubbles() {
  const seen = new Set<number>();
  for (const c of sim.customers) {
    if (!sim.bubbleVisible(c) || !room) continue;
    seen.add(c.id);
    let el = bubbleEls.get(c.id);
    if (!el) { el = document.createElement('p'); el.className = 'bubble'; bubbleLayer.append(el); bubbleEls.set(c.id, el); }
    el.textContent = c.bubble!.text;
    el.style.left = `${c.x * scale}px`;
    el.style.top = `${(room.wallH + c.y - 122) * scale}px`;
  }
  for (const [id, el] of bubbleEls) if (!seen.has(id)) { el.remove(); bubbleEls.delete(id); }
}

// ---------- Kassieren ----------
const checkoutBtn = $('btn-checkout');
function renderCheckoutButton() {
  const front = talking ? undefined : sim.frontCustomer();
  checkoutBtn.hidden = !front;
  // Über dem Kopf des vordersten Kunden, oberhalb seines Geduldsbalkens
  if (front && room) {
    checkoutBtn.style.left = `${front.x * scale}px`;
    checkoutBtn.style.top = `${(room.wallH + front.y - 122) * scale}px`;
  }
}

const talk = $('talk');
checkoutBtn.addEventListener('click', () => {
  const checkout = sim.startCheckout();
  if (!checkout) return;
  talking = checkout;
  const kind = CUSTOMERS[checkout.customer.type];
  const regular = checkout.customer.regularId;
  const product = PRODUCTS[checkout.customer.product];
  $('talk-name').textContent = regular
    ? `${checkout.customer.name} · Stammkunde ${hearts(state.regulars[regular]?.friendship ?? 0)} · kauft ${product.name}`
    : `${checkout.customer.name} · ${kind.label} · kauft ${product.name}`;
  $('talk-text').textContent = checkout.question?.text ?? checkout.line ?? '';
  const choices = $('talk-choices');
  choices.replaceChildren();
  const addChoice = (label: string, choice?: Choice) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sign sign-wide';
    b.textContent = label;
    b.addEventListener('click', () => finishTalk(choice));
    choices.append(b);
  };
  if (checkout.question) checkout.question.choices.forEach(ch => addChoice(ch.label, ch));
  else addChoice(`Kassieren · ${formatMoney(product.price)}`);
  talk.hidden = false;
  (choices.firstElementChild as HTMLElement).focus();
});

function finishTalk(choice?: Choice) {
  if (!talking) return;
  sim.finishCheckout(talking, choice);
  talking = null;
  talk.hidden = true;
  saveGame();
}

// ---------- Anzeige oben: Geld, Zeit, Beliebtheit, Warnung bei knapper Ware ----------
const setText = (id: string, text: string) => { const el = $(id); if (el.textContent !== text) el.textContent = text; };
function renderHud() {
  setText('hud-money', formatMoney(state.money));
  setText('hud-time', `Tag ${day(state.minutes)} · ${formatTime(state.minutes)}`);
  setText('hud-speed', SPEED_LABEL[speedIndex]);
  setText('hud-rating', `${formatRating(state.rating)}/5`);
  // Warnung für die knappste Ware
  const lowest = unlockedProducts().map(p => ({ p, n: state.stock[p] ?? 0 })).sort((a, b) => a.n - b.n)[0];
  $('hud-stock').hidden = lowest.n > LOW_STOCK;
  setText('hud-stock-text', lowest.n === 0 ? `${PRODUCTS[lowest.p].name} alle!` : `Nur noch ${lowest.n} ${PRODUCTS[lowest.p].name}`);
  setText('btn-goals', `Ziele ${state.goals.filter(g => g.done).length}/${state.goals.length}`);
  showToasts();
}

// ---------- Meldungen (Ziel geschafft, Tagesbilanz …) ----------
const toast = $('toast');
let toastUntil = 0;
function showToasts() {
  const now = performance.now();
  if (now < toastUntil) return;
  const next = messages.shift();
  toast.hidden = !next;
  if (next) { toast.textContent = next; toastUntil = now + 3500; }
}

const el = (tag: string, className: string, text = '') => {
  const e = document.createElement(tag);
  e.className = className;
  e.textContent = text;
  return e;
};
const signButton = (label: string, onClick: () => void, disabled = false) => {
  const b = el('button', 'sign sign-wide', label) as HTMLButtonElement;
  b.type = 'button';
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
};

// ---------- Buttons unten: öffnen je ein Panel ----------
const PANELS: Record<string, { title: string; text: string }> = {
  lager: { title: 'Lager', text: '' },
  preise: { title: 'Preise', text: '' },
  bauen: { title: 'Bauen', text: 'Gib dein Geld aus: neue Waren, mehr Platz, besserer Service.' },
  kiez: { title: 'Kiez', text: '' },
  ziele: { title: 'Tagesziele', text: 'Jeden Morgen gibt es neue Aufgaben. Geschafft ist geschafft, auch wenn du die App schließt.' },
  offline: { title: 'Während du weg warst', text: '' },
};
const panel = $('panel');
function openPanel(key: string) {
  $('panel-title').textContent = PANELS[key].title;
  $('panel-text').textContent = PANELS[key].text;
  $('panel-body').replaceChildren();
  if (key === 'lager') renderLager();
  if (key === 'kiez') renderKiez();
  if (key === 'bauen') renderBauen();
  if (key === 'preise') renderPreise();
  if (key === 'ziele') renderZiele();
  panel.hidden = false;
  $('panel-close').focus();
}
const closePanel = () => { panel.hidden = true; };
document.querySelectorAll<HTMLElement>('[data-panel]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.panel!)));
$('btn-goals').addEventListener('click', () => openPanel('ziele'));
$('panel-close').addEventListener('click', closePanel);
panel.addEventListener('click', e => { if (e.target === panel) closePanel(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

// Lager: Bestand und Nachbestellen für jede freigeschaltete Ware
function renderLager() {
  $('panel-text').textContent = `Platz pro Ware: ${stockCap()} Stück.`;
  $('panel-body').replaceChildren(...unlockedProducts().map(id => {
    const p = PRODUCTS[id];
    const amount = sim.orderAmount(id);
    const cost = amount * p.buyPrice;
    const row = el('div', 'item');
    row.append(el('p', 'item-name', `${p.name}: ${state.stock[id] ?? 0} ${p.plural}`));
    row.append(amount
      ? signButton(`+${amount} bestellen · ${formatMoney(cost)}`, () => { if (sim.order(id)) { saveGame(); renderLager(); } }, state.money < cost)
      : el('p', 'item-note', 'Lager voll.'));
    return row;
  }));
}

// Preise: vorerst nur ansehen, selbst festlegen kommt im nächsten Schritt
function renderPreise() {
  $('panel-text').textContent = 'Preise selbst festlegen kommt im nächsten Schritt.';
  $('panel-body').replaceChildren(...unlockedProducts().map(id =>
    el('p', 'item-name', `${PRODUCTS[id].name}: ${formatMoney(PRODUCTS[id].price)} (Einkauf ${formatMoney(PRODUCTS[id].buyPrice)})`)));
}

// Bauen: der Tech-Tree in drei Zweigen
function renderBauen() {
  const parts: HTMLElement[] = [];
  for (const branch of BRANCHES) {
    parts.push(el('h4', 'branch', branch.name));
    for (const u of UPGRADES.filter(x => x.branch === branch.id)) {
      const reason = blockedReason(u);
      const row = el('div', has(u.id) ? 'item item-done' : 'item');
      row.append(el('p', 'item-name', has(u.id) ? `✓ ${u.name}` : `${u.name} · ${formatMoney(u.cost)}`));
      row.append(el('p', 'item-note', u.desc));
      if (!has(u.id)) {
        row.append(reason && reason !== 'Zu wenig Geld'
          ? el('p', 'item-lock', reason)
          : signButton('Kaufen', () => {
            if (!buy(u)) return;
            messages.push(u.product ? `${u.name} ist ab jetzt im Sortiment! Denk ans Nachbestellen.` : `${u.name} gekauft!`);
            if (u.product) sim.order(u.product);
            saveGame();
            renderBauen();
          }, reason === 'Zu wenig Geld'));
      }
      parts.push(row);
    }
  }
  $('panel-body').replaceChildren(...parts);
}

// Tagesziele mit Fortschritt
function renderZiele() {
  $('panel-body').replaceChildren(...state.goals.map(g => {
    const row = el('div', g.done ? 'item item-done' : 'item');
    row.append(el('p', 'item-name', `${g.done ? '✓ ' : ''}${g.text}`));
    const reward = [g.reward.money && `+${formatMoney(g.reward.money)}`, g.reward.rating && 'mehr Beliebtheit'].filter(Boolean).join(', ');
    row.append(el('p', 'item-note', g.atDayEnd ? `Wird um Mitternacht geprüft · ${reward}` : `${Math.min(g.progress, g.target)} / ${g.target} · ${reward}`));
    return row;
  }));
}

// Kiez: Stammkunden, die du schon kennst
function renderKiez() {
  const known = REGULARS.filter(r => state.regulars[r.id]);
  $('panel-text').textContent = known.length
    ? 'Deine Stammkunden:'
    : 'Noch keine Stammkunden. Die tauchen von selbst auf, wenn dein Laden läuft. Halt abends mal die Augen offen.';
  $('panel-body').replaceChildren(...known.map(r => {
    const memory = state.regulars[r.id];
    const card = document.createElement('div');
    card.className = 'regular';
    const name = document.createElement('p');
    name.className = 'regular-name';
    name.textContent = `${r.name} ${hearts(memory.friendship)}`;
    const intro = document.createElement('p');
    intro.className = 'regular-text';
    intro.textContent = r.intro;
    const last = document.createElement('p');
    last.className = 'regular-last';
    last.textContent = `Zuletzt (Tag ${memory.lastDay}): ${memory.last}`;
    card.append(name, intro, last);
    return card;
  }));
}
fillIcons();

// Beim Verlassen der App speichern
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

// ---------- Einstellungen merken ----------
const SETTINGS_KEY = 'kiezkoenig-settings';
function loadSettings(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}
const settings = loadSettings();
for (const id of ['opt-sound', 'opt-music']) {
  const box = $(id) as HTMLInputElement;
  if (id in settings) box.checked = settings[id];
  box.addEventListener('change', () => {
    settings[id] = box.checked;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Speicher gesperrt */ }
  });
}

// ---------- Debug-Info: hilft beim Testen auf dem Handy ----------
function renderDebug() {
  const rows: [string, string][] = [
    ['Version', VERSION],
    ['Bildschirm', `${window.innerWidth} × ${window.innerHeight}`],
    ['Pixeldichte', String(window.devicePixelRatio)],
    ['Touch', 'ontouchstart' in window ? 'ja' : 'nein'],
    ['Browser', navigator.userAgent],
  ];
  $('debug-info').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

$('version').textContent = `Version ${VERSION}`;

$('btn-reset').addEventListener('click', () => {
  resetGame();
  sim.reset();
  $('reset-note').hidden = false;
});

// ---------- Web-App: offline spielbar, Updates beim nächsten Start ----------
// Nur in der veröffentlichten Version, nicht im Entwicklungsserver; in eingebetteten Vorschauen schlägt es still fehl
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* z. B. in der Claude-Vorschau nicht erlaubt */ });
}

// Nur im Entwicklungsmodus: Zugriff für automatische Tests (spult z. B. Spieltage im Schnelldurchlauf vor)
if (import.meta.env.DEV) {
  import('./game/upgrades').then(up => Object.assign(window, { kiez: { state, sim, up, products: PRODUCTS } }));
}
