# Ljud-toggle: placering och räckvidd

**Roll:** game-designer
**Kontext:** sound-designer föreslår ljudeffekter för Hänga gubbe. Den här noten svarar bara
på en fråga: var ska en mute/ljud-knapp sitta, och ska den vara global eller spelspecifik?

## Rekommendation

En **global** ljud-knapp, inte begränsad till Hänga gubbe — fast placerad (`position: fixed`)
i **övre vänstra hörnet**, som en spegelvänd syskon-komponent till `.exit-btn`
(`top:16px; right:16px`): samma chunky box-shadow-ram, samma pixelfont, `z-index:10`, och
syskon till `#app` i DOM:en (alltså synlig på alla skärmar oavsett vilket spel man är i).

## Varför

- **Global, inte spelspecifik:** `CLAUDE.md` flaggar redan att Luffarschack kan få ljud
  senare. Bygger man togglen som delat/globalt state från början slipper man flytta ut den
  ur Hänga gubbe-specifik kod när det blir dags — mindre omskrivning senare.
- **Motsatt hörn av Avsluta-knappen:** placeras i övre **vänstra** hörnet, inte höger, så de
  två fasta knapparna aldrig konkurrerar om samma tryckyta eller känns hopträngda på smala
  skärmar (samma typ av överlappnings-problem som redan lösts för Avsluta-knappen mot
  panelens kant, se `CLAUDE.md`s "Other interaction gotchas").
- **Ikon, inte text:** en högtalar-ikon (på/av) istället för ordet "Ljud", i linje med
  projektets etablerade princip att ha ikoner för den som inte kan läsa än (samma tanke som
  `phase-hint`-mönstret i Luffarschack).
- **Tillgänglighet:** `aria-label` som växlar mellan t.ex. "Stäng av ljud"/"Sätt på ljud" så
  skärmläsare hänger med, inte bara en visuell ikon-ändring.

## Öppen fråga till builder

Bör knappen komma ihåg sitt läge mellan sessioner (t.ex. via `localStorage`), eller
återställas till "på" varje gång appen öppnas? Rekommendation: kom ihåg valet — särskilt
värdefullt om appen spelas på en delad telefon där man kanske stänger av ljudet i vissa
sammanhang (t.ex. sent på kvällen).
