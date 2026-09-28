// Liste aller KI-generierten Assets. Neue Grafik = neuer Eintrag hier.
//
// Felder:
//   id         Dateiname in assets/ (ohne Endung)
//   prompt     was auf dem Bild sein soll (der Stil-Block wird automatisch vorangestellt)
//   size       Größe, in der die KI generiert: 1024x1024, 1536x1024 (quer), 1024x1536 (hoch)
//   background 'transparent' für Figuren und Objekte, sonst 'opaque'
//   pixelWidth Breite der fertigen Pixel-Grafik; kleiner = gröbere Pixel.
//              Bei Möbeln bestimmt das auch die Größe im Raum (Maßstab: Tür in room-wall)
//   pixelHeight optional: feste Höhe (staucht das Bild, z. B. Boden für Tiefenwirkung)
//   crop       optional: Ausschnitt aus dem Rohbild { left, top, width, height }
//   colors     maximale Farbanzahl nach der Aufbereitung
//   reference  optional: id eines schon erzeugten Assets als Stilvorlage

// Einheitlicher Stil für alle Bilder
export const STYLE =
  'Detailed pixel art in the style of modern cozy indie games like Stardew Valley, clean crisp pixels, ' +
  'slightly top-down three-quarter view, dark outlines, colorful and varied palette with many distinct hues ' +
  '(greens, blues, reds, yellows, purples) on a cozy evening base of deep night blues with warm lamp light ' +
  'and a few neon pink accents, subtle Berlin flair, charming and a little humorous.';

// Feste Ansicht für Innenraum und Möbel, damit alles zusammenpasst
const ROOM_VIEW =
  'Orthographic Stardew Valley style view: no perspective, no vanishing point, all horizontal lines perfectly ' +
  'horizontal and all vertical lines perfectly vertical. Objects are seen straight from the front and slightly from ' +
  'above, so only the flat front face and a thin strip of the top face are visible, never any side face.';

export const ASSETS = [
  {
    id: 'shop-interior',
    prompt:
      'Wide interior of a small Berlin "Späti" late-night kiosk, seen from slightly above in three-quarter view ' +
      'so the floor is visible, like a cozy room in a simulation game. The shop is wide and fills the whole image. ' +
      'Brightly lit: back wall with drink fridges full of bottles in many different colors (green beer bottles, ' +
      'yellow mate bottles, red and blue cans), wooden counter with a cash register on the left, snack shelves with ' +
      'colorful packages in the middle, a door on the right, a few Berlin details like a sticker-covered fridge and a ' +
      'crate of empty deposit bottles. Evening mood through the window. No characters, no text.',
    size: '1536x1024',
    background: 'opaque',
    pixelWidth: 512,
    colors: 64,
  },
  {
    id: 'char-raver',
    prompt:
      'Single full-body character sprite, slightly top-down three-quarter view, standing and facing the viewer: ' +
      'a stereotypical Berlin techno raver in his 20s, slightly exaggerated proportions with a somewhat larger head ' +
      'and expressive face, black mesh shirt, glitter on the cheeks, round sunglasses pushed up, bleached hair, ' +
      'tired but happy grin, holding a yellow bottle of Club-Mate. Friendly caricature with a wink. ' +
      'Centered, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 160,
    colors: 32,
    reference: 'shop-interior',
  },
  {
    id: 'items',
    prompt:
      'Sprite sheet of 6 item icons arranged in a 3x2 grid with even spacing, each item in its typical real-world ' +
      'colors but without real logos: green glass beer bottle with a plain label, yellow-orange Club-Mate style bottle, ' +
      'chocolate bar in a purple wrapper with the chocolate partly showing, white paper coffee cup with a brown lid, ' +
      'tiny green shot bottle of peppermint liqueur, small paper lottery ticket (a slip of paper with a grid of ' +
      'numbered boxes and a few crosses, not a calculator). Same size each, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 256,
    colors: 48,
    reference: 'shop-interior',
  },
  {
    id: 'shop-exterior',
    prompt:
      'Front view, slightly from above, of an old Berlin apartment building in the evening with a small Späti kiosk ' +
      'on the ground floor, glowing pink neon sign without letters, warm bright light from the shop window showing ' +
      'colorful goods, beer bench on the sidewalk, a bicycle, a few stickers and a small graffiti tag, street lamp, ' +
      'deep blue sky with a few stars. No text.',
    size: '1024x1536',
    background: 'opaque',
    pixelWidth: 320,
    colors: 64,
    reference: 'shop-interior',
  },
  // Ausbaubarer Innenraum aus Teilen: flache Rückwand + Bodenfliese (Bau-Raster nur im Baumodus) + Möbel einzeln
  {
    id: 'room-wall',
    prompt:
      'Flat front elevation of the inside back wall of a small Berlin "Späti" late-night kiosk, seen perfectly ' +
      'straight on like a theater backdrop: the wall fills the entire image edge to edge, no floor, no ceiling, ' +
      'no side walls, no corners, no perspective. On the wall: a large shop window on the left showing the evening ' +
      'street, an entrance door on the right standing on the bottom edge of the image, two hanging lamps at the top. ' +
      'Light painted plaster with some exposed light brick, a dark skirting board along the bottom edge, bright and ' +
      'well lit, friendly and inviting. Dark night blue only outside the window. No furniture, no goods, no characters, no text.',
    size: '1536x1024',
    background: 'opaque',
    pixelWidth: 384,
    colors: 64,
  },
  {
    id: 'room-floor',
    prompt:
      'Seamless floor surface of a small Berlin late-night kiosk, seen from above, filling the whole image edge to edge: ' +
      'worn warm beige-brown linoleum with a few scuff marks, faint stains and subtle wear paths, no tiles, no grid, ' +
      'no seams, no lines. Slightly darker toward the top edge. No objects, no shadows of objects, no text.',
    size: '1536x1024',
    background: 'opaque',
    pixelWidth: 384,
    pixelHeight: 144,
    crop: { left: 400, top: 300, width: 736, height: 400 }, // nur die Mitte, ohne den schrägen Rand
    colors: 24,
    reference: 'room-wall',
  },
  {
    id: 'furn-fridge',
    prompt:
      ROOM_VIEW + ' Single piece of shop furniture as a game object sprite, drawn as a strict front elevation ' +
      'with only a thin strip of its top visible and absolutely no side faces: a tall glass-door drink fridge full of colorful bottles (green beer, yellow mate, red and blue cans), glowing from inside, a few stickers on its front frame. ' +
      'Centered, whole object visible, no floor, no shadow on the background, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 160,
    colors: 32,
    reference: 'room-wall',
  },
  {
    id: 'furn-counter',
    prompt:
      ROOM_VIEW + ' Single piece of shop furniture as a game object sprite, drawn as a strict front elevation ' +
      'with only a thin strip of its top visible and absolutely no side faces: a wooden shop counter with an old grey cash register on top. ' +
      'Centered, whole object visible, no floor, no shadow on the background, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 176,
    colors: 32,
    reference: 'room-wall',
  },
  {
    id: 'furn-snackshelf',
    prompt:
      ROOM_VIEW + ' Single piece of shop furniture as a game object sprite, drawn as a strict front elevation ' +
      'with only a thin strip of its top visible and absolutely no side faces: a wooden snack shelf with three tiers of colorful chip bags and candy packages. ' +
      'Centered, whole object visible, no floor, no shadow on the background, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 128,
    colors: 32,
    reference: 'room-wall',
  },
  {
    id: 'furn-crate',
    prompt:
      ROOM_VIEW + ' Single piece of shop furniture as a game object sprite, drawn as a strict front elevation ' +
      'with only a thin strip of its top visible and absolutely no side faces: a blue plastic crate full of empty brown deposit beer bottles. ' +
      'Centered, whole object visible, no floor, no shadow on the background, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 64,
    colors: 32,
    reference: 'room-wall',
  },
];
