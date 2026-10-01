// Zeichnet das App-Icon (Pixel-Krone) und speichert es in den Größen für iPhone, Android und Web.
// Aufruf: node scripts/make-icons.mjs   (kostenlos, ohne KI)

import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'public', 'icons');

const COLORS = { '.': [22, 18, 31], p: [255, 79, 163], d: [163, 36, 103], y: [247, 201, 72] };
const CROWN = [
  '................',
  '................',
  '................',
  '................',
  '..y....yy....y..',
  '..p....pp....p..',
  '..pp..pppp..pp..',
  '..ppp.pppp.ppp..',
  '..pppppppppppp..',
  '..pppppppppppp..',
  '..pppyppppyppp..',
  '..pppppppppppp..',
  '..dddddddddddd..',
  '..dddddddddddd..',
  '................',
  '................',
];

const size = CROWN.length;
const pixels = Buffer.alloc(size * size * 3);
CROWN.forEach((row, y) => [...row].forEach((c, x) => pixels.set(COLORS[c], (y * size + x) * 3)));
const base = sharp(pixels, { raw: { width: size, height: size, channels: 3 } });

for (const [name, px] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await base.clone().resize(px, px, { kernel: 'nearest' }).png().toFile(path.join(OUT, name));
  console.log(`→ public/icons/${name}`);
}
