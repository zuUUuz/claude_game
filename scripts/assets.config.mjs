// Liste aller KI-generierten Assets. Neue Grafik = neuer Eintrag hier.
//
// Felder:
//   id         Dateiname in assets/ (ohne Endung)
//   prompt     was auf dem Bild sein soll (der Stil-Block wird automatisch vorangestellt)
//   size       Größe, in der die KI generiert: 1024x1024, 1536x1024 (quer), 1024x1536 (hoch)
//   background 'transparent' für Figuren und Objekte, sonst 'opaque'
//   pixelWidth Breite der fertigen Pixel-Grafik; kleiner = gröbere Pixel
//   colors     maximale Farbanzahl nach der Aufbereitung
//   reference  optional: id eines schon erzeugten Assets als Stilvorlage

// Einheitlicher Stil für alle Bilder
export const STYLE =
  'Pixel art, 16-bit retro game style, flat front-facing side view, clean crisp pixels, ' +
  'bold dark outlines, limited palette of warm yellows, deep night blues and neon pink accents, ' +
  'cozy Berlin night mood.';

export const ASSETS = [
  {
    id: 'shop-interior',
    prompt:
      'Interior of a small Berlin "Späti" late-night kiosk seen like a stage with the front wall removed. ' +
      'Back wall with glowing drink fridges full of colorful bottles, wooden counter with a cash register on the left, ' +
      'snack shelves, a door on the right, warm yellow lighting, slightly messy. No characters, no text.',
    size: '1536x1024',
    background: 'opaque',
    pixelWidth: 384,
    colors: 48,
  },
  {
    id: 'char-raver',
    prompt:
      'Single full-body character sprite standing and facing the viewer: a Berlin techno raver in his 20s, ' +
      'black outfit, sunglasses on his head, holding a bottle of Club-Mate. Centered, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 128,
    colors: 24,
    reference: 'shop-interior',
  },
  {
    id: 'items',
    prompt:
      'Sprite sheet of 6 item icons arranged in a 3x2 grid with even spacing: beer bottle, bottle of Club-Mate, ' +
      'chocolate bar, paper coffee cup, small shot bottle of peppermint liqueur, lottery ticket. ' +
      'Same size each, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 192,
    colors: 32,
    reference: 'shop-interior',
  },
  {
    id: 'shop-exterior',
    prompt:
      'Front view of an old Berlin apartment building at night with a small Späti kiosk on the ground floor, ' +
      'glowing pink neon sign without letters, warm light from the shop window, beer bench on the sidewalk, ' +
      'street lamp, dark blue sky with a few stars. No text.',
    size: '1024x1536',
    background: 'opaque',
    pixelWidth: 256,
    colors: 48,
    reference: 'shop-interior',
  },
];
