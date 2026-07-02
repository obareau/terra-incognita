// Chiptune génératif lofi — jukebox : chaque carte offre plusieurs morceaux
// de genres différents (marche, hymne, blues, berceuse, drone), tous dérivés
// de la seed. 4 voix WebAudio : 2 square, 1 triangle, 1 bruit.

import type { Ambiance } from "../shared/types";
import { chance, int, rngFor, type Rng } from "../core/rng";

// Intervalles (demi-tons) par ambiance — mineur harmonique pour le C.G.U.
const SCALES: Record<Ambiance, number[]> = {
  militaire: [0, 2, 3, 5, 7, 8, 11],   // mineur harmonique : martial, tendu
  industriel: [0, 2, 3, 5, 7, 9, 10],  // dorien : machine qui tourne
  neutre: [0, 2, 4, 7, 9],             // pentatonique majeure : calme
  clandestin: [0, 3, 5, 6, 7, 10],     // blues : marché noir enfumé
  ruine: [0, 1, 5, 7, 8],              // phrygien réduit : désolation
};

type Genre = "marche" | "hymne" | "blues" | "berceuse" | "drone" | "requiem";

/** Ordre des morceaux par ambiance — le morceau 1 colle au lieu. */
const PLAYLISTS: Record<Ambiance, Genre[]> = {
  militaire: ["marche", "hymne", "drone", "requiem", "berceuse"],
  industriel: ["drone", "marche", "blues", "requiem", "berceuse"],
  clandestin: ["blues", "berceuse", "drone", "requiem", "marche"],
  neutre: ["berceuse", "blues", "hymne", "marche", "requiem"],
  ruine: ["requiem", "drone", "berceuse", "hymne", "blues"],
};

export const TRACKS_PER_MAP = 5;
const STEPS = 16;

type Drum = "kick" | "snare" | "hat" | null;

interface Pattern {
  melody: (number | null)[];
  harmony: (number | null)[];
  bass: (number | null)[];
  drums: Drum[];
}

interface Song {
  genre: Genre;
  patterns: Pattern[];
  /** Enchaînement des patterns (indices) — structure couplet/refrain. */
  order: number[];
  tempo: number;
  rootHz: number;
  /** Décalage des contretemps (0 = droit, ~0.25 = shuffle blues). */
  swing: number;
  /** Gain maître du morceau. */
  level: number;
  melodyWave: OscillatorType;
  noteLen: number;
}

interface GenreSpec {
  tempo: [number, number];
  density: number;      // probabilité de note mélodique par pas
  noteLen: number;      // durée des notes (s)
  swing: number;
  level: number;
  melodyWave: OscillatorType;
  kickEvery: number;    // 0 = pas de kick
  snare: boolean;
  hatChance: number;
  harmony: boolean;     // seconde voix
  /** Intervalles possibles de la seconde voix (demi-tons). */
  harmonyIv: [number, number];
  bassEvery: number;
  /** true → mélodie à tendance descendante (lamento). */
  descend?: boolean;
}

const GENRES: Record<Genre, GenreSpec> = {
  marche: { tempo: [96, 116], density: 0.8, noteLen: 0.1, swing: 0, level: 0.17, melodyWave: "square", kickEvery: 4, snare: true, hatChance: 0.6, harmony: false, harmonyIv: [7, 4], bassEvery: 2 },
  hymne: { tempo: [58, 70], density: 0.55, noteLen: 0.5, swing: 0, level: 0.15, melodyWave: "square", kickEvery: 8, snare: false, hatChance: 0.1, harmony: true, harmonyIv: [7, 4], bassEvery: 4 },
  blues: { tempo: [78, 92], density: 0.6, noteLen: 0.2, swing: 0.28, level: 0.16, melodyWave: "square", kickEvery: 4, snare: false, hatChance: 0.7, harmony: false, harmonyIv: [7, 4], bassEvery: 2 },
  berceuse: { tempo: [64, 76], density: 0.45, noteLen: 0.34, swing: 0.1, level: 0.13, melodyWave: "triangle", kickEvery: 0, snare: false, hatChance: 0.15, harmony: true, harmonyIv: [7, 4], bassEvery: 4 },
  drone: { tempo: [66, 74], density: 0.25, noteLen: 0.9, swing: 0, level: 0.15, melodyWave: "sawtooth", kickEvery: 8, snare: false, hatChance: 0.25, harmony: false, harmonyIv: [7, 4], bassEvery: 8 },
  // Requiem : lamento descendant au triangle, glas grave tous les 16 pas,
  // cloche haute (quinte + octave) en écho — lent et mélancolique.
  requiem: { tempo: [46, 56], density: 0.5, noteLen: 0.9, swing: 0, level: 0.13, melodyWave: "triangle", kickEvery: 16, snare: false, hatChance: 0.04, harmony: true, harmonyIv: [3, 19], bassEvery: 8, descend: true },
};

function buildPattern(rng: Rng, scale: number[], spec: GenreSpec, transpose: number): Pattern {
  const melody: (number | null)[] = [];
  const harmony: (number | null)[] = [];
  const bass: (number | null)[] = [];
  const drums: Drum[] = [];
  let degree = spec.descend ? scale.length + int(rng, 0, scale.length - 1) : int(rng, 0, scale.length - 1);
  for (let i = 0; i < STEPS; i++) {
    if (chance(rng, spec.density)) {
      // Lamento : la ligne descend, puis reprend souffle dans l'aigu.
      const stepIv = spec.descend ? int(rng, -2, 1) : int(rng, -2, 2);
      degree = Math.max(0, Math.min(scale.length * 2 - 1, degree + stepIv));
      if (spec.descend && degree === 0) degree = scale.length + int(rng, 0, 2);
      const oct = Math.floor(degree / scale.length);
      const note = scale[degree % scale.length] + 12 * (1 + oct) + transpose;
      melody.push(note);
      harmony.push(spec.harmony && chance(rng, 0.7) ? note + (chance(rng, 0.5) ? spec.harmonyIv[0] : spec.harmonyIv[1]) : null);
    } else {
      melody.push(null);
      harmony.push(null);
    }
    bass.push(
      spec.bassEvery > 0 && i % spec.bassEvery === 0
        ? scale[0] + transpose + (chance(rng, 0.3) ? scale[4 % scale.length] : 0)
        : null,
    );
    let d: Drum = null;
    if (spec.kickEvery > 0 && i % spec.kickEvery === 0) d = "kick";
    else if (spec.snare && i % 8 === 4) d = "snare";
    else if (chance(rng, spec.hatChance)) d = "hat";
    drums.push(d);
  }
  return { melody, harmony, bass, drums };
}

export function buildSong(seed: string, ambiance: Ambiance, track: number): Song {
  const genre = PLAYLISTS[ambiance][track % TRACKS_PER_MAP];
  const spec = GENRES[genre];
  const rng = rngFor(seed, `audio:${track}:${genre}`);
  const scale = SCALES[ambiance];
  // A = couplet, A' = variation rythmique, B = refrain transposé, C = pont dépouillé.
  const a = buildPattern(rng, scale, spec, 0);
  const a2 = buildPattern(rng, scale, spec, 0);
  const b = buildPattern(rng, scale, spec, chance(rng, 0.5) ? 5 : 3);
  const c = buildPattern(rng, scale, { ...spec, density: spec.density * 0.4, hatChance: spec.hatChance * 0.5 }, 0);
  return {
    genre,
    patterns: [a, a2, b, c],
    order: [0, 0, 1, 0, 2, 2, 0, 3],
    tempo: int(rng, spec.tempo[0], spec.tempo[1]),
    rootHz: 110 * Math.pow(2, int(rng, 0, 5) / 12),
    swing: spec.swing,
    level: spec.level,
    melodyWave: spec.melodyWave,
    noteLen: spec.noteLen,
  };
}

export class Chiptune {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private song: Song | null = null;
  private step = 0;
  private out: BiquadFilterNode | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private seed = "";
  private ambiance: Ambiance = "neutre";
  track = 0;
  /** Analyseur branché sur le master — pour les visualisations (radio). */
  analyser: AnalyserNode | null = null;

  get playing(): boolean {
    return this.timer !== null;
  }

  /** Nom affichable du morceau courant. */
  get trackLabel(): string {
    const genre = this.song?.genre ?? PLAYLISTS[this.ambiance][this.track % TRACKS_PER_MAP];
    return `${(this.track % TRACKS_PER_MAP) + 1}/${TRACKS_PER_MAP} — ${genre.toUpperCase()}`;
  }

  start(seed: string, ambiance: Ambiance, track = this.track): void {
    this.stop();
    this.seed = seed;
    this.ambiance = ambiance;
    this.track = track % TRACKS_PER_MAP;
    this.ctx = this.ctx ?? new AudioContext();
    void this.ctx.resume();
    // Chaîne "cassette" : lowpass doux + gain maître.
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const master = this.ctx.createGain();
    lp.connect(master);
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    master.connect(analyser);
    analyser.connect(this.ctx.destination);
    this.out = lp;
    this.master = master;
    this.analyser = analyser;

    const nb = this.ctx.createBuffer(1, this.ctx.sampleRate / 8, this.ctx.sampleRate);
    const data = nb.getChannelData(0);
    const nrng = rngFor(seed, "noise");
    for (let i = 0; i < data.length; i++) data[i] = nrng() * 2 - 1;
    this.noiseBuf = nb;

    this.song = buildSong(seed, ambiance, this.track);
    this.master.gain.value = this.song.level;
    this.step = 0;
    const stepMs = (60_000 / this.song.tempo) / 4; // double-croches
    this.timer = window.setInterval(() => this.tick(), stepMs);
  }

  /** Morceau suivant du jukebox (même seed, autre genre). */
  next(): void {
    const wasPlaying = this.playing;
    this.track = (this.track + 1) % TRACKS_PER_MAP;
    if (wasPlaying) this.start(this.seed, this.ambiance, this.track);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.out?.disconnect();
    this.master?.disconnect();
    this.analyser?.disconnect();
    this.out = null;
    this.master = null;
    this.analyser = null;
  }

  private voice(type: OscillatorType, freq: number, t0: number, dur: number, gain: number, detune = 0): void {
    if (!this.ctx || !this.out) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private drum(kind: Exclude<Drum, null>, t: number): void {
    if (!this.ctx || !this.out || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    if (kind === "kick") {
      f.type = "lowpass";
      f.frequency.value = 200;
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    } else if (kind === "snare") {
      f.type = "bandpass";
      f.frequency.value = 1800;
      f.Q.value = 0.8;
      g.gain.setValueAtTime(0.55, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    } else {
      f.type = "highpass";
      f.frequency.value = 5000;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    }
    src.connect(f);
    f.connect(g);
    g.connect(this.out);
    src.start(t);
    src.stop(t + 0.15);
  }

  private tick(): void {
    if (!this.ctx || !this.song || !this.out) return;
    const s = this.song;
    const stepSec = 60 / s.tempo / 4;
    const i = this.step % STEPS;
    const bar = Math.floor(this.step / STEPS) % s.order.length;
    const p = s.patterns[s.order[bar]];
    // Shuffle : les contretemps traînent (blues, berceuse).
    const lag = i % 2 === 1 ? s.swing * stepSec : 0;
    const t = this.ctx.currentTime + 0.02 + lag;
    // Dérive lofi : léger désaccord qui ondule sur la boucle.
    const drift = Math.sin((this.step / STEPS) * Math.PI * 2) * 6;

    const m = p.melody[i];
    if (m !== null) {
      const f = s.rootHz * Math.pow(2, m / 12);
      this.voice(s.melodyWave, f, t, s.noteLen, 0.5, drift);
      if (s.melodyWave === "square") this.voice("square", f, t, s.noteLen, 0.2, drift + 8); // duty simulé
    }
    const h = p.harmony[i];
    if (h !== null) {
      this.voice("square", s.rootHz * Math.pow(2, h / 12), t, s.noteLen * 1.2, 0.22, drift - 4);
    }
    const b = p.bass[i];
    if (b !== null) {
      const dur = s.genre === "drone" ? stepSec * 8 : 0.3;
      this.voice("triangle", (s.rootHz / 2) * Math.pow(2, b / 12), t, dur, 0.8, drift / 2);
      if (s.genre === "drone") {
        this.voice("sawtooth", (s.rootHz / 2) * Math.pow(2, b / 12), t, dur, 0.12, drift + 10);
      }
    }
    const d = p.drums[i];
    if (d) this.drum(d, t);
    this.step++;
  }
}
