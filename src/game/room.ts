// Der Späti-Innenraum: flache Rückwand, Boden und Möbel, zusammengesetzt auf einem Canvas.
// Gezeichnet wird in Original-Pixeln; die Vergrößerung macht danach das CSS.

import wallUrl from '../../assets/room-wall.png';
import floorUrl from '../../assets/room-floor.png';
import fridgeUrl from '../../assets/furn-fridge.png';
import counterUrl from '../../assets/furn-counter.png';
import shelfUrl from '../../assets/furn-snackshelf.png';
import crateUrl from '../../assets/furn-crate.png';

import { furnitureLayout, FurnitureType } from './layout';

const FURNITURE: Record<FurnitureType, string> = { fridge: fridgeUrl, counter: counterUrl, shelf: shelfUrl, crate: crateUrl };

// Breite des Start-Spätis in Pixeln = genau ein Bildschirm. Upgrades machen den Raum später breiter,
// die Vergrößerung richtet sich aber immer nach dieser Breite.
export const SCREEN_WIDTH = 384;

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
export function footShadow(ctx: CanvasRenderingContext2D, cx: number, footY: number, width: number) {
  const rx = Math.round(width * 0.53), ry = Math.max(2, Math.round(width * 0.06));
  ctx.fillStyle = 'rgba(26, 15, 20, 0.45)';
  for (let dy = -ry; dy < ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - ((dy + 0.5) / ry) ** 2));
    ctx.fillRect(cx - half, footY + dy, half * 2, 1);
  }
}

// Boden bis zur gewünschten Höhe fortsetzen, abwechselnd gespiegelt, damit keine Nähte sichtbar sind
function drawFloor(ctx: CanvasRenderingContext2D, floor: HTMLImageElement, top: number, height: number) {
  for (let y = 0, i = 0; y < height; y += floor.height, i++) {
    if (i % 2 === 0) { ctx.drawImage(floor, 0, top + y); continue; }
    ctx.save();
    ctx.translate(0, top + y + floor.height);
    ctx.scale(1, -1);
    ctx.drawImage(floor, 0, 0);
    ctx.restore();
  }
}

// Zeichnet den Raum; minHeight streckt den Boden nach unten, damit der Raum den ganzen Bildschirm füllt
// Etwas, das im Raum steht und von hinten nach vorn sortiert gezeichnet wird (Möbel, Kunden)
export interface Drawable { y: number; draw: (ctx: CanvasRenderingContext2D, wallH: number) => void }

export interface Room {
  background: HTMLCanvasElement; // Wand und Boden, einmal gezeichnet
  wallH: number;
  sprites: Record<FurnitureType, HTMLImageElement>;
}

// Lädt die Bilder und baut den Hintergrund; minHeight streckt den Boden bis zum unteren Bildschirmrand
export async function buildRoom(minHeight = 0): Promise<Room> {
  const [wall, floor] = await Promise.all([loadImage(wallUrl), loadImage(floorUrl)]);
  const types = Object.keys(FURNITURE) as FurnitureType[];
  const sprites = Object.fromEntries(await Promise.all(types.map(async t => [t, await loadImage(FURNITURE[t])] as const))) as Room['sprites'];

  const wallH = Math.round(wall.height * WALL_CROP);
  const background = document.createElement('canvas');
  background.width = wall.width;
  background.height = Math.max(wallH + floor.height, minHeight);
  const ctx = background.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(wall, 0, 0, wall.width, wallH, 0, 0, wall.width, wallH);
  drawFloor(ctx, floor, wallH, background.height - wallH);
  shadeBand(ctx, wallH, background.width, 10, 0.45);
  return { background, wallH, sprites };
}

// Ein Bild der Szene: Hintergrund, dann Möbel und Kunden von hinten nach vorn
export function drawScene(canvas: HTMLCanvasElement, room: Room, people: Drawable[]) {
  if (canvas.width !== room.background.width || canvas.height !== room.background.height) {
    canvas.width = room.background.width;
    canvas.height = room.background.height;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(room.background, 0, 0);
  const furniture: Drawable[] = furnitureLayout().map(p => ({
    y: p.y,
    draw: (c, top) => {
      const img = room.sprites[p.type];
      const footY = top + p.y;
      footShadow(c, p.x, footY - 1, img.width);
      c.drawImage(img, Math.round(p.x - img.width / 2), footY - img.height);
    },
  }));
  for (const d of [...furniture, ...people].sort((a, b) => a.y - b.y)) d.draw(ctx, room.wallH);
}
