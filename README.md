# Frontline

Ein casual Frontkriegs-Spiel fürs Handy (Arbeitstitel). Zwei Fraktionen kämpfen auf einer
gemeinsamen Hex-Karte, und jede Aktion verschiebt die Frontlinie. Inspiriert von Foxhole und
Broken Arrow, aber in kurzen Sessions spielbar.

## Starten

Keine Installation nötig: **`index.html` im Browser öffnen**, am PC oder am Handy.

Alternativ als lokaler Server (zum Testen auf dem Handy im selben WLAN):

```bash
python3 -m http.server 8000
# dann im Browser: http://<deine-ip>:8000
```

## So wird gespielt

1. Fraktion wählen: Nordbund oder Südpakt
2. Einen Sektor an der gelben Frontlinie antippen
3. **Angreifen** (feindlicher Sektor) oder **Verstärken** (eigener Frontsektor), das kostet ⚡
4. Bots kämpfen auf beiden Seiten mit, die Front lebt
5. Wer das feindliche Hauptquartier (★) einnimmt, gewinnt den Krieg

Wie es weitergeht, steht in der [ROADMAP.md](ROADMAP.md).
