# ACIDRATCHET Suite

Browser-Acid-Synth (TB-303-Stil) mit Pattern Studio, FX Lab und Songbook. Statische Suite mit gemeinsamer Voice-Engine, läuft auf GitHub Pages.

| Datei | Zweck |
|---|---|
| `index.html` + `acidratchet-voice.js` | ACIDRATCHET v7.5 Devil-Fish-Kandidat, gemeinsame Voice-Engine |
| `ACIDRATCHET_TD3MO_TRANSLATOR.html` | Pattern Studio V3.5: Banks, Slots, Chain Builder |
| `ACIDRATCHET_SONGBOOK.html` | Bibliothek für Chains |
| `ACIDRATCHET_FX_LAB.html` + `acidratchet-fx-core.js` | FX-Presets (ARFX-Bridge) |
| `manifest.webmanifest`, `*.png` | Home-Screen-App |

**Deploy:** alle Dateien flach ins Repo-Root, Pages auf Branch `main` / Root.

**Wichtig:** Dateinamen exakt so lassen, keine Leerzeichen. Die Tools verlinken sich über diese Namen.

**Daten sichern:** BACKUP-Knopf in `index.html`. Die Home-Screen-App hat auf iOS einen eigenen Speicher, dort einmal RESTORE ausführen.

**v7.5:** Durchgehende Slide-Hüllkurven, CV-Portamento, korrigierte Accent-Skalierung,
umschaltbarer Body-Pfad, separater Filter Drive, Muffler I/II und Audio Filter FM sowie
vollständiges 2x-Oversampling mit FIR-Rückrechnung. [Änderungen, Prüfungen und Abnahme](docs/devilfish-v75-review.md).

**Prüfen:** `npm test` (DSP, ohne Installation). Für die Browserprüfung zusätzlich
`npm ci`, `npx playwright install chromium` und `npm run test:browser`.
