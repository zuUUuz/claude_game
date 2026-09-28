# Kiezkönig

Ein Späti-Spiel fürs Handy mit simpler Pixel-Grafik. Wird Schritt für Schritt aufgebaut.

## Starten

```bash
npm install
npm run dev      # Entwicklungsserver, auch im WLAN fürs Handy erreichbar
npm run build    # fertige Version in dist/
```

## Projekt

- `index.html`: Bildschirme (Menü, Einstellungen, Debug)
- `src/main.ts`: Logik
- `src/game/room.ts`: Späti-Innenraum (Wand, Boden, Möbel) zeichnen
- `src/game/state.ts`: Spielstand (vorerst Beispielwerte)
- `src/ui/icons.ts`: Pixel-Icons als Platzhalter
- `src/ui/style.css`: Aussehen
- `drafts/`: geparkte Entwürfe, noch nicht eingebaut
- `capacitor.config.ts`: Grundlage für die spätere Android- und iOS-App

Der Plan steht in der [ROADMAP.md](ROADMAP.md).

## Grafik generieren

Alle Pixel-Assets werden per KI erzeugt und automatisch auf ein echtes Pixelraster heruntergerechnet.
Die Liste steht in `scripts/assets.config.mjs`.

```bash
npm run assets                      # zeigt fehlende Assets und geschätzte Kosten, generiert nichts
npm run assets -- --ja              # fehlende Assets wirklich erzeugen (kostet Geld)
npm run assets -- char-raver --ja   # ein bestimmtes Asset neu erzeugen
npm run assets -- --pixel           # nur aus vorhandenen Rohbildern neu herunterrechnen (ohne API)
```

Standard-Qualität ist `low`, weil die Bilder ohnehin auf Pixelgröße verkleinert werden.
Mehrere Grafiken möglichst als Sammelblatt (`split`) anlegen: ein Bild statt vieler.

Braucht `OPENAI_API_KEY` als Umgebungsvariable und Netzwerkzugriff auf `api.openai.com`.
