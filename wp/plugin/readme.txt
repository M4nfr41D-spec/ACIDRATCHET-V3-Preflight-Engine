=== ACIDRATCHET ===
Contributors: manfredfoissner
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.1.0
License: Proprietär – alle Rechte vorbehalten

Die ACIDRATCHET Acid-Synth-Suite auf der eigenen WordPress-Seite.

== Einbinden ==

EIN Widget enthält die ganze Suite mit Menüleiste (Synth · Pattern Studio · FX Lab · Songbook).
Sprünge zwischen den Werkzeugen (z. B. „Synth öffnen“ im Pattern Studio) schalten innerhalb des
Widgets um, statt neue Fenster zu öffnen. Der Synth spielt beim Umschalten weiter.

Elementor: Widget „ACIDRATCHET“ auf die Seite ziehen. Einstellungen: Start-Werkzeug, Optik,
Menüleiste, Höhe, Vollbild-Link. Ein Widget pro Seite genügt.

Ohne Elementor (Block-Editor): Block „Shortcode“:

[acidratchet]
[acidratchet tool="translator"]
[acidratchet tool="synth" skin="classic" menu="0" height="1400"]

tool:       synth | translator | fxlab | songbook   (Start-Werkzeug, Standard: synth)
skin:       hw | classic                           (Optik des Synths, Standard: hw)
menu:       1 | 0                                  (Menüleiste, Standard: 1)
height:     auto | Pixel                           (Standard: auto, wächst mit dem Inhalt)
fullscreen: 1 | 0                                  (Link „Vollbild“, Standard: 1)

== Hinweise ==

* Die Suite läuft unter der eigenen Domain. Patterns und Einstellungen gehören dieser Seite
  (Browser-Speicher). Umzug von einer anderen Adresse: dort BACKUP, hier RESTORE.
* MIDI zur TD-3 / RD-6 funktioniert in Chrome und Edge am Computer, nicht in Safari/iOS.
* Updates: neue Plugin-ZIP hochladen und „Ersetzen“ wählen. Gespeicherte Patterns bleiben erhalten.
