// Rymdalbumet — en gemensam samling (INTE per spelare) av alla ord John
// och Vera har upptäckt i Hänga gubbe, oavsett om omgången vanns eller
// förlorades. Se ITERATION 3 i
// docs/design/2026-09-25-produktteam-3-iterationer.md. Egen fil, samma
// princip som hangman.js: isolerad så inget annat kan gå sönder om den
// här filen har en bugg. Läser PLANETS/getCurrentPlanet/getWordPicture
// från journey.js men skriver aldrig till journeyState — det är två
// helt separata localStorage-nycklar och två separata syften (resan
// framåt vs. minnet av vad man redan klarat).

const ALBUM_STORAGE_KEY = "rymdarkaden-album-v1";

// { [planetId]: ["hund", ...] } — ord i gemener, inga dubbletter. Delat
// mellan John och Vera, precis som journeyState: ingen jämförelse mellan
// dem, samma "Rivalerna"-avvisning som resten av appen bygger på.
let albumState = {};

function loadAlbumState() {
  try {
    const raw = localStorage.getItem(ALBUM_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;
    // Bara nycklar vars värde faktiskt är en lista med strängar tas med —
    // annat (t.ex. manuellt redigerad eller på annat sätt trasig data)
    // hade annars fått recordDiscoveredWord()/renderAlbumScreen() att
    // krascha på .includes()/.push() mitt i en omgång, vilket i sin tur
    // hade stoppat guessLetter() (se guessLetter() i hangman.js) från att
    // någonsin visa resultatet — en trasig samling ska bara kosta
    // samlingen, aldrig spelet.
    for (const [planetId, list] of Object.entries(saved)) {
      if (Array.isArray(list) && list.every((w) => typeof w === "string")) {
        albumState[planetId] = list;
      }
    }
  } catch (e) {
    // Privat läge eller trasig data — albumet börjar bara tomt igen,
    // ingen krasch är värd en sparad samling.
  }
}

function saveAlbumState() {
  try {
    localStorage.setItem(ALBUM_STORAGE_KEY, JSON.stringify(albumState));
  } catch (e) {
    // Privat läge — albumet sparas bara inte mellan besök, spelet
    // fungerar ändå (samma fallback-mönster som journey.js/sound.js).
  }
}

loadAlbumState();

// Anropas en gång per avklarad omgång (vunnen ELLER förlorad) från
// guessLetter() i hangman.js, på precis samma ställe som bränsle redan
// delas ut — ingen egen "är omgången precis slut"-koll behövs där.
// Ordet sparas i gemener och bara en gång per planet.
function recordDiscoveredWord(planetId, word) {
  const key = word.toLowerCase();
  const list = albumState[planetId] || [];
  if (!list.includes(key)) {
    list.push(key);
    albumState[planetId] = list;
    saveAlbumState();
  }
}

// Sparade ord för en planet, men bara de som fortfarande finns i dess
// ordlista — om listan redigeras senare (som redan hänt en gång den här
// säsongen) ska ett borttaget ord varken räknas i "N av M" eller räknas
// som ett besök på en annars obesökt planet.
function getDiscoveredWordsForPlanet(planet) {
  const saved = albumState[planet.id] || [];
  const currentWords = new Set(planet.words.map((w) => w.toLowerCase()));
  return saved.filter((w) => currentWords.has(w));
}

// Planeter man har hittat minst ett (fortfarande giltigt) ord på, i samma
// ordning som PLANETS — det är dessa (och bara dessa) man ska kunna
// bläddra mellan i albumet. En obesökt planet visas aldrig, inte ens som
// "låst".
function getVisitedPlanetIds() {
  return PLANETS.filter((planet) => getDiscoveredWordsForPlanet(planet).length > 0).map(
    (planet) => planet.id
  );
}

// Vilken planet som just nu visas i albumet. Ren visningsstate (bläddras
// med pilarna), sparas inte till localStorage — bara ordsamlingen ovan
// behöver bestå mellan besök.
let albumCurrentPlanetId = null;

const albumPlanetNameEl = document.getElementById("album-planet-name");
const albumCountEl = document.getElementById("album-count");
const albumGridEl = document.getElementById("album-grid");
const albumPrevBtnEl = document.getElementById("album-prev-btn");
const albumNextBtnEl = document.getElementById("album-next-btn");

// Ritar hela albumskärmen mot albumState/albumCurrentPlanetId. Anropas
// varje gång skärmen öppnas och varje gång man bläddrar.
function renderAlbumScreen() {
  const visitedIds = getVisitedPlanetIds();

  if (visitedIds.length === 0) {
    albumPlanetNameEl.textContent = "Inga planeter besökta än";
    albumCountEl.textContent = "Spela Hänga gubbe för att börja samla ord!";
    albumGridEl.innerHTML = "";
    albumPrevBtnEl.disabled = true;
    albumNextBtnEl.disabled = true;
    return;
  }

  // Förvalt: den planet man just nu reser på i rymdresan, om den redan är
  // besökt — annars den första besökta planeten i ordning. Håller också
  // kvar ett giltigt val om den tidigare visade planeten av någon
  // anledning inte längre finns i listan.
  if (!albumCurrentPlanetId || !visitedIds.includes(albumCurrentPlanetId)) {
    albumCurrentPlanetId = visitedIds.includes(getCurrentPlanet().id)
      ? getCurrentPlanet().id
      : visitedIds[0];
  }

  const planet = PLANETS.find((p) => p.id === albumCurrentPlanetId);
  const discovered = getDiscoveredWordsForPlanet(planet);

  albumPlanetNameEl.textContent = `🪐 ${planet.name}`;
  albumCountEl.textContent = `${discovered.length} av ${planet.words.length} ord upptäckta`;

  albumGridEl.innerHTML = "";
  planet.words.forEach((word) => {
    const key = word.toLowerCase();
    const card = document.createElement("div");
    card.className = "album-card";
    if (discovered.includes(key)) {
      // Långa ord (t.ex. "fjärrkontroll") får ett bredare kort så hela
      // ordet får plats på en rad, istället för att brytas mitt i ordet —
      // det gäller ju just den skärm som ska träna läsning.
      if (word.length > 8) card.classList.add("wide");
      const emojiEl = document.createElement("span");
      emojiEl.className = "album-card-emoji";
      emojiEl.textContent = getWordPicture(word, planet);
      const wordEl = document.createElement("span");
      wordEl.className = "album-card-word";
      wordEl.textContent = word.toUpperCase();
      card.appendChild(emojiEl);
      card.appendChild(wordEl);
    } else {
      card.classList.add("undiscovered");
      card.textContent = "?";
    }
    albumGridEl.appendChild(card);
  });

  // Med bara en besökt planet finns inget att bläddra till — pilarna
  // stängs av istället för att bläddra i cirkel till samma planet.
  const onlyOnePlanet = visitedIds.length <= 1;
  albumPrevBtnEl.disabled = onlyOnePlanet;
  albumNextBtnEl.disabled = onlyOnePlanet;
}

// direction: -1 (◀) eller 1 (▶). Bläddrar bara bland besökta planeter,
// i cirkel (precis som resans egen advanceToNextPlanet()).
function stepAlbumPlanet(direction) {
  const visitedIds = getVisitedPlanetIds();
  if (visitedIds.length <= 1) return;
  const currentIndex = visitedIds.indexOf(albumCurrentPlanetId);
  const nextIndex = (currentIndex + direction + visitedIds.length) % visitedIds.length;
  albumCurrentPlanetId = visitedIds[nextIndex];
  renderAlbumScreen();
}

document.getElementById("select-album-btn").addEventListener("click", () => {
  playClick();
  // Nollställs varje gång albumet öppnas, så förvalet i renderAlbumScreen()
  // (den planet man just nu reser på, om den är besökt) verkligen gäller
  // varje gång — annars fastnar visningen på den planet man senast tittade
  // på i albumet även efter att resan gått vidare till en ny planet.
  albumCurrentPlanetId = null;
  renderAlbumScreen();
  showScreen("screen-album");
});

albumPrevBtnEl.addEventListener("click", () => {
  playClick();
  stepAlbumPlanet(-1);
});

albumNextBtnEl.addEventListener("click", () => {
  playClick();
  stepAlbumPlanet(1);
});

document.getElementById("album-back-btn").addEventListener("click", () => {
  playClick();
  showScreen("screen-game-select");
});
