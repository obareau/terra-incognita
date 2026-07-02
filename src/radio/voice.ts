// Speakerine de Radio Robotariis — Web Speech API.
// Voix grave, débit posé : l'annonceuse d'un émetteur pirate rétrofuturiste.

let voice: SpeechSynthesisVoice | null = null;

function pickVoice(): void {
  const all = window.speechSynthesis?.getVoices() ?? [];
  // Priorité aux voix françaises ; sinon la voix par défaut fera l'affaire.
  voice =
    all.find((v) => v.lang.startsWith("fr") && v.localService) ??
    all.find((v) => v.lang.startsWith("fr")) ??
    all[0] ??
    null;
}

export function voiceAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function initVoice(): void {
  if (!voiceAvailable()) return;
  pickVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

/**
 * Parle, puis appelle `done` (aussi en cas d'échec ou d'absence de voix —
 * la musique ne doit jamais rester bloquée sur une annonce).
 */
export function speak(text: string, done: () => void): void {
  if (!voiceAvailable()) return done();
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? "fr-FR";
    u.rate = 0.92;
    u.pitch = 0.55; // grave — speakerine d'État détournée
    u.volume = 1;
    let finished = false;
    const finish = (): void => {
      if (!finished) {
        finished = true;
        done();
      }
    };
    u.onend = finish;
    u.onerror = finish;
    // Garde-fou : certaines plateformes n'émettent jamais onend.
    setTimeout(finish, 4000 + text.length * 90);
    window.speechSynthesis.speak(u);
  } catch {
    done();
  }
}

export function shutUp(): void {
  if (voiceAvailable()) window.speechSynthesis.cancel();
}
