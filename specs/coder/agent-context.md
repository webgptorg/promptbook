# Agent Books a kontext

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Použít existující Book semantics pro persona/rules, `FROM`, `IMPORT`, znalosti a `TEAM`. Reuse stávající kompilace může být úzkou knihovní závislostí; není důvod převzít celý historický runtime. Title, cesta a podporované aliasy slouží routing identitě, nikoli nahrazení stabilního task ID.

Předávaný request odděluje orchestrace pravidla, efektivní instrukce agenta, task payload, task-local rules a dodatečný projektový kontext. Coder vlastní status a Git finalizaci; harness dostane instrukci sám necommitovat. Změny agentního souboru z disku se načtou v jasném dokumentovaném bodě, minimálně při nové invokaci; jeden běžící attempt má neměnný snapshot.

Inicializace poskytuje `agents/.core/adam.book`, `agents/developer.book`, `agents/planner.book`, `agents/lawyer.book` a `agents/copywriter.book`. Chybějící lokální TEAM odkazy na Lawyer/Copywriter doplní do Developer/Planner bez přepsání ostatních instrukcí; konfliktní či neplatný Book ponechá s diagnostikou. Znovuspuštění init nesmí přepsat jejich místní úpravy. Chybějící nebo nejednoznačné odkazy se hlásí s deklarujícím souborem.

## Související specifikace

- [Uživatelské a CLI kontrakty](cli.md)
- [Inicializace projektu](initialization.md)
- [Task Books](task-books.md)
- [TEAM konzultace](team.md)
- [Coding harnessy](harnesses.md)
- [Book language](../book-language.md), včetně označených historických principů dědičnosti a importů.
