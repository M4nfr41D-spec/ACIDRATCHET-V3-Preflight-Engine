/*
 * ACIDRATCHET FX CORE v0.1.0
 * Shared DSP + preset contract for ACIDRATCHET-MF79 and ACIDRATCHET FX LAB.
 * Copyright (c) 2026 Manfred Foissner. All rights reserved.
 */
(function (global) {
  'use strict';

  const VERSION = '0.1.1';
  const SCHEMA = 'acidratchet.fx-preset';
  const PRESET_KEY = 'acidratchet_fx_presets_v1';
  const ACTIVE_KEY = 'acidratchet_fx_active_v1';
  const HANDOFF_KEY = 'acidratchet_fx_handoff_v1';
  const SAMPLE_SLOT_KEY = 'acidratchet_fx_sample_slots_v1';
  const DB_NAME = 'acidratchet_fx_samples_v1';
  const DB_STORE = 'samples';

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v)));
  const uid = (prefix) => (prefix || 'arfx') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  const copy = (value) => JSON.parse(JSON.stringify(value));

  function merge(base, extra) {
    const out = copy(base);
    if (!extra || typeof extra !== 'object') return out;
    Object.keys(extra).forEach((key) => {
      if (extra[key] && typeof extra[key] === 'object' && !Array.isArray(extra[key]) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
        out[key] = merge(out[key], extra[key]);
      } else {
        out[key] = extra[key];
      }
    });
    return out;
  }

  const ENGINE_DEFAULTS = {
    echo: {
      time: '3/16', feedback: 0.54, tone: 3400, drive: 0.18, lowCut: 120, mix: 0.34
    },
    space: {
      size: 0.62, decay: 2.8, damping: 5200, preDelay: 0.035, lowCut: 160, mix: 0.30
    },
    corrosion: {
      drive: 0.52, fold: 0.22, bits: 11, asymmetry: 0.08, lowCut: 70, highCut: 7200, mix: 0.30
    },
    pulse: {
      rate: '1/16', depth: 0.88, floor: 0.05, shape: 'square', tone: 7600, mix: 0.62
    }
  };

  const DEFAULT_ROUTING = { voiceA: 0.34, voiceB: 0.18, drums: 0.16, samples: 0.58 };
  const DEFAULT_MACROS = { character: 0.50, motion: 0.45, depth: 0.55, mix: 0.50 };

  const DEFAULT_PRESETS = [
    {
      id: 'fx_echo_black_vault_01', name: 'BLACK VAULT ECHO', engine: 'echo',
      parameters: { time: '3/16', feedback: 0.58, tone: 3100, drive: 0.24, lowCut: 150, mix: 0.36 },
      macros: { character: 0.64, motion: 0.52, depth: 0.60, mix: 0.52 },
      routing: { voiceA: 0.42, voiceB: 0.24, drums: 0.18, samples: 0.68 },
      tags: ['acid', 'dark', 'tempo']
    },
    {
      id: 'fx_echo_dub_corrosion_01', name: 'DUB CORROSION', engine: 'echo',
      parameters: { time: '1/8', feedback: 0.68, tone: 2250, drive: 0.40, lowCut: 210, mix: 0.32 },
      macros: { character: 0.78, motion: 0.38, depth: 0.72, mix: 0.48 },
      routing: { voiceA: 0.30, voiceB: 0.20, drums: 0.28, samples: 0.74 },
      tags: ['dub', 'feedback', 'dirty']
    },
    {
      id: 'fx_space_warehouse_01', name: 'WAREHOUSE SPACE', engine: 'space',
      parameters: { size: 0.78, decay: 4.2, damping: 4300, preDelay: 0.055, lowCut: 190, mix: 0.34 },
      macros: { character: 0.55, motion: 0.44, depth: 0.70, mix: 0.52 },
      routing: { voiceA: 0.22, voiceB: 0.32, drums: 0.20, samples: 0.78 },
      tags: ['warehouse', 'space', 'industrial']
    },
    {
      id: 'fx_space_metal_chamber_01', name: 'METAL CHAMBER', engine: 'space',
      parameters: { size: 0.46, decay: 2.1, damping: 8600, preDelay: 0.018, lowCut: 320, mix: 0.28 },
      macros: { character: 0.82, motion: 0.30, depth: 0.46, mix: 0.42 },
      routing: { voiceA: 0.12, voiceB: 0.18, drums: 0.42, samples: 0.70 },
      tags: ['metallic', 'short', 'percussion']
    },
    {
      id: 'fx_corrosion_acid_01', name: 'ACID CORROSION', engine: 'corrosion',
      parameters: { drive: 0.64, fold: 0.34, bits: 10, asymmetry: 0.12, lowCut: 85, highCut: 6100, mix: 0.34 },
      macros: { character: 0.70, motion: 0.42, depth: 0.66, mix: 0.50 },
      routing: { voiceA: 0.38, voiceB: 0.30, drums: 0.10, samples: 0.54 },
      tags: ['drive', 'fold', 'acid']
    },
    {
      id: 'fx_corrosion_bit_melt_01', name: 'BIT MELT', engine: 'corrosion',
      parameters: { drive: 0.42, fold: 0.18, bits: 7, asymmetry: 0.05, lowCut: 140, highCut: 4700, mix: 0.30 },
      macros: { character: 0.88, motion: 0.60, depth: 0.58, mix: 0.46 },
      routing: { voiceA: 0.20, voiceB: 0.24, drums: 0.24, samples: 0.72 },
      tags: ['bit', 'digital', 'melt']
    },
    {
      id: 'fx_pulse_gate_16_01', name: 'PULSE GATE 16', engine: 'pulse',
      parameters: { rate: '1/16', depth: 0.92, floor: 0.02, shape: 'square', tone: 7600, mix: 0.78 },
      macros: { character: 0.50, motion: 0.62, depth: 0.82, mix: 0.72 },
      routing: { voiceA: 0.70, voiceB: 0.54, drums: 0.00, samples: 0.72 },
      tags: ['gate', 'pulse', '16th']
    },
    {
      id: 'fx_pulse_ratchet_cut_01', name: 'RATCHET CUT', engine: 'pulse',
      parameters: { rate: '1/32', depth: 0.98, floor: 0.00, shape: 'sawtooth', tone: 6200, mix: 0.86 },
      macros: { character: 0.68, motion: 0.90, depth: 0.90, mix: 0.78 },
      routing: { voiceA: 0.76, voiceB: 0.62, drums: 0.18, samples: 0.78 },
      tags: ['ratchet', 'cut', 'performance']
    }
  ].map((p) => normalizePreset(p));

  function normalizePreset(raw) {
    const src = raw || {};
    const engine = Object.prototype.hasOwnProperty.call(ENGINE_DEFAULTS, src.engine) ? src.engine : 'echo';
    return {
      schema: SCHEMA,
      version: 1,
      id: String(src.id || uid('fx')),
      name: String(src.name || 'UNTITLED FX').slice(0, 80),
      engine,
      parameters: merge(ENGINE_DEFAULTS[engine], src.parameters || {}),
      macros: merge(DEFAULT_MACROS, src.macros || {}),
      routing: merge(DEFAULT_ROUTING, src.routing || {}),
      tags: Array.isArray(src.tags) ? src.tags.slice(0, 12) : [],
      updatedAt: src.updatedAt || new Date().toISOString()
    };
  }

  function loadLibrary() {
    let saved = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(PRESET_KEY) || '[]');
      if (Array.isArray(parsed)) saved = parsed.map(normalizePreset);
    } catch (_) {}
    const byId = new Map();
    DEFAULT_PRESETS.forEach((p) => byId.set(p.id, copy(p)));
    saved.forEach((p) => byId.set(p.id, p));
    return Array.from(byId.values());
  }

  function saveLibrary(list) {
    const normalized = (Array.isArray(list) ? list : []).map(normalizePreset);
    localStorage.setItem(PRESET_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function upsertPreset(preset) {
    const p = normalizePreset(preset);
    const list = loadLibrary();
    const idx = list.findIndex((x) => x.id === p.id);
    if (idx >= 0) list[idx] = p; else list.unshift(p);
    saveLibrary(list);
    return p;
  }

  function removePreset(id) {
    const list = loadLibrary().filter((p) => p.id !== id || DEFAULT_PRESETS.some((d) => d.id === id));
    saveLibrary(list);
    return list;
  }

  function setActivePreset(preset) {
    const p = normalizePreset(preset);
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(p));
    return p;
  }

  function getActivePreset() {
    try {
      const raw = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
      if (raw) return normalizePreset(raw);
    } catch (_) {}
    return copy(DEFAULT_PRESETS[0]);
  }

  function sendHandoff(preset) {
    const p = setActivePreset(preset);
    localStorage.setItem(HANDOFF_KEY, JSON.stringify({ preset: p, sentAt: Date.now() }));
    return p;
  }

  function consumeHandoff() {
    try {
      const raw = JSON.parse(localStorage.getItem(HANDOFF_KEY) || 'null');
      if (!raw || !raw.preset) return null;
      localStorage.removeItem(HANDOFF_KEY);
      return normalizePreset(raw.preset);
    } catch (_) {
      return null;
    }
  }

  function divisionSeconds(bpm, division) {
    const beat = 60 / clamp(bpm || 132, 40, 260);
    const map = {
      '1/1': beat * 4,
      '1/2': beat * 2,
      '1/4': beat,
      '1/8': beat / 2,
      '3/16': beat * 0.75,
      '1/16': beat / 4,
      '1/32': beat / 8,
      '1/8T': beat / 3,
      '1/16T': beat / 6
    };
    return map[division] || beat / 2;
  }

  /* Der alte Folder y = |((z+1) % 4) - 2| - 1 ist auf [-1,1] identisch zu -z:
     er invertierte das Signal, statt es zu falten. Zusammen mit `asymmetry`
     ergab das einen konstanten Gleichspannungsversatz (gemessen bis -0.31),
     der als Brumm auf dem FX-Bus landete. Jetzt: echtes Dreieck (tri(z) = z
     fuer |z| <= 1, also keine Inversion), Kurve DC-zentriert und auf Spitzen-
     wert normiert. Bitcrush erst danach, auf dem zentrierten Signal. */
  function triFold(z) {
    let t = (z + 1) % 4;
    if (t < 0) t += 4;
    return 1 - Math.abs(t - 2);
  }

  function makeDriveCurve(amount, fold, bits, asymmetry) {
    const n = 4096;
    const curve = new Float32Array(n);
    const drive = 1 + clamp(amount || 0, 0, 1) * 12;
    const fld = clamp(fold || 0, 0, 1);
    const bitCount = Math.max(3, Math.min(16, Math.round(bits || 16)));
    const levels = Math.pow(2, bitCount - 1);
    const asym = clamp(asymmetry || 0, -0.45, 0.45);
    const shape = (x0) => {
      const x = x0 + asym * (x0 >= 0 ? 1 : -0.35);
      let y = Math.tanh(x * drive) / Math.tanh(drive);
      if (fld > 0.001) {
        const z = y * (1 + fld * 3.5);
        y = triFold(z) * (0.58 + fld * 0.24) + Math.tanh(z) * (0.42 - fld * 0.20);
      }
      return y;
    };
    const dc = shape(0);
    let peak = 1e-9;
    for (let i = 0; i < n; i++) {
      const y = shape((i / (n - 1)) * 2 - 1) - dc;
      curve[i] = y;
      const a = Math.abs(y); if (a > peak) peak = a;
    }
    const norm = peak > 1 ? 1 / peak : 1 / Math.max(0.35, peak);
    for (let i = 0; i < n; i++) {
      curve[i] = clamp(Math.round(curve[i] * norm * levels) / levels, -1, 1);
    }
    return curve;
  }

  /* Diese Kurve sitzt IM Rueckkopplungsweg des Echos, also muss ihre Steigung
     bei kleinen Pegeln <= 1 bleiben — sonst schwingt die Delayschleife auf.
     makeDriveCurve normiert auf tanh(x*d)/tanh(d): Spitzenwert 1, aber die
     Steigung bei Null wird d/tanh(d), also bis zu 12. Mal Feedback 0.92 ergab
     das Schleifenverstaerkung weit ueber 1 — der Hall lief weg und saettigte
     in ein Dauerrauschen. Der Fold-Zweig drehte zusaetzlich die Phase.
     tanh(x*d)/d hat Steigung 1 bei Null, bleibt monoton und komprimiert nach
     oben: bei hohem Drive werden die Wiederholungen dunkler, nicht lauter. */
  function makeFeedbackCurve(amount) {
    const n = 4096;
    const curve = new Float32Array(n);
    const drive = 1 + clamp(amount, 0, 1) * 3;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * drive) / drive;
    }
    return curve;
  }

  function makeImpulse(ctx, size, decay, damping) {
    const duration = clamp(decay || 2.5, 0.25, 8.0);
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const damp = clamp(damping || 5000, 800, 18000);
    const smooth = Math.exp(-2 * Math.PI * damp / ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, 1.2 + (1 - clamp(size, 0, 1)) * 3.2);
        const noise = Math.random() * 2 - 1;
        lp = noise * (1 - smooth) + lp * smooth;
        const early = i < ctx.sampleRate * 0.09 ? (Math.random() < 0.0018 ? (Math.random() * 2 - 1) * 0.85 : 0) : 0;
        data[i] = (lp * 0.72 + early) * env * (ch ? 0.96 : 1.0);
      }
    }
    return buffer;
  }

  function effectiveParameters(preset) {
    const p = normalizePreset(preset);
    const m = p.macros;
    const base = copy(p.parameters);
    if (p.engine === 'echo') {
      const divisions = ['1/16', '1/8T', '1/8', '3/16', '1/4'];
      const baseIndex = Math.max(0, divisions.indexOf(base.time));
      const shift = Math.round((m.motion - 0.5) * 2.4);
      base.time = divisions[Math.max(0, Math.min(divisions.length - 1, baseIndex + shift))];
      base.tone = clamp(base.tone * (0.65 + m.character * 0.70), 900, 12000);
      base.drive = clamp(base.drive + (m.character - 0.5) * 0.42, 0, 0.92);
      base.feedback = clamp(base.feedback + (m.depth - 0.5) * 0.34, 0, 0.85);
      base.mix = clamp(base.mix + (m.mix - 0.5) * 0.52, 0, 0.95);
    } else if (p.engine === 'space') {
      base.damping = clamp(base.damping * (0.68 + m.character * 0.64), 1000, 16000);
      base.preDelay = clamp(base.preDelay + (m.motion - 0.5) * 0.11, 0, 0.18);
      base.decay = clamp(base.decay * (0.55 + m.depth * 0.90), 0.25, 8);
      base.mix = clamp(base.mix + (m.mix - 0.5) * 0.52, 0, 0.95);
    } else if (p.engine === 'corrosion') {
      base.bits = clamp(Math.round(base.bits - (m.character - 0.5) * 8), 3, 16);
      base.asymmetry = clamp(base.asymmetry + (m.character - 0.5) * 0.28, -0.35, 0.35);
      base.highCut = clamp(base.highCut * (1.26 - m.motion * 0.52), 1200, 16000);
      base.drive = clamp(base.drive + (m.depth - 0.5) * 0.52, 0, 1);
      base.fold = clamp(base.fold + (m.depth - 0.5) * 0.46, 0, 1);
      base.mix = clamp(base.mix + (m.mix - 0.5) * 0.52, 0, 0.95);
    } else if (p.engine === 'pulse') {
      const divisions = ['1/8', '1/16', '1/16T', '1/32'];
      const baseIndex = Math.max(0, divisions.indexOf(base.rate));
      const shift = Math.round((m.motion - 0.5) * 3.0);
      base.rate = divisions[Math.max(0, Math.min(divisions.length - 1, baseIndex + shift))];
      base.floor = clamp(base.floor - (m.depth - 0.5) * 0.35, 0, 0.8);
      base.depth = clamp(base.depth + (m.depth - 0.5) * 0.45, 0, 1);
      base.tone = clamp(base.tone * (0.68 + m.character * 0.64), 1000, 16000);
      base.mix = clamp(base.mix + (m.mix - 0.5) * 0.45, 0, 1);
    }
    return base;
  }

  function createEcho(ctx) {
    const input = ctx.createGain();
    const delay = ctx.createDelay(4.0);
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass';
    const lowCut = ctx.createBiquadFilter(); lowCut.type = 'highpass'; lowCut.Q.value = 0.5;
    const saturator = ctx.createWaveShaper(); saturator.oversample = '2x';
    const feedback = ctx.createGain();
    const output = ctx.createGain();
    input.connect(delay);
    delay.connect(lowCut); lowCut.connect(tone); tone.connect(saturator);
    saturator.connect(output); saturator.connect(feedback); feedback.connect(delay);
    let bpm = 132;
    let params = copy(ENGINE_DEFAULTS.echo);
    function apply(next) {
      params = merge(params, next || {});
      const now = ctx.currentTime;
      delay.delayTime.setTargetAtTime(divisionSeconds(bpm, params.time), now, 0.025);
      feedback.gain.setTargetAtTime(clamp(params.feedback, 0, 0.85), now, 0.025);
      tone.frequency.setTargetAtTime(clamp(params.tone, 600, 16000), now, 0.02);
      lowCut.frequency.setTargetAtTime(clamp(params.lowCut, 20, 1800), now, 0.02);
      saturator.curve = makeFeedbackCurve(params.drive || 0);
      output.gain.setTargetAtTime(clamp(params.mix, 0, 1), now, 0.02);
    }
    function setBpm(value) { bpm = clamp(value, 40, 260); apply(params); }
    function destroy() { [input, delay, tone, lowCut, saturator, feedback, output].forEach((n) => { try { n.disconnect(); } catch (_) {} }); }
    apply(params);
    return { input, output, apply, setBpm, destroy };
  }

  function createSpace(ctx) {
    const input = ctx.createGain();
    const lowCut = ctx.createBiquadFilter(); lowCut.type = 'highpass'; lowCut.Q.value = 0.5;
    const preDelay = ctx.createDelay(0.5);
    const convolver = ctx.createConvolver();
    const damping = ctx.createBiquadFilter(); damping.type = 'lowpass';
    const output = ctx.createGain();
    input.connect(lowCut); lowCut.connect(preDelay); preDelay.connect(convolver); convolver.connect(damping); damping.connect(output);
    let params = copy(ENGINE_DEFAULTS.space);
    let lastSignature = '';
    function apply(next) {
      params = merge(params, next || {});
      const now = ctx.currentTime;
      lowCut.frequency.setTargetAtTime(clamp(params.lowCut, 20, 2500), now, 0.02);
      preDelay.delayTime.setTargetAtTime(clamp(params.preDelay, 0, 0.35), now, 0.02);
      damping.frequency.setTargetAtTime(clamp(params.damping, 700, 18000), now, 0.02);
      output.gain.setTargetAtTime(clamp(params.mix, 0, 1), now, 0.02);
      const signature = [Number(params.size).toFixed(3), Number(params.decay).toFixed(3), Math.round(params.damping)].join('|');
      if (signature !== lastSignature) {
        convolver.buffer = makeImpulse(ctx, params.size, params.decay, params.damping);
        lastSignature = signature;
      }
    }
    function setBpm() {}
    function destroy() { [input, lowCut, preDelay, convolver, damping, output].forEach((n) => { try { n.disconnect(); } catch (_) {} }); }
    apply(params);
    return { input, output, apply, setBpm, destroy };
  }

  function createCorrosion(ctx) {
    const input = ctx.createGain();
    const lowCut = ctx.createBiquadFilter(); lowCut.type = 'highpass'; lowCut.Q.value = 0.5;
    const preGain = ctx.createGain();
    const shaper = ctx.createWaveShaper(); shaper.oversample = '2x';
    const highCut = ctx.createBiquadFilter(); highCut.type = 'lowpass'; highCut.Q.value = 0.4;
    const output = ctx.createGain();
    const dcBlock = ctx.createBiquadFilter(); dcBlock.type = 'highpass'; dcBlock.frequency.value = 22; dcBlock.Q.value = 0.707;
    input.connect(lowCut); lowCut.connect(preGain); preGain.connect(shaper); shaper.connect(dcBlock); dcBlock.connect(highCut); highCut.connect(output);
    let params = copy(ENGINE_DEFAULTS.corrosion);
    function apply(next) {
      params = merge(params, next || {});
      const now = ctx.currentTime;
      lowCut.frequency.setTargetAtTime(clamp(params.lowCut, 20, 3000), now, 0.02);
      highCut.frequency.setTargetAtTime(clamp(params.highCut, 600, 18000), now, 0.02);
      preGain.gain.setTargetAtTime(1 + clamp(params.drive, 0, 1) * 2.8, now, 0.02);
      shaper.curve = makeDriveCurve(params.drive, params.fold, params.bits, params.asymmetry);
      output.gain.setTargetAtTime(clamp(params.mix, 0, 1) * 0.82, now, 0.02);
    }
    function setBpm() {}
    function destroy() { [input, lowCut, preGain, shaper, dcBlock, highCut, output].forEach((n) => { try { n.disconnect(); } catch (_) {} }); }
    apply(params);
    return { input, output, apply, setBpm, destroy };
  }

  function createPulse(ctx) {
    const input = ctx.createGain();
    const gate = ctx.createGain();
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass';
    const output = ctx.createGain();
    input.connect(gate); gate.connect(tone); tone.connect(output);
    let bpm = 132;
    let params = copy(ENGINE_DEFAULTS.pulse);
    let lfo = null;
    let lfoGain = null;
    function rebuildLfo() {
      if (lfo) { try { lfo.stop(); } catch (_) {} try { lfo.disconnect(); } catch (_) {} }
      if (lfoGain) { try { lfoGain.disconnect(); } catch (_) {} }
      lfo = ctx.createOscillator();
      lfoGain = ctx.createGain();
      const shape = ['sine', 'square', 'sawtooth', 'triangle'].includes(params.shape) ? params.shape : 'square';
      lfo.type = shape;
      lfo.frequency.value = 1 / Math.max(0.015, divisionSeconds(bpm, params.rate));
      const depth = clamp(params.depth, 0, 1);
      const floor = clamp(params.floor, 0, 1);
      gate.gain.value = floor + depth * 0.5;
      lfoGain.gain.value = depth * 0.5;
      lfo.connect(lfoGain); lfoGain.connect(gate.gain);
      lfo.start();
    }
    function apply(next) {
      const prevShape = params.shape, prevRate = params.rate, prevDepth = params.depth, prevFloor = params.floor;
      params = merge(params, next || {});
      tone.frequency.setTargetAtTime(clamp(params.tone, 700, 18000), ctx.currentTime, 0.02);
      output.gain.setTargetAtTime(clamp(params.mix, 0, 1), ctx.currentTime, 0.02);
      if (!lfo || prevShape !== params.shape || prevRate !== params.rate || prevDepth !== params.depth || prevFloor !== params.floor) rebuildLfo();
    }
    function setBpm(value) { bpm = clamp(value, 40, 260); rebuildLfo(); }
    function destroy() {
      if (lfo) { try { lfo.stop(); } catch (_) {} }
      [input, gate, tone, output, lfo, lfoGain].forEach((n) => { if (n) try { n.disconnect(); } catch (_) {} });
    }
    apply(params);
    return { input, output, apply, setBpm, destroy };
  }

  const ENGINE_FACTORIES = { echo: createEcho, space: createSpace, corrosion: createCorrosion, pulse: createPulse };

  function createRack(ctx, destination, options) {
    const opts = options || {};
    const input = ctx.createGain();
    const output = ctx.createGain();
    output.gain.value = 1;
    if (destination) output.connect(destination);
    let bpm = clamp(opts.bpm || 132, 40, 260);
    let current = normalizePreset(opts.preset || getActivePreset());
    let engine = null;
    let bypassed = !!opts.bypassed;

    function rebuild() {
      const now = ctx.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setTargetAtTime(0.0001, now, 0.008);
      if (engine) {
        try { input.disconnect(engine.input); } catch (_) {}
        setTimeout(() => { try { engine.destroy(); } catch (_) {} }, 180);
      }
      const factory = ENGINE_FACTORIES[current.engine] || createEcho;
      engine = factory(ctx);
      input.connect(engine.input);
      engine.output.connect(output);
      engine.setBpm(bpm);
      engine.apply(effectiveParameters(current));
      output.gain.setTargetAtTime(bypassed ? 0.0001 : 1, now + 0.015, 0.02);
    }

    function setPreset(preset) {
      const next = normalizePreset(preset);
      const engineChanged = !engine || next.engine !== current.engine;
      current = next;
      if (engineChanged) rebuild();
      else {
        engine.setBpm(bpm);
        engine.apply(effectiveParameters(current));
      }
      return copy(current);
    }

    function setMacro(name, value) {
      if (!Object.prototype.hasOwnProperty.call(current.macros, name)) return copy(current);
      current.macros[name] = clamp(value, 0, 1);
      if (engine) engine.apply(effectiveParameters(current));
      return copy(current);
    }

    function setParameter(name, value) {
      current.parameters[name] = value;
      if (engine) engine.apply(effectiveParameters(current));
      return copy(current);
    }

    function setRouting(name, value) {
      if (Object.prototype.hasOwnProperty.call(current.routing, name)) current.routing[name] = clamp(value, 0, 1);
      return copy(current);
    }

    function setBpm(value) {
      bpm = clamp(value, 40, 260);
      if (engine) engine.setBpm(bpm);
    }

    function setBypass(value) {
      bypassed = !!value;
      output.gain.setTargetAtTime(bypassed ? 0.0001 : 1, ctx.currentTime, 0.015);
    }

    function destroy() {
      if (engine) engine.destroy();
      try { input.disconnect(); } catch (_) {}
      try { output.disconnect(); } catch (_) {}
    }

    rebuild();
    return {
      input, output,
      setPreset, setMacro, setParameter, setRouting, setBpm, setBypass, destroy,
      getPreset: () => copy(current),
      getEffectiveParameters: () => effectiveParameters(current),
      isBypassed: () => bypassed
    };
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) return reject(new Error('IndexedDB nicht verfügbar'));
      const req = global.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB konnte nicht geöffnet werden'));
    });
  }

  async function putSample(blob, meta) {
    const db = await openDb();
    const record = {
      id: (meta && meta.id) || uid('sample'),
      name: String((meta && meta.name) || 'VOICE SAMPLE').slice(0, 100),
      mime: blob.type || (meta && meta.mime) || 'audio/webm',
      blob,
      createdAt: (meta && meta.createdAt) || new Date().toISOString(),
      duration: Number((meta && meta.duration) || 0)
    };
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return record;
  }

  async function getSample(id) {
    if (!id) return null;
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  }

  async function deleteSample(id) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function listSamples() {
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function loadSampleSlots() {
    try {
      const raw = JSON.parse(localStorage.getItem(SAMPLE_SLOT_KEY) || '[]');
      if (Array.isArray(raw)) return Array.from({ length: 4 }, (_, i) => raw[i] || null);
    } catch (_) {}
    return [null, null, null, null];
  }

  function saveSampleSlots(slots) {
    const normalized = Array.from({ length: 4 }, (_, i) => (slots && slots[i]) || null);
    localStorage.setItem(SAMPLE_SLOT_KEY, JSON.stringify(normalized));
    return normalized;
  }

  global.ARFX = Object.freeze({
    VERSION, SCHEMA, PRESET_KEY, ACTIVE_KEY, HANDOFF_KEY, SAMPLE_SLOT_KEY,
    DEFAULT_PRESETS: copy(DEFAULT_PRESETS), ENGINE_DEFAULTS: copy(ENGINE_DEFAULTS),
    normalizePreset, loadLibrary, saveLibrary, upsertPreset, removePreset,
    getActivePreset, setActivePreset, sendHandoff, consumeHandoff,
    createRack, divisionSeconds, effectiveParameters,
    samples: Object.freeze({ put: putSample, get: getSample, delete: deleteSample, list: listSamples, loadSlots: loadSampleSlots, saveSlots: saveSampleSlots }),
    util: Object.freeze({ clamp, uid, copy, merge })
  });
})(window);
