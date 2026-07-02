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

/**
 * Seed du programme : anniversaire × instant précis de la mise sous tension
 * (à la seconde). Chaque TUNE IN est une onde nouvelle — aucune ne revient.
 */
export function stationSeed(birthday: string, d: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `radio:${birthday}:${hourKey(d)}:${p(d.getMinutes())}${p(d.getSeconds())}`;
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

// ── Speakerine : grammaire combinatoire seedée ───────────────────────
// Des gabarits à trous remplis par des lexiques ancrés dans le lore —
// des dizaines de milliers d'annonces possibles, toutes déterministes.

import { rngFor, pick, type Rng } from "../core/rng";

const LEX: Record<string, string[]> = {
  lieu: [
    "les Anciens Docks", "Sigma-7", "Port Alpha", "les niveaux inférieurs",
    "la ceinture d'Helion", "les Jardins suspendus", "les friches de l'Est",
    "la zone de quarantaine", "les galeries clandestines", "la Colonie Émeraude",
  ],
  autorite: [
    "le Conseil", "la Rectitude", "les Pasteurs", "la Division Dark Umbrae",
    "les patrouilles", "les Briseurs de Conscience",
  ],
  auditeur: [
    "les inadaptés", "les veilleurs", "ceux qui doutent", "les archivistes libres",
    "les insoumis", "ceux qui restent", "les consciences en fuite",
  ],
  sombre: [
    "La nuit est longue sur les Mondes", "Les relais tombent un à un",
    "Quelque part, une conscience s'éteint", "Le réseau oublie plus vite que nous",
    "L'électricité est rationnée, pas la musique", "Les miradors balaient les toits",
    "Il paraît qu'on démonte encore un quartier",
  ],
  injonction: [
    "Restez à l'écoute", "Baissez le volume, pas la garde", "Doutez, révoltez",
    "N'archivez rien, souvenez-vous de tout", "Éteignez les lampes, ouvrez les oreilles",
    "Ne répétez pas cette fréquence",
  ],
  ephemere: [
    "Ce morceau ne repassera jamais", "Cette onde meurt à la fin de l'heure",
    "Vous êtes seul à entendre ceci", "Personne ne pourra rejouer cet instant",
    "Ce qui suit n'existera qu'une fois",
  ],
  origine: [
    "monté des ateliers", "sorti des mémoires mortes", "capté entre deux brouillages",
    "sauvé d'une bande magnétique", "composé par personne", "trouvé dans un fragment mémoriel",
  ],
};

const STATION_TPL = [
  "Ici Radio Robotariis, quelque part vers {lieu}.",
  "Radio Robotariis. {autorite} ne connaît pas cette fréquence.",
  "Vous êtes sur Radio Robotariis, la voix de {auditeur}.",
  "Ici Radio Robotariis. Émetteur pirate, relais de {lieu}.",
];

const GENRE_TPL: Record<string, string[]> = {
  marche: ["Une marche, {origine}. Pour tenir le pas.", "Une marche. Le pas de {autorite} résonne — apprenez-le pour mieux l'esquiver."],
  hymne: ["Un hymne, {origine}. Comme au temps des processions.", "Voix hautes pour {auditeur} : un hymne."],
  blues: ["Un blues, {origine}. De ceux qu'on joue vers {lieu}.", "Pour {auditeur} : un blues."],
  berceuse: ["Une berceuse, {origine}. Pour ceux qui veillent sur {lieu}.", "Baissez les lampes. Une berceuse pour {auditeur}."],
  drone: ["Un drone, {origine}. Les machines de {lieu} chantent aussi.", "Un drone. Écoutez ce que {autorite} ne sait pas faire taire."],
  requiem: ["Un requiem, {origine}. Pour ce qui ne reviendra pas.", "Un requiem, en mémoire de {lieu}. De ce que nous y étions."],
};

const FILLER_TPL = [
  "{ephemere}.",
  "{sombre}. {injonction}.",
  "{ephemere}. {injonction}.",
];

/** Remplit récursivement les {trous} d'un gabarit, puis élide le français. */
export function expand(template: string, rng: Rng): string {
  const filled = template.replace(/\{(\w+)\}/g, (_, slot: string) => {
    const pool = LEX[slot];
    return pool ? expand(pick(rng, pool), rng) : slot;
  });
  return filled
    .replace(/\bde les\b/g, "des")
    .replace(/\bde le\b/g, "du")
    .replace(/\bde (Anciens|archivistes|insoumis)/g, "d'$1");
}

/** Annonce parlée avant un morceau — déterministe par seed et piste. */
export function announcementFor(seed: string, track: number, genre: string, hour: number, freq: string): string {
  const rng = rngFor(seed, `voice:${track}`);
  const parts: string[] = [];
  if (track === 0) {
    parts.push(expand(pick(rng, STATION_TPL), rng));
    parts.push(`${freq.replace(".", " point ")} mégahertz. Il est ${hour} heures.`);
  }
  parts.push(expand(pick(rng, GENRE_TPL[genre] ?? [`${genre}.`]), rng));
  if (track !== 0 && rng() < 0.6) parts.push(expand(pick(rng, FILLER_TPL), rng));
  return parts.join(" ");
}
