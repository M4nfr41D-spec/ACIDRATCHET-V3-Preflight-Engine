# ACIDRATCHET Suite

Browser-Acid-Synth (TB-303-Stil) mit Pattern Studio, FX Lab und Songbook. Single-File-HTML, läuft auf GitHub Pages.

| Datei | Zweck |
|---|---|
| `index.html` | ACIDRATCHET v6.5 ZDF+FX+INST, spielt ab |
| `ACIDRATCHET_TD3MO_TRANSLATOR.html` | Pattern Studio V3.5: Banks, Slots, Chain Builder |
| `ACIDRATCHET_SONGBOOK.html` | Bibliothek für Chains |
| `ACIDRATCHET_FX_LAB.html` + `acidratchet-fx-core.js` | FX-Presets (ARFX-Bridge) |
| `manifest.webmanifest`, `*.png` | Home-Screen-App |

**Deploy:** alle Dateien flach ins Repo-Root, Pages auf Branch `main` / Root.

**Wichtig:** Dateinamen exakt so lassen, keine Leerzeichen. Die Tools verlinken sich über diese Namen.

**Daten sichern:** BACKUP-Knopf in `index.html`. Die Home-Screen-App hat auf iOS einen eigenen Speicher, dort einmal RESTORE ausführen.
