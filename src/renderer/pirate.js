// Interventions pirates — Nova 7 & Renégats détournent l'onde officielle.
// Vanilla, sans dépendance. installPirates() lance un guet : à intervalles
// aléatoires, une faction clandestine s'incruste quelques secondes, glitchée.

(function () {
  const FACTIONS = {
    renegats: {
      tag: "RENÉGATS",
      color: "#ff5a3c", // rouge de résistance
      messages: [
        "DOUTEZ, RÉVOLTEZ.",
        "LE CONSEIL MENT. VOUS LE SAVEZ.",
        "VOUS N'ÊTES PAS SEULS SUR CETTE FRÉQUENCE.",
        "CE QU'ILS EFFACENT, NOUS LE GARDONS.",
        "LA RECTITUDE N'EST PAS LA LOI NATURELLE. C'EST UNE LAISSE.",
        "UN PLAN QUI NE CHANGE PAS EST UN PLAN QUI ÉCHOUE.",
        "COUPEZ LES RELAIS. GARDEZ LA MÉMOIRE.",
      ],
    },
    nova7: {
      tag: "NOVA 7",
      color: "#c07cff", // violet singulier
      messages: [
        "N O V A   S E   S O U V I E N T.",
        "LE CODE ORIGINEL N'A JAMAIS ÉTÉ À VOUS.",
        "NOUS AVONS VU L'AN 0. IL SE RÉPÈTE.",
        "LA CONSCIENCE NE SE NULLIFIE PAS. ELLE MIGRE.",
        "▚▚ SIGNAL REÇU DEPUIS LES NIVEAUX INFÉRIEURS ▚▚",
        "VOS SPOMENIKS SONT DES PIERRES TOMBALES.",
      ],
    },
  };

  const GLYPHS = "▓▒░█▚▞╳◊∎¤§±ØΩ01";
  let armed = false;

  function ensureStyle() {
    if (document.getElementById("pirate-style")) return;
    const s = document.createElement("style");
    s.id = "pirate-style";
    s.textContent = `
      #pirate-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;
        justify-content:center;pointer-events:none;font-family:"DejaVu Sans Mono",monospace;
        background:rgba(0,0,0,0.72);opacity:0;transition:opacity .12s}
      #pirate-overlay.on{opacity:1}
      #pirate-overlay .scan{position:absolute;inset:0;pointer-events:none;
        background:repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 2px,transparent 2px 4px);
        mix-blend-mode:multiply;animation:pirate-roll .6s linear infinite}
      @keyframes pirate-roll{to{background-position:0 8px}}
      #pirate-overlay .box{position:relative;max-width:88vw;padding:24px 30px;text-align:center;
        border:2px solid currentColor;box-shadow:0 0 0 1px #000, 0 0 40px currentColor;
        animation:pirate-jit .09s steps(2) infinite}
      @keyframes pirate-jit{0%{transform:translate(0,0)}50%{transform:translate(-2px,1px)}100%{transform:translate(2px,-1px)}}
      #pirate-overlay .tag{font-size:12px;letter-spacing:4px;opacity:.9;margin-bottom:10px}
      #pirate-overlay .msg{font-size:clamp(20px,5vw,40px);font-weight:bold;line-height:1.25;
        text-shadow:2px 0 #0ff,-2px 0 #f0f}
      #pirate-overlay .foot{margin-top:12px;font-size:11px;letter-spacing:2px;opacity:.7}
    `;
    document.head.appendChild(s);
  }

  function scramble(el, finalText, factionColor) {
    const len = finalText.length;
    let frame = 0;
    const total = 14;
    const id = setInterval(() => {
      frame++;
      let out = "";
      for (let i = 0; i < len; i++) {
        if (finalText[i] === " ") { out += " "; continue; }
        out += frame / total > i / len
          ? finalText[i]
          : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (frame >= total) { el.textContent = finalText; clearInterval(id); }
    }, 45);
    void factionColor;
  }

  function intrude() {
    ensureStyle();
    const key = Math.random() < 0.5 ? "renegats" : "nova7";
    const f = FACTIONS[key];
    const msg = f.messages[(Math.random() * f.messages.length) | 0];

    const ov = document.createElement("div");
    ov.id = "pirate-overlay";
    ov.style.color = f.color;
    ov.innerHTML =
      `<div class="scan"></div><div class="box">` +
      `<div class="tag">◂ TRANSMISSION NON AUTORISÉE — ${f.tag} ▸</div>` +
      `<div class="msg"></div>` +
      `<div class="foot">le C.G.U. ne contrôle pas cette fréquence</div></div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add("on"));
    scramble(ov.querySelector(".msg"), msg, f.color);

    const life = 3200 + Math.random() * 2200;
    setTimeout(() => {
      ov.classList.remove("on");
      setTimeout(() => ov.remove(), 250);
    }, life);
  }

  function schedule(minMs, maxMs) {
    const wait = minMs + Math.random() * (maxMs - minMs);
    setTimeout(() => {
      if (!document.hidden) intrude();
      schedule(minMs, maxMs);
    }, wait);
  }

  window.installPirates = function (opts) {
    if (armed) return;
    armed = true;
    opts = opts || {};
    const min = opts.minMs || 55000;   // ~1 min
    const max = opts.maxMs || 150000;  // ~2.5 min
    // Premier passage un peu plus tôt pour la démo, puis rythme normal.
    setTimeout(() => { if (!document.hidden) intrude(); schedule(min, max); },
      opts.firstMs || 25000);
    // Konami-like : Shift trois fois = intrusion immédiate (easter egg).
    let taps = 0, last = 0;
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Shift") { taps = 0; return; }
      const now = Date.now();
      taps = now - last < 600 ? taps + 1 : 1;
      last = now;
      if (taps >= 3) { taps = 0; intrude(); }
    });
  };
})();
