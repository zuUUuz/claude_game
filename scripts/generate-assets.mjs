// Erzeugt Pixel-Assets über die OpenAI-Bild-API und bereitet sie als echte Pixel-Grafik auf.
//
// Aufruf:
//   npm run assets                 zeigt, welche fehlenden Assets erzeugt würden und was das etwa kostet
//   npm run assets -- --ja         ... und erzeugt sie dann wirklich (kostet Geld)
//   npm run assets -- char-raver   nur bestimmte Assets (auch wenn sie schon existieren), ebenfalls mit --ja
//   npm run assets -- --force      alle neu erzeugen, ebenfalls mit --ja
//   npm run assets -- --pixel      nur aus vorhandenen Rohbildern neu herunterrechnen (kostet nichts)
//
// Qualität: Standard ist 'low', weil die Bilder ohnehin stark verkleinert werden. Pro Asset mit
// quality: 'medium' | 'high' überschreibbar, oder für alle mit der Umgebungsvariable OPENAI_IMAGE_QUALITY.
//
// Braucht die Umgebungsvariable OPENAI_API_KEY und Netzwerkzugriff auf api.openai.com.
// Rohbilder landen in assets/raw/, fertige Pixel-Grafik in assets/.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ASSETS, STYLE } from './assets.config.mjs';

const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'low';

// Ungefähre Preise in US-Dollar pro Bild für gpt-image-1 (ohne Aufschlag für Stilvorlagen), nur zur Orientierung
const PRICE = {
  low: { square: 0.011, wide: 0.016 },
  medium: { square: 0.042, wide: 0.063 },
  high: { square: 0.167, wide: 0.25 },
};
const qualityOf = asset => asset.quality || QUALITY;
const priceOf = asset => PRICE[qualityOf(asset)]?.[asset.size === '1024x1024' ? 'square' : 'wide'] ?? 0;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const RAW = path.join(ROOT, 'assets', 'raw');
const OUT = path.join(ROOT, 'assets');

const key = process.env.OPENAI_API_KEY;

const args = process.argv.slice(2);
const force = args.includes('--force');
const confirmed = args.includes('--ja');
const pixelOnly = args.includes('--pixel');
const only = args.filter(a => !a.startsWith('--'));

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function generate(asset) {
  const prompt = `${STYLE} ${asset.prompt}`;
  const refPath = asset.reference ? path.join(RAW, `${asset.reference}.png`) : null;
  let res;
  if (refPath && await exists(refPath)) {
    // Mit Stilvorlage: Bild-Edit-Endpunkt mit dem Referenzbild
    const form = new FormData();
    form.append('model', MODEL);
    form.append('prompt', `Use the attached image only as the style reference (palette, pixel size, outlines). ${prompt}`);
    form.append('size', asset.size);
    form.append('quality', qualityOf(asset));
    form.append('background', asset.background);
    form.append('image[]', new Blob([await fs.readFile(refPath)], { type: 'image/png' }), 'reference.png');
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, size: asset.size, quality: qualityOf(asset), background: asset.background, n: 1 }),
    });
  }
  if (!res.ok) throw new Error(`API-Fehler ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return Buffer.from(json.data[0].b64_json, 'base64');
}

// Auf ein echtes Pixelraster herunterrechnen und die Farben begrenzen
async function pixelate(raw, asset) {
  if (asset.crop) raw = await sharp(raw).extract(asset.crop).toBuffer();
  const meta = await sharp(raw).metadata();
  const height = asset.pixelHeight || Math.round(meta.height * asset.pixelWidth / meta.width);
  let img = sharp(raw).resize(asset.pixelWidth, height, { kernel: 'nearest', fit: 'fill' });
  if (asset.background === 'transparent') img = img.ensureAlpha();
  const small = await img.png({ palette: true, colors: asset.colors, dither: 0 }).toBuffer();
  // Halbtransparente Kantenpixel hart machen, damit die Figuren sauber freigestellt sind
  if (asset.background !== 'transparent') return small;
  const { data, info } = await sharp(small).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] < 128 ? 0 : 255;
  // Verirrte Einzelpixel entfernen (weniger als 2 deckende Nachbarn)
  const { width: w, height: h } = info, a = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  const stray = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!a(x, y)) continue;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && a(x + dx, y + dy)) n++;
    if (n < 2) stray.push((y * w + x) * 4 + 3);
  }
  for (const i of stray) data[i] = 0;
  return sharp(data, { raw: info }).png({ palette: true, colors: asset.colors, dither: 0 }).toBuffer();
}

await fs.mkdir(RAW, { recursive: true });
const list = only.length ? ASSETS.filter(a => only.includes(a.id)) : ASSETS;
if (only.length && list.length !== only.length) {
  console.error(`Unbekannte Asset-IDs. Verfügbar: ${ASSETS.map(a => a.id).join(', ')}`);
  process.exit(1);
}

// Fertige Pixel-Grafik speichern; Sammelblätter werden in einzelne Teile zerlegt,
// jedes Teil aus dem Rohbild zugeschnitten und auf seine eigene Breite gerechnet
async function save(asset, raw) {
  await fs.writeFile(path.join(OUT, `${asset.id}.png`), await pixelate(raw, asset));
  if (!asset.split) return `assets/${asset.id}.png`;
  const { cols, rows, parts } = asset.split;
  const { width, height } = await sharp(raw).metadata();
  const w = Math.floor(width / cols), h = Math.floor(height / rows);
  for (const [i, part] of parts.entries()) {
    const m = Math.round(w * 0.04); // kleiner Rand weg, damit nichts vom Nachbarteil mitkommt
    const cell = await sharp(raw).extract({ left: (i % cols) * w + m, top: Math.floor(i / cols) * h + m, width: w - 2 * m, height: h - 2 * m }).png().toBuffer();
    const trimmed = await sharp(cell).trim().png().toBuffer();
    const small = await pixelate(trimmed, { ...asset, pixelWidth: part.pixelWidth });
    await fs.writeFile(path.join(OUT, `${part.id}.png`), await sharp(small).trim().png({ palette: true, colors: asset.colors, dither: 0 }).toBuffer());
  }
  return `assets/${asset.id}.png + ${parts.map(p => p.id).join(', ')}`;
}

if (pixelOnly) {
  for (const asset of list) {
    const rawPath = path.join(RAW, `${asset.id}.png`);
    if (!await exists(rawPath)) { console.log(`= ${asset.id} hat kein Rohbild`); continue; }
    console.log(`↻ ${await save(asset, await fs.readFile(rawPath))}`);
  }
  console.log('Fertig.');
  process.exit(0);
}

// Erst zeigen, was generiert würde und was es etwa kostet; generiert wird nur mit --ja
const todo = [];
for (const asset of list) {
  if (!force && !only.length && await exists(path.join(OUT, `${asset.id}.png`))) continue;
  todo.push(asset);
}
if (!todo.length) { console.log('Nichts zu tun, alle Assets existieren schon.'); process.exit(0); }
const total = todo.reduce((sum, a) => sum + priceOf(a), 0);
console.log(`${todo.length} Bild(er), Modell ${MODEL}:`);
for (const a of todo) console.log(`  ${a.id.padEnd(16)} ${a.size.padEnd(10)} ${qualityOf(a).padEnd(7)} ca. ${priceOf(a).toFixed(3)} $`);
console.log(`Geschätzt zusammen: ca. ${total.toFixed(2)} $ (Stilvorlagen kosten etwas mehr)`);
if (!confirmed) {
  console.log('Noch nichts generiert. Zum Ausführen denselben Befehl mit --ja starten.');
  process.exit(0);
}
if (!key) {
  console.error('OPENAI_API_KEY fehlt. In den Umgebungs-Einstellungen als Variable anlegen und eine neue Session starten.');
  process.exit(1);
}

for (const asset of todo) {
  process.stdout.write(`… ${asset.id} wird generiert (${asset.size}, ${qualityOf(asset)}) `);
  const raw = await generate(asset);
  await fs.writeFile(path.join(RAW, `${asset.id}.png`), raw);
  console.log(`→ ${await save(asset, raw)}`);
}
console.log('Fertig.');
