// Liste aller KI-generierten Assets. Neue Grafik = neuer Eintrag hier.
//
// Felder:
//   id         Dateiname in assets/ (ohne Endung)
//   prompt     was auf dem Bild sein soll (der Stil-Block wird automatisch vorangestellt)
//   size       Größe, in der die KI generiert: 1024x1024, 1536x1024 (quer), 1024x1536 (hoch)
//   background 'transparent' für Figuren und Objekte, sonst 'opaque'
//   pixelWidth Breite der fertigen Pixel-Grafik; kleiner = gröbere Pixel.
//              Bei Möbeln bestimmt das auch die Größe im Raum (Maßstab: Tür ≈ 165 Pixel hoch)
//   colors     maximale Farbanzahl nach der Aufbereitung
//   reference  optional: id eines schon erzeugten Assets als Stilvorlage

// Einheitlicher Stil für alle Bilder
export const STYLE =
  'Detailed pixel art in the style of modern cozy indie games like Stardew Valley, clean crisp pixels, ' +
  'slightly top-down three-quarter view, dark outlines, colorful and varied palette with many distinct hues ' +
  '(greens, blues, reds, yellows, purples) on a cozy evening base of deep night blues with warm lamp light ' +
  'and a few neon pink accents, subtle Berlin flair, charming and a little humorous.';

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
  // Ausbaubarer Innenraum: leerer Raum als Hintergrund, Möbel als Einzelteile zum Platzieren
  {
    id: 'room-empty',
    prompt:
      'Wide empty interior of a small Berlin "Späti" late-night kiosk, straight-on front view seen from slightly above ' +
      'like a room in Stardew Valley: the back wall runs perfectly horizontal and parallel to the image edge, ' +
      'no side walls visible, no corner view, no angled walls, no vanishing point to the side. Below it a large empty rectangular floor with ' +
      'a straight square tile grid seen from above. Only the bare room: back wall with a shop window on the left ' +
      'showing the evening street and an entrance door on the right, two hanging lamps. The room is bright and well lit by warm ceiling lamps and fluorescent light: ' +
      'light painted walls with some exposed light brick, light warm floor tiles, friendly and inviting. ' +
      'Dark night blue only outside the window, not inside. Completely empty: no furniture, no fridges, no shelves, no counter, no goods, ' +
      'no characters, no text. Lots of free floor and wall space to place furniture later.',
    size: '1536x1024',
    background: 'opaque',
    pixelWidth: 512,
    colors: 64,
    // ohne Stilvorlage: das alte Innenraum-Bild zieht sonst die Eck-Perspektive mit hinein
  },
  {
    id: 'furn-fridge',
    prompt:
      'Single piece of shop furniture as a game object sprite, slightly top-down three-quarter view matching a ' +
      'simulation game room: a tall glass-door drink fridge full of colorful bottles (green beer, yellow mate, red and blue cans), glowing from inside, a few stickers on the side. ' +
      'Centered, whole object visible, no floor, no shadow on the background, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 160,
    colors: 32,
    reference: 'shop-interior',
  },
  {
    id: 'furn-counter',
    prompt:
      'Single piece of shop furniture as a game object sprite, slightly top-down three-quarter view matching a ' +
      'simulation game room: a wooden shop counter with an old grey cash register on top. ' +
      'Centered, whole object visible, no floor, no shadow on the background, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 176,
    colors: 32,
    reference: 'shop-interior',
  },
  {
    id: 'furn-snackshelf',
    prompt:
      'Single piece of shop furniture as a game object sprite, slightly top-down three-quarter view matching a ' +
      'simulation game room: a wooden snack shelf with three tiers of colorful chip bags and candy packages. ' +
      'Centered, whole object visible, no floor, no shadow on the background, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 128,
    colors: 32,
    reference: 'shop-interior',
  },
  {
    id: 'furn-crate',
    prompt:
      'Single piece of shop furniture as a game object sprite, slightly top-down three-quarter view matching a ' +
      'simulation game room: a blue plastic crate full of empty brown deposit beer bottles. ' +
      'Centered, whole object visible, no floor, no shadow on the background, transparent background, no text.',
    size: '1024x1024',
    background: 'transparent',
    pixelWidth: 64,
    colors: 32,
    reference: 'shop-interior',
  },
];
