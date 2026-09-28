// Der Späti-Innenraum: flache Rückwand, Boden und Möbel, zusammengesetzt auf einem Canvas.
// Gezeichnet wird in Original-Pixeln und dann ganzzahlig vergrößert, damit die Pixel scharf bleiben.

import wallUrl from '../../assets/room-wall.png';
import floorUrl from '../../assets/room-floor.png';
import fridgeUrl from '../../assets/furn-fridge.png';
import counterUrl from '../../assets/furn-counter.png';
import shelfUrl from '../../assets/furn-snackshelf.png';
import crateUrl from '../../assets/furn-crate.png';

const FURNITURE = { fridge: fridgeUrl, counter: counterUrl, shelf: shelfUrl, crate: crateUrl };
type FurnitureType = keyof typeof FURNITURE;

// Ein Möbelstück im Raum: x = Mitte, y = Fußlinie in Pixeln unterhalb der Wandkante (0 = direkt an der Wand)
interface Placed { type: FurnitureType; x: number; y: number }

// Feste Startaufstellung; im Baumodus wird das später veränderbar
const START_LAYOUT: Placed[] = [
  { type: 'shelf', x: 110, y: 3 },
  { type: 'fridge', x: 208, y: 3 },
  { type: 'fridge', x: 365, y: 3 },
  { type: 'crate', x: 300, y: 55 },
  { type: 'counter', x: 170, y: 110 },
];

// Die Wand hat unten einen Rest Boden im Bild, der abgeschnitten wird
const WALL_CROP = 0.955;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild fehlt: ${src}`));
    img.src = src;
  });
}

// Weicher Verlauf in groben Pixelstufen, z. B. Schatten unter der Wand
function shadeBand(ctx: CanvasRenderingContext2D, top: number, width: number, height: number, alpha: number) {
  for (let i = 0; i < height; i += 2) {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * (1 - i / height)})`;
    ctx.fillRect(0, top + i, width, 2);
  }
}

// Pixeliger Ellipsen-Schatten unter einem Möbelstück, zeilenweise aus Rechtecken
function footShadow(ctx: CanvasRenderingContext2D, cx: number, footY: number, width: number) {
  const rx = Math.round(width * 0.53), ry = Math.max(2, Math.round(width * 0.06));
  ctx.fillStyle = 'rgba(26, 15, 20, 0.45)';
  for (let dy = -ry; dy < ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - ((dy + 0.5) / ry) ** 2));
    ctx.fillRect(cx - half, footY + dy, half * 2, 1);
  }
}

export async function renderRoom(canvas: HTMLCanvasElement, layout: Placed[] = START_LAYOUT) {
  const [wall, floor] = await Promise.all([loadImage(wallUrl), loadImage(floorUrl)]);
  const types = [...new Set(layout.map(p => p.type))];
  const sprites = Object.fromEntries(await Promise.all(types.map(async t => [t, await loadImage(FURNITURE[t])] as const)));

  const wallH = Math.round(wall.height * WALL_CROP);
  canvas.width = wall.width;
  canvas.height = wallH + floor.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(wall, 0, 0, wall.width, wallH, 0, 0, wall.width, wallH);
  ctx.drawImage(floor, 0, wallH);
  shadeBand(ctx, wallH, canvas.width, 10, 0.45);

  // Von hinten nach vorn zeichnen, damit Vorderes Hinteres verdeckt
  for (const p of [...layout].sort((a, b) => a.y - b.y)) {
    const img = sprites[p.type];
    const footY = wallH + p.y;
    footShadow(ctx, p.x, footY - 1, img.width);
    ctx.drawImage(img, Math.round(p.x - img.width / 2), footY - img.height);
  }
}
