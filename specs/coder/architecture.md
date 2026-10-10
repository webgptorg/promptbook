# Architektura coderu

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Použít TypeScript a explicitní závislosti. **Nové rozhodnutí:** runtime cílit na Node 22+; současné repo uvádí Node >=18.18 a npm >=8, takže zvýšení minima je vědomá změna. Produkční npm balíček musí fungovat v cizím fixture projektu bez source checkoutu Promptbooku a bez `ts-node` v uživatelském workflow. Současné process adaptéry vyžadují Bash; nová verze jej buď výslovně ověří jako prerequisite, nebo jej nahradí ekvivalentním argv/process adaptérem. macOS/Linux musí být ověřeny; Windows podporu opřít o konkrétní procesní/Git adaptér nebo výslovně dokumentované WSL, nikoli neurčitý cross-platform slib.

## Moduly a jejich odpovědnost

| Modul | Vlastní | Nesmí vlastnit |
| --- | --- | --- |
| Domain | TaskDefinition, Occurrence, Attempt, outcome, diagnostiky | Filesystem, subprocess, UI, Git. |
| Source adapters | Markdown/Book parse, serialize, source revision | Scheduler, harness instalaci. |
| Eligibility & schedule | Typed routing, čas, intervaly, due sloty | Čekání, Git, modelová volání. |
| Workspace & configuration | Cesty, zdroje, Book/context selection, effective options | Globální `process.chdir`, skryté změny env. |
| Claim & state store | Lease, occurrence ledger, atomické transitions, recovery | Modelové rozhodování. |
| Execution service | Lifecycle jednoho tasku, pokusy, cancellation | Čtení dalšího backlogu, kreslení UI. |
| Check service | Command setup, izolovaný snapshot, výsledky, repair feedback | Vlastní task frontu. |
| Git persistence | Ownership, fázové delta, commit/integrace/sync | Interpretaci Book syntaxe. |
| Harness adapters | Providerový proces, stream, auth/quota/capabilities | Přepis task statusu, vlastní Git commit policy. |
| Supervisor | Finite/persistent policy, výběr další práce, wake-ups | Duplikaci execution služby. |
| Presentation | CLI help, terminal/server views, commands nad services | Druhou kanonickou podobu tasků. |

Hodiny, timezone resolver, filesystem, Git, subprocess launcher, state store a harness musí jít nahradit deterministickými test doubles. Adaptéry se kompilují do jedné dependency graph; orchestrace nesmí importovat CLI ani React. Žádný mutable globální „aktuální agent“, task, cwd nebo sdílená cache bez klíče workspace/revize.

Nepřidávat obecný plugin framework nebo event bus s desítkami abstrakcí před reálnou potřebou. Důležité jsou úzké rozhraní, jeden vlastník každé odpovědnosti a testovatelné hranice. SQLite může být pozdějším adaptérem state store; základní coder jej nevyžaduje.

## Související specifikace

- [Základní pojmy a datové kontrakty](domain-model.md)
- [Projektové cesty a zdroje tasků](workspace.md)
- [Execution lifecycle](execution.md)
- [Coding harnessy](harnesses.md)
- [Implementační etapy a Definition of Done](delivery.md)
