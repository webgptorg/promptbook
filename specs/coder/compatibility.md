# Kompatibilita a vědomé změny

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

## Musí zůstat kompatibilní

Legacy fronta včetně implicitních tasků, priority a OR routing; všechny stavy a ruční verify; oddělení `fix` od queue; vybraný projekt/context; default Developer; explicitní agent Books a TEAM; základní CLI a podporované harnessy; Git scope, fázové commity, no-commit, isolation a synchronizace; ovládání Normal/Raw a plain output; použití z nainstalovaného balíčku.

Init ani migrace nesmějí hromadně přepsat existující backlog Promptbooku jako vedlejší efekt instalace nové verze. Přepis se vyvíjí v samostatném balíčku/modulu s kompatibilitním testovacím corpus a po ověření může nahradit starý vstupní bod.

## Záměrné změny pro lepší implementaci

| Změna | Důvod a zachovaná hranice |
| --- | --- |
| Oddělený domain model místo Markdown objektu v celém runtime | Oba formáty a recurrence používají jeden engine. |
| `.promptbook` místo vlastních souborů v `.git` | Požadavek nového PRD 0130; Git samotný dále pracuje standardně. |
| Explicitní source revisions a persisted ownership při resume | Ochrana uživatelských editací a skutečná recovery. |
| Loopback a chráněné lokální mutace serveru | Zachování funkčního UI bez přenosu současných slabých guardů. |
| Redakce secrets a bounded occurrence historie | Durable diagnostika bez neúmyslného verzování credentials. |
| Bezpečný noninteractive disk failure | Zákaz dotazů neznamená automatické ignorování kritické chyby. |
| Přehled odložených/blocked úkolů v list/dry-run | Nové schedule nesmí zmizet z viditelnosti jako prázdná fronta. |

Každou změnu příkazového defaultu, exit code nebo výstupního formátu uvést v release notes. **Nové rozhodnutí:** základní exit kontrakt `0` = úspěšné ukončení podle režimu, `1` = execution/check/persistence/sync failure, `2` = neplatná konfigurace/vstup; cancellation `130` pro SIGINT. Prázdná nebo pouze budoucí fronta není chyba, ale musí být poctivě popsána.

## Související specifikace

- [Rozsah coderu](scope.md)
- [Uživatelské a CLI kontrakty](cli.md)
- [Migrace Markdown tasků na Books](migration.md)
- [Akceptační scénáře](acceptance.md)
- [Implementační etapy a Definition of Done](delivery.md)
