import './ui/style.css';
import { renderRoom } from './game/room';

const VERSION = '0.2.0';
const $ = (id: string) => document.getElementById(id)!;

// ---------- Bildschirme wechseln ----------
const screens = ['menu', 'play', 'settings', 'debug'] as const;
type Screen = typeof screens[number];
function show(name: Screen) {
  screens.forEach(s => { $(`screen-${s}`).hidden = s !== name; });
  if (name === 'debug') renderDebug();
  if (name === 'play') openRoom();
}
$('btn-play').addEventListener('click', () => show('play'));
$('btn-settings').addEventListener('click', () => show('settings'));
$('btn-debug').addEventListener('click', () => show('debug'));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => show('menu')));

// ---------- Späti: Raum anzeigen, seitlich wischen ----------
const room = $('room') as HTMLCanvasElement;
const roomScroll = $('room-scroll');
let roomReady: Promise<void> | null = null;

// Größte ganzzahlige Vergrößerung, bei der der Raum in die Höhe passt
function fitRoom() {
  if (!room.height) return;
  const scale = Math.max(1, Math.floor(roomScroll.clientHeight / room.height));
  room.style.width = `${room.width * scale}px`;
  room.style.height = `${room.height * scale}px`;
}

async function openRoom() {
  roomReady ??= renderRoom(room);
  await roomReady;
  fitRoom();
  // Beim Öffnen mittig starten
  roomScroll.scrollLeft = (roomScroll.scrollWidth - roomScroll.clientWidth) / 2;
}
window.addEventListener('resize', fitRoom);

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
