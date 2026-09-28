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
//   split      optional: Blatt in { cols, rows, parts: [{ id, pixelWidth }] } zerschneiden; jedes Teil wird
//              aus dem Rohbild auf seine eigene Breite gerechnet und als eigene Datei gespeichert
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
      'Seamless floor surface of a small Berlin late-night kiosk, seen from above, filling the whole image edge to edge ' +
      'with no border and no edges: light warm beige linoleum with a subtle fine speckle pattern of tiny darker and ' +
      'lighter flecks, some gentle scuff marks and a few faint worn paths. Calm and not too busy, no large spots. ' +
      'No tiles, no grid, no seams, no lines, even lighting. No objects, no shadows of objects, no text.',
    size: '1536x1024',
    background: 'opaque',
    pixelWidth: 384,
    pixelHeight: 144,
    crop: { left: 400, top: 300, width: 736, height: 400 }, // nur die Mitte, ohne den schrägen Rand
    colors: 24,
    reference: 'room-wall',
  },
  // Alle Möbel auf einem Blatt, damit Blickwinkel und Maßstab einheitlich sind; das Skript schneidet sie auseinander
  {
    id: 'furniture',
    prompt:
      ROOM_VIEW + ' Sprite sheet of 4 pieces of shop furniture for the same game, arranged in a 2x2 grid with lots of ' +
      'empty space between them, every piece drawn from exactly the same camera angle: strict front view, only a thin ' +
      'strip of each top visible, absolutely no side faces, not rotated. All drawn at the same real-world scale: ' +
      'top left a tall glass-door drink fridge (tallest piece, taller than a person) full of colorful bottles (green beer, ' +
      'yellow mate, red and blue cans), glowing from inside, a few stickers on its front frame; ' +
      'top right a waist-high wooden shop counter with an old grey cash register on top; ' +
      'bottom left a chest-high wooden snack shelf with three tiers of colorful chip bags and candy packages; ' +
      'bottom right a small knee-high blue plastic crate full of empty brown deposit beer bottles. ' +
      'Each piece standing upright on its own, no floor, no shadows, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 384,
    colors: 48,
    reference: 'room-wall',
    split: {
      cols: 2, rows: 2,
      // Breite der fertigen Teile = Größe im Raum (Tür in room-wall ist etwa 150 Pixel hoch)
      parts: [
        { id: 'furn-fridge', pixelWidth: 88 },
        { id: 'furn-counter', pixelWidth: 132 },
        { id: 'furn-snackshelf', pixelWidth: 96 },
        { id: 'furn-crate', pixelWidth: 72 },
      ],
    },
  },
  // Menüs im Spiel: Holz und Pappe, werden später mit dem Späti aufgewertet
  {
    id: 'ui-icons',
    prompt:
      'Sprite sheet of 8 small game UI icons arranged in a 4x2 grid with lots of empty space between them, all the same ' +
      'size and style, bold and readable at small size, front view, hand-made cozy look: ' +
      'top row: a gold coin with a euro sign, a round wall clock, a yellow star, a cardboard box with a red exclamation mark; ' +
      'bottom row: a wooden crate full of bottles, a paper price tag on a string, a hammer crossed with a saw, ' +
      'a speech bubble with a small heart. Transparent background, no text.',
    size: '1536x1024',
    background: 'transparent',
    pixelWidth: 384,
    colors: 48,
    reference: 'room-wall',
    split: {
      cols: 4, rows: 2,
      parts: [
        { id: 'icon-money', pixelWidth: 24 },
        { id: 'icon-clock', pixelWidth: 24 },
        { id: 'icon-star', pixelWidth: 24 },
        { id: 'icon-stock', pixelWidth: 24 },
        { id: 'icon-lager', pixelWidth: 32 },
        { id: 'icon-preise', pixelWidth: 32 },
        { id: 'icon-bauen', pixelWidth: 32 },
        { id: 'icon-kiez', pixelWidth: 32 },
      ],
    },
  },
  {
    id: 'ui-wood',
    prompt:
      'Seamless texture of old warm brown wooden planks running horizontally, seen straight on, filling the whole image ' +
      'edge to edge: a few boards with visible grain, small nail heads and slight wear. Flat, even lighting, no border, ' +
      'no objects, no text.',
    size: '1536x1024',
    background: 'opaque',
    pixelWidth: 192,
    colors: 16,
  },
  {
    id: 'ui-sign',
    prompt:
      'A single blank rectangular sign made of a piece of wood with a torn cardboard label glued on it, seen straight ' +
      'from the front, slightly wider than tall, simple game button, the cardboard area is empty and plain so text and ' +
      'an icon can be placed on it. Transparent background, no text, no symbols.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 96,
    colors: 24,
    reference: 'room-wall',
  },
];
