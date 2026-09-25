// Rymdresan: John och Vera reser tillsammans genom olika planeter i Hänga
// gubbe. Varje avklarad omgång (vunnen ELLER förlorad) ger bränsle — ingen
// bestraffas för att missa, det bär bara framåt olika fort. Vid full tank
// lyfter skeppet till nästa planet med ett nytt ordtema. Resan är delad,
// inte per spelare — den finns till för att fira dem som lag, inte för att
// jämföra dem (jfr sound.js/hangman.js-mönstret för localStorage-sparning).
//
// Luffarschack påverkas inte av detta alls.

const JOURNEY_STORAGE_KEY = "rymdarkaden-journey-v1";

const FUEL_PER_WIN = 2;
const FUEL_PER_LOSS = 1;

// De två första planeterna kräver mindre bränsle (~2 omgångar) så resan
// känns igång snabbt; resten kräver mer (~3-6 omgångar) när konceptet
// redan känns kul. Ordlistorna är tematiska så Hänga gubbe samtidigt
// tränar ord kopplade till varje planet.
const PLANETS = [
  {
    id: "djur", name: "Djurplaneten", fuelNeeded: 8, icon: "🐾",
    bg: "linear-gradient(180deg, #142b12, #0d0d1a)",
    sceneColor: "#7CFC00", scene: ["fence", "barn", "tree", "tree"],
    words: [
      "hund", "katt", "häst", "ko", "gris", "get", "höna", "tupp", "anka",
      "fisk", "fågel", "groda", "orm", "mus", "räv", "varg", "björn",
      "zebra", "giraff", "elefant", "känguru", "panda", "tiger", "lejon", "apa",
    ],
  },
  {
    id: "dinosaurie", name: "Dinosaurieplaneten", fuelNeeded: 8, icon: "🦖",
    bg: "linear-gradient(180deg, #2b1a12, #0d0d1a)",
    sceneColor: "#ff7043", scene: ["mountain", "volcano", "mountain"],
    words: [
      "ägg", "ödla", "klor", "svans", "tänder", "fossil", "jätte", "museum",
      "spår", "vulkan", "meteor", "grotta", "skelett", "sten", "hals",
      "vinge", "gap", "stor", "liten",
    ],
  },
  {
    id: "mat", name: "Matplaneten", fuelNeeded: 12, icon: "🍽️",
    bg: "linear-gradient(180deg, #2b2312, #0d0d1a)",
    sceneColor: "#ffca28", scene: ["tree", "ball", "tree", "ball"],
    words: [
      "äpple", "banan", "apelsin", "päron", "jordgubbe", "glass", "kaka",
      "bulle", "bröd", "smör", "ost", "mjölk", "saft", "soppa", "pizza",
      "pasta", "ris", "potatis", "morot", "gurka", "tomat", "korv",
      "köttbullar", "sallad",
    ],
  },
  {
    id: "trafik", name: "Trafikplaneten", fuelNeeded: 12, icon: "🚦",
    bg: "linear-gradient(180deg, #12222b, #0d0d1a)",
    sceneColor: "#4fc3f7", scene: ["car", "antenna", "car"],
    words: [
      "bil", "buss", "tåg", "cykel", "moped", "lastbil", "taxi", "flygplan",
      "båt", "skepp", "väg", "gata", "bro", "tunnel", "stopp", "skylt",
      "lykta", "hjälm", "hjul", "parkering", "korsning", "rondell",
    ],
  },
  {
    id: "skola", name: "Skolplaneten", fuelNeeded: 12, icon: "🔤",
    bg: "linear-gradient(180deg, #1a1230, #0d0d1a)",
    sceneColor: "#ba68c8", scene: ["board", "book", "book"],
    words: [
      "skola", "lärare", "elev", "penna", "sudd", "linjal", "bok", "häfte",
      "ryggsäck", "tavla", "stol", "bord", "rast", "lektion", "matte",
      "svenska", "idrott", "kompis", "fröken", "läxa",
    ],
  },
  {
    id: "sport", name: "Sportplaneten", fuelNeeded: 12, icon: "🏟️",
    bg: "linear-gradient(180deg, #122b1e, #0d0d1a)",
    sceneColor: "#66bb6a", scene: ["goalpost", "ball", "goalpost"],
    words: [
      "boll", "mål", "fotboll", "hockey", "simning", "löpning", "cykling",
      "tennis", "skidor", "skridskor", "medalj", "lag", "domare", "match",
      "tränare", "arena", "publik", "seger", "träning",
    ],
  },
  {
    id: "robot", name: "Robotplaneten", fuelNeeded: 12, icon: "⚙️",
    bg: "linear-gradient(180deg, #1a1a2b, #0d0d1a)",
    sceneColor: "#90a4ae", scene: ["antenna", "gear", "antenna"],
    words: [
      "robot", "skruv", "batteri", "kabel", "knapp", "skärm", "lampa",
      "motor", "raket", "rymdskepp", "astronaut", "planet", "måne",
      "stjärna", "satellit", "fjärrkontroll", "dator", "sladd",
    ],
  },
  {
    id: "hav", name: "Havsplaneten", fuelNeeded: 12, icon: "🏝️",
    bg: "linear-gradient(180deg, #0f2530, #0d0d1a)",
    sceneColor: "#26c6da", scene: ["wave", "shell", "wave", "shell"],
    words: [
      "hav", "våg", "krabba", "bläckfisk", "sjöstjärna", "val", "delfin",
      "haj", "säl", "mussla", "korall", "sand", "strand", "simma",
      "snorkel", "alger", "fisk", "brygga",
    ],
  },
  {
    id: "vader", name: "Väderplaneten", fuelNeeded: 12, icon: "🌦️",
    bg: "linear-gradient(180deg, #1c1c2e, #0d0d1a)",
    sceneColor: "#90caf9", scene: ["cloud", "raindrop", "cloud", "raindrop"],
    words: [
      "sol", "regn", "snö", "moln", "vind", "storm", "åska", "blixt", "is",
      "dimma", "kyla", "värme", "paraply", "stövlar", "regnbåge", "frost",
      "hagel", "halka",
    ],
  },
  {
    id: "kropp", name: "Kroppsplaneten", fuelNeeded: 12, icon: "🧍",
    bg: "linear-gradient(180deg, #2b1224, #0d0d1a)",
    sceneColor: "#f06292", scene: ["person", "person", "person"],
    words: [
      "huvud", "hår", "öga", "öra", "näsa", "mun", "tand", "hals", "arm",
      "hand", "finger", "mage", "ben", "fot", "tå", "rygg", "axel", "knä",
    ],
  },
  {
    id: "natur", name: "Naturplaneten", fuelNeeded: 12, icon: "🌱",
    bg: "linear-gradient(180deg, #16281a, #0d0d1a)",
    sceneColor: "#81c784", scene: ["mountain", "tree", "tree", "tree"],
    words: [
      "träd", "skog", "blomma", "gräs", "löv", "gren", "rot", "sten",
      "berg", "sjö", "bäck", "mossa", "svamp", "bär", "kotte", "eld",
      "lägereld", "stig",
    ],
  },
  {
    id: "musik", name: "Musikplaneten", fuelNeeded: 12, icon: "🎵",
    bg: "linear-gradient(180deg, #241230, #0d0d1a)",
    sceneColor: "#ce93d8", scene: ["note", "note", "note"],
    words: [
      "sång", "gitarr", "trumma", "piano", "flöjt", "fiol", "mikrofon",
      "högtalare", "dans", "trumpet", "tamburin", "scen", "konsert", "orkester",
      "kör", "musiker",
    ],
  },
];

// Bildledtråden i Hänga gubbe (se renderHangmanClue() i hangman.js): en
// emoji för ord som har en tydlig, konkret bild. Ord som saknar en (t.ex.
// "stor", "läxa") utelämnas helt härifrån med flit — en gissad eller
// missvisande bild är sämre än att falla tillbaka på planetens egen symbol
// (planet.icon ovan). "fisk", "sten" och "hals" finns på två planeter men
// får bara en gemensam bild här, eftersom kartan är nyckel-på-ord, inte
// nyckel-på-planet.
// Bara emoji ur Unicode Emoji 13 (2020) eller äldre — nyare tecken (t.ex.
// 🪸, 🪼) kan visas som tomma rutor på äldre Android-telefoner.
const WORD_PICTURES = {
  // Djurplaneten
  hund: "🐕", katt: "🐈", häst: "🐎", ko: "🐄", gris: "🐷", get: "🐐",
  höna: "🐔", tupp: "🐓", anka: "🦆", fisk: "🐟", fågel: "🐦", groda: "🐸",
  orm: "🐍", mus: "🐭", räv: "🦊", varg: "🐺", björn: "🐻", zebra: "🦓",
  giraff: "🦒", elefant: "🐘", känguru: "🦘", panda: "🐼", tiger: "🐅",
  lejon: "🦁", apa: "🐒",

  // Dinosaurieplaneten — "stor"/"liten"/"svans"/"jätte" saknar en
  // rimlig egen bild (rena storleksord, eller inget bra emoji finns) och
  // faller därför tillbaka på planetens symbol, med flit.
  ägg: "🥚", ödla: "🦎", tänder: "🦷", museum: "🏛️", vulkan: "🌋",
  meteor: "☄️", skelett: "💀", sten: "🪨", klor: "🐾", fossil: "🦴",
  spår: "👣", grotta: "🕳️", hals: "🦒", vinge: "🐦", gap: "🐊",

  // Matplaneten
  äpple: "🍎", banan: "🍌", apelsin: "🍊", päron: "🍐", jordgubbe: "🍓",
  glass: "🍦", kaka: "🍪", bröd: "🍞", smör: "🧈", ost: "🧀", mjölk: "🥛",
  saft: "🧃", soppa: "🍲", pizza: "🍕", pasta: "🍝", ris: "🍚",
  potatis: "🥔", morot: "🥕", gurka: "🥒", tomat: "🍅", korv: "🌭",
  sallad: "🥗",

  // Trafikplaneten — "hjul" och "rondell" saknar en bra bild (för nya
  // för de gamla emoji-versionerna vi håller oss till, respektive inget
  // eget emoji finns) och faller tillbaka på planetens symbol.
  bil: "🚗", buss: "🚌", tåg: "🚆", cykel: "🚲", moped: "🛵",
  lastbil: "🚚", taxi: "🚕", flygplan: "✈️", båt: "⛵", skepp: "🚢",
  bro: "🌉", stopp: "🛑", skylt: "🪧", hjälm: "⛑️", parkering: "🅿️",
  väg: "🛣️", gata: "🏙️", tunnel: "🚇", lykta: "💡", korsning: "🚸",

  // Skolplaneten — "tavla"/"bord"/"sudd"/"rast" saknar ett bra eget
  // emoji och faller tillbaka på planetens symbol.
  skola: "🏫", penna: "✏️", linjal: "📏", bok: "📖", häfte: "📓",
  ryggsäck: "🎒", stol: "🪑", lärare: "🧑‍🏫", elev: "🧑‍🎓",
  lektion: "📚", matte: "🔢", svenska: "🇸🇪", idrott: "⚽",
  kompis: "🧑‍🤝‍🧑", fröken: "🍎", läxa: "📝",

  // Sportplaneten — "boll" och "fotboll" delar annars samma bild; boll
  // faller tillbaka på planetens symbol istället för en gissad egen bild.
  // "arena" faller också tillbaka med flit — planetens symbol (🏟️) ÄR en
  // arena, så det är en korrekt bild där, inte en missvisande gissning.
  mål: "🥅", fotboll: "⚽", hockey: "🏒", simning: "🏊",
  löpning: "🏃", cykling: "🚴", tennis: "🎾", skidor: "⛷️",
  skridskor: "⛸️", medalj: "🏅", seger: "🏆", lag: "👥",
  domare: "🧑‍⚖️", match: "🆚", tränare: "📢", publik: "🙌",
  träning: "🏋️",

  // Robotplaneten — "motor" faller tillbaka med flit, samma resonemang
  // som "arena" på Sportplaneten (planetens symbol ⚙️ är själv en
  // mekanisk del, en korrekt bild, inte en gissning). "fjärrkontroll"
  // saknar ett bra eget emoji.
  robot: "🤖", skruv: "🔩", batteri: "🔋", kabel: "🔌", knapp: "🔘",
  skärm: "🖥️", lampa: "💡", raket: "🚀", rymdskepp: "🛸",
  astronaut: "🧑‍🚀", planet: "🪐", måne: "🌙", stjärna: "⭐",
  // "kabel" och "sladd" delar annars samma bild (🔌); sladd faller
  // tillbaka på planetens symbol.
  satellit: "🛰️", dator: "💻",

  // Havsplaneten — "hav" och "våg" delar annars samma bild; våg faller
  // tillbaka på planetens symbol. "sjöstjärna"/"korall"/"sand" saknar
  // ett bra eget emoji (eller är för nytt — 🪸 för korall kom 2021).
  hav: "🌊", krabba: "🦀", bläckfisk: "🐙", val: "🐋",
  delfin: "🐬", haj: "🦈", säl: "🦭", mussla: "🐚", strand: "🏖️",
  simma: "🏊", snorkel: "🤿", alger: "🌿", brygga: "⚓",

  // Väderplaneten
  sol: "☀️", regn: "🌧️", snö: "❄️", moln: "☁️", vind: "💨",
  storm: "🌪️", åska: "⛈️", blixt: "⚡", is: "🧊", dimma: "🌫️",
  kyla: "🥶", värme: "🥵", paraply: "☔", stövlar: "👢",
  regnbåge: "🌈",

  // Kroppsplaneten — "mage"/"tå"/"rygg"/"knä" saknar ett bra eget emoji.
  öga: "👁️", öra: "👂", näsa: "👃", mun: "👄", tand: "🦷", arm: "💪",
  hand: "✋", finger: "☝️", ben: "🦵", fot: "🦶", huvud: "🎩",
  hår: "💇", hals: "🦒", axel: "🤷",

  // Naturplaneten — "eld" och "lägereld" delade annars samma bild;
  // lägereld har nu en egen (🏕️, campingtema). "gren"/"rot"/"bäck"/
  // "mossa"/"kotte" saknar ett bra eget emoji.
  träd: "🌳", skog: "🌲", blomma: "🌼", gräs: "🌿", löv: "🍃",
  berg: "⛰️", svamp: "🍄", bär: "🍓", eld: "🔥", sjö: "🏞️",
  lägereld: "🏕️", stig: "🥾",

  // Musikplaneten — "sång" och "mikrofon" delar annars samma bild; sång
  // faller tillbaka på planetens symbol (🎵 passar den bra ändå).
  // "flöjt"/"tamburin" saknar ett bra emoji i den gamla emoji-versionen
  // vi håller oss till (flöjt/tamburin-emoji kom först 2021).
  gitarr: "🎸", trumma: "🥁", piano: "🎹", fiol: "🎻",
  mikrofon: "🎤", högtalare: "🔊", dans: "💃", trumpet: "🎺",
  scen: "🎭", konsert: "🎫", orkester: "🎼", kör: "👥",
  musiker: "🧑‍🎤",
};

// Bilden till bildkortet för ett givet ord: ordets egen bild om den finns,
// annars planetens symbol som en neutral "ingen bild"-signal (aldrig en
// gissad eller missvisande bild).
function getWordPicture(word, planet) {
  const key = word.toLowerCase();
  return Object.hasOwn(WORD_PICTURES, key) ? WORD_PICTURES[key] : planet.icon;
}

// Enkla siluett-former som byggs ihop till en liten temascen bakom själva
// hänga gubbe-teckningen (se buildPlanetSceneSVG/renderPlanetScene i
// hangman.js) — så "djurplaneten" faktiskt ser ut som stall/djungel, inte
// bara en färgad bakgrund. Varje form är en ren SVG-sträng, centrerad på
// x, ritad mot samma 200x220-koordinatsystem som galg-SVG:n
// (#hangman-svg) delar rityta med, med marklinjen vid y≈205 — precis ovanför
// galgens egen marklinje (y=210), så de två känns som samma golv.
const SCENE_SHAPES = {
  tree: (x) => `<rect x="${x - 4}" y="150" width="8" height="55" /><circle cx="${x}" cy="138" r="38" />`,
  barn: (x) => `<rect x="${x - 45}" y="155" width="90" height="50" /><polygon points="${x - 52},155 ${x},95 ${x + 52},155" />`,
  fence: (x) => `<rect x="${x - 45}" y="165" width="8" height="40" /><rect x="${x - 4}" y="165" width="8" height="40" /><rect x="${x + 37}" y="165" width="8" height="40" /><rect x="${x - 50}" y="172" width="100" height="8" />`,
  mountain: (x) => `<polygon points="${x - 60},205 ${x},90 ${x + 60},205" />`,
  volcano: (x) => `<polygon points="${x - 60},205 ${x},90 ${x + 60},205" /><circle cx="${x}" cy="100" r="9" fill="#ff5533" stroke="none" />`,
  wave: (x) => `<path d="M ${x - 55},180 q27,-30 55,0 q28,30 55,0" fill="none" stroke-width="6" />`,
  cloud: (x) => `<circle cx="${x - 22}" cy="55" r="18" /><circle cx="${x + 12}" cy="48" r="24" /><circle cx="${x + 42}" cy="56" r="16" />`,
  raindrop: (x) => `<path d="M ${x},85 q10,16 0,26 q-10,-10 0,-26 Z" />`,
  ball: (x) => `<circle cx="${x}" cy="185" r="24" />`,
  goalpost: (x) => `<rect x="${x - 42}" y="100" width="8" height="100" /><rect x="${x + 34}" y="100" width="8" height="100" /><rect x="${x - 42}" y="100" width="84" height="8" />`,
  book: (x) => `<rect x="${x - 32}" y="175" width="64" height="40" /><line x1="${x}" y1="175" x2="${x}" y2="215" stroke-width="3" />`,
  board: (x) => `<rect x="${x - 45}" y="120" width="90" height="55" /><line x1="${x - 30}" y1="138" x2="${x + 18}" y2="138" stroke-width="3" /><line x1="${x - 30}" y1="155" x2="${x + 6}" y2="155" stroke-width="3" />`,
  antenna: (x) => `<rect x="${x - 4}" y="100" width="8" height="105" /><circle cx="${x}" cy="88" r="14" />`,
  gear: (x) => `<circle cx="${x}" cy="150" r="32" /><circle cx="${x}" cy="150" r="12" fill="#0d0d1a" stroke="none" />`,
  car: (x) => `<rect x="${x - 45}" y="170" width="90" height="35" rx="5" /><rect x="${x - 25}" y="142" width="50" height="30" rx="5" /><circle cx="${x - 25}" cy="207" r="12" /><circle cx="${x + 25}" cy="207" r="12" />`,
  note: (x) => `<circle cx="${x - 10}" cy="195" r="17" /><rect x="${x + 6}" y="95" width="7" height="102" /><rect x="${x + 6}" y="95" width="34" height="24" />`,
  person: (x) => `<circle cx="${x}" cy="115" r="20" /><rect x="${x - 18}" y="137" width="36" height="68" rx="14" />`,
  shell: (x) => `<path d="M ${x - 28},205 Q ${x},150 ${x + 28},205 Z" /><path d="M ${x - 16},205 Q ${x},170 ${x + 16},205" fill="none" stroke-width="3" />`,
};

// Sprider ut planetens former jämnt över scenens bredd och bygger en enda
// inline-SVG av dem, i planetens egen accentfärg.
function buildPlanetSceneSVG(planet) {
  const shapes = planet.scene || [];
  const width = 200;
  const spacing = width / (shapes.length + 1);
  const shapeMarkup = shapes
    .map((shapeName, i) => {
      const draw = SCENE_SHAPES[shapeName];
      return draw ? draw(spacing * (i + 1)) : "";
    })
    .join("");
  return `<svg viewBox="0 0 ${width} 220" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
    <g fill="rgba(0,0,0,0.4)" stroke="${planet.sceneColor}" stroke-width="3" stroke-opacity="0.65">
      ${shapeMarkup}
    </g>
  </svg>`;
}

// --- Resegrafiken mellan planeter (visas i #hangman-launch-overlay) ---

// Hur varje planet ser ut som en rund himlakropp under resan: grundfärg +
// ett mönster i temat (fläckar för djur, kratrar för dinosaurier, vågor
// för havet, ...). Egen karta istället för fler fält i PLANETS, så
// resegrafikens utseende är samlat på ett ställe.
const PLANET_LOOKS = {
  djur: { base: "#3f8f2a", pattern: "spots", patternColor: "#d9a441" },
  dinosaurie: { base: "#b5532b", pattern: "craters", patternColor: "#5c2a14" },
  mat: { base: "#f2b632", pattern: "dots", patternColor: "#fff3c4" },
  trafik: { base: "#2f7fb8", pattern: "stripes", patternColor: "#e8f1f8" },
  skola: { base: "#7b4bb0", pattern: "grid", patternColor: "#e6d6ff" },
  sport: { base: "#3d9b4f", pattern: "bands", patternColor: "#bff5c6" },
  robot: { base: "#6f7f8a", pattern: "grid", patternColor: "#c9d6de" },
  hav: { base: "#1f8fb0", pattern: "waves", patternColor: "#b9f0ff" },
  vader: { base: "#6fa8dc", pattern: "bands", patternColor: "#e8f4ff" },
  kropp: { base: "#d9557f", pattern: "dots", patternColor: "#ffd1df" },
  natur: { base: "#3f7d45", pattern: "spots", patternColor: "#8fd694" },
  musik: { base: "#9b4fb0", pattern: "waves", patternColor: "#f0c8ff" },
};

// Innehållet i en 24x24-ruta som upprepas över planetens yta.
const PLANET_PATTERNS = {
  spots: (c) => `<circle cx="6" cy="6" r="4" fill="${c}" /><circle cx="18" cy="16" r="3" fill="${c}" /><circle cx="9" cy="20" r="2" fill="${c}" />`,
  craters: (c) => `<circle cx="7" cy="8" r="4" fill="none" stroke="${c}" stroke-width="2" /><circle cx="18" cy="18" r="3" fill="none" stroke="${c}" stroke-width="2" />`,
  dots: (c) => `<circle cx="6" cy="6" r="2" fill="${c}" /><circle cx="18" cy="18" r="2" fill="${c}" />`,
  stripes: (c) => `<path d="M-6,6 l12,-12 M0,24 l24,-24 M18,30 l12,-12" stroke="${c}" stroke-width="4" />`,
  grid: (c) => `<path d="M0,0 H24 M0,0 V24" stroke="${c}" stroke-width="2" fill="none" />`,
  waves: (c) => `<path d="M0,12 q6,-6 12,0 t12,0" stroke="${c}" stroke-width="3" fill="none" />`,
  bands: (c) => `<rect x="0" y="0" width="24" height="7" fill="${c}" />`,
};

function buildPlanetOrbSVG(planet, cx, cy, r) {
  const look = PLANET_LOOKS[planet.id];
  const patternId = `travel-pattern-${planet.id}`;
  const shadeId = `travel-shade-${planet.id}`;
  return `
    <defs>
      <pattern id="${patternId}" width="24" height="24" patternUnits="userSpaceOnUse">${PLANET_PATTERNS[look.pattern](look.patternColor)}</pattern>
      <radialGradient id="${shadeId}" cx="35%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
        <stop offset="60%" stop-color="#000000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.55" />
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${look.base}" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${patternId})" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${shadeId})" stroke="${planet.sceneColor}" stroke-width="2" class="travel-planet" style="--planet-glow: ${planet.sceneColor}" />
  `;
}

// Raketen ritas med nosen åt +x och centrerad kring (0,0) — hangman.js
// flyttar och vrider den längs banan. Symmetrisk kring sin egen axel, så
// den ser rätt ut även när den vrids ~180° (resan går höger → vänster).
const ROCKET_SVG = `
  <g class="travel-rocket">
    <path class="flame flame-outer" d="M -14,-4 L -32,0 L -14,4 Z" fill="#ff7a1a" />
    <path class="flame flame-inner" d="M -14,-2.5 L -24,0 L -14,2.5 Z" fill="#ffe14d" />
    <path d="M -14,-6 L -21,-12 L -8,-6 Z" fill="#ff3355" stroke="#000" stroke-width="1" />
    <path d="M -14,6 L -21,12 L -8,6 Z" fill="#ff3355" stroke="#000" stroke-width="1" />
    <path d="M -14,-6 L 8,-6 Q 18,0 8,6 L -14,6 Z" fill="#f2f2f2" stroke="#000" stroke-width="1" />
    <circle cx="1" cy="0" r="2.8" fill="#00eaff" stroke="#000" stroke-width="1" />
  </g>
`;

// Hela reseskärmen: planeten man lämnar till HÖGER, nästa planet till
// VÄNSTER, en båge mellan dem och raketen. Strecket (.travel-trail) går i
// en övertoning från avresans färg till destinationens, och ritas fram
// bakom raketen av hangman.js.
const TRAVEL_FROM = { x: 250, y: 80 };
const TRAVEL_TO = { x: 50, y: 80 };
const TRAVEL_PLANET_R = 32;

function buildTravelSceneSVG(fromPlanet, toPlanet) {
  const startX = TRAVEL_FROM.x - TRAVEL_PLANET_R - 4;
  const endX = TRAVEL_TO.x + TRAVEL_PLANET_R + 4;
  const route = `M ${startX},${TRAVEL_FROM.y} Q 150,18 ${endX},${TRAVEL_TO.y}`;

  let stars = "";
  for (let i = 0; i < 18; i++) {
    const x = (Math.random() * 300).toFixed(1);
    const y = (Math.random() * 150).toFixed(1);
    const r = (0.6 + Math.random() * 0.8).toFixed(2);
    const opacity = (0.3 + Math.random() * 0.6).toFixed(2);
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${opacity}" />`;
  }

  return `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="travel-trail-gradient" gradientUnits="userSpaceOnUse" x1="${startX}" y1="0" x2="${endX}" y2="0">
        <stop offset="0" stop-color="${fromPlanet.sceneColor}" />
        <stop offset="1" stop-color="${toPlanet.sceneColor}" />
      </linearGradient>
    </defs>
    ${stars}
    <path d="${route}" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5" stroke-dasharray="2 6" />
    <path class="travel-trail" d="${route}" fill="none" stroke="url(#travel-trail-gradient)" stroke-width="4" stroke-linecap="round" />
    ${buildPlanetOrbSVG(fromPlanet, TRAVEL_FROM.x, TRAVEL_FROM.y, TRAVEL_PLANET_R)}
    ${buildPlanetOrbSVG(toPlanet, TRAVEL_TO.x, TRAVEL_TO.y, TRAVEL_PLANET_R)}
    ${ROCKET_SVG}
  </svg>`;
}

const journeyState = {
  planetIndex: 0,
  fuel: 0,
};

function loadJourneyState() {
  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Number.isInteger(saved.planetIndex) && saved.planetIndex >= 0 && saved.planetIndex < PLANETS.length) {
      journeyState.planetIndex = saved.planetIndex;
    }
    if (Number.isInteger(saved.fuel) && saved.fuel >= 0) {
      journeyState.fuel = saved.fuel;
    }
  } catch (e) {
    // Privat läge eller trasig data — kör bara vidare från planet 1, ingen
    // krasch är värt en sparad resa.
  }
}

function saveJourneyState() {
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(journeyState));
  } catch (e) {
    // Privat läge — resan sparas bara inte mellan besök, spelet funkar ändå.
  }
}

loadJourneyState();

function getCurrentPlanet() {
  return PLANETS[journeyState.planetIndex];
}

// Lägger till bränsle för en avklarad omgång och talar om ifall tanken nu
// är full (dags att lyfta mot nästa planet).
function addFuel(amount) {
  journeyState.fuel += amount;
  saveJourneyState();
  return journeyState.fuel >= getCurrentPlanet().fuelNeeded;
}

// Nästa planet i ordningen. Loopar om till planet 1 efter den sista, så
// resan aldrig tar slut — returnerar true just den gången hela varvet
// rundats, så anroparen kan fira det extra.
function advanceToNextPlanet() {
  journeyState.planetIndex = (journeyState.planetIndex + 1) % PLANETS.length;
  journeyState.fuel = 0;
  saveJourneyState();
  return journeyState.planetIndex === 0;
}
