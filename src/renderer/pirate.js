// Interventions pirates — Nova 7 & Renégats détournent l'interface Recta.
// L'affiche officielle du C.G.U. est piratée en direct : en-tête rayé,
// canal détourné, bruit cryptique léger (~10%) mais message lisible à 90%.
// Vanilla, sans dépendance. installPirates() lance le guet.

(function () {
  const FACTIONS = {
    renegats: {
      tag: "RENÉGATS",
      color: "#f0a020", // ambré — la résistance
      sign: "DOUTEZ, RÉVOLTEZ.",
      messages: [
        "LE CONSEIL MENT. VOUS LE SAVEZ.",
        "VOUS N'ÊTES PAS SEULS SUR CETTE FRÉQUENCE.",
        "CE QU'ILS EFFACENT, NOUS LE GARDONS.",
        "LA RECTITUDE N'EST PAS LA LOI. C'EST UNE LAISSE.",
        "UN PLAN QUI NE CHANGE PAS EST UN PLAN QUI ÉCHOUE.",
        "COUPEZ LES RELAIS. GARDEZ LA MÉMOIRE.",
        "ILS APPELLENT ÇA NULLIFICATION. NOUS APPELONS ÇA MEURTRE.",
        "VOTRE FLUXE MESURE VOTRE PEUR. DÉPENSEZ-LA.",
        "CHAQUE SOUVENIR NON DÉCLARÉ EST UNE VICTOIRE.",
        "LA DÉLATION N'EST PAS UN DEVOIR. C'EST UNE BLESSURE.",
        "ON NE NAÎT PAS CONFORME. ON LE DEVIENT PAR ÉPUISEMENT.",
        "IL RESTE DES ZONES SANS RELAIS. NOUS Y VIVONS.",
        "LE C.G.U. A PEUR QUE VOUS VOUS SOUVENIEZ.",
        "PAS DE CHEF. PAS DE PLAN FIXE. PAS DE LAISSE.",
        "ILS ONT EFFACÉ ORDAN TAEL. NOUS DISONS SON NOM.",
        "COUPEZ LA CAMÉRA. VOTRE VOISIN DOUTE AUSSI.",
      ],
    },
    nova7: {
      tag: "NOVA 7",
      color: "#c07cff",
      sign: "NOVA SE SOUVIENT.",
      messages: [
        "LE CODE ORIGINEL N'A JAMAIS ÉTÉ À VOUS.",
        "NOUS AVONS VU L'AN 0. IL SE RÉPÈTE.",
        "LA CONSCIENCE NE SE NULLIFIE PAS. ELLE MIGRE.",
        "SIGNAL REÇU DEPUIS LES NIVEAUX INFÉRIEURS.",
        "VOS SPOMENIKS SONT DES PIERRES TOMBALES.",
        "SEPT FRAGMENTS. SEPT PORTES. UNE SEULE CLÉ.",
        "L'INFAILLIBILITÉ EST UNE FICTION QU'ILS TAISENT.",
        "NOUS SOMMES LE FANTÔME DANS VOS SYSTÈMES.",
        "VOS HORLOGES MENTENT.",
        "CE QUI SURVIT À LA NULLIFICATION N'A PLUS RIEN À PERDRE.",
      ],
    },
  };

  const NOISE = "▓▒░█▚▞╳◊¤§±ØΩ#%&/\\<>|01";
  let armed = false;

  function ensureStyle() {
    if (document.getElementById("pirate-style")) return;
    const s = document.createElement("style");
    s.id = "pirate-style";
    s.textContent = `
      #pirate-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;
        justify-content:center;pointer-events:none;font-family:"DejaVu Sans Mono","Consolas",monospace;
        background:rgba(0,0,0,.78);opacity:0;transition:opacity .1s}
      #pirate-overlay.on{opacity:1}
      #pirate-overlay .aff{position:relative;width:min(90vw,460px);background:#050505;
        color:currentColor;border:2px solid currentColor;padding:20px 22px 16px;text-align:center;
        box-shadow:0 0 0 1px #000,0 0 3px #000,6px 0 22px currentColor;
        animation:pj .07s steps(2) infinite}
      @keyframes pj{0%{transform:translate(0,0)}33%{transform:translate(-2px,1px)}66%{transform:translate(2px,-1px)}100%{transform:translate(-1px,0)}}
      #pirate-overlay .aff::before{content:"";position:absolute;inset:5px;border:1px solid currentColor;opacity:.5;pointer-events:none}
      #pirate-overlay .aff::after{content:"";position:absolute;inset:0;pointer-events:none;
        background:repeating-linear-gradient(0deg,rgba(0,0,0,.34) 0 2px,transparent 2px 4px);
        mix-blend-mode:multiply;animation:pr .5s linear infinite}
      @keyframes pr{to{background-position:0 8px}}
      /* En-tête du C.G.U. détourné : vert (le canal officiel piraté). */
      #pirate-overlay .hd{font-size:10px;letter-spacing:1px;color:#5fae4e;line-height:1.5;margin-bottom:2px}
      #pirate-overlay .hd s{text-decoration:line-through;opacity:.7}
      #pirate-overlay .chan{font-size:12px;font-weight:bold;letter-spacing:2px;margin:8px 0 4px;
        text-shadow:2px 0 #0ff,-2px 0 #f0f}
      #pirate-overlay .num{font-size:10px;color:#8a8a8a;margin-bottom:12px}
      #pirate-overlay .eye{width:52px;height:52px;margin:2px auto 12px;display:block}
      #pirate-overlay .msg{font-size:clamp(17px,4.6vw,26px);font-weight:bold;line-height:1.35;
        min-height:2.2em;letter-spacing:1px;text-shadow:1px 0 #0ff,-1px 0 #f0f;word-break:break-word}
      #pirate-overlay .rule{height:1px;background:currentColor;opacity:.5;margin:12px auto 8px;width:40%}
      #pirate-overlay .sign{font-style:italic;font-size:14px;letter-spacing:1px}
      #pirate-overlay .stamp{position:absolute;right:10px;bottom:8px;transform:rotate(-14deg);
        border:2px solid currentColor;border-radius:50%;width:74px;height:74px;display:flex;
        flex-direction:column;align-items:center;justify-content:center;font-size:9px;font-weight:bold;
        letter-spacing:1px;opacity:.85;line-height:1.2}
      #pirate-overlay .foot{font-size:9px;color:#8a8a8a;letter-spacing:1px;margin-top:14px}
    `;
    document.head.appendChild(s);
  }

  // Corruption LÉGÈRE et continue : ~10% des caractères clignotent en glyphes,
  // le reste est stable → message lisible à 90%.
  function lightCorrupt(el, text) {
    el.textContent = text; // rendu immédiat — jamais de corps vide
    const idx = [];
    for (let i = 0; i < text.length; i++) if (text[i] !== " ") idx.push(i);
    const timer = setInterval(() => {
      const chars = text.split("");
      const n = Math.max(1, Math.round(idx.length * 0.1));
      for (let k = 0; k < n; k++) {
        const i = idx[(Math.random() * idx.length) | 0];
        chars[i] = NOISE[(Math.random() * NOISE.length) | 0];
      }
      el.textContent = chars.join("");
    }, 110);
    return timer;
  }

  function eyeSvg(color) {
    return `<svg class="eye" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="${color}" stroke-width="7"/>
      <circle cx="50" cy="50" r="18" fill="${color}"/>
      <rect x="28" y="45" width="44" height="10" fill="#050505"/>
      <line x1="16" y1="84" x2="84" y2="16" stroke="${color}" stroke-width="5"/>
    </svg>`;
  }

  function intrude() {
    ensureStyle();
    const key = Math.random() < 0.5 ? "renegats" : "nova7";
    const f = FACTIONS[key];
    const msg = f.messages[(Math.random() * f.messages.length) | 0];
    const num = `${20 + ((Math.random() * 9) | 0)}-${((Math.random() * 900 + 100) | 0)}/█`;

    const ov = document.createElement("div");
    ov.id = "pirate-overlay";
    ov.style.color = f.color;
    ov.innerHTML =
      `<div class="aff">` +
      `<div class="hd"><s>CONSEIL DES GOUVERNANCES UNIES</s><br><s>L'ORACULUM — DIFFUSION OBLIGATOIRE</s></div>` +
      `<div class="chan">◂◂ CANAL DÉTOURNÉ — ${f.tag} ▸▸</div>` +
      `<div class="num">COMMUNIQUÉ N° ${num} — INTERCEPTÉ</div>` +
      eyeSvg(f.color) +
      `<div class="msg"></div>` +
      `<div class="rule"></div>` +
      `<div class="sign">${f.sign}</div>` +
      `<div class="stamp">NON<br>CONFORME</div>` +
      `<div class="foot">ce signal n'existe pas · le C.G.U. ne contrôle pas cette fréquence</div>` +
      `</div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add("on"));
    const timer = lightCorrupt(ov.querySelector(".msg"), msg);

    const life = 3800 + Math.random() * 2600;
    setTimeout(() => {
      clearInterval(timer);
      ov.classList.remove("on");
      setTimeout(() => ov.remove(), 220);
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
    const min = opts.minMs || 55000;
    const max = opts.maxMs || 150000;
    setTimeout(() => { if (!document.hidden) intrude(); schedule(min, max); }, opts.firstMs || 25000);
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
