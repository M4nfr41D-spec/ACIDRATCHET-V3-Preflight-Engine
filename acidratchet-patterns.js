/* Photo transcription supplied by Manfred: MOGUAI vs. Kai Tracid — DT64,
   sheet footer "Kai Tracid 2019". Only the three filled patterns are included.
   The sheet does not specify base octave, BPM, sound settings or drums.
   Base octave is an explicit application choice: E2 (MIDI 40); U = +12.
   A = accent; S = outgoing slide, including step 16 -> step 1 on loop.
   Zero drum masks mean bassline-only playback, not a drum transcription. */
(function (root) {
  'use strict';
  const E = 40, B = 47, C = 36, G = 43;
  function part(number, notes, accents, slides, hint) {
    return {
      role: 'PATTERN ' + number, hint, len: 16,
      steps: notes.map((note, i) => ({
        on: 1, note, accent: accents.includes(i + 1) ? 1 : 0,
        slide: slides.includes(i + 1) ? 1 : 0, rat: 1
      })),
      drums: {k: 0, s: 0, h: 0, o: 0}
    };
  }
  root.ARPatternPacks = [{
    id: 'dt64', name: 'DT64', style: 'MOGUAI vs. Kai Tracid · Fototranskription',
    bpm: null, kitName: 'Bassline ohne Drums',
    source: 'Vorlage: Kai Tracid 2019 · Grundoktave E2 angenommen · Tempo und Klang frei · Pattern 4/5 leer',
    parts: [
      part(1, [E,E,E,E, E,E,B,E, E,E,E,E, E,E,E,B+12], [16], [16],
        'Step 16: B +1 Oktave, Accent + Slide → Step 1'),
      part(2, [E,E,E,E, E,E,B,E, E,C+12,E,E, B+12,E,G,E], [10,13], [10,13],
        'Step 10: C +1 Oktave · Step 13: B +1 Oktave · beide Accent + Slide'),
      part(3, [E,E,E,E, E,E,E,E, C,E,E,B, E,E,G,E], [3,6,9,12,15], [],
        'Accent auf Step 3, 6, 9, 12, 15 · keine Slides / Oktavsprünge')
    ]
  }];
})(typeof window === 'undefined' ? globalThis : window);
