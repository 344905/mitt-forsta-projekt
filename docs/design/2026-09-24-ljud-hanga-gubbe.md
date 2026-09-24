# Ljuddesign: Hänga gubbe

**Roll:** sound-designer
**Kontext:** Hänga gubbe har idag inget ljud alls. Förslaget nedan täcker de återkommande
händelserna i spelet. Alla ljud genereras procedurellt med Web Audio API:ets oscillatorer
(fyrkant-/triangelvåg) — inga ljudfiler, inga nya beroenden i den levererade appen.

## Ljud per händelse

| Händelse | Vågform | Frekvens | Längd | Karaktär |
|---|---|---|---|---|
| Rätt bokstav | Fyrkantsvåg | 500 → 800 Hz (stigande) | ~120 ms | Kort, ljust "ping" |
| Fel bokstav | Fyrkantsvåg | 300 → 150 Hz (fallande) | ~150–180 ms | Dov "duns" |
| Vunnen runda | Fyrkantsvåg, 3–4 toner | C–E–G–C | ~400 ms totalt | Stigande liten fanfar |
| Förlorad runda | Triangelvåg | 300 → 80 Hz (fallande) | ~600 ms | Mjuk, utdragen, inte skrämmande |
| "Nytt ord" / "Byt spel" (knapptryck) | Fyrkantsvåg | 440 Hz (fast) | ~80 ms | Neutralt klick |

Alla ljud spelas med låg gain (**~0.15–0.2**) så det aldrig känns påträngande, även vid
upprepad användning.

## Delat mellan John och Vera

Hänga gubbe är co-op (de gissar tillsammans på samma ord) — därför inga spelarspecifika
ljud (till skillnad från hur de har varsin färg). Samma ljud oavsett vems tur det är.

## Mute-kontroll — se game-designers förslag

Den här filen föreslog ursprungligen en egen textbaserad "LJUD: PÅ/AV"-knapp nära
turindikatorn. **Game-designer har i ett separat förslag** (`2026-09-24-ljud-toggle-
placering.md`) rekommenderat en **global** ikon-baserad knapp, fast placerad i övre vänstra
hörnet (spegelvänd mot `.exit-btn`), med motiveringen att Luffarschack kan få ljud senare
och att en global lösning slipper flyttas om då.

**Avstämt beslut för builder:** använd game-designers placering/UI (global, ikon, fast
position, `aria-label`), men behåll den här filens ljud-parametrar för själva effekterna.
Sparat val (på/av) ska ändå ligga i `localStorage` så det kommer ihåg sig mellan sessioner,
vilket båda förslagen var överens om.
