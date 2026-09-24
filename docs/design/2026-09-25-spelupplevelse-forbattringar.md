# Spelupplevelse: intro-ljud + bred genomgång av båda spelen

**Roll:** game-designer
**Kontext:** Ljud finns nu i hela appen (4 iterationer, se `2026-09-24-ljud-*.md`). Två
frågor från användaren: (1) ska introskärmen (John/Vera-porträtten) ha mer ljud än dagens
klick, och (2) en förutsättningslös genomgång av båda spelen — vad gör vi för att
spelupplevelsen faktiskt ska bli roligare, mer tillfredsställande och mer repeterbar. Inget
här kräver backend, konton eller nya npm-beroenden.

---

## Del 1: Ljud på introskärmen

### Nuläge
Introskärmen visar John/Vera-porträtten, auto-avancerar efter 3 sekunder
(`setTimeout(..., 3000)` i `script.js`), och spelar redan `playClick()` om man trycker för
att hoppa förbi den tidigare. Ingen musik, ingen ambience.

### Rekommendation: behåll den som en kort ljudsignal — men gör den lite mer "power-up"
Byt inte till loopande bakgrundsmusik. Gör istället dagens enkla klick (en enda 440 Hz-ton,
0.08s) till en kort stigande **2–3-tons-flourish** (~150–200ms totalt) i samma stil som
`playWin()`/`playMatchWin()` redan använder (flera `playTone()`-anrop efter varandra med
`startAt`-offset) — men kortare och utan att ta ut en spelares färg/register, eftersom
introskärmen inte tillhör John eller Vera specifikt. Tänk "spelet vaknar till liv", inte en
fanfar. Exakta frekvenser/typ är sound-designerns bord (samma ansvarsfördelning som redan
gäller i det här projektet) — den här noten säger bara *vilken sorts* ljud som passar
platsen och varför.

### Varför inte loopande ambient-musik här
- **AudioContext-regeln gör poängen tandlös.** Ljud kan bara starta efter en användar-gest.
  Skärmen auto-avancerar efter 3 sekunder — om ambience skulle hinna starta över huvud
  taget måste den starta *från samma tryck som lämnar skärmen*. Man skulle i praktiken höra
  0.1 sekund av loopen innan man är på spelvalet. Att bygga en loop för att sedan aldrig
  höra den är bortkastat arbete.
- **Repetitionströtthet är värre här än någon annanstans i appen.** Det här är en installerad
  PWA på en delad telefon (se `CLAUDE.md`) — introskärmen är sannolikt det *mest* repeterade
  ögonblicket i hela appen, man ser den vid varje öppning. En loop man hör om och om igen på
  en skärm man ändå bara vill förbi känns snabbt tjatig; en kort, engångs-flourish gör inte
  det.
- **Skärmen är byggd för att lämnas snabbt, inte för att man ska dröja sig kvar.**
  3-sekunders auto-avancering plus en klickbar hel skärm signalerar tydligt "det här är ett
  mellansteg, inte en destination". Ambient-musik är ett verktyg för skärmar man vistas på —
  fel verktyg här.
- **Implementationskomplexitet är inte gratis.** En sömlös Web-Audio-loop (schemaläggning så
  den inte klickar/hackar i skarven, städning när skärmen lämnas, samspel med
  ljud-toggle-knappen som redan finns) är en genuin bit extra kod för en effekt som ändå
  knappt skulle höras. Den korta flourishen återanvänder ett mönster (`playTone()` flera
  gånger i rad) som redan finns och är beprövat.

**Sammanfattning:** kort klick → kort stigande flourish. Ingen loop, ingen ambient-musik.

---

## Del 2: Bred genomgång — hur vi gör spelupplevelsen bättre

Genomgången är organiserad per spel, plus ett gemensamt avsnitt. Alla förslag är
CSS/SVG/Canvas/`localStorage` — inget som bryter mot "ingen backend, inga nya
runtime-beroenden".

### Luffarschack

**Juice/visuell feedback**
- Vinst-strecket (`drawWinLine()`) ritas idag direkt i full längd. Att animera det som ett
  streck som **växer från mitten ut** (SVG `stroke-dasharray`/`stroke-dashoffset`,
  ~250–300ms) ger en kort "ah, DÄR gick den"-paus istället för att linjen bara dyker upp.
  Billigt (ren CSS/SVG-transition), stor upplevd effekt.
- De tre vinnande rutorna kan pulsera/glöda en extra gång när linjen ritas (en kort
  `box-shadow`/`scale`-puls via CSS `@keyframes`, samma teknik som `.cursor-dim` redan
  använder för blinkningen). Förstärker "det här var vinstraden" utan ny text.
- Nya brickor poppar in idag direkt (textContent sätts, ingen övergångseffekt). En liten
  `scale(0) → scale(1)`-transition (~120ms) på `.cell` när en bricka läggs ut eller flyttas
  klart gör varje drag kännas som en handling med vikt, inte bara en DOM-uppdatering.
- Serievinst-bannern (`screen-series-winner`) är idag ren text. En enkel "gnist-skur" — ett
  gäng små `<div>`/SVG-punkter i spelarens färg som CSS-animeras utåt och tonar bort
  (`@keyframes` med `transform`+`opacity`, inga bibliotek) — hade gett serie-avgörandet den
  tyngd det förtjänar jämfört med en vanlig matchvinst.

**Pacing**
- Bäst-av-5 känns rätt längd för en match som tar någon minut — ingen ändring rekommenderas
  här. Att lägga till ett val mellan "snabbmatch" (bäst av 3) och "maraton" (bäst av 7) är
  fullt möjligt men är en extra skärm/beslut *innan* varje serie, vilket bromsar in flödet
  precis där det idag går snabbt från spelval till bräde. Se det som en möjlig framtida idé,
  inte något att bygga nu.
- Flytt-regeln (max 3 brickor, sedan måste man flytta) är redan en bra mekanism som
  förhindrar oavgjort och håller sena skeden av matchen intressanta — inget att ändra.

**Repeterbarhet/variation**
- Ingen AI-motståndare, ingen svårighetsgrad — det är fel typ av förslag här. Spelet är
  byggt kring att John och Vera är två *namngivna, mänskliga* spelare; att lägga till en
  dator-motståndare vore en arkitekturändring, inte en förbättring, och ligger utanför scope.

### Hänga gubbe

**Juice/visuell feedback**
- Bokstavs-poppen (`.pop`-klassen) vid rätt gissning finns redan och fungerar bra.
  Motsvarande **liten skakning** på hela ritningen (`.hangman-drawing-wrap`, ett kort
  `translateX`-skak, ~150ms) när en *fel* bokstav läggs till nästa galg-del hade gett en
  tydlig, kroppslig "aj" som matchar ljudet (`playWrongGuess()`) som redan finns.
- Sista fel-gissningen (förlust) kan få en tydligare markering än de föregående — t.ex. att
  gubben-figuren gör en kort svajning (CSS-animation på hela SVG:n) istället för att bara
  visa samma `.hm-part.visible`-tillägg som alla andra fel. Skiljer "spelet är slut" från
  "ännu ett fel" rent visuellt, inte bara via texten som redan visas.
- Vid vinst: samma gnist-skur-idé som för Luffarschacks serievinst, fast i cyan (`--accent`)
  över ordet — förstärker att just *det här* ordet är klart.

**Pacing/svårighetsgrad**
- 9 tillåtna fel mot ordlistan (2–7 bokstäver, många mycket korta ord som "vi"/"du"/"en") gör
  att korta ord är nästan omöjliga att förlora på, medan längre ord fortfarande är
  hanterbara — det här är sannolikt *avsiktligt* forgivande snarare än ett buggigt
  svårighetsläge, och ordlistan är uttryckligen användarens egen (se `CLAUDE.md`: "ask
  before replacing or filtering it"). Rekommendation: rör inte svårighetsgraden. Om det
  någon gång känns för lätt är en `localStorage`-baserad "svår ordlista"-växel (bara längre
  ord) en möjlig framtida tillägg, inte en prioritet nu.

**Repeterbarhet/variation**
- Ordet slumpas idag helt fritt (`WORDS[Math.floor(Math.random() * WORDS.length)]`), vilket
  innebär att **samma ord kan komma två gånger i rad**. Enkel, billig fix: uteslut senast
  spelade ordet ur slumpningen nästa gång. Ren kvalitetsförbättring, inte ny funktionalitet,
  men gör "Nytt ord"-knappen kännas mer pålitlig.
- Ett litet räkneverk för **antal ord i rad utan förlust den här sessionen** ("3 ord i rad!")
  hade förstärkt att Hänga gubbe är samarbete — John och Vera bygger något *tillsammans*
  över flera ord, inte bara ett enskilt ord i taget.

### Genomgripande (båda spelen) — den enskilt största hävstången

Det som saknas mest i hela appen just nu är **minne mellan sessioner**. Allt
(serie-poäng, ord-listor, streaks) nollställs varje gång man startar om. `sound.js` visar
redan att `localStorage` fungerar fint i det här projektet (ljud-preferensen sparas där, med
ett beprövat try/catch-mönster för privat surfläge). Att återanvända exakt det mönstret för
enkla spelstatistik är billigt och passar arkitekturen perfekt.

Konkret förslag: en **"Rivalerna"-rad** (kort text, inte en ny skärm) som visas längst ner
på spelvalsskärmen (`screen-game-select`), t.ex. "John leder 7–4 i Luffarschack · 12 ord
lösta tillsammans i Hänga gubbe". Uppdateras tyst i bakgrunden varje gång en match/omgång
avgörs, ingen extra knapptryckning krävs.

- **Användarflöde:** inget nytt flöde — texten sitter på en skärm som redan finns
  (spelvalet), uppdateras automatiskt, kräver ingen egen interaktion.
- **Vinst/förlust förblir inline:** påverkar inte alls — det här är bara en sammanfattning på
  en annan skärm, rör inte reglerna om att bräde/ord ska stanna synligt vid utgång.
- **Mikrocopy (svenska), samma ton som appen idag:** "John leder 7–4", "Vera leder serien",
  "Lika läge, 5–5", "12 ord lösta tillsammans hittills". Kort, siffror före namn där det är
  naturligt, inga utropstecken-överdrifter (matchar den nyktra tonen i t.ex.
  `round-result-text`).
- **John/Vera-inblandning:** det här *är* rivalitets-/lagkänslan i konkret form — Luffarschack
  är tävling (vem leder-räkning), Hänga gubbe är samarbete (gemensam räkning, inte
  "John X, Vera Y" uppdelat), vilket speglar att spelen redan är designade med olika
  spelar-relation.
- **Tillgänglighet:** ren text, ingen ny ikon behövs (det här är inte ett läshinder-kritiskt
  ställe som `phase-hint` — det är en bonus-rad för den som redan kan läsa, spelet fungerar
  identiskt utan att någon läser den). Fungerar identiskt med touch och mus eftersom den
  inte är interaktiv.

---

## Rangordnad kortlista — vad som faktiskt är värt att bygga näst

1. **"Rivalerna"-raden på spelvalsskärmen** (persistent `localStorage`-statistik över
   Luffarschack-serier och gemensamt lösta Hänga gubbe-ord). Störst hävstång på
   repeterbarhet och känslan av att John/Vera bygger något över tid, återanvänder ett redan
   beprövat sparmönster, ingen ny skärm.
2. **Vinst-linjen i Luffarschack ritas som en kort animation** (växer från mitten,
   `stroke-dashoffset`) istället för att dyka upp direkt. Litet, rent CSS/SVG-jobb med stor
   upplevd "juice"-effekt på spelets mest tillfredsställande ögonblick.
3. **Gnist-skur vid serievinst (Luffarschack) och ordvinst (Hänga gubbe).** Samma teknik
   återanvänd på två ställen, ger de två "stora" vinstögonblicken i appen den visuella tyngd
   texten ensam inte ger idag.
4. **Skakning på Hänga gubbe-ritningen vid fel gissning**, som den visuella motsvarigheten
   till `playWrongGuess()`-ljudet som redan finns. Billigt, matchar ett ljud som redan
   spelas i tomma intet visuellt idag.
5. **Uteslut senast spelade ordet ur nästa slumpning i Hänga gubbe.** Minsta möjliga fix på
   listan, men en riktig (om liten) brist — "Nytt ord" bör kännas som ett nytt ord.

Introskärmens ljud (Del 1) är en egen, redan avgjord fråga — kort flourish, ingen loop — och
listas inte separat i kortlistan ovan eftersom det är ett svar på en specifik fråga, inte ett
nytt förslag att prioritera mot de andra.
