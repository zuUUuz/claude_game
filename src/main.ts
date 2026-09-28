import './ui/style.css';
import { Game } from './game/game';
import { MATCH, UNITS, UNIT_ORDER, UnitKind } from './game/config';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const ICONS: Record<UnitKind, string> = {
  infantry: '<svg viewBox="0 0 40 28"><circle cx="14" cy="6" r="3"/><path d="M14 10v9m0-9-5 6m5-6 5 5m-5 4-4 7m4-7 4 7"/><circle cx="26" cy="8" r="2.5"/><path d="M26 11v7m0 0-3 6m3-6 3 6m-3-12 4 4"/></svg>',
  tank: '<svg viewBox="0 0 40 28"><path d="M5 19h30l-3 5H8z"/><path d="M8 19l2-5h18l3 5"/><path d="M14 14v-4h9v4M23 11h13"/></svg>',
  antitank: '<svg viewBox="0 0 40 28"><circle cx="16" cy="7" r="3"/><path d="M16 11v8m0 0-4 7m4-7 4 7m-4-15 5 4"/><path d="M8 10l24-5M30 3l5 1-3 3"/></svg>',
  recon: '<svg viewBox="0 0 40 28"><path d="M5 18h30v-4l-6-5H14l-5 5H5z"/><circle cx="12" cy="20" r="3"/><circle cx="28" cy="20" r="3"/><path d="M20 9V5h6"/></svg>',
};

const game = new Game($('viewport'));
if (location.hash === '#debug') (window as unknown as { game: Game }).game = game;

// ---------- Einheiten-Karten ----------
const cards = $('cards');
const cardEls = new Map<UnitKind, HTMLButtonElement>();
for (const kind of UNIT_ORDER) {
  const s = UNITS[kind];
  const b = document.createElement('button');
  b.className = 'card';
  b.type = 'button';
  b.id = `card-${kind}`;
  b.title = `${s.name}: ${s.blurb}`;
  b.innerHTML = `${ICONS[kind]}<span class="nm">${s.label}</span><span class="cost">${s.cost}</span><span class="fill"></span>`;
  b.addEventListener('click', () => game.deploy(kind));
  cards.appendChild(b);
  cardEls.set(kind, b);
}
$('btn-all').addEventListener('click', () => game.selectAll());

// ---------- Punkte-Anzeige ----------
const pointsEl = $('points');
const ptEls = game.points.map(p => {
  const d = document.createElement('div');
  d.className = 'pt';
  d.innerHTML = `<svg viewBox="0 0 38 38"><circle cx="19" cy="19" r="17" fill="none" stroke-width="3" stroke-dasharray="0 200"/></svg>${p.def.id}`;
  pointsEl.appendChild(d);
  return d;
});

// ---------- Meldungen ----------
const feed = $('feed');
game.onEvent = e => {
  const t = document.createElement('div');
  t.className = `toast ${e.tone}`;
  t.textContent = e.text;
  feed.prepend(t);
  while (feed.children.length > 3) feed.lastChild!.remove();
  setTimeout(() => t.remove(), 3800);
};

// ---------- Spielende ----------
game.onOver = winner => {
  const won = winner === 'blue';
  $('end-eyebrow').textContent = winner === null ? 'Unentschieden' : won ? 'Nordbund siegt' : 'Südpakt siegt';
  $('end-title').textContent = winner === null ? 'PATT' : won ? 'SIEG' : 'NIEDERLAGE';
  const rows: [string, string | number][] = [
    ['Punkte', `${Math.floor(game.score.blue)} : ${Math.floor(game.score.red)}`],
    ['Feinde zerstört', game.stats.kills],
    ['Eigene Verluste', game.stats.lost],
    ['Einheiten aufgestellt', game.stats.deployed],
    ['Punkte erobert', game.stats.captures],
  ];
  $('end-stats').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('end').hidden = false;
};

function begin() {
  $('start').hidden = true;
  $('end').hidden = true;
  feed.innerHTML = '';
  game.start();
}
$('btn-start').addEventListener('click', begin);
$('btn-again').addEventListener('click', begin);

// ---------- HUD aktualisieren (10× pro Sekunde reicht) ----------
function fmt(sec: number) {
  const s = Math.ceil(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
setInterval(() => {
  $('score-blue').textContent = String(Math.floor(game.score.blue));
  $('score-red').textContent = String(Math.floor(game.score.red));
  $('bar-blue').style.width = `${Math.min(50, game.score.blue / MATCH.scoreToWin * 50)}%`;
  $('bar-red').style.width = `${Math.min(50, game.score.red / MATCH.scoreToWin * 50)}%`;
  $('clock').textContent = fmt(game.timeLeft);
  const clockBox = $('clock').parentElement!;
  clockBox.classList.toggle('overtime', game.overtime && game.running);
  $('clock-note').textContent = game.overtime && game.running ? 'Punkte ×2' : `Ziel ${MATCH.scoreToWin}`;

  const supply = Math.floor(game.supply.blue);
  $('supply').textContent = String(supply);
  for (const [kind, el] of cardEls) {
    const cost = UNITS[kind].cost;
    el.disabled = !game.running || supply < cost;
    el.classList.toggle('ready', game.running && supply >= cost);
    (el.querySelector('.fill') as HTMLElement).style.width = `${Math.min(100, supply / cost * 100)}%`;
  }

  game.points.forEach((p, i) => {
    const el = ptEls[i];
    el.classList.toggle('blue', p.owner === 'blue');
    el.classList.toggle('red', p.owner === 'red');
    el.classList.toggle('contested', p.contested);
    const circle = el.querySelector('circle')!;
    const len = Math.abs(p.control) / 100 * 106.8;
    circle.setAttribute('stroke', p.control >= 0 ? 'var(--blue)' : 'var(--red)');
    circle.setAttribute('stroke-dasharray', `${len} 200`);
  });
}, 100);
