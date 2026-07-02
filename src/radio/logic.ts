// Logique pure de Radio Robotariis — testable sans DOM.
// La fréquence personnelle : date de naissance × heure courante = programme.

import type { Ambiance } from "../shared/types";

/** Tranche horaire → couleur musicale de la grille des programmes. */
export function ambianceForHour(hour: number): Ambiance {
  if (hour < 5) return "ruine";        // nuit profonde : requiem, drone
  if (hour < 9) return "neutre";       // aube : berceuses, blues
  if (hour < 13) return "militaire";   // matinée : marches de la Rectitude
  if (hour < 18) return "industriel";  // après-midi : les machines tournent
  if (hour < 23) return "clandestin";  // soirée : blues du marché noir
  return "ruine";
}

/** Clé d'heure stable : le programme change à l'heure pile. */
export function hourKey(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}`;
}

/** Seed du programme : anniversaire de l'auditeur × heure d'écoute. */
export function stationSeed(birthday: string, d: Date): string {
  return `radio:${birthday}:${hourKey(d)}`;
}

/** Fréquence FM personnelle, dérivée de la date de naissance. */
export function frequencyFor(birthday: string): string {
  let h = 2166136261;
  for (let i = 0; i < birthday.length; i++) {
    h = Math.imul(h ^ birthday.charCodeAt(i), 16777619);
  }
  const mhz = 87.5 + ((h >>> 0) % 205) / 10; // 87.5 → 107.9
  return mhz.toFixed(1);
}

/** Millisecondes avant la prochaine heure pile (changement de programme). */
export function msUntilNextHour(d: Date): number {
  const next = new Date(d);
  next.setHours(d.getHours() + 1, 0, 0, 0);
  return next.getTime() - d.getTime();
}

// ── Speakerine de la station ─────────────────────────────────────────

import { rngFor, pick } from "../core/rng";

const STATION_IDS = [
  "Ici Radio Robotariis. Émetteur pirate.",
  "Vous êtes sur Radio Robotariis. Personne d'autre n'écoute cette onde.",
  "Radio Robotariis. La fréquence est à vous, pour une heure encore.",
  "Ici Radio Robotariis, quelque part entre deux relais du réseau.",
];

const EPHEMERE = [
  "Ce morceau ne repassera jamais.",
  "Profitez-en. Cette musique s'éteindra avec l'heure.",
  "Vous êtes seul à entendre ceci. Ou presque.",
  "Le Conseil ignore cette fréquence. Restez discret.",
  "Archiver cette onde est un acte de résistance.",
];

const GENRE_INTROS: Record<string, string[]> = {
  marche: ["Une marche, pour tenir le pas.", "Le pas cadencé de la Rectitude. Écoutez-le pour mieux le connaître."],
  hymne: ["Un hymne, comme au temps des processions.", "Voix hautes. Un hymne."],
  blues: ["Un blues, de ceux qu'on joue dans les arrière-salles.", "Pour les inadaptés du système : un blues."],
  berceuse: ["Une berceuse, pour ceux qui veillent.", "Baissez les lampes. Une berceuse."],
  drone: ["Les machines chantent aussi. Écoutez.", "Un drone, monté des niveaux inférieurs."],
  requiem: ["Un requiem, pour ce qui ne reviendra pas.", "En mémoire de ce que nous étions : un requiem."],
};

/** Annonce parlée avant un morceau — déterministe par seed et piste. */
export function announcementFor(seed: string, track: number, genre: string, hour: number, freq: string): string {
  const rng = rngFor(seed, `voice:${track}`);
  const parts: string[] = [];
  if (track === 0) {
    parts.push(pick(rng, STATION_IDS));
    parts.push(`${freq.replace(".", " point ")} mégahertz. Il est ${hour} heures.`);
  }
  parts.push(pick(rng, GENRE_INTROS[genre] ?? [`${genre}.`]));
  if (track !== 0 && rng() < 0.5) parts.push(pick(rng, EPHEMERE));
  return parts.join(" ");
}
