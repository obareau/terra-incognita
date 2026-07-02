// Radio Robotariis — jukebox chiptune généré à la volée.
// Seed = date de naissance de l'auditeur × heure d'écoute : la station
// est personnelle, mais reproductible (même date + même heure = même onde).

import { buildSong, Chiptune, TRACKS_PER_MAP } from "../renderer/chiptune";
import { ambianceForHour, frequencyFor, msUntilNextHour, stationSeed } from "./logic";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const chiptune = new Chiptune();
const state = {
  birthday: "",
  playing: false,
  trackTimer: 0,
  hourTimer: 0,
};

function currentProgram(): { seed: string; ambiance: ReturnType<typeof ambianceForHour> } {
  const now = new Date();
  return { seed: stationSeed(state.birthday, now), ambiance: ambianceForHour(now.getHours()) };
}

/** Durée d'un morceau : deux passages complets de la structure. */
function songDurationMs(seed: string, ambiance: ReturnType<typeof ambianceForHour>, track: number): number {
  const song = buildSong(seed, ambiance, track);
  const stepMs = (60_000 / song.tempo) / 4;
  return stepMs * 16 * song.order.length * 2;
}

function updateScreen(): void {
  const { seed, ambiance } = currentProgram();
  const song = buildSong(seed, ambiance, chiptune.track);
  $("trackLine").textContent = state.playing
    ? `♪ ${chiptune.trackLabel} — ${song.tempo} BPM`
    : "Émission interrompue.";
  $("programLine").textContent = state.playing
    ? `programme ${ambiance.toUpperCase()} · l'onde change à l'heure pile`
    : "";
}

function playTrack(track: number): void {
  const { seed, ambiance } = currentProgram();
  chiptune.start(seed, ambiance, track);
  updateScreen();
  clearTimeout(state.trackTimer);
  state.trackTimer = window.setTimeout(() => {
    playTrack((chiptune.track + 1) % TRACKS_PER_MAP);
  }, songDurationMs(seed, ambiance, track));
}

function scheduleHourChange(): void {
  clearTimeout(state.hourTimer);
  state.hourTimer = window.setTimeout(() => {
    if (state.playing) playTrack(0); // nouvelle heure → nouveau programme
    scheduleHourChange();
  }, msUntilNextHour(new Date()) + 500);
}

function tuneIn(): void {
  const input = $<HTMLInputElement>("birthday");
  if (!input.value) {
    $("trackLine").textContent = "Entrez votre date de naissance pour capter l'onde.";
    return;
  }
  state.birthday = input.value;
  localStorage.setItem("radio-birthday", state.birthday);
  $("freq").innerHTML = `${frequencyFor(state.birthday)} <small>MHz</small>`;
  state.playing = true;
  $("btnTune").textContent = "⏻ COUPER";
  playTrack(0);
  scheduleHourChange();
}

function tuneOut(): void {
  state.playing = false;
  chiptune.stop();
  clearTimeout(state.trackTimer);
  clearTimeout(state.hourTimer);
  $("btnTune").textContent = "⏻ TUNE IN";
  updateScreen();
}

$("btnTune").addEventListener("click", () => (state.playing ? tuneOut() : tuneIn()));
$("btnSkip").addEventListener("click", () => {
  if (state.playing) playTrack((chiptune.track + 1) % TRACKS_PER_MAP);
});

// ── Oscilloscope phosphore ───────────────────────────────────────────
const scope = $<HTMLCanvasElement>("scope");
const sctx = scope.getContext("2d")!;
const wave = new Uint8Array(1024);

function drawScope(): void {
  requestAnimationFrame(drawScope);
  sctx.fillStyle = "#000";
  sctx.fillRect(0, 0, scope.width, scope.height);
  const style = getComputedStyle(document.documentElement);
  sctx.strokeStyle = style.getPropertyValue("--c2").trim() || "#5fae4e";
  sctx.beginPath();
  if (chiptune.analyser && state.playing) {
    chiptune.analyser.getByteTimeDomainData(wave);
    for (let x = 0; x < scope.width; x++) {
      const v = wave[Math.floor((x / scope.width) * wave.length)] / 255;
      const y = v * scope.height;
      x === 0 ? sctx.moveTo(x, y) : sctx.lineTo(x, y);
    }
  } else {
    // Porteuse au repos : fine ligne bruitée.
    for (let x = 0; x < scope.width; x++) {
      const y = scope.height / 2 + (Math.random() - 0.5) * 2;
      x === 0 ? sctx.moveTo(x, y) : sctx.lineTo(x, y);
    }
  }
  sctx.stroke();
}

// ── Démarrage ────────────────────────────────────────────────────────
const saved = localStorage.getItem("radio-birthday");
if (saved) {
  $<HTMLInputElement>("birthday").value = saved;
  $("freq").innerHTML = `${frequencyFor(saved)} <small>MHz</small>`;
}
drawScope();
