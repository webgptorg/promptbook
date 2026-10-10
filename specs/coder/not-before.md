# Not-before: nejdřívější spuštění

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Markdown rozpoznává schedule pouze v celém backtick tokenu vlastního řídicího stavového řádku. Book používá `AFTER`. Datum v názvu, těle, cestě, příkladu, URL nebo hotovém reportu není trigger.

Podporovat striktní gramatiku: `YYYY-MM-DD`; datum a čas oddělené mezerou nebo `T`, čas `HH:mm` s volitelnými sekundami a zlomkem sekund; bez zóny, s `Z` nebo offsetem `+HH:mm`/`-HH:mm`. Offset přijímat i u formy s mezerou. Netvrdit podporu libovolné ISO varianty.

```markdown
[ ] !! `2026-10-30 09:30`
[ ] `gpt` `2026-10-30T09:30:00+01:00`
[ ] `gpt-4.1-2025-04-14` `2026-10-30`
```

Datum bez času znamená půlnoc na začátku daného dne. Hranice je `now >= notBefore`. `Z`/offset určuje instant; bez offsetu použít jednu explicitně vyřešenou lokální timezone invokace a ukázat ji uživateli. **Nové rozhodnutí:** default je systémová lokální IANA timezone zachycená jednou na začátku invokace; nelze-li ji spolehlivě vyřešit, vstup bez offsetu je chyba. Při aktivaci schedule uložit i použitou timezone. Neexistující nebo dvojznačný lokální čas při změně DST vyžaduje explicitní offset.

Neplatná data, rozsahy nebo date-shaped překlepy úkol blokují. Modelové jméno s vloženým datem není datum. Stejné opakované instanty jsou redundantní; odlišné instanty v jedné definici jsou konflikt. Relativní slova, samotný čas, cron a přirozenojazyčné podmínky nejsou podporovány.

Budoucí task s vysokou prioritou neblokuje způsobilé tasky. Odložený task zůstává `todo`. `run` skončí, když nemá způsobilou práci, a vypíše budoucí úkoly/příští relevantní čas. Persistentní scheduler se znovu probudí při zdrojové změně nebo čase. `S` ani pause/resume tuto podmínku neobchází. Obnova již skutečně zahájeného tasku je recovery, nikoli nový plánovaný start.

## Související specifikace

- [Způsobilost tasku](eligibility.md)
- [Opakované task Books](recurrence.md)
- [Terminál a řízení běhu](terminal.md)
