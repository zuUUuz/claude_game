// Platzhalter-Icons als kleine Pixel-Grafiken im Code (12 × 12). Werden später durch KI-Icons ersetzt.
// Jedes Zeichen ist ein Pixel; '.' ist durchsichtig.

const COLORS: Record<string, string> = {
  k: '#2a1a12', // Umriss
  y: '#f7c948', // Gold
  o: '#c98a1a', // Gold dunkel
  w: '#fff4d6', // Weiß / Papier
  r: '#d9412b', // Rot
  b: '#a86b32', // Holz / Pappe
  B: '#6b421d', // Holz dunkel
  g: '#3f8f4a', // Flaschengrün
  s: '#a9b3bd', // Metall
  p: '#ff4fa3', // Neon-Pink
};

const ICONS = {
  money: [
    '....kkkk....',
    '..kkyyyykk..',
    '.kyywyyyyok.',
    '.kywyyyyyok.',
    'kyyyyyyyyyok',
    'kyyyyyyyyyok',
    'kyyyyyyyyyok',
    'kyyyyyyyyook',
    '.kyyyyyyyok.',
    '.kooyyyyook.',
    '..kkooookk..',
    '....kkkk....',
  ],
  clock: [
    '....kkkk....',
    '..kkwwwwkk..',
    '.kwwwwkwwwk.',
    '.kwwwwkwwwk.',
    'kwwwwwkwwwwk',
    'kwwwwwkwwwwk',
    'kwwwwwkkkwwk',
    'kwwwwwwwwwwk',
    '.kwwwwwwwwk.',
    '.kwwwwwwwwk.',
    '..kkwwwwkk..',
    '....kkkk....',
  ],
  star: [
    '.....kk.....',
    '....kyyk....',
    '....kyyk....',
    'kkkkkyykkkkk',
    'kyyyyyyyyyyk',
    '.kyyyyyyyyk.',
    '..kyyyyyyk..',
    '..kyyyyyyk..',
    '.kyyykkyyyk.',
    '.kyyk..kyyk.',
    'kyyk....kyyk',
    'kkk......kkk',
  ],
  stock: [
    '............',
    '..kkkkkkkk..',
    '.kbbbbbbbbk.',
    'kbbbbrrbbbbk',
    'kkkkkrrkkkkk',
    'kbbbbrrbbbbk',
    'kbbbbrrbbbbk',
    'kbbbbbbbbbbk',
    'kbbbbrrbbbbk',
    'kbbbbrrbbbbk',
    'kBBBBBBBBBBk',
    'kkkkkkkkkkkk',
  ],
  lager: [
    '..kk.kk.kk..',
    '..gg.gg.gg..',
    '.kggkggkggk.',
    '.kggkggkggk.',
    'kkkkkkkkkkkk',
    'kbbbbbbbbbbk',
    'kbBBbbbbBBbk',
    'kbbbbbbbbbbk',
    'kkkkkkkkkkkk',
    'kbbbbbbbbbbk',
    'kBBBBBBBBBBk',
    'kkkkkkkkkkkk',
  ],
  preise: [
    'k...........',
    '.k..........',
    '.kkkkkkkkk..',
    '.kwkwwwwwwk.',
    '.kwwwwwwwwwk',
    '.kwwwrrrwwwk',
    '.kwwwwwwwwwk',
    '.kwwwrrrwwwk',
    '.kwwwwwwwwwk',
    '.kwwwwwwwwk.',
    '.kkkkkkkkk..',
    '............',
  ],
  bauen: [
    '..kkkkkk....',
    '.ksssssskk..',
    '.ksssssssk..',
    '..kkkbbkkk..',
    '....kbbk....',
    '....kbbk....',
    '....kbbk....',
    '....kbbk....',
    '....kbbk....',
    '....kbbk....',
    '....kBBk....',
    '....kkkk....',
  ],
  kiez: [
    '.kkkkkkkkkk.',
    'kwwwwwwwwwwk',
    'kwwppwwppwwk',
    'kwppppppppwk',
    'kwppppppppwk',
    'kwwppppppwwk',
    'kwwwppppwwwk',
    'kwwwwppwwwwk',
    '.kkkwwkkkkk.',
    '...kwk......',
    '...kk.......',
    '............',
  ],
};

export type IconName = keyof typeof ICONS;

const cache = new Map<IconName, string>();

// Liefert das Icon als Bild-URL (einmal gezeichnet, dann zwischengespeichert)
export function iconUrl(name: IconName): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const rows = ICONS[name];
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === '.') return;
    ctx.fillStyle = COLORS[c];
    ctx.fillRect(x, y, 1, 1);
  }));
  const url = canvas.toDataURL();
  cache.set(name, url);
  return url;
}

// Alle <img data-icon="…"> im Dokument mit ihrem Icon füllen
export function fillIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLImageElement>('img[data-icon]').forEach(img => {
    img.src = iconUrl(img.dataset.icon as IconName);
    img.alt = '';
  });
}
