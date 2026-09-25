# Ljuddesign: `playCorrectGuess(count)` — beröm per bokstav (iteration 2)

**Roll:** sound-designer
**Kontext:** `docs/design/2026-09-25-produktteam-3-iterationer.md`, avsnitt "ITERATION 2: Din tur,
och bra jobbat!". `playCorrectGuess()` tar idag inga argument och spelar en enda ton. Iteration 2
lägger till en berömbubbla med **en ⭐ per förekomst** av den gissade bokstaven i ordet (t.ex. A i
"BANAN" → ⭐⭐), och vill att ljudet speglar samma räkning: "en stigande ton per förekomst, 1–3+
korta 'pling', som låter som att man räknar". Det här dokumentet specificerar exakt hur.
Fel-ljudet (`playWrongGuess()`) ändras inte.

Alla ljud genereras procedurellt med Web Audio API:ets oscillatorer, via befintliga `playTone()` i
`sound.js` — inga ljudfiler, ingen ny lågnivåkod.

## Ny signatur

```js
function playCorrectGuess(count = 1)
```

`count` = antalet gånger den gissade bokstaven förekommer i det aktuella ordet (samma tal som
antalet ⭐ i berömbubblan). Standardvärdet `1` gör anropet bakåtkompatibelt om något ställe råkar
kalla på funktionen utan argument.

## Beteende

| `count` | Vad som spelas | Motivering |
|---|---|---|
| **1** (vanligast — de flesta bokstäver finns bara en gång) | **Exakt samma ton som idag**: 500 → 800 Hz, fyrkantsvåg, 120 ms, ingen paus. | Den absolut vanligaste gissningen ska låta precis som den gör idag — ingen anledning att lära om ett ljud som redan känns rätt för det vanliga fallet. |
| **2** | Två korta "pling" i stigande tonhöjd: **659,3 Hz (E5)**, sedan **784,0 Hz (G5)**. | Två distinkta toner, inte en sweep — det är själva upprepningen (pling-PLING) som ska låta som att man räknar till två, inte en enda glidande ton. |
| **3 eller fler (tak)** | Tre korta "pling": **659,3 Hz (E5) → 784,0 Hz (G5) → 1046,5 Hz (C6)**. Exakt samma tre toner oavsett om bokstaven finns 3, 4 eller fler gånger. | Se "Tak för långa upprepningar" nedan. |

Alla pling-toner (fallet `count ≥ 2`): fyrkantsvåg, **90 ms** långa, med **110 ms** mellan varje
tons start (dvs. ca 20 ms tyst mellanrum mellan tonerna) — tätt nog för att låta som en enda
snabb "räkne-stege", inte tre separata ljud. Volym: samma `SOUND_GAIN`-skala som allt annat ljud
(`playTone()`s standardvärde, ingen egen volymjustering).

### Varför just E5–G5–C6

Samma tonart (C-dur) som `playWin()`s fanfar (C4–E4–G4–C5), men en oktav upp och utan grundtonen
C — så att beröm-plinget känns släkt med segerfanfaren (samma "rätt håll", uppåtgående, ljus) men
aldrig kan förväxlas med den: det är kortare (max 3 toner å 90 ms mot `playWin()`s 4 toner å
120 ms), ligger högre i registret, och saknar den avslutande basnoten som gör `playWin()` till en
tydlig "final".

### Exempel: koden bygger vidare på `playTone()`, inte ny oscillatorkod

```js
function playCorrectGuess(count = 1) {
  const notesToPlay = Math.min(Math.max(count, 1), 3); // 1–3, se tak nedan

  if (notesToPlay === 1) {
    // Oförändrat jämfört med idag.
    playTone({ freq: 500, sweepTo: 800, duration: 0.12, type: "square" });
    return;
  }

  const STAIRCASE = [659.3, 784.0, 1046.5]; // E5, G5, C6
  for (let i = 0; i < notesToPlay; i++) {
    playTone({ freq: STAIRCASE[i], duration: 0.09, type: "square", startAt: i * 0.11 });
  }
}
```

Anropsplatsen i `hangman.js` (`guessLetter()`) räknar redan ut antalet förekomster för
⭐-bubblan enligt iterationsspecen — samma tal skickas in här, t.ex.
`playCorrectGuess(occurrenceCount)`.

## Tak för långa upprepningar

**Tak: 3 toner, oavsett om bokstaven förekommer 3, 4, 5 eller fler gånger i ordet.** Ovanför taket
spelas exakt samma tre-tons stege som vid `count === 3` — inget extra läggs på.

Motivering:
- Svenska barnordlistan i `WORDS`/`PLANETS` innehåller nästan uteslutande korta ord (4–7 tecken),
  så 4+ förekomster av samma bokstav är sällsynt redan idag och blir inte vanligare av att bilder
  läggs till. Att bygga för ett teoretiskt maxfall vore överdesign.
- ⭐-raden på skärmen visar redan det **exakta** antalet — ljudets jobb är att kännas som en kort
  fira-stund ("pling, pling till!"), inte att vara en exakt hörbar räknare. Ett tak på 3 håller
  ljudet under en halv sekund även i värsta fall, vilket är viktigt för ett barn som gissar snabbt
  i följd och inte ska behöva vänta ut en lång ljudsvit för varje bokstav.
- Att förlänga ljudet proportionerligt mot ordlängd hade också riskerat att korsa in i
  `playWin()`s tidsrymd (≥ 400 ms) och gjort de två lätta att förväxla.

## John/Vera: delat, inte spelarspecifikt

Precis som befintlig `playCorrectGuess()`/`playWrongGuess()` (se
`docs/design/2026-09-24-ljud-hanga-gubbe.md`): Hänga gubbe är co-op, John och Vera gissar
tillsammans på samma ord, så ljudet är **neutralt och delat** — ingen tonhöjdsskillnad mellan
spelarna. Identiteten i stunden kommer redan från den nya berömbubblans namn och färg
(`Snyggt, Vera!` i hennes färg) och tangentbordets färgade glöd — att lägga in ännu en
spelarspecifik signal i själva ljudet vore en tredje kanal för samma information, och skulle göra
det svårare att i framtiden återanvända samma "counting-pling"-mönster (t.ex. till Rymdalbumet)
utan att behöva köna in per-spelare-register.

## Volym / mute

Ingen ny mute-funktion behövs — den globala ljud-på/av-knappen från
`docs/design/2026-09-24-ljud-toggle-placering.md` (fast ikonknapp, sparas i `localStorage`,
`toggleSound()`/`isSoundEnabled()` i `sound.js`) täcker redan alla ljud i appen, inklusive detta.
`playTone()`s `if (!soundEnabled) return;`-vakt gäller per definition varje anrop denna funktion
gör, oavsett hur många "pling" som spelas — så en avstängning tystar hela stegen, inte bara första
tonen. Ingen builder-åtgärd krävs här utöver att fortsätta anropa `playTone()` som idag.

## Sammanfattning för builder

- Ändra `playCorrectGuess()` → `playCorrectGuess(count = 1)` i `sound.js`.
- `count === 1`: oförändrat (500 → 800 Hz sweep, 120 ms, fyrkantsvåg).
- `count >= 2`: `Math.min(count, 3)` diskreta toner ur `[659.3, 784.0, 1046.5]` (E5/G5/C6),
  fyrkantsvåg, 90 ms var, `startAt: i * 0.11`.
- Anropsplatsen i `hangman.js` skickar in samma antal förekomster som används för ⭐-bubblan.
- `playWrongGuess()` rörs inte.
