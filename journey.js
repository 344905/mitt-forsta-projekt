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
    words: [
      "hund", "katt", "häst", "ko", "gris", "get", "höna", "tupp", "anka",
      "fisk", "fågel", "groda", "orm", "mus", "räv", "varg", "björn",
      "zebra", "giraff", "elefant", "känguru", "panda", "tiger", "lejon", "apa",
    ],
  },
  {
    id: "dinosaurie", name: "Dinosaurieplaneten", fuelNeeded: 8,
    bg: "linear-gradient(180deg, #2b1a12, #0d0d1a)",
    words: [
      "ägg", "ödla", "klor", "svans", "tänder", "fossil", "jätte", "museum",
      "urtid", "vulkan", "meteor", "grotta", "skelett", "brant", "stjärt",
      "vinge", "gap", "stor", "liten",
    ],
  },
  {
    id: "mat", name: "Matplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #2b2312, #0d0d1a)",
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
    words: [
      "bil", "buss", "tåg", "cykel", "moped", "lastbil", "taxi", "flygplan",
      "båt", "skepp", "väg", "gata", "bro", "tunnel", "stopp", "skylt",
      "lykta", "hjälm", "körkort", "parkering", "korsning", "rondell",
    ],
  },
  {
    id: "skola", name: "Skolplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #1a1230, #0d0d1a)",
    words: [
      "skola", "lärare", "elev", "penna", "sudd", "linjal", "bok", "häfte",
      "ryggsäck", "tavla", "stol", "bord", "rast", "lektion", "matte",
      "svenska", "idrott", "kompis", "fröken", "läxa",
    ],
  },
  {
    id: "sport", name: "Sportplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #122b1e, #0d0d1a)",
    words: [
      "boll", "mål", "fotboll", "hockey", "simning", "löpning", "cykling",
      "tennis", "skidor", "skridskor", "medalj", "lag", "domare", "match",
      "tränare", "arena", "publik", "seger", "träning",
    ],
  },
  {
    id: "robot", name: "Robotplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #1a1a2b, #0d0d1a)",
    words: [
      "robot", "skruv", "batteri", "kabel", "knapp", "skärm", "lampa",
      "motor", "raket", "rymdskepp", "astronaut", "planet", "måne",
      "stjärna", "satellit", "radar", "dator", "sladd",
    ],
  },
  {
    id: "hav", name: "Havsplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #0f2530, #0d0d1a)",
    words: [
      "hav", "våg", "krabba", "bläckfisk", "sjöstjärna", "val", "delfin",
      "haj", "säl", "mussla", "korall", "sand", "strand", "simma",
      "snorkel", "alger", "fisk", "brygga",
    ],
  },
  {
    id: "vader", name: "Väderplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #1c1c2e, #0d0d1a)",
    words: [
      "sol", "regn", "snö", "moln", "vind", "storm", "åska", "blixt", "is",
      "dimma", "kyla", "värme", "paraply", "stövlar", "regnbåge", "frost",
      "hagel", "halka",
    ],
  },
  {
    id: "kropp", name: "Kroppsplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #2b1224, #0d0d1a)",
    words: [
      "huvud", "hår", "öga", "öra", "näsa", "mun", "tand", "hals", "arm",
      "hand", "finger", "mage", "ben", "fot", "tå", "rygg", "axel", "knä",
    ],
  },
  {
    id: "natur", name: "Naturplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #16281a, #0d0d1a)",
    words: [
      "träd", "skog", "blomma", "gräs", "löv", "gren", "rot", "sten",
      "berg", "sjö", "bäck", "mossa", "svamp", "bär", "kotte", "eld",
      "lägereld", "stig",
    ],
  },
  {
    id: "musik", name: "Musikplaneten", fuelNeeded: 12,
    bg: "linear-gradient(180deg, #241230, #0d0d1a)",
    words: [
      "sång", "gitarr", "trumma", "piano", "flöjt", "fiol", "mikrofon",
      "högtalare", "dans", "rytm", "ton", "refräng", "konsert", "orkester",
      "kör", "musiker",
    ],
  },
];

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
