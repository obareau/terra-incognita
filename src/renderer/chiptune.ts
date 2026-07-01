// Chiptune génératif lofi : 4 voix WebAudio (2 square, 1 triangle, 1 bruit),
// séquenceur 16 pas seedé, gamme choisie par l'ambiance de la carte.

import type { Ambiance } from "../shared/types";
import { int, rngFor, type Rng } from "../core/rng";

// Intervalles (demi-tons) par ambiance — mineur harmonique pour le C.G.U.
const SCALES: Record<Ambiance, number[]> = {
  militaire: [0, 2, 3, 5, 7, 8, 11],   // mineur harmonique : martial, tendu
  industriel: [0, 2, 3, 5, 7, 9, 10],  // dorien : machine qui tourne
  neutre: [0, 2, 4, 7, 9],             // pentatonique majeure : calme
  clandestin: [0, 3, 5, 6, 7, 10],     // blues : marché noir enfumé
  ruine: [0, 1, 5, 7, 8],              // phrygien réduit : désolation
};

const STEPS = 16;

interface Pattern {
  melody: (number | null)[];
  bass: (number | null)[];
  drums: ("kick" | "hat" | null)[];
  tempo: number;
  rootHz: number;
}

function buildPattern(seed: string, ambiance: Ambiance): Pattern {
  const rng: Rng = rngFor(seed, "audio");
  const scale = SCALES[ambiance];
  const rootHz = 110 * Math.pow(2, int(rng, 0, 5) / 12); // A2 à ~D3
  const melody: (number | null)[] = [];
  const bass: (number | null)[] = [];
  const drums: ("kick" | "hat" | null)[] = [];
  let degree = 0;
  for (let i = 0; i < STEPS; i++) {
    if (rng() < 0.65) {
      degree = Math.max(0, Math.min(scale.length * 2 - 1, degree + int(rng, -2, 2)));
      const oct = Math.floor(degree / scale.length);
      melody.push(scale[degree % scale.length] + 12 * (1 + oct));
    } else {
      melody.push(null);
    }
    bass.push(i % 4 === 0 ? scale[0] : i % 4 === 2 && rng() < 0.5 ? scale[4 % scale.length] : null);
    drums.push(i % 4 === 0 ? "kick" : rng() < 0.45 ? "hat" : null);
  }
  return { melody, bass, drums, tempo: int(rng, 72, 90), rootHz };
}

export class Chiptune {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private pattern: Pattern | null = null;
  private step = 0;
  private out: BiquadFilterNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  get playing(): boolean {
    return this.timer !== null;
  }

  start(seed: string, ambiance: Ambiance): void {
    this.stop();
    this.ctx = this.ctx ?? new AudioContext();
    void this.ctx.resume();
    // Chaîne "cassette" : lowpass doux + gain maître.
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const master = this.ctx.createGain();
    master.gain.value = 0.16;
    lp.connect(master);
    master.connect(this.ctx.destination);
    this.out = lp;

    const nb = this.ctx.createBuffer(1, this.ctx.sampleRate / 8, this.ctx.sampleRate);
    const data = nb.getChannelData(0);
    const nrng = rngFor(seed, "noise");
    for (let i = 0; i < data.length; i++) data[i] = nrng() * 2 - 1;
    this.noiseBuf = nb;

    this.pattern = buildPattern(seed, ambiance);
    this.step = 0;
    const stepMs = (60_000 / this.pattern.tempo) / 4; // double-croches
    this.timer = window.setInterval(() => this.tick(), stepMs);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.out?.disconnect();
    this.out = null;
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

  private tick(): void {
    if (!this.ctx || !this.pattern || !this.out) return;
    const p = this.pattern;
    const t = this.ctx.currentTime + 0.02;
    const i = this.step % STEPS;
    // Dérive lofi : léger désaccord qui ondule sur la boucle.
    const drift = Math.sin((this.step / STEPS) * Math.PI * 2) * 6;

    const m = p.melody[i];
    if (m !== null) {
      const f = p.rootHz * Math.pow(2, m / 12);
      this.voice("square", f, t, 0.16, 0.5, drift);
      this.voice("square", f, t, 0.16, 0.2, drift + 8); // duty simulé
    }
    const b = p.bass[i];
    if (b !== null) {
      this.voice("triangle", (p.rootHz / 2) * Math.pow(2, b / 12), t, 0.3, 0.8, drift / 2);
    }
    const d = p.drums[i];
    if (d && this.noiseBuf) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      if (d === "kick") {
        f.type = "lowpass";
        f.frequency.value = 200;
        g.gain.setValueAtTime(0.9, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
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
    this.step++;
  }
}
