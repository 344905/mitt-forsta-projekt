// Alla vinstlinjer på ett 3x3-bräde (index 0-8, rad för rad).
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rader
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // kolumner
  [0, 4, 8], [2, 4, 6],            // diagonaler
];

const MAX_MARKS_PER_PLAYER = 3;
const WINS_NEEDED = 3; // bäst av 5 = först till 3 vinster

// Registrerar service workern (sw.js) så spelet kan installeras och
// fungera offline. Fungerar bara över HTTPS eller på "localhost".
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((registration) => {
        // Fråga direkt om det finns en nyare sw.js, istället för att
        // vänta på webbläsarens egen (mycket långsammare) schemaläggning.
        registration.update();
      })
      .catch(() => {
        // Går inte att registrera (t.ex. vanlig http:// på ett lokalt nätverk) — spelet funkar ändå, bara utan offline-stöd.
      });
  });

  // Så fort en NY service worker tagit över (efter en uppdatering) laddas
  // sidan om en gång, så man garanterat får matchande html/css/js — annars
  // kan man annars fastna med gammal html ihop med ny kod, eller tvärtom.
  let hasReloadedForUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasReloadedForUpdate) return;
    hasReloadedForUpdate = true;
    window.location.reload();
  });
}

// Allt spelets tillstånd samlat på ett ställe.
const state = {
  board: Array(9).fill(null),
  currentPlayer: "John",
  scores: { John: 0, Vera: 0 },
  gameNumber: 1,
  nextStarter: "John", // vem som ska börja nästa match
  selectedIndex: null, // rutan för en bricka som är "plockad upp" och väntar på en destination
};

// Håller reda på var ett drag startade medan pekaren fortfarande är nedtryckt.
// Detta är bara tillfällig interaktionsdata, inte något som behöver sparas i state.
let pointerDownIndex = null;

// Sant precis efter att en match avgjorts, tills man trycker "Nästa match".
// Då ska brädet visas (med vinst-strecket) men inte längre gå att klicka i.
let roundLocked = false;

// --- DOM-referenser ---
const boardEl = document.getElementById("board");
const gameCounterEl = document.getElementById("game-counter");
const scoreJohnEl = document.getElementById("score-john");
const scoreVeraEl = document.getElementById("score-vera");
const turnIndicatorEl = document.getElementById("turn-indicator");
const phaseHintEl = document.getElementById("phase-hint");
const phaseIconEl = document.getElementById("phase-icon");
const phaseTextEl = document.getElementById("phase-text");
const roundResultEl = document.getElementById("round-result");
const roundResultTextEl = document.getElementById("round-result-text");
const winnerBannerEl = document.getElementById("winner-banner");
const winLineSvgEl = document.getElementById("win-line-svg");
const winLineEl = document.getElementById("win-line");

// Enkla pixel-ikoner (SVG, ärver textfärgen via "currentColor") som visar
// vilken fas spelaren är i, oberoende av text — så det funkar även för
// den som inte kan läsa än.
const PLACE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"><path d="M12 4v16M4 12h16"/></svg>';
const MOVE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><polyline points="9,5 12,2 15,5"/><polyline points="9,19 12,22 15,19"/><polyline points="5,9 2,12 5,15"/><polyline points="19,9 22,12 19,15"/></svg>';

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
    cell.addEventListener("pointerdown", (e) => handlePointerDown(i, e));
    cell.addEventListener("pointerup", (e) => handlePointerUp(i, e));
    boardEl.appendChild(cell);
  }
}

function renderBoard() {
  const cells = boardEl.querySelectorAll(".cell");
  cells.forEach((cell, i) => {
    const mark = state.board[i];
    cell.textContent = mark ? (mark === "John" ? "X" : "O") : "";
    cell.classList.remove("john", "vera", "selected");
    if (mark === "John") cell.classList.add("john");
    if (mark === "Vera") cell.classList.add("vera");
    if (state.selectedIndex === i) cell.classList.add("selected");
  });
}

function renderScores() {
  scoreJohnEl.textContent = `John: ${state.scores.John}`;
  scoreVeraEl.textContent = `Vera: ${state.scores.Vera}`;
}

function renderTurnIndicator() {
  turnIndicatorEl.textContent = `${state.currentPlayer}s tur`;
  turnIndicatorEl.className = `turn-indicator ${state.currentPlayer === "John" ? "john" : "vera"}`;
  boardEl.classList.toggle("john-turn", state.currentPlayer === "John");
  boardEl.classList.toggle("vera-turn", state.currentPlayer === "Vera");
  updateCursorBlink();
  renderPhaseHint();
}

// Visar ikon + text för om spelaren ska lägga ut en ny bricka
// eller dra en befintlig — syns på både mus och touch.
function renderPhaseHint() {
  const player = state.currentPlayer;
  const moving = isMovePhase(player);
  phaseIconEl.innerHTML = moving ? MOVE_ICON : PLACE_ICON;
  phaseTextEl.textContent = moving ? "Dra en bricka" : "Lägg ut";
  phaseHintEl.className = `phase-hint ${player === "John" ? "john" : "vera"}`;
}

// Låter musens pekare blinka långsamt så länge spelaren fortfarande
// placerar ut nya brickor. Så fort spelaren har 3 brickor ute (och
// därmed ska dra en av dem istället) stannar pekaren i fullt sken.
let cursorBlinkTimer = null;

function updateCursorBlink() {
  clearInterval(cursorBlinkTimer);
  boardEl.classList.remove("cursor-dim");

  if (isMovePhase(state.currentPlayer)) return; // dra-fas: pekaren är still

  cursorBlinkTimer = setInterval(() => {
    boardEl.classList.toggle("cursor-dim");
  }, 500);
}

function renderGameCounter() {
  gameCounterEl.textContent = `Spel ${state.gameNumber} av 5`;
}

// --- Ny match (nollställer bräde, behåller serie-poäng) ---
function startNewRound() {
  state.board = Array(9).fill(null);
  state.selectedIndex = null;
  pointerDownIndex = null;
  roundLocked = false;
  state.currentPlayer = state.nextStarter;

  buildBoardUI();
  renderBoard();
  renderScores();
  renderTurnIndicator();
  renderGameCounter();
  hideWinLine();
  roundResultEl.classList.add("hidden");
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

// Hittar den vinnande raden/kolumnen/diagonalen (om någon), t.ex. [0,1,2].
function getWinningLine(player) {
  return WIN_LINES.find((line) => line.every((i) => state.board[i] === player)) || null;
}

// Mittpunkten (i pixlar) för en ruta, används för att rita vinst-strecket.
// Varje ruta är 90px + 10px mellanrum = 100px per "steg" i rutnätet.
function cellCenter(index) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  return { x: col * 100 + 45, y: row * 100 + 45 };
}

function drawWinLine(line, player) {
  const start = cellCenter(line[0]);
  const end = cellCenter(line[2]);
  winLineEl.setAttribute("x1", start.x);
  winLineEl.setAttribute("y1", start.y);
  winLineEl.setAttribute("x2", end.x);
  winLineEl.setAttribute("y2", end.y);
  winLineSvgEl.classList.remove("john", "vera");
  winLineSvgEl.classList.add(player === "John" ? "john" : "vera", "visible");
}

function hideWinLine() {
  winLineSvgEl.classList.remove("visible");
}

// Hur många brickor spelaren redan har på brädet.
function markCount(player) {
  return state.board.filter((mark) => mark === player).length;
}

// När en spelare redan har 3 brickor ute måste de flytta en av dem
// istället för att placera en ny — annars skulle brädet bara fyllas på.
function isMovePhase(player) {
  return markCount(player) >= MAX_MARKS_PER_PLAYER;
}

// Hittar vilken ruta (index) som ligger under en given skärmkoordinat.
// Används för att avgöra var pekaren/fingret faktiskt släpptes.
function cellIndexFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el ? el.closest(".cell") : null;
  return cell ? Number(cell.dataset.index) : null;
}

function setDropHighlight(index) {
  boardEl.querySelectorAll(".cell").forEach((cell, i) => {
    cell.classList.toggle("drop-target", i === index && state.board[i] === null);
  });
}

function clearDropHighlight() {
  boardEl.querySelectorAll(".cell").forEach((cell) => cell.classList.remove("drop-target", "dragging"));
}

// --- Steg 1: en bricka "plockas upp" (musen/fingret trycks ner) ---
function handlePointerDown(index, event) {
  if (roundLocked) return;
  const player = state.currentPlayer;
  const ownMovablePiece = state.board[index] === player && isMovePhase(player);

  if (!ownMovablePiece) {
    pointerDownIndex = null;
    return;
  }

  pointerDownIndex = index;
  event.currentTarget.classList.add("dragging");
  event.currentTarget.setPointerCapture(event.pointerId);
  boardEl.addEventListener("pointermove", handlePointerMove);
}

// --- Under tiden pekaren dras: visa vilken ruta som är ett giltigt mål ---
function handlePointerMove(event) {
  if (pointerDownIndex === null) return;
  const hovered = cellIndexFromPoint(event.clientX, event.clientY);
  setDropHighlight(hovered);
}

// --- Steg 2: pekaren släpps — antingen ett riktig drag, eller bara en tryckning ---
function handlePointerUp(index, event) {
  if (roundLocked) return;
  boardEl.removeEventListener("pointermove", handlePointerMove);
  const endIndex = cellIndexFromPoint(event.clientX, event.clientY);
  clearDropHighlight();

  if (pointerDownIndex !== null) {
    const startIndex = pointerDownIndex;
    pointerDownIndex = null;

    if (endIndex !== null && endIndex !== startIndex && state.board[endIndex] === null) {
      // Ett fullständigt drag: släpptes på en tom ruta -> flytta dit.
      movePiece(startIndex, endIndex);
    } else if (endIndex === startIndex) {
      // Ingen förflyttning skedde -> tolka det som en tryckning: markera/avmarkera
      // brickan så man kan trycka på en destination separat istället (två-tryck-läge).
      state.selectedIndex = state.selectedIndex === startIndex ? null : startIndex;
      renderBoard();
    }
    return;
  }

  if (state.selectedIndex !== null) {
    // En bricka var redan markerad sedan tidigare -> det här är destinationen.
    if (state.board[index] === null) {
      movePiece(state.selectedIndex, index);
    } else {
      state.selectedIndex = null;
      renderBoard();
    }
    return;
  }

  // Vanlig placering: spelaren har fortfarande färre än 3 brickor ute.
  if (state.board[index] === null && !isMovePhase(state.currentPlayer)) {
    placeMark(index);
  }
}

function placeMark(index) {
  state.board[index] = state.currentPlayer;
  finishTurn(state.currentPlayer);
}

function movePiece(fromIndex, toIndex) {
  const player = state.board[fromIndex];
  state.board[toIndex] = player;
  state.board[fromIndex] = null;
  state.selectedIndex = null;
  finishTurn(player);
}

function finishTurn(player) {
  renderBoard();

  const winningLine = getWinningLine(player);
  if (winningLine) {
    handleRoundWin(player, winningLine);
    return;
  }

  state.currentPlayer = player === "John" ? "Vera" : "John";
  renderTurnIndicator();
}

function handleRoundWin(winner, winningLine) {
  state.scores[winner]++;
  renderScores();
  roundResultTextEl.textContent = `${winner} vann match ${state.gameNumber}!`;
  // Förloraren av matchen börjar nästa match.
  state.nextStarter = winner === "John" ? "Vera" : "John";

  drawWinLine(winningLine, winner);
  roundResultEl.classList.remove("hidden");
  roundLocked = true;
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
