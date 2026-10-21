# ACIDRATCHET 7.5 — Devil Fish candidate

Status: implemented candidate for Manfred's listening review; not an accepted hardware match.
Baseline: v7.4, commit `b70e1a6c9a273f92b017d231a9b32e084df9e79f`.

## Changes

1. A tied note keeps the existing gate and envelopes; its new pitch is approached in
   semitone/CV space before conversion to oscillator frequency. Rests and panic clear
   the slide latch. The previous implementation retriggered both envelopes and slewed Hz.
2. Accent amount scales added capacitor charge and VCA boost to zero. Accented-note
   filter decay remains independent. The existing accumulating sweep is retained.
3. **Body-Pfad: 303** removes the parallel low-passed oscillator blend. **Extended**
   retains that blend. This switch affects Body only; it does not restrict the other
   creative oscillator modes, Sub, PWM or Detune, and is not a complete hardware preset.
4. **Filter Drive** controls oscillator level into the filter independently of output
   Distortion. Its exponential range is 0–66.6 times the internal nominal input level;
   about 16.45 on the UI scale gives unity. The UI shows the multiplier. **Muffler I/II**
   are functional soft-clipping approximations that retain a low-band component, with
   smoothed switching. **Audio Filter FM** uses AC-coupled post-VCA/Muffler audio before
   output tone/level. A causal internal-sample delay and bounded modulation prevent
   unbounded exponentiation; this is not a component-level circuit solution.
5. Oscillators, envelopes, filter, VCA, Muffler, output distortion and final saturation
   now run at the internal rate. A normalized Blackman-windowed sinc FIR low-passes
   the output before decimation. The app and Pattern Studio use 2x; the DSP API also
   supports 1x for comparison and 4x for experiments. FIR group delay is 24 output
   frames at 2x/4x (0.5 ms at 48 kHz). Event timestamps remain in output-rate frames.

New tone settings are saved per voice under `ar_devilfish_v75` and included by the
existing suite backup. Old patterns, banks, chains and backup formats are retained.
New tone controls stay independent when switching existing sound presets. INIT returns
them to 303 Body path, nominal Filter Drive, Muffler off and Filter FM zero.
The versioned shared voice URL and service-worker cache v9 prevent mixing the old
voice with the new app. The Pattern Studio continues to use the same source.

## Verification

Execution record (2026-10-21): all 12 DSP tests passed against source and minified
WordPress DSP; both browser audio paths passed against source and WordPress app.
Desktop and 390 px mobile screenshots were visually inspected. WordPress build
completed. Device-level iOS listening and hardware A/B remain open.

- `npm test`: tied-note continuity, CV-slide symmetry, rest/panic recovery, accent zero,
  accumulating accents, reference/extended Body, independent distortion/drive/FM/Muffler,
  zero carrier drive, rate-independent envelope/slide timing and FIR latency.
- DSP stress sweep: 45 combinations (44.1/48/96 kHz × 1/2/4x × five waveforms), maximum
  normalized controls, a slide and note-off: finite bounded output, zero filter resets.
- Targeted spectral regression: folded harmonic energy of a driven 3011 Hz tone at
  48 kHz must be at least 20 dB lower at 2x than at 1x. This narrow case does **not**
  establish a general aliasing/SNR figure for every waveform, sync setting or FM patch.
- `npm run test:browser`: Chromium audio output over AudioWorklet and forced
  ScriptProcessor fallback, per-voice routing when starting with B focused,
  persistence after reload and new controls fitting a 390 px viewport.
- The same DSP invariants and browser smoke test can run against the minified
  WordPress build using `VOICE_PATH` and `APP_ROOT` respectively.

Browser setup: `npm ci`, then `npx playwright install chromium`. For an existing
browser use `CHROMIUM_PATH=/absolute/path/to/chromium npm run test:browser`.
Tests require Node 22+; test dependencies are development-only.

## Listening acceptance and recovery

Compare with v7.4 using the same pattern and matched perceived level: first slides
with no accents, then repeated accents, then Drive, Muffler and FM one at a time.
Use 303 Body path with Sub, Detune and LFO depth at zero for the initial comparison.
The master high-pass, compressor and Glue chain are retained; FX bypass alone does
not remove them. A hardware comparison must account for these stages separately.

Desktop Chromium success does not establish iOS Safari performance or an audible
hardware match. Manfred retains listening acceptance and baseline promotion.
Keep the candidate branch separate from `main` until accepted. Recovery is the baseline
commit above; restoring all app files together also restores its shared DSP and cache.

## Hardware references

- Robin Whittle, [Devil Fish user manual](https://www.firstpr.com.au/rwi/dfish/Devil-Fish-Manual.pdf),
  especially slide/CV operation, Overdrive, Muffler and Audio Filter FM.
- Robin Whittle, [TB-303 accent characteristics](https://www.firstpr.com.au/rwi/dfish/303-unique.html).

These documents guide functional behavior. The oscillator, ladder and Muffler have
not been fitted to measurements from a specific TB-303/Devil Fish unit.
