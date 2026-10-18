=== ACIDRATCHET ===
Contributors: manfredfoissner
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: Proprietär – alle Rechte vorbehalten

Die ACIDRATCHET Acid-Synth-Suite auf der eigenen WordPress-Seite.

== Einbinden ==

Elementor: Widget „ACIDRATCHET“ auf die Seite ziehen. Einstellungen: Werkzeug, Optik, Höhe, Vollbild-Link.

Ohne Elementor (Block-Editor): Block „Shortcode“ einfügen:

[acidratchet]
[acidratchet tool="translator"]
[acidratchet tool="synth" skin="classic" height="1400"]

tool:       synth | translator | fxlab | songbook   (Standard: synth)
skin:       hw | classic                           (nur Synth, Standard: hw)
height:     auto | Pixel                           (Standard: auto, wächst mit dem Inhalt)
fullscreen: 1 | 0                                  (Link „Im Vollbild öffnen“, Standard: 1)

== Hinweise ==

* Die Suite läuft unter der eigenen Domain. Patterns und Einstellungen gehören dieser Seite
  (Browser-Speicher). Umzug von einer anderen Adresse: dort BACKUP, hier RESTORE.
* MIDI zur TD-3 / RD-6 funktioniert in Chrome und Edge am Computer, nicht in Safari/iOS.
* Updates: neue Plugin-ZIP hochladen und „Ersetzen“ wählen. Gespeicherte Patterns bleiben erhalten.
