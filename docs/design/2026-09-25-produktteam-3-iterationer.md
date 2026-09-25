# Produktteam: roadmap i 3 iterationer (Hänga gubbe för John och Vera)

**Roll:** game-designer / produktarkitekt
**Datum:** 2026-09-25
**Gäller:** Hänga gubbe + rymdresan. Luffarschack rörs inte.
**Bygger vidare på:** `CLAUDE.md`, `journey.js`, `hangman.js`, `2026-09-25-spelupplevelse-forbattringar.md`
(där "Rivalerna" föreslogs och sedan **avvisades** av ägaren, och en "ord i rad"-streak nämndes.
Den föreslås inte igen, eftersom en streak som bryts vid förlust är en bestraffning).

---

## 1. Analys: så upplevs spelet av en 6-åring och ett lite äldre syskon

Det här fungerar redan bra: turordningen, att förlust också ger bränsle, planetscenerna,
raketresan, pop/skak/gnistor och ljudet. Grundtonen är vänlig och stödjande.

De största luckorna, i prioritetsordning:

| # | Lucka | Varför det spelar roll för John och Vera |
|---|-------|------------------------------------------|
| 1 | **Barnet vet inte vilket ord man letar efter.** Man ser bara `_ _ _ _` och 29 bokstäver. | För ett barn som knappt läser blir varje gissning ren slump. Det enda man lär sig är att trycka på knappar. Om barnet vet att ordet är *hund* kan det istället fundera: "vilket ljud börjar hund på?" Det är precis den kopplingen mellan ljud och bokstav som ska tränas. |
| 2 | **Vid förlust får man aldrig se hur ordet stavas i själva ordet.** Det står bara i en textrad ("Ordet var: HUND"). | Understrecken står kvar. Det tillfälle där man lär sig mest (så här skulle det ha stavats) går förlorat för den som inte läser textraden. Dessutom börjar texten "Gubben hann hänga", vilket är det mest negativa i hela appen. |
| 3 | **En rätt bokstav firas lika lite oavsett vem som hittade den.** Det blir en pop och en kort ton. Turen visas bara som text ("Veras tur att gissa"). | Ett barn som inte läser ser inte att det är hens tur, förutom på färgen på en liten textrad. Och det finns inget "bra jobbat, Vera!" i stunden när det faktiskt gick bra. |
| 4 | **Resan saknar minne av vad man har upptäckt.** Bränslet nollställs vid varje planet. Det man har åstadkommit syns inte någonstans. | Barn vill samla och kunna visa upp. En gemensam samling av ord man har klarat gör resan till ett äventyr och ger återkommande lästräning. Allt är delat, så det blir ingen jämförelse. |
| 5 | (Backlog) Tangenterna är ca 27 px breda på en 320 px-skärm, alltså små för barnfingrar. Ingen introduktion första gången. Ingen väg tillbaka mitt i ett ord (bara Avsluta). | Verkliga problem, men de kräver en egen layoutrunda (höjdbudgeten är redan tight) eller är mindre värda än 1–4. Se sista avsnittet. |

**Ordningen motiveras av:** nr 1 och 2 ändrar *vad barnet lär sig*, nr 3 hur det *känns*,
nr 4 *varför man vill fortsätta*. Nr 3 och 4 bygger på bilderna från iteration 1.

---

## 2. Roadmap

| Iteration | Namn | Ljuddesigner? |
|-----------|------|---------------|
| **1** | Bildledtråd och tydligt facit | **Nej** |
| **2** | Din tur, och bra jobbat! (beröm per bokstav och tydlig tur för den som inte läser) | **Ja** |
| **3** | Rymdalbumet (en gemensam samling av upptäckta ord) | Nej (`playClick()` återanvänds) |

---

## ITERATION 1: Bildledtråd och tydligt facit (redo att byggas)

### Mål
Varje ord i Hänga gubbe visas med en **bild (emoji)** bredvid galgen, så att även det barn som
inte läser vet vilket ord man stavar. Vid förlust **fylls ordet i på plats** med rätt stavning,
och resultattexten blir uppmuntrande.

### Varför för John och Vera
- Yngsta barnet ser 🐕, säger "hund!" och kan vara med och tänka "H…". Det äldre syskonet
  får ett konkret stavningsproblem istället för gissningslotto. Samarbetet blir på riktigt:
  "vad låter hund på i början?"
- Förlusten blir ett lärotillfälle ("så här stavas det"), inte ett straff.
- Emoji är systemtecken. De kräver inga bildfiler, fungerar offline och innebär inga nya beroenden.

### Beteende

**Under spel**
1. När en ny omgång börjar visas ett **bildkort** till vänster om galgteckningen, med ordets emoji.
2. Om ett ord saknar en tydlig bild (t.ex. *stor*, *liten*, *rast*, *läxa*) visas **planetens
   symbol** istället (🐾, 🦖, …). Det är en neutral "ingen bild"-signal som aldrig vilseleder.
   **Inga ord tas bort ur listorna.**
3. Bildkortet går inte att trycka på och ändras inte under omgången.

**Vid vinst (inline, allt står kvar)**
- Ordet, bildkortet, teckningen och tangentbordet syns som idag, och gnistorna finns kvar.
- Resultattext: **`Ni klarade det! 🚀+2`**

**Vid förlust (inline, allt står kvar)**
- De bokstäver man inte hittade **fylls i direkt i ordraden** med en egen stil, `.missed`:
  ljus text (`var(--text)`, ca 70 % opacitet), streckad understrykning och ingen glöd. Bokstäverna
  **tonas in en i taget** (ca 120 ms fördröjning per bokstav, via en CSS custom property
  `--i` på varje bokstav och `animation-delay: calc(var(--i) * 120ms)`). De bokstäver man redan
  hittat behåller sin cyan `.revealed`-stil, så man ser vad man själv klarade.
- Använd **inte** röd färg för de ifyllda bokstäverna. Rött betyder "fel" i appen (`.wrong`-tangenter).
- Resultattext: **`Nästan! Så stavas det. 🚀+1`** (ersätter "Gubben hann hänga. Ordet var: …").

`🚀+2` / `🚀+1` kopplar resultatet till bränslemätaren med en symbol, inte ett ord. Så förklaras
bränslet utan någon introduktion.

### Layout (viktigt för 320 px)
Bildkortet ligger **bredvid** teckningen, inte ovanför. Då blir skärmen inte högre.

```html
<div class="hangman-stage">
  <div id="hangman-clue" class="hangman-clue" role="img" aria-label="Bildledtråd"></div>
  <div class="hangman-drawing-wrap"> …oförändrat innehåll… </div>
</div>
```

- `.hangman-stage`: `display: flex; align-items: center; justify-content: center; gap: 10px;`
- `.hangman-clue`: `flex: none; width: clamp(44px, min(16vw, 9vh), 72px); aspect-ratio: 1;`
  centrerad emoji med `font-size` ca 60 % av bredden, bakgrund `#1a1a2e` och en chunky ram
  i samma stil som `.primary-btn` (`box-shadow: 0 0 0 3px var(--accent), 4px 4px 0 3px #000`).
- Räkneexempel vid 320×700: innehållsbredden är ca 254 px, teckningen 160 px + 10 px mellanrum +
  kortet 51 px = 221 px. Det får plats.
- `.hangman-drawing-wrap` behåller sina egna storleksregler (`min(180px, 50vw, 24vh)`,
  `isolation: isolate`, skakningen). Sätt **ingen** storlek på den inre SVG:n (se CLAUDE.md om
  cirkelberoendet).
- `.hangman-letter` behöver `position: relative` om stilen för `.missed` ska kunna ha en understrykning
  via pseudo-element. Det går lika bra med `border-bottom: 2px dashed`.

### Data
- `journey.js`:
  - Nytt fält `icon` på varje planet i `PLANETS` (reservsymbol): djur 🐾, dinosaurie 🦖,
    mat 🍽️, trafik 🚦, skola 🏫, sport ⚽, robot 🤖, hav 🌊, vader 🌦️, kropp 🧍, natur 🌲,
    musik 🎵.
  - Ny karta `WORD_PICTURES` med gemener som nycklar, precis som orden står i listorna (inklusive å/ä/ö), t.ex.
    `hund: "🐕", katt: "🐈", ko: "🐄", äpple: "🍎", bil: "🚗", tåg: "🚆", sol: "☀️",
    gitarr: "🎸", raket: "🚀"`. **Ord som saknar en tydlig bild utelämnas helt ur kartan**
    (en gissad eller missvisande bild är sämre än reservsymbolen).
  - Ny funktion `getWordPicture(word, planet)` → `WORD_PICTURES[word.toLowerCase()] || planet.icon`.
  - Orden `fisk`, `sten` och `hals` finns på två planeter och får samma bild via kartan. Välj en bild som
    passar båda planeterna, eller utelämna ordet.
  - Använd bara emoji från **Unicode Emoji 13 (2020) eller äldre**. Nyare (t.ex. 🪸, 🪼) kan visas
    som tomma rutor på äldre Android-telefoner.
  - `PLANETS[].words` ska **inte** byggas om till objekt. Listorna förblir strängar, så att ordlistorna och
    befintliga tester inte påverkas.
- `hangman.js`:
  - `renderHangmanClue()` anropas från `startNewHangmanRound()`.
  - `renderHangmanWord()`: när `status === "lost"` visas de bokstäver som inte gissats med klassen `.missed`
    och `--i` satt till bokstavens position bland de ifyllda.
  - Resultattexterna i `guessLetter()` byts ut enligt mikrocopyn ovan (värdena `FUEL_PER_WIN`/`FUEL_PER_LOSS`
    läses från konstanterna, inte hårdkodat: `` `🚀+${FUEL_PER_WIN}` ``).
- `sw.js`: höj `CACHE_NAME` (`luffarschack-v15` → `v16`). Inga nya filer, så `ASSETS` behöver inte ändras.

### Troliga filer
`journey.js`, `hangman.js`, `index.html`, `style.css`, `sw.js`, ny testfil `tests/e2e/word-clue.spec.js`.

### Ljud
**Inget nytt ljud.** Befintliga `playWin()`/`playLose()` räcker.

### Tillgänglighet
- Bilden *är* stödet för den som inte läser. Den fungerar lika bra med touch och mus eftersom den inte går att trycka på.
- `role="img"` + `aria-label="Bildledtråd"`. Ordet står inte i etiketten, så att det inte avslöjas.
- De ifyllda bokstäverna skiljer sig från de man själv hittat genom **både** färg och understrykning, alltså inte
  bara genom färg.

### Acceptanskriterier (Playwright)
1. **Datakomplett:** varje planet i `PLANETS` har en `icon` som är en icke-tom sträng, och
   `getWordPicture(w, p)` returnerar en icke-tom sträng för varje ord `w` på varje planet `p`.
2. **Inga felstavade nycklar:** varje nyckel i `WORD_PICTURES` finns som ord på minst en planet.
3. **Bilden visas:** efter `#select-hangman-btn` är `#hangman-clue` synlig och dess `textContent` är
   `getWordPicture(hangmanState.word, getCurrentPlanet())`.
4. **Bilden följer ordet:** efter `startNewHangmanRound()` stämmer `#hangman-clue` med det nya ordet.
5. **Facit vid förlust:** efter en förlust (samma `loseRound`-hjälpfunktion som i `journey.spec.js`) finns
   ingen `.hangman-letter` med texten `_`. Antalet `.hangman-letter.missed` är lika med antalet
   bokstavspositioner i ordet vars bokstav inte finns i `guessedLetters`.
6. **Ingen `.missed` vid vinst.**
7. **Mikrocopy:** vid vinst innehåller `#hangman-result-text` `Ni klarade det!` och `🚀+2`. Vid förlust
   innehåller den `Nästan!` och `🚀+1`.
8. **Inline-regeln:** vid både vinst och förlust är `#hangman-word`, `#hangman-clue`, `.hangman-drawing-wrap`
   och `#hangman-keyboard` fortfarande synliga, och `#screen-hangman-game` har kvar `active`.
9. **320 px:** vid 320×700 och 412×915, både under spel och med resultatet synligt: `scrollWidth <= innerWidth`.
   Tvinga även fram det längsta ordet (`hangmanState.word = "FJÄRRKONTROLL"; renderHangmanWord();
   renderHangmanClue();`) och kontrollera igen. `#hangman-clue` och `.hangman-drawing-wrap` får inte
   överlappa (samma bounding-box-teknik som i `responsive.spec.js`).
10. **Ingen ny vertikal scroll:** QA mäter `scrollHeight` på Hänga gubbe-skärmen vid 412×915 med resultatet
    synligt på `main` *före* ändringen. Efter ändringen får värdet inte vara större.
11. Hela `npm run test:e2e` passerar i alla 4 projekt.

### Utanför scope (iteration 1)
- Uppläsning av ord eller bokstäver med talsyntes (se "Ägarbeslut").
- Att ändra, filtrera eller byta ut ord i planeternas listor.
- En knapp för att dölja bilden (t.ex. för det äldre barnet).
- Bilder på spelvalsskärmen eller i reseanimationen.
- Nya ljud, ändrad bränsleekonomi, ändrad tangentbordslayout.

---

## ITERATION 2: Din tur, och bra jobbat!

### Mål
(a) Den som inte läser ska se **utan text** att det är hens tur. (b) Varje rätt bokstav ska ge
personligt beröm i stunden, till den som gissade.

### Varför
Barn känner igen sin egen färg och **sin egen första bokstav** (J / V) långt innan de läser
hela ord. Beröm med namn ("Snyggt, Vera!") uppmuntrar utan att jämföra, så länge det aldrig räknas ihop.

### Beteende
- **Turmärke:** före texten i `#hangman-turn-indicator` visas en liten ruta med ramen i spelarens färg
  och bokstaven **J** eller **V** (pixelfonten, samma stil som `phase-hint`-ikonen i Luffarschack).
- **Tangentbordet i spelarens färg:** `.hangman-keyboard` får klassen `john`/`vera`, och en tunn yttre glöd
  i `--john-color`/`--vera-color` byter färg vid varje tur. Tangenterna själva behåller färgerna
  cyan/röd för rätt/fel.
- **Berömbubbla vid rätt gissning:** en kort bubbla som ligger absolut positionerad över `.hangman-stage`
  och därför inte tar någon höjd i layouten. Den visas i gissarens färg och tonas bort efter ca 1,2 s.
  - Text: slumpas ur `Snyggt, {namn}!` · `Bra, {namn}!` · `Toppen, {namn}!` · `Rätt, {namn}!`
  - Under texten visas **en ⭐ per förekomst** av bokstaven (A i "BANAN" → ⭐⭐). Så ser även den som inte läser hur
    många bokstäver som dök upp.
  - Varje nyss avslöjad bokstav får en liten gnistskur (`sparkBurst()` med färre gnistor, i gissarens färg).
- **Vid fel gissning:** bubblan `Bra försök!` i gissarens färg, utan stjärnor. Skakningen och ljudet är som idag.
- På gissningen som avgör omgången visas ingen bubbla. Vinst- och förlustbeteendet från iteration 1 tar över.

### Ljud (ljuddesignern konsulteras)
`playCorrectGuess(count)`: en stigande ton per förekomst, 1–3+ korta "pling" som låter som att man räknar.
Ljuddesignern bestämmer frekvenser, längder och ett tak för långa upprepningar. Fel-ljudet ändras inte.

### Troliga filer
`hangman.js`, `index.html`, `style.css`, `sound.js`, `sw.js` (höj `CACHE_NAME`).

### Acceptanskriterier (grova)
- `#hangman-turn-indicator` innehåller ett märke med texten `J`/`V` som matchar `hangmanState.currentPlayer`,
  med klassen `john`/`vera`.
- `#hangman-keyboard` har klassen `john` eller `vera` som stämmer med `currentPlayer` efter varje gissning.
- Efter en rätt gissning syns en bubbla med gissarens namn och klass, med lika många ⭐ som bokstaven förekommer.
  Bubblan är dold igen efter ca 2 s.
- `playCorrectGuess` anropas med antalet förekomster (spion via `page.evaluate`).
- Ingen horisontell overflow vid 320 px. Bubblan påverkar inte `scrollHeight`.
- Det finns ingen räknare per barn någonstans i DOM:en eller i `localStorage`.

### Utanför scope
Bränsle per bokstav, statistik över vem som hittade vad, större tangenter och vokalmarkering.

---

## ITERATION 3: Rymdalbumet

### Mål
Varje ord John och Vera klarar av, **vunnet eller förlorat**, hamnar i ett gemensamt album per
planet, med bild och ord. Resan får ett synligt "det här har vi upptäckt".

### Varför
Att samla är en stark drivkraft för 6–7-åringar. Albumet ger återkommande lästräning (bild + ord
bredvid varandra), och det är helt gemensamt. Även förlorade ord samlas, eftersom barnen har sett
stavningen (i linje med att förlust också ger bränsle).

### Beteende
- Ny knapp på spelvalsskärmen: **`📖 Rymdalbum`**, under Hänga gubbe-knappen.
- Ny skärm `screen-album`:
  - Rubrik: planetens namn. Under den: **`7 av 25 ord upptäckta`**.
  - Ett rutnät med kort. Upptäckta ord visar emoji + ORDET med versaler. Ord som inte upptäckts än visar ett
    nedtonat **`?`**.
  - Pilarna **`◀`** och **`▶`** bläddrar mellan planeter man har besökt. Planeter man inte har besökt visas
    inte (ingen "låst"-känsla).
  - Knappen **`Tillbaka`** går till spelvalet (regeln om väg tillbaka i CLAUDE.md).
  - Man får scrolla vertikalt på den här skärmen eftersom man bläddrar där, men aldrig horisontellt.
- Sparas i `localStorage` under nyckeln `rymdarkaden-album-v1`, i formatet `{ [planetId]: ["hund", …] }`, med samma
  try/catch-mönster som `journey.js`. Dubbletter sparas bara en gång.
- Albumet börjar tomt när funktionen rullas ut. Ord man redan spelat kan inte återskapas.

### Ljud
Inget nytt. Bläddring och knappar använder `playClick()`.

### Troliga filer
Ny fil `album.js` (samma princip som `hangman.js`: egen fil så att inget annat går sönder), `index.html`,
`style.css`, `hangman.js` (ett anrop när en omgång är klar), `sw.js` (`ASSETS` + `CACHE_NAME`).

### Acceptanskriterier (grova)
- Efter en vunnen och en förlorad omgång finns båda orden under rätt planet-id i `localStorage`.
- Albumet visar `2 av N ord upptäckta`. Upptäckta kort har rätt emoji och ord, resten visar `?`.
- Samma ord två gånger räknas en gång.
- `Tillbaka` leder till `screen-game-select`. Ingen horisontell overflow vid 320 px.
- Om `localStorage` kastar ett fel (privat läge) fungerar spelet ändå.

### Utanför scope
Belöningar eller troféer för att fylla ett helt album, att dela eller exportera, uppläsning, och album för Luffarschack.

---

## Ägarbeslut

**Inget blockerar iteration 1.** Två frågor kan ägaren ta ställning till när det passar:
1. **Talsyntes (uppläsning av ord/bokstav på svenska)** skulle vara det enskilt största stödet
   för den som inte läser. Det bryter dock mot "bara procedurellt ljud", och svenska röster fungerar
   olika bra offline och på olika telefoner. Därför finns det inte med i den här roadmapen.
   Vill ägaren att det utreds senare?
2. Iteration 1 visar **planetsymbolen** för abstrakta ord (t.ex. *stor*, *liten*, *rast*, *läxa*)
   istället för att byta ut dem. Ägaren kan titta igenom kartan `WORD_PICTURES` vid granskningen.

## Backlog (kända luckor som inte ryms i de tre iterationerna)
- Större tangenter för barnfingrar (kräver en egen genomgång av höjdbudgeten, eftersom fler rader ger scroll).
- Vokalerna markerade på tangentbordet (A E I O U Y Å Ä Ö), som ett tips för det äldre barnet.
- Nyfyllda bränslerutor som pulserar vid resultatet.
- En kort introduktion första gången Hänga gubbe öppnas.
- En väg tillbaka till spelvalet mitt i ett ord (idag bara via Avsluta).
