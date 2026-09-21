// Hänga gubbe — John och Vera turas om att gissa bokstäver tillsammans
// på samma ord. Helt separat fil/logik från Luffarschack (script.js)
// så de två spelen aldrig krockar med varandra.

const WORDS = [
  "sol", "mus", "hus", "bil", "bok", "båt", "bad", "ben", "tak", "tåg",
  "mat", "mor", "far", "fot", "får", "hår", "nos", "ris", "ros", "rum",
  "sak", "säl", "val", "vas", "ved", "fisk", "mask", "hund", "hand", "sand",
  "bord", "stol", "park", "korv", "salt", "glas", "gris", "kniv", "knut", "moln",
  "näsa", "rita", "ruta", "saga", "sida", "sova", "vila", "lera", "krita", "skola",
  "katt", "hatt", "boll", "buss", "mamma", "pappa", "docka", "flicka", "gubbe", "hoppa",
  "kanna", "kappa", "klocka", "mygga", "natt", "nalle", "sitta", "sommar", "ägg", "äpple",
  "jag", "du", "han", "hon", "vi", "ni", "de", "och", "att", "är",
  "en", "ett", "på", "av", "med", "som", "inte", "hej", "ja", "nej",
  "sjunga", "sjö", "kjol", "tjuv", "ljus", "hjärta", "stjärna", "ring", "säng", "kung",
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ".split("");
const MAX_WRONG_GUESSES = 6;
const HANGMAN_PARTS = ["hm-head", "hm-body", "hm-arm-left", "hm-arm-right", "hm-leg-left", "hm-leg-right"];

const hangmanState = {
  word: "",
  guessedLetters: [],
  wrongGuesses: 0,
  currentPlayer: "John",
  status: "playing", // "playing" | "won" | "lost"
};

// --- DOM-referenser ---
const hangmanTurnIndicatorEl = document.getElementById("hangman-turn-indicator");
const hangmanWordEl = document.getElementById("hangman-word");
const hangmanKeyboardEl = document.getElementById("hangman-keyboard");
const hangmanResultEl = document.getElementById("hangman-result");
const hangmanResultTextEl = document.getElementById("hangman-result-text");

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
  hangmanWordEl.textContent = hangmanState.word
    .split("")
    .map((letter) => (hangmanState.guessedLetters.includes(letter) ? letter : "_"))
    .join(" ");
}

function renderHangmanDrawing() {
  HANGMAN_PARTS.forEach((partId, i) => {
    document.getElementById(partId).classList.toggle("visible", i < hangmanState.wrongGuesses);
  });
}

function renderHangmanKeyboard() {
  hangmanKeyboardEl.querySelectorAll(".hangman-key").forEach((key) => {
    const letter = key.dataset.letter;
    key.disabled = hangmanState.guessedLetters.includes(letter) || hangmanState.status !== "playing";
  });
}

// --- Ny omgång: slumpar ett nytt ord och nollställer allt ---
function startNewHangmanRound() {
  hangmanState.word = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
  hangmanState.guessedLetters = [];
  hangmanState.wrongGuesses = 0;
  hangmanState.currentPlayer = "John";
  hangmanState.status = "playing";

  buildHangmanKeyboard();
  renderHangmanTurnIndicator();
  renderHangmanWord();
  renderHangmanDrawing();
  renderHangmanKeyboard();
  hangmanResultEl.classList.add("hidden");
  showScreen("screen-hangman-game");
}

function guessLetter(letter) {
  if (hangmanState.status !== "playing") return;
  if (hangmanState.guessedLetters.includes(letter)) return;

  hangmanState.guessedLetters.push(letter);

  if (!hangmanState.word.includes(letter)) {
    hangmanState.wrongGuesses++;
  }

  renderHangmanWord();
  renderHangmanDrawing();

  const wordGuessed = hangmanState.word
    .split("")
    .every((wordLetter) => hangmanState.guessedLetters.includes(wordLetter));

  if (wordGuessed) {
    hangmanState.status = "won";
    hangmanResultTextEl.textContent = "Ni gissade ordet!";
  } else if (hangmanState.wrongGuesses >= MAX_WRONG_GUESSES) {
    hangmanState.status = "lost";
    hangmanResultTextEl.textContent = `Gubben hann hänga. Ordet var: ${hangmanState.word}`;
  }

  if (hangmanState.status !== "playing") {
    renderHangmanKeyboard();
    hangmanResultEl.classList.remove("hidden");
    return;
  }

  hangmanState.currentPlayer = hangmanState.currentPlayer === "John" ? "Vera" : "John";
  renderHangmanTurnIndicator();
  renderHangmanKeyboard();
}

document.getElementById("hangman-again-btn").addEventListener("click", () => {
  startNewHangmanRound();
});

document.getElementById("hangman-switch-btn").addEventListener("click", () => {
  showScreen("screen-game-select");
});

// Stöd för fysiskt tangentbord på dator, som ett komplement till
// skärmtangentbordet (som alltid behövs för touch).
window.addEventListener("keydown", (event) => {
  if (document.getElementById("screen-hangman-game").classList.contains("active")) {
    const letter = event.key.toUpperCase();
    if (ALPHABET.includes(letter)) {
      guessLetter(letter);
    }
  }
});
