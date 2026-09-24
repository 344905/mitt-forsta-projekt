# Ljuddesign: Luffarschack

**Roll:** sound-designer
**Kontext:** ljud finns redan i Hänga gubbe (`sound.js`, delat system). Det här förslaget
utökar samma infrastruktur till Luffarschack — inga nya tekniska beroenden, bara nya
`playTone()`-parametrar.

## Ljud per händelse

| Händelse | Vågform | John | Vera | Längd |
|---|---|---|---|---|
| Placera bricka | Fyrkantsvåg, ingen sweep | 380 Hz | 560 Hz | 70 ms |
| Färdigt drag (flytta bricka) | Triangelvåg, sweep uppåt | 300 → 420 Hz | 440 → 620 Hz | 100 ms |
| Vinna en match | Fyrkantsvåg, 2 toner | G4 → C5 | B4 → E5 (en ters upp) | 100 ms/ton |
| Vinna serien (Grattis-banner) | Fyrkantsvåg, 4 toner, samma rytm som Hänga gubbes `playWin` | C-E-G-C | Transponerad en stor ters upp | 100 ms/ton |

Placering och drag är medvetet olika vågform/karaktär (kort torr blipp vs. mjukare svep) så
de går att särskilja utan att titta på skärmen.

## John/Vera — olika tonhöjd, samma form

Ja till skillnad mellan spelarna, men bara i **register** (tonhöjd), inte i vågform eller
karaktär — samma "typ" av ljud, bara högre/lägre. Motivering: Luffarschack är redan
tävlingsinriktat med tydlig spelaridentitet (egna färger, egna markörer), till skillnad från
Hänga gubbes co-op-upplägg där ett delat/neutralt ljud var rätt val. Håller sig fortfarande
inom samma `SOUND_GAIN` och tekniska ramar som redan finns.

## Mute/volym

Inget nytt behövs — den globala mute-knappen och `SOUND_GAIN`-nivån i `sound.js` täcker
redan alla spel i appen, per den ursprungliga designen (se
`docs/design/2026-09-24-ljud-toggle-placering.md`).

## Anteckning till builder

Serie-vinst-ljudet (`playSeriesWin`, förslagsvis) bör trigga när `screen-series-winner`
visas (samma ögonblick som den blinkande bannern), inte samtidigt som match-vinst-ljudet —
annars överlappar de två fanfarerna om spelaren precis vunnit sin tredje match.
