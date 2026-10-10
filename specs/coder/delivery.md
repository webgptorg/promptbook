# Implementační etapy a Definition of Done

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

| Etapa | Dodávka | Gate |
| --- | --- | --- |
| 1. Kontrakty a kostra | Domain typy, fixture corpus ze stávajícího chování, workspace/config, CLI shell | Read-only a path/Book precedence scénáře. |
| 2. Funkční legacy coder | Jeden task engine, Markdown adapter, harness boundary, Git scope, checks/fix, recovery, traces | E01-E18 a legacy T/U scénáře. |
| 3. Produktová parita | Init/add/plan/verify, sedm harnessů, TEAM, terminal a základní server, isolation | Packaged CLI a UI/capability scénáře. |
| 4. Not-before a task Books | Typed annotations, čas, Book adapter, `--tasks`, mixed queue, migrace | T01-T11 a migration crash/idempotence testy. |
| 5. Recurrence | Trigger/occurrence store, claims, coalescing, persistent wake-ups | T12-T15, restart/concurrency scénáře. |
| 6. Náhrada starého coderu | Compatibility report, release notes, odstranění superseded runner cest | Všechny povinné scénáře, bez tiché ztráty příkazů. |

Etapy určují pořadí práce, ne oprávnění vypustit některou závaznou funkci z finální dodávky. Check/Git kontrakt a ownership musí být hotové před přidáním dlouhodobých schedule. Odložené směry z [rozsahu coderu](scope.md) mají vlastní budoucí zadání.

**Definition of Done:** coder lze nainstalovat a používat mimo Promptbook monorepo; legacy uživatel může pokračovat beze změny backlogu; nové task Books, časování a recurrence splní zde popsané chování; žádný formát neobchází společné checks/Git/recovery; CLI a server sdílejí engine; ztráta nebo přepsání cizí práce je regresní blocker. Dodávka zahrnuje běžící kód, testy, dokumentaci, kompatibilitní tabulku a záznam ověření, s jasným seznamem skutečně nepodporovaných odložených funkcí.

## Dodaná dokumentace

Dodaná dokumentace obsahuje quick start, úplný CLI help, task/agent rozlišení, gramatiku času/intervalů, tabulku priorit/routingu, příklady legacy/mixed/Book projektu, bezpečnou migraci a downgrade omezení, checks vs verify, postup recovery a politiky commitů/synchronizace. Ukázky se validují stejným parserem jako runtime. Marketingové sliby nejsou důkaz funkce.

## Související specifikace

- [Rozsah coderu](scope.md)
- [Architektura coderu](architecture.md)
- [Kompatibilita a vědomé změny](compatibility.md)
- [Akceptační scénáře](acceptance.md)
- [Provozní kvalita](operations.md)
