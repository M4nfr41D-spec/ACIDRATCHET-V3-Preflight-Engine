# v7.6 — Translator knobs and shared tone control

Baseline/recovery: `03144174a8f44a9cfb163b3b320df2e5109ebf6e` (includes DT64).

## Behavior

- Synth and Translator use `acidratchet-controls.js` for normalized tone values,
  response curves and three tone-only starting presets. The v7.5 voice DSP itself
  is unchanged. Both hosts use its complete oversampled signal path.
- **Direct** retains the raw 0–100 parameter scale. **Sweetspot** expands the
  upper resonance range and the moderate filter-drive/FM range with monotone,
  continuous-slope curves. Full endpoints remain accessible. Drive is 1× at 20,
  5× at 80 and 66.6× at 100 in Sweetspot mode; the display shows the actual gain.
  Audio-FM uses a squared response (50 gives 25% modulation amount).
- **303 LIQUID**, **DEVIL BITE** and **FM EDGE** set a complete tone without
  replacing notes or drums. They are starting points for listening, not measured
  recreations of particular hardware patches.
- Translator sound and FX sliders are rotary controls. Drag vertically, enable
  **FINE** or hold Shift/Alt for tenfold finer drag. Arrow keys, Page Up/Down,
  Home/End and double-click reset are supported. No playback starts by dragging.
- Translator now exposes Filter Drive, Audio Filter FM, Muffler and Body path,
  plus Tone, Body, Squelch, Slide, Gate and Release. Waveform changes are saved.
- Parameter evaluation/DOM reads in the preview are cached per audio quantum.
  The old preview-only cutoff/resonance/envelope remapping no longer sits in
  between the visible controls and the shared voice. Legacy patterns retain
  those filter laws when read; editing saves a canonical `controlVersion: 1`
  vector. Original library entries are not rewritten merely by viewing them.
- A preview gate now sends Note-Off to the shared voice; previously only rests
  did so. Restart/stop clears the shared gate and buffered preview state.
- A transferred bank carries its tone. Synth loading applies it to voice A,
  irrespective of which voice has UI focus. Bank edits/switches retain that tone;
  importing the bank back into the Translator reads the current tone vector.
  The existing per-voice A/B settings and DT64 pattern pack are retained.

The two apps still have different master/FX/drum paths. Equal voice parameter
vectors establish equal core settings, not identical final mixed recordings.
Preview-only live transposition, master FX and hardware MIDI are separate paths.

## Verification

- `npm test`: 12 existing DSP regressions plus six control tests (monotonicity,
  endpoints, unity drive, fine FM, legacy filter laws, full tone round-trip,
  continuous slopes, and finite/audible preset renders).
- `npm run test:translator`: actual rotary dragging and fine mode, keyboard
  control, preset application without note changes, live audio parameters and
  gate-offs, reload persistence, complete parameter forwarding to the synth,
  bank switch/reload, reverse bank import, FX repaint and mobile bounds.
- `npm run test:browser`: Worklet and forced ScriptProcessor audio paths,
  separate voice routing, persistence and response-mode restoration with a
  saved voice-B character.
- `npm run test:patterns`: DT64's 48 notes, accents/slides, isolated loading,
  bank 128 and multi-bank handoff regression.
- WordPress build includes the shared controls file and cache v11. Tests also
  run against its minified controls/voice/app using `CONTROLS_PATH`, `VOICE_PATH`
  and `APP_ROOT`. Desktop and 390-pixel screenshots are visually reviewed.

Subjective sweetspot placement and iOS Safari listening remain user feedback
items. The response switch keeps the direct parameter range available.

Verification record, 2026-10-24: all 18 source/minified unit tests passed; source
and minified translator round-trip and main Worklet/fallback checks passed; DT64
regression passed; WordPress build completed. Mobile/desktop screenshots reviewed.
