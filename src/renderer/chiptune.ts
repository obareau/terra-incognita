// Chiptune génératif lofi — jukebox : chaque carte offre plusieurs morceaux
// de genres différents (marche, hymne, blues, berceuse, drone), tous dérivés
// de la seed. 4 voix WebAudio : 2 square, 1 triangle, 1 bruit.

import type { Ambiance } from "../shared/types";
import { chance, int, pick, rngFor, type Rng } from "../core/rng";

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
  /** Durée de chaque note en pas (les pas couverts par une tenue restent null). */
  melLen: number[];
  harmony: (number | null)[];
  bass: (number | null)[];
  bassLen: number[];
  drums: Drum[];
}

/** Progressions d'accords (degrés de gamme), 1 accord par mesure de 4 pas. */
const PROGRESSIONS: Record<Genre, number[][]> = {
  marche: [[0, 3, 4, 0], [0, 5, 4, 0]],
  hymne: [[0, 5, 3, 4], [0, 3, 5, 4]],
  blues: [[0, 0, 3, 4], [0, 3, 0, 4]],
  berceuse: [[0, 4, 5, 3], [0, 5, 0, 4]],
  drone: [[0, 0, 0, 0]],
  requiem: [[0, 5, 3, 2], [0, 1, 0, 4]],
};

/** Cellules rythmiques d'une mesure (durées en pas, somme = 4). */
const RHYTHMS: number[][] = [
  [1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [2, 2], [1, 2, 1], [3, 1], [4],
];

/** Degré de gamme (peut dépasser l'octave) → demi-tons. */
function degTone(scale: number[], deg: number): number {
  const L = scale.length;
  const d = ((deg % L) + L) % L;
  return scale[d] + 12 * Math.floor(deg / L);
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

type BassStyle = "ostinato" | "walking" | "held" | "pulse";

interface GenreSpec {
  tempo: [number, number];
  density: number;      // probabilité de note mélodique par pas
  noteLen: number;      // durée des notes (s)
  swing: number;
  level: number;
  melodyWave: OscillatorType;
  /** Groove sur 16 pas : K=kick, S=snare, h=hat, x=hat possible, .=silence. */
  groove: string;
  /** Roulement de caisse claire en fin de phrase (proba). */
  fillChance: number;
  hatChance: number;    // proba qu'un 'x' devienne un hat
  harmony: boolean;     // seconde voix
  /** Intervalles possibles de la seconde voix (demi-tons). */
  harmonyIv: [number, number];
  bassStyle: BassStyle;
  /** true → mélodie à tendance descendante (lamento). */
  descend?: boolean;
}

const GENRES: Record<Genre, GenreSpec> = {
  marche: { tempo: [96, 116], density: 0.8, noteLen: 0.1, swing: 0, level: 0.17, melodyWave: "square", groove: "K.xhS.xhK.xhS.xh", fillChance: 0.6, hatChance: 0.6, harmony: false, harmonyIv: [7, 4], bassStyle: "ostinato" },
  hymne: { tempo: [58, 70], density: 0.55, noteLen: 0.5, swing: 0, level: 0.15, melodyWave: "square", groove: "K.......S.......", fillChance: 0.15, hatChance: 0.1, harmony: true, harmonyIv: [7, 4], bassStyle: "held" },
  blues: { tempo: [78, 92], density: 0.6, noteLen: 0.2, swing: 0.28, level: 0.16, melodyWave: "square", groove: "K.h.S.hxK.h.S.hx", fillChance: 0.4, hatChance: 0.7, harmony: false, harmonyIv: [7, 4], bassStyle: "walking" },
  berceuse: { tempo: [64, 76], density: 0.45, noteLen: 0.34, swing: 0.1, level: 0.13, melodyWave: "triangle", groove: "....x.......x...", fillChance: 0, hatChance: 0.5, harmony: true, harmonyIv: [7, 4], bassStyle: "held" },
  drone: { tempo: [66, 74], density: 0.25, noteLen: 0.9, swing: 0, level: 0.15, melodyWave: "sawtooth", groove: "K.......x...x...", fillChance: 0, hatChance: 0.4, harmony: false, harmonyIv: [7, 4], bassStyle: "held" },
  // Requiem : lamento descendant au triangle, glas grave en ouverture,
  // cloche haute (quinte + octave) en écho — lent et mélancolique.
  requiem: { tempo: [46, 56], density: 0.5, noteLen: 0.9, swing: 0, level: 0.13, melodyWave: "triangle", groove: "K...............", fillChance: 0, hatChance: 0.1, harmony: true, harmonyIv: [3, 19], bassStyle: "held", descend: true },
};

/** Note d'accord (fondamentale/tierce/quinte) la plus proche — ancrage harmonique. */
function nearestChordTone(chord: number, deg: number): number {
  let best = chord;
  for (const c of [chord - 7, chord - 5, chord - 3, chord, chord + 2, chord + 4, chord + 7]) {
    if (Math.abs(c - deg) < Math.abs(best - deg)) best = c;
  }
  return best;
}

/**
 * Une mesure mélodique : cellule rythmique + contour ancré sur l'accord.
 * Temps fort = note d'accord ; temps faibles = mouvement conjoint.
 * Renvoie les degrés joués (pour la séquence : mesure suivante = motif transposé).
 */
function writeMeasure(
  rng: Rng, p: Pattern, scale: number[], spec: GenreSpec, transpose: number,
  bar: number, chord: number, rhythm: number[],
  replay: { degs: number[]; rhythm: number[] } | null, cadence: boolean,
): { degs: number[]; rhythm: number[] } {
  const degs: number[] = [];
  let pos = 0;
  let deg = replay ? replay.degs[0] + chord : chord + (chance(rng, 0.5) ? 2 : 0);
  const r = replay ? replay.rhythm : rhythm;
  for (let k = 0; k < r.length && pos < 4; k++) {
    const dur = Math.min(r[k], 4 - pos);
    const step = bar * 4 + pos;
    const strong = pos === 0;
    if (strong || chance(rng, spec.density + 0.15)) {
      if (replay) {
        deg = replay.degs[k] + chord; // séquence : motif transposé sur l'accord
      } else if (strong) {
        deg = nearestChordTone(chord, deg);
      } else {
        deg += spec.descend ? int(rng, -2, 1) : int(rng, -2, 2);
      }
      if (cadence && k === r.length - 1) deg = chord; // la phrase retombe sur la fondamentale
      deg = Math.max(-2, Math.min(scale.length * 2, deg));
      p.melody[step] = degTone(scale, deg) + 12 + transpose;
      p.melLen[step] = dur;
      if (spec.harmony && dur >= 2 && chance(rng, 0.75)) {
        p.harmony[step] = p.melody[step]! + (chance(rng, 0.5) ? spec.harmonyIv[0] : spec.harmonyIv[1]);
      }
      degs.push(replay ? replay.degs[k] : deg - chord);
    } else {
      degs.push(deg - chord);
    }
    pos += dur;
  }
  return { degs, rhythm: r };
}

function buildPattern(rng: Rng, scale: number[], spec: GenreSpec, transpose: number, genre: Genre): Pattern {
  const p: Pattern = {
    melody: new Array<number | null>(STEPS).fill(null),
    melLen: new Array<number>(STEPS).fill(0),
    harmony: new Array<number | null>(STEPS).fill(null),
    bass: new Array<number | null>(STEPS).fill(null),
    bassLen: new Array<number>(STEPS).fill(0),
    drums: new Array<Drum>(STEPS).fill(null),
  };
  const prog = pick(rng, PROGRESSIONS[genre]);
  // Développement : motif A, séquence de A sur l'accord suivant, contraste B, cadence.
  const motifA = writeMeasure(rng, p, scale, spec, transpose, 0, prog[0], pick(rng, RHYTHMS), null, false);
  writeMeasure(rng, p, scale, spec, transpose, 1, prog[1], motifA.rhythm, motifA, false);
  writeMeasure(rng, p, scale, spec, transpose, 2, prog[2], pick(rng, RHYTHMS), null, false);
  writeMeasure(rng, p, scale, spec, transpose, 3, prog[3], pick(rng, [[2, 2], [1, 1, 2], [4]]), null, true);

  // ── Ligne de basse : un style par genre ────────────────────────────
  const putBass = (i: number, deg: number, len: number): void => {
    p.bass[i] = degTone(scale, deg) + transpose;
    p.bassLen[i] = len;
  };
  for (let bar = 0; bar < 4; bar++) {
    const chord = prog[bar];
    const next = prog[(bar + 1) % 4];
    const b0 = bar * 4;
    switch (spec.bassStyle) {
      case "ostinato": // martial : fondamentale-fondamentale-quinte-octave
        putBass(b0, chord, 1);
        putBass(b0 + 1, chord, 1);
        putBass(b0 + 2, chord + 4, 1);
        putBass(b0 + 3, chance(rng, 0.5) ? chord + 7 : chord, 1);
        break;
      case "walking": { // blues : accord arpégé + approche chromatique du suivant
        putBass(b0, chord, 1);
        putBass(b0 + 1, chord + 2, 1);
        putBass(b0 + 2, chord + 4, 1);
        // Note d'approche : un degré au-dessus/dessous de la cible.
        putBass(b0 + 3, next + (chance(rng, 0.5) ? 1 : -1), 1);
        break;
      }
      case "pulse": // noire répétée
        for (let k = 0; k < 4; k++) putBass(b0 + k, chord, 1);
        break;
      case "held": // tenue sur la mesure — respiration des genres lents
        putBass(b0, chord, 4);
        if (chance(rng, 0.35)) putBass(b0 + 3, chord + 4, 1); // relance à la quinte
        break;
    }
  }

  // ── Batterie : groove écrit + variations, fill de fin de phrase ────
  for (let i = 0; i < STEPS; i++) {
    const c = spec.groove[i];
    if (c === "K") p.drums[i] = "kick";
    else if (c === "S") p.drums[i] = "snare";
    else if (c === "h") p.drums[i] = "hat";
    else if (c === "x" && chance(rng, spec.hatChance)) p.drums[i] = "hat";
  }
  if (chance(rng, spec.fillChance)) {
    // Roulement sur les 3 derniers pas — annonce la phrase suivante.
    for (const i of [13, 14, 15]) p.drums[i] = chance(rng, 0.8) ? "snare" : "hat";
  }
  return p;
}

export function buildSong(seed: string, ambiance: Ambiance, track: number): Song {
  const genre = PLAYLISTS[ambiance][track % TRACKS_PER_MAP];
  const spec = GENRES[genre];
  const rng = rngFor(seed, `audio:${track}:${genre}`);
  const scale = SCALES[ambiance];
  // A = couplet, A' = variation rythmique, B = refrain transposé, C = pont dépouillé.
  const a = buildPattern(rng, scale, spec, 0, genre);
  const a2 = buildPattern(rng, scale, spec, 0, genre);
  const b = buildPattern(rng, scale, spec, chance(rng, 0.5) ? 5 : 3, genre);
  const c = buildPattern(rng, scale, { ...spec, density: spec.density * 0.4, hatChance: spec.hatChance * 0.5 }, 0, genre);
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
    // Vibrato expressif sur les notes tenues (s'installe après l'attaque).
    if (dur > 0.45) {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 5.2;
      const depth = this.ctx.createGain();
      depth.gain.value = 14; // cents
      lfo.connect(depth);
      depth.connect(osc.detune);
      lfo.start(t0 + 0.18);
      lfo.stop(t0 + dur);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private drum(kind: Exclude<Drum, null>, t: number): void {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    if (kind === "kick") {
      // Grosse caisse synthétisée : sinus à chute de hauteur — du punch.
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(1.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g);
      g.connect(this.master!);
      osc.start(t);
      osc.stop(t + 0.18);
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    if (kind === "snare") {
      f.type = "bandpass";
      f.frequency.value = 1900;
      f.Q.value = 0.7;
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      // Corps de la caisse : un coup de tom court sous le souffle.
      const body = this.ctx.createOscillator();
      body.type = "triangle";
      body.frequency.setValueAtTime(210, t);
      body.frequency.exponentialRampToValueAtTime(140, t + 0.06);
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.4, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      body.connect(bg);
      bg.connect(this.master!);
      body.start(t);
      body.stop(t + 0.08);
    } else {
      f.type = "highpass";
      f.frequency.value = 5500;
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    }
    src.connect(f);
    f.connect(g);
    g.connect(this.master!);
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
      const held = Math.max(1, p.melLen[i]);
      const dur = s.noteLen * held; // la tenue garde l'articulation du genre
      const f = s.rootHz * Math.pow(2, m / 12);
      this.voice(s.melodyWave, f, t, dur, 0.5, drift);
      if (s.melodyWave === "square") this.voice("square", f, t, dur, 0.2, drift + 8); // duty simulé
    }
    const h = p.harmony[i];
    if (h !== null) {
      const dur = s.noteLen * Math.max(1, p.melLen[i]) * 1.15;
      this.voice("square", s.rootHz * Math.pow(2, h / 12), t, dur, 0.22, drift - 4);
    }
    const b = p.bass[i];
    if (b !== null) {
      const held = Math.max(1, p.bassLen[i]);
      const dur = s.genre === "drone" ? stepSec * 8 : Math.max(0.28, held * stepSec * 0.95);
      const f = (s.rootHz / 2) * Math.pow(2, b / 12);
      this.voice("triangle", f, t, dur, 0.95, drift / 2);
      this.voice("square", f, t, Math.min(dur, 0.12), 0.18, drift / 2); // attaque perceptible
      if (s.genre === "drone") {
        this.voice("sawtooth", f, t, dur, 0.12, drift + 10);
      }
    }
    const d = p.drums[i];
    if (d) this.drum(d, t);
    this.step++;
  }
}
