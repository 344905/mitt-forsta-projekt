# UX-granskning: ljud-täckning över hela appen

**Roll:** game-designer
**Kontext:** ljud finns nu i båda spelen (iteration 1-2). Den här granskningen går igenom
varje knapp/övergång och letar efter tystnad där ljud rimligen förväntas, eller
inkonsekvens mellan spelen.

## Fynd

### 1. Hänga gubbe — trycka på en redan gissad bokstav
Tyst via skärmtangentbordet (knappen är `disabled`, klicket når aldrig `guessLetter()`) —
korrekt beteende, inget att åtgärda. **Men:** ett fysiskt tangentbordstryck på en redan
gissad bokstav går förbi `disabled`-kollen (den sitter bara på DOM-knappen) och blir också
tyst, vilket är rätt eftersom `guessLetter()` har ett tidigt `return` för redan gissade
bokstäver. Lågprioriterad observation, inget verkligt gap — tystnad är rätt svar här (ingen
ny information, inget att bekräfta ljudmässigt).

### 2. Luffarschack — drag vs. två-tryck-flytt
Båda vägarna går igenom samma `movePiece()` → `playDragMove()`. Inget gap. Den mellanliggande
"plocka upp brickan"-tryckningen (markering, innan destination valts) är tyst i båda lägena
— rimligt, ingen motsvarande mellanstat finns i Hänga gubbe att jämföra med.

### 3. Byt spel / navigering — verklig inkonsekvens
Hänga gubbes "Nytt ord"/"Byt spel"-knappar har `playClick()`. **Nästan ingen av
Luffarschacks motsvarande knappar har det:** `select-tictactoe-btn`, `select-hangman-btn`,
alla "tillbaka till spelval"-knappar, `continue-btn`, `play-again-btn`, `start-btn`,
`next-round-btn`, och hela avsluta-bekräftelse-trion (`exit-btn`/`exit-confirm-btn`/
`exit-cancel-btn`) saknar ljud helt.

**Rekommendation: stäng det här gapet.** Lägg `playClick()` på samtliga ovanstående knappar
— annars känns Hänga gubbe "levande" och Luffarschack/spelvalet "dövt" i jämförelse, trots
att de delar samma ljudsystem.

### 4. Introskärmen (klicka för att fortsätta)
Helt tyst idag. **Rekommendation: lägg till `playClick()` här** — det är dessutom det första
tillfället en användare interagerar med sidan, så det är precis rätt ställe att "väcka"
`AudioContext` (som ändå kräver en användar-gest för att få skapas).

## Sammanfattning till builder

Prioritet: fynd 3 och 4 (riktiga, hörbara gap). Fynd 1 och 2 kräver ingen ändring.
