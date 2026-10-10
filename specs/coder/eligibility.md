# Způsobilost tasku

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Výběr tasku vyžaduje: platný zdroj, povolený lifecycle, dokončené zadání bez placeholderů, vyhovující prioritu, kompatibilní routing, splněný trigger a dostupný claim. Vyhodnocení musí vracet vysvětlení: `ready`, `waiting-until`, `blocked`, `invalid`, `unsupported` nebo vyřazení filtrem; může dodat příští wake-up.

Stejný evaluator používá list, dry-run, dashboard, server i skutečný claim. Dostává injektované hodiny, timezone, konfiguraci a uložený stav. Neprovádí I/O, Git, čekání ani modelové volání. Cache parsovaného dokumentu není cache jeho časové způsobilosti.

## Související specifikace

- [Legacy Markdown tasky](task-markdown.md)
- [Task Books](task-books.md)
- [Not-before: nejdřívější spuštění](not-before.md)
- [Opakované task Books](recurrence.md)
- [Mutační lease, journal a recovery](recovery.md)
