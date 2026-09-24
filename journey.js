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
    id: "djur", name: "Djurplaneten", fuelNeeded: 8,
    bg: "linear-gradient(180deg, #142b12, #0d0d1a)",
    sceneColor: "#7CFC00", scene: ["fence", "barn", "tree", "tree"],
    words: [
      "hund", "katt", "häst", "ko", "gris", "get", "höna", "tupp", "anka",
      "fisk", "fågel", "groda", "orm", "mus", "räv", "varg", "björn",
      "zebra", "giraff", "elefant", "känguru", "panda", "tiger", "lejon", "apa",
    ],
  },
  {
    id: "dinosaurie", name: "Dinosaurieplaneten", fuelNeeded: 8,
    bg: "linear-gradient(180deg, #2b1a12, #0d0d1a)",
    sceneColor: "#ff7043", scene: ["mountain", "volcano", "mountain"],
    words: [
      "ägg", "ödla", "klor", "svans", "tänder", "fossil", "jätte", "museum",
      "spår", "vulkan", "meteor", "grotta", "skelett", "sten", "hals",
      "vinge", "gap", "stor", "liten",
    ],
  },
  {
    id: "mat", name: "Matplaneten", fuelNeeded: 12,
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
    id: "trafik", name: "Trafikplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #12222b, #0d0d1a)",
    sceneColor: "#4fc3f7", scene: ["car", "antenna", "car"],
    words: [
      "bil", "buss", "tåg", "cykel", "moped", "lastbil", "taxi", "flygplan",
      "båt", "skepp", "väg", "gata", "bro", "tunnel", "stopp", "skylt",
      "lykta", "hjälm", "hjul", "parkering", "korsning", "rondell",
    ],
  },
  {
    id: "skola", name: "Skolplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #1a1230, #0d0d1a)",
    sceneColor: "#ba68c8", scene: ["board", "book", "book"],
    words: [
      "skola", "lärare", "elev", "penna", "sudd", "linjal", "bok", "häfte",
      "ryggsäck", "tavla", "stol", "bord", "rast", "lektion", "matte",
      "svenska", "idrott", "kompis", "fröken", "läxa",
    ],
  },
  {
    id: "sport", name: "Sportplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #122b1e, #0d0d1a)",
    sceneColor: "#66bb6a", scene: ["goalpost", "ball", "goalpost"],
    words: [
      "boll", "mål", "fotboll", "hockey", "simning", "löpning", "cykling",
      "tennis", "skidor", "skridskor", "medalj", "lag", "domare", "match",
      "tränare", "arena", "publik", "seger", "träning",
    ],
  },
  {
    id: "robot", name: "Robotplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #1a1a2b, #0d0d1a)",
    sceneColor: "#90a4ae", scene: ["antenna", "gear", "antenna"],
    words: [
      "robot", "skruv", "batteri", "kabel", "knapp", "skärm", "lampa",
      "motor", "raket", "rymdskepp", "astronaut", "planet", "måne",
      "stjärna", "satellit", "fjärrkontroll", "dator", "sladd",
    ],
  },
  {
    id: "hav", name: "Havsplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #0f2530, #0d0d1a)",
    sceneColor: "#26c6da", scene: ["wave", "shell", "wave", "shell"],
    words: [
      "hav", "våg", "krabba", "bläckfisk", "sjöstjärna", "val", "delfin",
      "haj", "säl", "mussla", "korall", "sand", "strand", "simma",
      "snorkel", "alger", "fisk", "brygga",
    ],
  },
  {
    id: "vader", name: "Väderplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #1c1c2e, #0d0d1a)",
    sceneColor: "#90caf9", scene: ["cloud", "raindrop", "cloud", "raindrop"],
    words: [
      "sol", "regn", "snö", "moln", "vind", "storm", "åska", "blixt", "is",
      "dimma", "kyla", "värme", "paraply", "stövlar", "regnbåge", "frost",
      "hagel", "halka",
    ],
  },
  {
    id: "kropp", name: "Kroppsplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #2b1224, #0d0d1a)",
    sceneColor: "#f06292", scene: ["person", "person", "person"],
    words: [
      "huvud", "hår", "öga", "öra", "näsa", "mun", "tand", "hals", "arm",
      "hand", "finger", "mage", "ben", "fot", "tå", "rygg", "axel", "knä",
    ],
  },
  {
    id: "natur", name: "Naturplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #16281a, #0d0d1a)",
    sceneColor: "#81c784", scene: ["mountain", "tree", "tree", "tree"],
    words: [
      "träd", "skog", "blomma", "gräs", "löv", "gren", "rot", "sten",
      "berg", "sjö", "bäck", "mossa", "svamp", "bär", "kotte", "eld",
      "lägereld", "stig",
    ],
  },
  {
    id: "musik", name: "Musikplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #241230, #0d0d1a)",
    sceneColor: "#ce93d8", scene: ["note", "note", "note"],
    words: [
      "sång", "gitarr", "trumma", "piano", "flöjt", "fiol", "mikrofon",
      "högtalare", "dans", "trumpet", "tamburin", "scen", "konsert", "orkester",
      "kör", "musiker",
    ],
  },
];

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
