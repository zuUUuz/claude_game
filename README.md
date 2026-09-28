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
- `src/ui/style.css`: Aussehen
- `drafts/`: geparkte Entwürfe, noch nicht eingebaut
- `capacitor.config.ts`: Grundlage für die spätere Android- und iOS-App

Der Plan steht in der [ROADMAP.md](ROADMAP.md).

## Grafik generieren

Alle Pixel-Assets werden per KI erzeugt und automatisch auf ein echtes Pixelraster heruntergerechnet.
Die Liste steht in `scripts/assets.config.mjs`.

```bash
npm run assets                 # fehlende Assets erzeugen
npm run assets -- char-raver   # ein bestimmtes Asset neu erzeugen
```

Braucht `OPENAI_API_KEY` als Umgebungsvariable und Netzwerkzugriff auf `api.openai.com`.
