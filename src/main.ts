import './ui/style.css';
import { renderRoom, SCREEN_WIDTH } from './game/room';
import { state, formatMoney, formatTime } from './game/state';
import { fillIcons } from './ui/icons';

const VERSION = '0.3.0';
const $ = (id: string) => document.getElementById(id)!;

// ---------- Bildschirme wechseln ----------
const screens = ['menu', 'play', 'settings', 'debug'] as const;
type Screen = typeof screens[number];
function show(name: Screen) {
  screens.forEach(s => { $(`screen-${s}`).hidden = s !== name; });
  if (name === 'debug') renderDebug();
  if (name === 'play') { renderHud(); openRoom(); }
}
$('btn-play').addEventListener('click', () => show('play'));
$('btn-settings').addEventListener('click', () => show('settings'));
$('btn-debug').addEventListener('click', () => show('debug'));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => show('menu')));

// ---------- Späti: Raum füllt den ganzen Bildschirm ----------
const room = $('room') as HTMLCanvasElement;
const roomScroll = $('room-scroll');

// Vergrößerung so, dass ein Bildschirm breit Raum genau die Breite füllt; der Boden reicht bis ganz unten.
// Der Faktor ist meist nicht ganzzahlig, bei der hohen Pixeldichte heutiger Handys fällt das aber nicht auf.
async function openRoom() {
  const scale = roomScroll.clientWidth / SCREEN_WIDTH;
  await renderRoom(room, Math.ceil(roomScroll.clientHeight / scale));
  room.style.width = `${room.width * scale}px`;
  room.style.height = `${room.height * scale}px`;
  // Bei einem breiteren Raum (später durch Upgrades) mittig starten
  roomScroll.scrollLeft = (roomScroll.scrollWidth - roomScroll.clientWidth) / 2;
}
window.addEventListener('resize', () => { if (!$('screen-play').hidden) openRoom(); });

// ---------- Anzeige oben: Geld, Zeit, Beliebtheit, Warnung bei knapper Ware ----------
function renderHud() {
  $('hud-money').textContent = formatMoney(state.money);
  $('hud-time').textContent = `Tag ${state.day} · ${formatTime(state.minutes)}`;
  $('hud-rating').textContent = `${state.rating}/5`;
  const warn = $('hud-stock');
  warn.hidden = state.lowStock.length === 0;
  warn.querySelector('span')!.textContent = `${state.lowStock.join(', ')} knapp`;
}

// ---------- Buttons unten: öffnen je ein Panel (Inhalte kommen in späteren Schritten) ----------
const PANELS: Record<string, { title: string; text: string }> = {
  lager: { title: 'Lager', text: 'Hier bestellst du Ware und siehst, was noch da ist. Kommt in einem späteren Schritt.' },
  preise: { title: 'Preise', text: 'Hier legst du fest, was Bier, Mate und Co. bei dir kosten. Kommt in einem späteren Schritt.' },
  bauen: { title: 'Bauen', text: 'Hier kaufst und platzierst du Möbel und vergrößerst später den Laden. Kommt in einem späteren Schritt.' },
  kiez: { title: 'Kiez', text: 'Hier triffst du deine Stammkunden und siehst, welche seltenen Besucher du schon kennst. Kommt in einem späteren Schritt.' },
};
const panel = $('panel');
function openPanel(key: string) {
  $('panel-title').textContent = PANELS[key].title;
  $('panel-text').textContent = PANELS[key].text;
  panel.hidden = false;
  $('panel-close').focus();
}
const closePanel = () => { panel.hidden = true; };
document.querySelectorAll<HTMLElement>('[data-panel]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.panel!)));
$('panel-close').addEventListener('click', closePanel);
panel.addEventListener('click', e => { if (e.target === panel) closePanel(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
fillIcons();

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

// ---------- Web-App: offline spielbar, Updates beim nächsten Start ----------
// Nur in der veröffentlichten Version, nicht im Entwicklungsserver; in eingebetteten Vorschauen schlägt es still fehl
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* z. B. in der Claude-Vorschau nicht erlaubt */ });
}
