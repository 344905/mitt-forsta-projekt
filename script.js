// Alla vinstlinjer på ett 3x3-bräde (index 0-8, rad för rad).
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rader
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // kolumner
  [0, 4, 8], [2, 4, 6],            // diagonaler
];

const MAX_MARKS_PER_PLAYER = 3;
const WINS_NEEDED = 3; // bäst av 5 = först till 3 vinster

// Allt spelets tillstånd samlat på ett ställe.
const state = {
  board: Array(9).fill(null),
  currentPlayer: "John",
  moveHistory: { John: [], Vera: [] },
  scores: { John: 0, Vera: 0 },
  gameNumber: 1,
  nextStarter: "John", // vem som ska börja nästa match
};

// --- DOM-referenser ---
const boardEl = document.getElementById("board");
const gameCounterEl = document.getElementById("game-counter");
const scoreJohnEl = document.getElementById("score-john");
const scoreVeraEl = document.getElementById("score-vera");
const turnIndicatorEl = document.getElementById("turn-indicator");
const roundResultTextEl = document.getElementById("round-result-text");
const winnerBannerEl = document.getElementById("winner-banner");

// --- Skärmhantering ---
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.toggle("active", el.id === id);
  });
}

// --- Bräde-UI byggs en gång ---
function buildBoardUI() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.dataset.index = i;
    cell.addEventListener("click", () => handleCellClick(i));
    boardEl.appendChild(cell);
  }
}

function renderBoard() {
  const cells = boardEl.querySelectorAll(".cell");
  cells.forEach((cell, i) => {
    const mark = state.board[i];
    cell.textContent = mark ? (mark === "John" ? "X" : "O") : "";
    cell.classList.remove("john", "vera");
    if (mark === "John") cell.classList.add("john");
    if (mark === "Vera") cell.classList.add("vera");
  });
}

function renderScores() {
  scoreJohnEl.textContent = `John: ${state.scores.John}`;
  scoreVeraEl.textContent = `Vera: ${state.scores.Vera}`;
}

function renderTurnIndicator() {
  turnIndicatorEl.textContent = `${state.currentPlayer}s tur`;
  turnIndicatorEl.className = `turn-indicator ${state.currentPlayer === "John" ? "john" : "vera"}`;
}

function renderGameCounter() {
  gameCounterEl.textContent = `Spel ${state.gameNumber} av 5`;
}

// --- Ny match (nollställer bräde, behåller serie-poäng) ---
function startNewRound() {
  state.board = Array(9).fill(null);
  state.moveHistory = { John: [], Vera: [] };
  state.currentPlayer = state.nextStarter;

  buildBoardUI();
  renderBoard();
  renderScores();
  renderTurnIndicator();
  renderGameCounter();
  showScreen("screen-game");
}

// --- Helt ny serie (nollställer allt) ---
function startNewSeries() {
  state.scores = { John: 0, Vera: 0 };
  state.gameNumber = 1;
  // Vem som börjar match 1 slumpas.
  state.nextStarter = Math.random() < 0.5 ? "John" : "Vera";
  startNewRound();
}

function checkWin(player) {
  return WIN_LINES.some((line) => line.every((i) => state.board[i] === player));
}

function handleCellClick(index) {
  if (state.board[index] !== null) return; // rutan är redan tagen

  const player = state.currentPlayer;
  const history = state.moveHistory[player];

  // "Rullande brickor": har spelaren redan 3 på brädet, tas den äldsta bort.
  if (history.length >= MAX_MARKS_PER_PLAYER) {
    const oldestIndex = history.shift();
    state.board[oldestIndex] = null;
  }

  state.board[index] = player;
  history.push(index);

  renderBoard();

  if (checkWin(player)) {
    handleRoundWin(player);
    return;
  }

  state.currentPlayer = player === "John" ? "Vera" : "John";
  renderTurnIndicator();
}

function handleRoundWin(winner) {
  state.scores[winner]++;
  roundResultTextEl.textContent = `${winner} vann match ${state.gameNumber}!`;
  // Förloraren av matchen börjar nästa match.
  state.nextStarter = winner === "John" ? "Vera" : "John";
  showScreen("screen-round-result");
}

document.getElementById("next-round-btn").addEventListener("click", () => {
  if (state.scores.John >= WINS_NEEDED || state.scores.Vera >= WINS_NEEDED) {
    const seriesWinner = state.scores.John >= WINS_NEEDED ? "John" : "Vera";
    winnerBannerEl.textContent = `Grattis ${seriesWinner}!`;
    winnerBannerEl.className = `winner-banner ${seriesWinner === "John" ? "john" : "vera"}`;
    showScreen("screen-series-winner");
  } else {
    state.gameNumber++;
    startNewRound();
  }
});

document.getElementById("continue-btn").addEventListener("click", () => {
  showScreen("screen-play-again");
});

document.getElementById("play-again-btn").addEventListener("click", () => {
  startNewSeries();
});

document.getElementById("start-btn").addEventListener("click", () => {
  startNewSeries();
});

// Avsluta-knappen: window.close() fungerar bara om webbläsaren tillåter det
// (vanligtvis bara på flikar öppnade via script). Fallback: visa en tydlig
// "du kan stänga fliken själv nu"-skärm om stängningen blockeras.
document.getElementById("exit-btn").addEventListener("click", () => {
  window.close();
  setTimeout(() => {
    showScreen("screen-goodbye");
  }, 150);
});
