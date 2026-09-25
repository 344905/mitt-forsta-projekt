// Delat ljud-system för hela appen (används av Hänga gubbe idag,
// tänkt att kunna återanvändas av Luffarschack senare — se
// docs/design/2026-09-24-ljud-toggle-placering.md för varför det
// är globalt och inte spelspecifikt).
//
// Alla ljud genereras procedurellt med Web Audio API — inga ljudfiler,
// inga nya beroenden i den levererade appen. Parametrarna kommer från
// docs/design/2026-09-24-ljud-hanga-gubbe.md.

const SOUND_STORAGE_KEY = "rymdarkaden-sound-enabled";
const SOUND_GAIN = 0.18;

let audioCtx = null;
let soundEnabled = readSoundPreference();

// localStorage kan kasta i privat surfläge (särskilt äldre Safari) —
// om det händer redan här, vid inladdning, skulle HELA sound.js sluta
// köra och varje playX-funktion bli odefinierad, vilket kraschar
// hangman.js första gången ett ljud ska spelas. Faller tillbaka på
// "ljud på" om läsningen misslyckas.
function readSoundPreference() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
  } catch (e) {
    return true;
  }
}

// AudioContext får bara skapas/startas efter en användarinteraktion
// (webbläsarens regel mot automatiskt ljud) — skapas därför först när
// det faktiskt behövs, inte vid sidladdning.
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // "!== running" (inte bara "=== suspended") fångar även iOS Safaris
  // "interrupted"-state, som webbläsaren kan sätta när fliken bakgrundas
  // (appväxling, samtal, Siri). Utan detta blir ljudet permanent tyst
  // efter en sådan avbrytning tills sidan laddas om.
  if (audioCtx.state !== "running") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Spelar en enkel ton. `sweepTo` (valfri) låter frekvensen glida till
// ett annat värde under tonens längd, för stigande/fallande effekter.
function playTone({ freq, duration, type = "square", sweepTo = null, startAt = 0, volume = SOUND_GAIN }) {
  if (!soundEnabled) return;
  // Ljud får ALDRIG kunna krascha spellogiken (t.ex. om AudioContext inte
  // stöds, eller redan är "closed") — guessLetter() i hangman.js anropar
  // playWin()/playLose() innan resultatskärmen visas, så ett okontrollerat
  // fel här skulle kunna dölja vinst/förlust helt. Se code-reviewer-fyndet
  // från iteration 1.
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
    if (sweepTo !== null) {
      osc.frequency.linearRampToValueAtTime(sweepTo, ctx.currentTime + startAt + duration);
    }

    gain.gain.setValueAtTime(volume, ctx.currentTime + startAt);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startAt + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startAt);
    osc.stop(ctx.currentTime + startAt + duration);
  } catch (e) {
    // Ett spel utan ljud är okej. Ett spel som fastnar för att ljudet
    // gick sönder är det inte.
  }
}

function playCorrectGuess() {
  playTone({ freq: 500, sweepTo: 800, duration: 0.12, type: "square" });
}

function playWrongGuess() {
  playTone({ freq: 300, sweepTo: 150, duration: 0.17, type: "square" });
}

function playWin() {
  // Stigande liten fanfar: C-E-G-C.
  [261.6, 329.6, 392.0, 523.3].forEach((freq, i) => {
    playTone({ freq, duration: 0.12, type: "square", startAt: i * 0.1 });
  });
}

function playLose() {
  playTone({ freq: 300, sweepTo: 80, duration: 0.6, type: "triangle" });
}

function playClick() {
  playTone({ freq: 440, duration: 0.08, type: "square" });
}

function isSoundEnabled() {
  return soundEnabled;
}

// --- Luffarschack-ljud (docs/design/2026-09-24-ljud-luffarschack.md) ---
// Samma "typ" av ljud för båda spelarna, bara register (tonhöjd) skiljer
// — motiverat av att Luffarschack redan har tydlig spelaridentitet
// (egna färger/markörer), till skillnad från Hänga gubbes delade ljud.

function playPlaceMark(player) {
  playTone({ freq: player === "John" ? 380 : 560, duration: 0.07, type: "square" });
}

function playDragMove(player) {
  const [from, to] = player === "John" ? [300, 420] : [440, 620];
  playTone({ freq: from, sweepTo: to, duration: 0.1, type: "triangle" });
}

function playMatchWin(player) {
  const [a, b] = player === "John" ? [392.0, 523.3] : [493.9, 659.3]; // G4-C5 / B4-E5
  playTone({ freq: a, duration: 0.1, type: "square" });
  playTone({ freq: b, duration: 0.1, type: "square", startAt: 0.1 });
}

function playSeriesWin(player) {
  // Samma rytm som Hänga gubbes playWin. Veras version transponerad en
  // stor ters upp (samma mönster som playMatchWin).
  const notes = player === "John"
    ? [261.6, 329.6, 392.0, 523.3]
    : [329.6, 415.3, 493.9, 659.3];
  notes.forEach((freq, i) => {
    playTone({ freq, duration: 0.12, type: "square", startAt: i * 0.1 });
  });
}

// --- Rymdresan (journey.js / launchToNextPlanet i hangman.js) ---

// Raketstart: två lager som stiger tillsammans — ett mörkt mullrande
// sågtandslager och ett ljusare "vrål" ovanpå. Lägre volym per lager än
// standard, annars blir summan av dem dubbelt så stark som övriga ljud.
function playRocketLaunch() {
  playTone({ freq: 60, sweepTo: 200, duration: 1.4, type: "sawtooth", volume: 0.1 });
  playTone({ freq: 110, sweepTo: 440, duration: 1.2, type: "square", startAt: 0.05, volume: 0.08 });
}

// Landning: ett mjukt fallande "pling-plong" (G5 → C5).
function playLanding() {
  playTone({ freq: 784, duration: 0.12, type: "triangle" });
  playTone({ freq: 523.3, duration: 0.2, type: "triangle", startAt: 0.12 });
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, soundEnabled ? "on" : "off");
  } catch (e) {
    // Kan inte sparas (t.ex. privat surfläge) — knappen ska ändå visa
    // rätt läge för resten av den här sessionen, bara inte komma ihåg
    // det till nästa gång.
  }
  renderSoundToggleButton();
  return soundEnabled;
}

const SOUND_ON_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M17 8a5 5 0 0 1 0 8"/><path d="M20 5a9 9 0 0 1 0 14"/></svg>';
const SOUND_OFF_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 5V4L8 9H4z"/><line x1="17" y1="9" x2="23" y2="15"/><line x1="23" y1="9" x2="17" y2="15"/></svg>';

function renderSoundToggleButton() {
  const btn = document.getElementById("sound-toggle-btn");
  if (!btn) return;
  btn.innerHTML = soundEnabled ? SOUND_ON_ICON : SOUND_OFF_ICON;
  btn.setAttribute("aria-label", soundEnabled ? "Stäng av ljud" : "Sätt på ljud");
  btn.classList.toggle("muted", !soundEnabled);
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("sound-toggle-btn");
  if (!btn) return;
  renderSoundToggleButton();
  btn.addEventListener("click", () => {
    toggleSound();
    if (soundEnabled) playClick();
  });
});
