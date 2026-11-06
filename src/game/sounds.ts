// Game sounds, synthesized with the Web Audio API (no audio files).
//
// Every sound is a function that schedules notes on an AudioContext at a
// given start time, so the same code plays live and renders offline (which
// is how the sounds are tested and previewed).

// "digit": every copy of a number is now on the board.
export type CompletionKind = "row" | "column" | "region" | "diagonal" | "digit";

export const COMPLETION_KINDS: CompletionKind[] = [
  "row",
  "column",
  "region",
  "diagonal",
  "digit",
];

type Ctx = BaseAudioContext;

// C major pentatonic from C5: every combination sounds consonant.
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0, 2349.32, 2637.02];
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;
const C7 = 2093.0;

interface ToneOptions {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  // Slide to this frequency over the note.
  glideTo?: number;
  // Lowpass cutoff, for softer timbres.
  cutoff?: number;
}

// One enveloped oscillator: quick attack, exponential decay.
function tone(ctx: Ctx, out: AudioNode, o: ToneOptions) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, o.start);
  if (o.glideTo) {
    osc.frequency.exponentialRampToValueAtTime(o.glideTo, o.start + o.duration);
  }
  const peak = o.gain ?? 0.2;
  const attack = o.attack ?? 0.004;
  env.gain.setValueAtTime(0.0001, o.start);
  env.gain.exponentialRampToValueAtTime(peak, o.start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, o.start + o.duration);
  let node: AudioNode = osc;
  if (o.cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = o.cutoff;
    osc.connect(filter);
    node = filter;
  }
  node.connect(env).connect(out);
  osc.start(o.start);
  osc.stop(o.start + o.duration + 0.05);
}

// A bell: a sine plus quieter inharmonic partials with a long ring.
function bell(ctx: Ctx, out: AudioNode, freq: number, start: number, gain = 0.12) {
  tone(ctx, out, { freq, start, duration: 1.4, gain });
  tone(ctx, out, { freq: freq * 2.76, start, duration: 0.6, gain: gain * 0.35 });
  tone(ctx, out, { freq: freq * 5.4, start, duration: 0.25, gain: gain * 0.15 });
}

// A plucked note: triangle with a sine octave, short decay, tiny pitch drop.
function pluck(ctx: Ctx, out: AudioNode, freq: number, start: number, gain = 0.14) {
  tone(ctx, out, {
    freq,
    glideTo: freq * 0.985,
    start,
    duration: 0.22,
    type: "triangle",
    gain,
  });
  tone(ctx, out, { freq: freq * 2, start, duration: 0.12, gain: gain * 0.25 });
}

export const sounds = {
  // Each digit gets its own note, so runs of entries sound like a melody.
  correct(ctx: Ctx, out: AudioNode, t: number, digit: number) {
    pluck(ctx, out, PENTATONIC[(digit - 1) % PENTATONIC.length], t);
  },

  // Low, muffled and short: unmistakable without being harsh.
  wrong(ctx: Ctx, out: AudioNode, t: number) {
    for (const [freq, detune] of [
      [196, 1],
      [185, 0.98],
    ]) {
      tone(ctx, out, {
        freq,
        glideTo: freq * 0.7 * detune,
        start: t,
        duration: 0.28,
        type: "square",
        gain: 0.12,
        cutoff: 900,
      });
    }
  },

  // The completion motifs. Each takes a pitch ratio and a level so the
  // combination sounds can transpose and layer them.

  // Rising left to right, like sweeping along the row.
  row(ctx: Ctx, out: AudioNode, t: number, p = 1, g = 1) {
    [C5, E5, G5, C6].forEach((f, i) =>
      pluck(ctx, out, f * p, t + i * 0.065, 0.15 * g)
    );
  },

  // Falling top to bottom, a quick cascade.
  column(ctx: Ctx, out: AudioNode, t: number, p = 1, g = 1) {
    [G6, E6, C6, G5].forEach((f, i) =>
      tone(ctx, out, {
        freq: f * p,
        start: t + i * 0.055,
        duration: 0.35,
        type: "sine",
        gain: 0.14 * g,
      })
    );
  },

  // Struck all at once: a chord of bells.
  region(ctx: Ctx, out: AudioNode, t: number, p = 1, g = 1) {
    [C5, E5, G5].forEach((f) => bell(ctx, out, f * p, t, 0.09 * g));
  },

  // A high glittering run.
  diagonal(ctx: Ctx, out: AudioNode, t: number, p = 1, g = 1) {
    PENTATONIC.slice(5, 12).forEach((f, i) =>
      tone(ctx, out, {
        freq: f * p,
        start: t + i * 0.035,
        duration: 0.3,
        gain: 0.1 * g,
      })
    );
    tone(ctx, out, {
      freq: C7 * 2 * p,
      start: t + 0.25,
      duration: 0.5,
      gain: 0.04 * g,
    });
  },

  // Every copy of a number placed: a bright two-note "collect" with a
  // shimmer, like picking up a coin.
  digit(ctx: Ctx, out: AudioNode, t: number, p = 1, g = 1) {
    tone(ctx, out, {
      freq: 987.77 * p,
      start: t,
      duration: 0.09,
      type: "square",
      gain: 0.07 * g,
      cutoff: 3500,
    });
    tone(ctx, out, {
      freq: 1318.51 * p,
      start: t + 0.08,
      duration: 0.45,
      type: "square",
      gain: 0.07 * g,
      cutoff: 3500,
    });
    tone(ctx, out, {
      freq: 2637.02 * p,
      start: t + 0.1,
      duration: 0.5,
      gain: 0.04 * g,
    });
  },

  // One completion plays its motif; a combination plays its own sound.
  completions(ctx: Ctx, out: AudioNode, t: number, kinds: CompletionKind[]) {
    if (kinds.length === 1) sounds[kinds[0]](ctx, out, t);
    else if (kinds.length > 1) combination(ctx, out, t, kinds);
  },

  // Timed mode: a board finished, the next is coming.
  boardDone(ctx: Ctx, out: AudioNode, t: number) {
    [C5, E5, G5, C6].forEach((f, i) => pluck(ctx, out, f, t + i * 0.08, 0.16));
    [C6, E6, G6].forEach((f) => bell(ctx, out, f, t + 0.34, 0.07));
  },

  // You won the race.
  win(ctx: Ctx, out: AudioNode, t: number) {
    [C5, E5, G5, C6, E6, G6].forEach((f, i) =>
      pluck(ctx, out, f, t + i * 0.07, 0.15)
    );
    [C5, G5, C6, E6].forEach((f) => bell(ctx, out, f, t + 0.45, 0.07));
    bell(ctx, out, C7, t + 0.75, 0.06);
  },

  // The game ended and someone else won: a short, warm sign-off.
  finish(ctx: Ctx, out: AudioNode, t: number) {
    [G5, E5, C5].forEach((f, i) => pluck(ctx, out, f, t + i * 0.1, 0.12));
  },

  // Out of lives: a gentle falling phrase.
  lose(ctx: Ctx, out: AudioNode, t: number) {
    [329.63, 261.63, 220.0].forEach((f, i) =>
      tone(ctx, out, {
        freq: f,
        glideTo: f * 0.97,
        start: t + i * 0.18,
        duration: 0.45,
        type: "sawtooth",
        gain: 0.12,
        cutoff: 1100,
      })
    );
  },

  tick(ctx: Ctx, out: AudioNode, t: number) {
    tone(ctx, out, { freq: 660, start: t, duration: 0.09, gain: 0.12 });
  },

  go(ctx: Ctx, out: AudioNode, t: number) {
    tone(ctx, out, { freq: 990, start: t, duration: 0.3, gain: 0.12 });
    tone(ctx, out, { freq: 1320, start: t, duration: 0.3, gain: 0.08 });
  },
};

export type SoundName = Exclude<
  keyof typeof sounds,
  "correct" | "completions" | CompletionKind
>;

// Every combination of two or more completions has its own sound: the
// motifs of the kinds involved, layered and transposed into a key, then a
// finale that grows with how many completed at once (2: an open fifth,
// 3: a triad, 4: a ninth chord, 5: a two-octave sweep). Combinations of the
// same size share a finale, so each of them gets a different key; together
// with the different layers, no two combinations sound alike.
const KEYS = [0, 5, -3, 2, 7, -5, 4, -2, 3, -4, 6, 1];

export function comboKey(kinds: CompletionKind[]): number {
  const maskOf = (ks: CompletionKind[]) =>
    ks.reduce((m, k) => m | (1 << COMPLETION_KINDS.indexOf(k)), 0);
  const mask = maskOf(kinds);
  // Position among all combinations with the same number of kinds.
  let index = 0;
  for (let other = 1; other < mask; other++) {
    if (popcount(other) === kinds.length) index++;
  }
  return KEYS[index % KEYS.length];
}

const popcount = (n: number) => {
  let count = 0;
  for (let m = n; m; m &= m - 1) count++;
  return count;
};

function combination(
  ctx: Ctx,
  out: AudioNode,
  t: number,
  kinds: CompletionKind[]
) {
  const ordered = COMPLETION_KINDS.filter((k) => kinds.includes(k));
  const p = Math.pow(2, comboKey(ordered) / 12);
  // Layers enter 45ms apart, quieter as more stack up.
  const level = 0.85 / Math.sqrt(ordered.length - 0.5);
  ordered.forEach((kind, i) => sounds[kind](ctx, out, t + i * 0.045, p, level));

  const finale = t + 0.12 + ordered.length * 0.06;
  const root = C6 * p;
  const at = (semitones: number) => root * Math.pow(2, semitones / 12);
  switch (ordered.length) {
    case 2:
      [0, 7, 12].forEach((s) => bell(ctx, out, at(s), finale, 0.06));
      break;
    case 3:
      [0, 4, 7].forEach((s, i) => pluck(ctx, out, at(s), finale + i * 0.06, 0.1));
      [0, 4, 7, 12].forEach((s) => bell(ctx, out, at(s), finale + 0.2, 0.055));
      break;
    case 4:
      [0, 4, 7, 11, 14].forEach((s, i) =>
        pluck(ctx, out, at(s), finale + i * 0.05, 0.09)
      );
      [0, 7, 14, 16].forEach((s) => bell(ctx, out, at(s), finale + 0.28, 0.055));
      break;
    default:
      [-12, -8, -5, 0, 4, 7, 12, 16, 19, 24].forEach((s, i) =>
        pluck(ctx, out, at(s), finale + i * 0.045, 0.09)
      );
      [0, 4, 7, 12, 19].forEach((s) => bell(ctx, out, at(s), finale + 0.5, 0.055));
      tone(ctx, out, { freq: at(31), start: finale + 0.5, duration: 1.2, gain: 0.03 });
  }
}

// Master chain: a compressor keeps stacked sounds from clipping.
export function createOutput(ctx: Ctx, volume = 1.5): AudioNode {
  const master = ctx.createGain();
  master.gain.value = volume;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 4;
  master.connect(compressor).connect(ctx.destination);
  return master;
}

const MUTE_KEY = "sudokuMuted";

// Live playback. The AudioContext is created on first use, which is always
// after a tap or key press, as browsers require.
class SoundPlayer {
  private ctx: AudioContext | null = null;
  private out: AudioNode | null = null;
  muted = (() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  })();
  private listeners = new Set<() => void>();

  private context(): [AudioContext, AudioNode] | null {
    if (this.muted || typeof window === "undefined") return null;
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtor();
      this.out = createOutput(this.ctx);
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return [this.ctx, this.out!];
  }

  private play(schedule: (ctx: Ctx, out: AudioNode, t: number) => void) {
    const live = this.context();
    if (!live) return;
    const [ctx, out] = live;
    try {
      schedule(ctx, out, ctx.currentTime + 0.01);
    } catch {
      // Sound is a nicety; never let it break the game.
    }
  }

  correct(digit: number) {
    this.play((ctx, out, t) => sounds.correct(ctx, out, t, digit));
  }

  completions(kinds: CompletionKind[]) {
    if (kinds.length) {
      // Let the pluck for the last cell land first.
      this.play((ctx, out, t) => sounds.completions(ctx, out, t + 0.12, kinds));
    }
  }

  cue(name: SoundName) {
    this.play((ctx, out, t) => sounds[name](ctx, out, t));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {}
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const soundPlayer = new SoundPlayer();
