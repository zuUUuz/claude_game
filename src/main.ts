import './ui/style.css';
import { buildRoom, drawScene, footShadow, Room, SCREEN_WIDTH } from './game/room';
import { state, saveGame, resetGame, day, formatMoney, formatTime, formatRating } from './game/state';
import { BEER, QUEUE, TIME } from './game/config';
import { CUSTOMERS, drawPerson, Choice } from './game/customers';
import * as sim from './game/sim';
import { fillIcons } from './ui/icons';

const VERSION = '0.4.0';
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

async function openShop() {
  await layoutRoom();
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
  $('talk-name').textContent = `${checkout.customer.name} · ${kind.label}`;
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
  else addChoice(`Kassieren · ${formatMoney(BEER.price)}`);
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
  const warn = $('hud-stock');
  warn.hidden = state.beer > BEER.lowStock;
  setText('hud-stock-text', state.beer === 0 ? 'Bier alle!' : `Nur noch ${state.beer} Bier`);
}

// ---------- Buttons unten: öffnen je ein Panel ----------
const PANELS: Record<string, { title: string; text: string }> = {
  lager: { title: 'Lager', text: '' },
  preise: { title: 'Preise', text: `Bier kostet bei dir ${formatMoney(BEER.price)}. Preise selbst festlegen kommt in einem späteren Schritt.` },
  bauen: { title: 'Bauen', text: 'Hier kaufst und platzierst du Möbel und vergrößerst später den Laden. Kommt in einem späteren Schritt.' },
  kiez: { title: 'Kiez', text: 'Hier triffst du deine Stammkunden und siehst, welche seltenen Besucher du schon kennst. Kommt in einem späteren Schritt.' },
};
const panel = $('panel');
function openPanel(key: string) {
  $('panel-title').textContent = PANELS[key].title;
  $('panel-text').textContent = PANELS[key].text;
  $('panel-body').replaceChildren();
  if (key === 'lager') renderLager();
  panel.hidden = false;
  $('panel-close').focus();
}
const closePanel = () => { panel.hidden = true; };
document.querySelectorAll<HTMLElement>('[data-panel]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.panel!)));
$('panel-close').addEventListener('click', closePanel);
panel.addEventListener('click', e => { if (e.target === panel) closePanel(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

// Lager: Bestand und Nachbestellen
function renderLager() {
  const cost = BEER.orderAmount * BEER.buyPrice;
  $('panel-text').textContent = `Bier: ${state.beer} Flaschen im Lager.`;
  const order = document.createElement('button');
  order.type = 'button';
  order.className = 'sign sign-wide';
  order.textContent = `+${BEER.orderAmount} Bier bestellen · ${formatMoney(cost)}`;
  order.disabled = state.money < cost;
  const note = document.createElement('p');
  note.className = 'panel-note';
  note.textContent = order.disabled ? 'Dafür reicht dein Geld gerade nicht.' : 'Neue Waren schaltest du später frei.';
  order.addEventListener('click', () => {
    if (sim.orderBeer()) { saveGame(); renderLager(); }
  });
  $('panel-body').replaceChildren(order, note);
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
