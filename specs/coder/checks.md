# Projektové checks a opravy

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

`--check` určuje jeden projektový shell příkaz. `--check-before` má `no` (default), `yes-and-fail`, `yes-and-fix`. Zapnutý počáteční check bez explicitního příkazu použije `npm run check`. Když není uveden ani `--check`, ani zapnutý `--check-before`, volitelné check fáze se přeskočí; UI nesmí tvrdit, že testy prošly.

`yes-and-fail` po neúspěchu skončí. `yes-and-fix` vytvoří jednu opravnou úlohu a využije sdílenou repair službu před přechodem k běžné frontě. `fix` vždy provede check (bez explicitního `--check` použije `npm run check`), případně opraví, znovu ověří a skončí; vůbec nevybírá běžné tasky.

Chybějící, rekurzivní nebo neinicializovaný validační příkaz je setup error. Nepřepisovat ho na automatický úspěch. Opravná instrukce zakazuje odstraňovat assertions, snižovat thresholds, vypínat lint/checks nebo vynechávat builds pouze k získání zeleného výsledku.

Kontroly mohou měnit soubory. Musí kontrolovat přesnou obsahovou verzi určenou k uložení, včetně scoped line-ending normalizace. Soukromý check view zachová projektovou relativní polohu, závislosti a potřebné ignored soubory; výsledek se importuje jen pokud živý checkout stále odpovídá zachycené hranici.

## Související specifikace

- [Execution lifecycle](execution.md)
- [Pokusy, retry a providerová omezení](retries.md)
- [Vlastnictví změn a Git persistence](git-persistence.md)
- [Inicializace projektu](initialization.md)
- [Uživatelské a CLI kontrakty](cli.md)
