# Kiezkönig

Ein Späti-Spiel fürs Handy mit simpler Pixel-Grafik.

**Spielen:** https://zuuuuz.github.io/claude_game/ (auf dem iPhone in Safari öffnen → Teilen → „Zum Home-Bildschirm“)

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
- `src/game/state.ts`: Spielstand mit Speichern
- `src/game/config.ts`: Stellschrauben (Tempo, Geduld, Beliebtheit, Kundenandrang)
- `src/game/customers.ts`: Kundentypen, Sprüche und Fragen; neue Sprüche hier eintragen
- `src/game/regulars.ts`: Stammkunden mit ihren Geschichten über mehrere Tage
- `src/game/products.ts`: Waren mit Preisen und welche Kunden sie mögen
- `src/game/upgrades.ts`: Tech-Tree (Kosten, Voraussetzungen, Wirkungen)
- `src/game/goals.ts`: Tagesziele
- `src/game/layout.ts`: wo Möbel stehen und wo Kunden hinlaufen
- `src/game/sim.ts`: Uhr, Kunden, Schlange, Kassieren, Aushilfe
- `src/ui/icons.ts`: Pixel-Icons als Platzhalter
- `src/ui/style.css`: Aussehen
- `drafts/`: geparkte Entwürfe, noch nicht eingebaut
- `capacitor.config.ts`: Grundlage für die spätere Android- und iOS-App (Bundle-ID `de.kiezkoenig.app`)
- `public/`: Web-App-Dateien (Manifest, Offline-Speicher, Icons; Icons mit `npm run icons`)
- `.github/workflows/pages.yml`: veröffentlicht jede Version automatisch auf GitHub Pages

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
