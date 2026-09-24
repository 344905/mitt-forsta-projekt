// Hänga gubbe — John och Vera turas om att gissa bokstäver tillsammans
// på samma ord. Helt separat fil/logik från Luffarschack (script.js)
// så de två spelen aldrig krockar med varandra. Orden kommer numera från
// den planet man befinner sig på i rymdresan (journey.js) istället för en
// enda blandad lista — se pickRandomWord().

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split("");
// Första 3 felen bygger själva galgen (stolpe, överligg, rep), resten
// bygger upp kroppen — 9 fel totalt innan man förlorar.
const HANGMAN_PARTS = [
  "hm-post", "hm-beam", "hm-rope",
  "hm-head", "hm-body", "hm-arm-left", "hm-arm-right", "hm-leg-left", "hm-leg-right",
];
const MAX_WRONG_GUESSES = HANGMAN_PARTS.length;

const hangmanState = {
  word: "",
  guessedLetters: [],
  wrongGuesses: 0,
  currentPlayer: "John",
  status: "playing", // "playing" | "won" | "lost"
};

// Senast spelade ord — så nästa slump kan utesluta det och undvika
// att samma ord dyker upp två gånger i rad.
let lastWord = null;

function pickRandomWord() {
  const words = getCurrentPlanet().words;
  if (words.length <= 1) return words[0].toUpperCase();
  let word;
  do {
    word = words[Math.floor(Math.random() * words.length)].toUpperCase();
  } while (word === lastWord);
  return word;
}

// Vilken bokstav som senast gissades — bara till för att veta vilken
// bokstav i ordet som ska "poppa till" som visuell bekräftelse. Ingen
// spellogik beror på den, så den behöver inte vara del av hangmanState.
let lastGuessedLetter = null;

// --- DOM-referenser ---
const hangmanTurnIndicatorEl = document.getElementById("hangman-turn-indicator");
const hangmanWordEl = document.getElementById("hangman-word");
const hangmanKeyboardEl = document.getElementById("hangman-keyboard");
const hangmanResultEl = document.getElementById("hangman-result");
const hangmanResultTextEl = document.getElementById("hangman-result-text");
const hangmanAgainBtnEl = document.getElementById("hangman-again-btn");
const hangmanPlanetNameEl = document.getElementById("hangman-planet-name");
const hangmanPlanetSceneEl = document.getElementById("hangman-planet-scene");
const hangmanFuelMeterEl = document.getElementById("hangman-fuel-meter");
const gameSelectJourneyStatusEl = document.getElementById("game-select-journey-status");
const hangmanLaunchOverlayEl = document.getElementById("hangman-launch-overlay");
const launchOverlayTextEl = document.getElementById("launch-overlay-text");
const appEl = document.getElementById("app");

// Sant mellan att en omgång avgjorts med full bränsletank och att man
// faktiskt tryckt vidare — styr om "Nytt ord"-knappen startar en vanlig
// ny omgång eller lyfter till nästa planet (se guessLetter/hangman-again-btn).
let readyToLaunch = false;

// --- Tangentbordet byggs en gång ---
function buildHangmanKeyboard() {
  hangmanKeyboardEl.innerHTML = "";
  ALPHABET.forEach((letter) => {
    const key = document.createElement("button");
    key.className = "hangman-key";
    key.textContent = letter;
    key.dataset.letter = letter;
    key.addEventListener("click", () => guessLetter(letter));
    hangmanKeyboardEl.appendChild(key);
  });
}

function renderHangmanTurnIndicator() {
  hangmanTurnIndicatorEl.textContent = `${hangmanState.currentPlayer}s tur att gissa`;
  hangmanTurnIndicatorEl.className = `turn-indicator ${hangmanState.currentPlayer === "John" ? "john" : "vera"}`;
}

function renderHangmanWord() {
  hangmanWordEl.innerHTML = "";
  hangmanState.word.split("").forEach((letter) => {
    const span = document.createElement("span");
    span.className = "hangman-letter";
    const revealed = hangmanState.guessedLetters.includes(letter);
    span.textContent = revealed ? letter : "_";
    if (revealed) {
      span.classList.add("revealed");
      if (letter === lastGuessedLetter) span.classList.add("pop");
    }
    hangmanWordEl.appendChild(span);
  });
}

function renderHangmanDrawing() {
  HANGMAN_PARTS.forEach((partId, i) => {
    document.getElementById(partId).classList.toggle("visible", i < hangmanState.wrongGuesses);
  });
}

// Kort skakning på hela teckningen vid en fel gissning — den visuella
// motsvarigheten till playWrongGuess()/playLose()-ljudet, som annars
// inte hade haft något synligt "aj" alls.
function shakeDrawing() {
  const el = document.querySelector(".hangman-drawing-wrap");
  if (!el) return;
  el.classList.remove("shake");
  void el.offsetWidth; // reflow, så animationen kan startas om vid nästa fel också
  el.classList.add("shake");
}

// Namnet på planeten man just nu spelar på, ovanför teckningen.
function renderPlanetName() {
  hangmanPlanetNameEl.textContent = `🪐 ${getCurrentPlanet().name}`;
}

// Bränslemätaren: en rad pixel-rutor, en per bränsleenhet planeten kräver,
// fyllda upp till hur mycket bränsle man samlat än så länge. Byggs om varje
// gång (istället för att bara toggla synlighet) eftersom fuelNeeded varierar
// mellan planeter.
function renderFuelMeter() {
  const planet = getCurrentPlanet();
  hangmanFuelMeterEl.innerHTML = "";
  for (let i = 0; i < planet.fuelNeeded; i++) {
    const pip = document.createElement("span");
    pip.className = "fuel-pip";
    if (i < journeyState.fuel) pip.classList.add("filled");
    hangmanFuelMeterEl.appendChild(pip);
  }
}

// Färgar hela app-panelen efter planetens tema medan man faktiskt är
// landad där — nollställs (renderSpaceBackdrop) under själva resan mellan
// planeter, så bakgrunden märkbart skiljer sig mellan "på en planet" och
// "i rymden".
function renderPlanetBackdrop() {
  appEl.style.setProperty("--planet-bg", getCurrentPlanet().bg);
  appEl.classList.add("on-planet");
  renderPlanetScene();
}

function renderSpaceBackdrop() {
  appEl.classList.remove("on-planet");
  hangmanPlanetSceneEl.innerHTML = "";
}

// Liten siluett-scen (stall/djungel, vulkan, hav, ...) längs botten av
// panelen, så varje planet faktiskt ser ut som sitt tema — inte bara en
// färgad bakgrund. Formerna själva byggs i journey.js (delade mellan
// planeter), det här bara skriver in dem i DOM:en.
function renderPlanetScene() {
  hangmanPlanetSceneEl.innerHTML = buildPlanetSceneSVG(getCurrentPlanet());
}

// Liten statusrad på spelval-skärmen, så resan syns även utan att öppna
// Hänga gubbe.
function renderGameSelectJourneyStatus() {
  const planet = getCurrentPlanet();
  gameSelectJourneyStatusEl.textContent =
    `🪐 ${planet.name} · 🚀 ${Math.min(journeyState.fuel, planet.fuelNeeded)}/${planet.fuelNeeded}`;
}

// Lyft mot nästa planet: en kort resa i rymden (bakgrunden återgår till
// standard) innan man landar och en ny omgång börjar på den nya planeten.
function launchToNextPlanet() {
  readyToLaunch = false;
  renderSpaceBackdrop();
  launchOverlayTextEl.textContent = "🚀 Startar mot nästa planet...";
  hangmanLaunchOverlayEl.classList.remove("hidden");
  hangmanResultEl.classList.add("hidden");

  setTimeout(() => {
    const roundedGalaxy = advanceToNextPlanet();
    renderGameSelectJourneyStatus();

    if (!roundedGalaxy) {
      hangmanLaunchOverlayEl.classList.add("hidden");
      startNewHangmanRound();
      return;
    }

    // Extra stund för att fira att hela planetrundan är klar, innan man
    // landar på planet 1 igen med en ny omgång.
    launchOverlayTextEl.textContent = "🌌 Hela galaxen utforskad — ny resa!";
    setTimeout(() => {
      hangmanLaunchOverlayEl.classList.add("hidden");
      startNewHangmanRound();
    }, 1400);
  }, 1400);
}

function renderHangmanKeyboard() {
  hangmanKeyboardEl.querySelectorAll(".hangman-key").forEach((key) => {
    const letter = key.dataset.letter;
    const guessed = hangmanState.guessedLetters.includes(letter);
    key.disabled = guessed || hangmanState.status !== "playing";
    key.classList.remove("correct", "wrong");
    // Färgar knappen man faktiskt tryckte på — rätt (cyan) eller fel (röd)
    // — så man ser bokstaven OCH utfallet på samma ställe, inte bara att
    // den blivit nedtonad.
    if (guessed) {
      key.classList.add(hangmanState.word.includes(letter) ? "correct" : "wrong");
    }
  });
}

// --- Ny omgång: slumpar ett nytt ord och nollställer allt ---
function startNewHangmanRound() {
  hangmanState.word = pickRandomWord();
  lastWord = hangmanState.word;
  hangmanState.guessedLetters = [];
  hangmanState.wrongGuesses = 0;
  // Vem som gissar första bokstaven slumpas — annars är det alltid John.
  hangmanState.currentPlayer = Math.random() < 0.5 ? "John" : "Vera";
  hangmanState.status = "playing";
  lastGuessedLetter = null;

  buildHangmanKeyboard();
  renderHangmanTurnIndicator();
  renderHangmanWord();
  renderHangmanDrawing();
  renderHangmanKeyboard();
  renderPlanetName();
  renderFuelMeter();
  renderPlanetBackdrop();
  hangmanAgainBtnEl.textContent = "Nytt ord";
  hangmanResultEl.classList.add("hidden");
  showScreen("screen-hangman-game");
}

function guessLetter(letter) {
  if (hangmanState.status !== "playing") return;
  if (hangmanState.guessedLetters.includes(letter)) return;

  lastGuessedLetter = letter;
  hangmanState.guessedLetters.push(letter);

  const wasCorrect = hangmanState.word.includes(letter);
  if (!wasCorrect) {
    hangmanState.wrongGuesses++;
    shakeDrawing(); // visuell motsvarighet till playWrongGuess()/playLose()-ljudet
  }

  renderHangmanWord();
  renderHangmanDrawing();

  const wordGuessed = hangmanState.word
    .split("")
    .every((wordLetter) => hangmanState.guessedLetters.includes(wordLetter));

  if (wordGuessed) {
    hangmanState.status = "won";
    hangmanResultTextEl.textContent = "Ni gissade ordet!";
    playWin();
    sparkBurst(hangmanWordEl, "var(--accent)");
  } else if (hangmanState.wrongGuesses >= MAX_WRONG_GUESSES) {
    hangmanState.status = "lost";
    hangmanResultTextEl.textContent = `Gubben hann hänga. Ordet var: ${hangmanState.word}`;
    playLose();
  } else {
    // Vinst/förlust-ljudet räcker för den sista gissningen — annars
    // hade man hört både "rätt/fel"-tonen och fanfaren/dunset på en gång.
    wasCorrect ? playCorrectGuess() : playWrongGuess();
  }

  if (hangmanState.status !== "playing") {
    // Bränsle för en avklarad omgång — vinst ger mer, men en förlust ger
    // också bränsle. Ingen ska känna sig fast bara för att ordet var svårt.
    readyToLaunch = addFuel(hangmanState.status === "won" ? FUEL_PER_WIN : FUEL_PER_LOSS);
    renderFuelMeter();
    renderGameSelectJourneyStatus();
    hangmanAgainBtnEl.textContent = readyToLaunch ? "🚀 Lyft till nästa planet!" : "Nytt ord";
    renderHangmanKeyboard();
    hangmanResultEl.classList.remove("hidden");
    return;
  }

  hangmanState.currentPlayer = hangmanState.currentPlayer === "John" ? "Vera" : "John";
  renderHangmanTurnIndicator();
  renderHangmanKeyboard();
}

hangmanAgainBtnEl.addEventListener("click", () => {
  playClick();
  if (readyToLaunch) {
    launchToNextPlanet();
  } else {
    startNewHangmanRound();
  }
});

document.getElementById("hangman-switch-btn").addEventListener("click", () => {
  playClick();
  renderSpaceBackdrop();
  showScreen("screen-game-select");
});

// Stöd för fysiskt tangentbord på dator, som ett komplement till
// skärmtangentbordet (som alltid behövs för touch).
window.addEventListener("keydown", (event) => {
  // Hoppa över tangenttryck med Cmd/Ctrl/Alt — annars räknas t.ex.
  // Cmd+R (ladda om sidan) som en gissning på bokstaven R.
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (document.getElementById("screen-hangman-game").classList.contains("active")) {
    const letter = event.key.toUpperCase();
    if (ALPHABET.includes(letter)) {
      guessLetter(letter);
    }
  }
});

// Visa var resan står redan på spelval-skärmen, innan man ens öppnat
// Hänga gubbe.
renderGameSelectJourneyStatus();
