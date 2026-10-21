# DT64 photo pattern pack

Candidate based on `d582cbf` (v7.5). Source: Manfred's supplied photograph
`IMG_0991.jpeg`, headed **MOGUAI vs. Kai Tracid – "DT64"**, footer **Kai Tracid 2019**.
Patterns 4 and 5 are empty and are excluded. This is a transcription of that sheet,
not a claim of independently verified correspondence to the released recording.

## Transcription

Steps are numbered 1–16. Every step is a played sixteenth note. `U` raises the
written note by one octave. `A/S` sets both accent and the outgoing slide.

| Pattern | Notes (four groups of four) | Up | Accent | Slide |
| --- | --- | --- | --- | --- |
| 1 | E E E E / E E B E / E E E E / E E E B | 16 | 16 | 16 |
| 2 | E E E E / E E B E / E C E E / B E G E | 10, 13 | 10, 13 | 10, 13 |
| 3 | E E E E / E E E E / C E E B / E E G E | none | 3, 6, 9, 12, 15 | none |

The photo does not specify the base octave, BPM, sound controls or drums.
The implementation explicitly assumes octave 2: E2=MIDI 40, C2=36, G2=43,
B2=47, C3=48, B3=59. This assumption is shown in both user interfaces.
The slide at pattern 1 step 16 connects to step 1 when looping.

## Use

- Synth: three **DT64 PATTERN** buttons beneath Presets. They replace only the
  active A pattern, leave tempo, sound, B voice and drums intact, and wait for
  the existing transport. They do not automatically write the pattern to a bank.
- Songbook: **DT64** imports exactly three consecutive banks and the 1→2→3 chain.
  These are bassline-only banks with zero drum masks. No BPM is assigned.
  The target bank defaults to 97; writing occurs only when an import button is used.
  A start above 126 is clamped to 126; existing five-part sets still clamp to 124.
- The shared data file is included in the offline cache and WordPress build.

## Verification

- `npm test`: 12 voice/DSP tests passed.
- `npm run test:browser`: Worklet and fallback audio, routing, persistence and
  mobile controls passed.
- `npm run test:patterns`: all 48 note values and exact accent/slide positions,
  no sound/tempo/drum/B-voice changes on synth load, Songbook rendering,
  three-bank import/chain, preservation of unrelated banks, bank 128 boundary,
  actual synth handoff and existing five-part import passed.

The image transcription and base octave remain subject to Manfred's listening
review. No DSP or voice parameter behavior was changed.
Rollback: revert the pattern-pack commit; baseline is `d582cbf`.
