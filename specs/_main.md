# Promptbook Coder: hlavní specifikace

**Samostatná produktová a technická specifikace**  
Verze 1.0 | 7. října 2026 | Pro Pavola Hejného

**Účel:** znovu vytvořit Promptbook Coder jako přehledný, samostatně udržovatelný nástroj. Zachovat jeho podstatné pracovní postupy a dokončit aktuálně zadaný přechod k tasks, bez přenášení historických vrstev celého Promptbook monorepa.

**Rozhodující zdroj:** `webgptorg/promptbook`, větev `main`, commit `12010a9a1f2df8b23c9c3934f0570caa6daa19da` z 7. 10. 2026, 10:58:27 CEST. Všechny odkazy ve [zdrojové mapě](coder/audit-and-sources.md) míří na tento snapshot.

**Povaha dokumentu:** pouze zadání pro budoucí implementaci. Analýza vychází ze zdrojového kódu, testů, CLI, dokumentace a relevantních PRD. Nebyl spuštěn produkční coder, placené modely ani kompletní test suite monorepa. Akceptační scénáře v této sadě specifikací jsou požadavky na novou implementaci, nikoli hlášení o již provedených testech.

## Výsledek, který má vzniknout

Vytvořit lokální CLI `ptbk coder`, které nad zvoleným projektem načte připravené úkoly, vybere způsobilou práci, předá ji zvolenému agentovi prostřednictvím coding harnessu, spustí projektové kontroly, případně vyžádá opravu, zaznamená výsledek a bezpečně uloží vlastní změny do Gitu. Uživatel může běh sledovat, pozastavit, ukončit, obnovit přerušenou práci nebo provozovat persistentní režim.

Úkoly a agenti jsou lidsky čitelné soubory v projektu. Git uchovává zdrojové zadání a výsledky práce. Coding harness je vyměnitelný adaptér; žádný konkrétní poskytovatel, webová aplikace nebo databáze nesmí být podmínkou samotného jádra.

Nová implementace musí zachovat **pozorovatelné chování a ochranu práce uživatele**, nikoli vnitřní členění historických skriptů. Stejný task engine obsluhuje Markdown, task Books, CLI, kontrolní opravy a persistentní běh. Nezakládat druhý runner pro nový formát.

## Jak číst závaznost

| Označení | Význam v této sadě specifikací |
| --- | --- |
| **Zachovat** | Chování doložené aktuálním kódem; může být zpřesněno akceptačním kontraktem. |
| **Doplnit dle PRD** | Zamýšlená funkce z relevantních dosud nedokončených zadání. Součást cílové verze. |
| **Nové rozhodnutí** | Doporučené řešení nejasnosti nebo zlepšení pro přepis. Netvrdí, že tak funguje současný coder. |
| **Odloženo** | Známý směr nebo historické PRD mimo základní dodávku; nepředstírat podporu. |

Následující normativní věty „musí“ popisují cílovou implementaci. Pro konflikty platí: explicitní cílový kontrakt této sady specifikací, nejnovější relevantní PRD, skutečný kód, starší dokumentace. Stav `[x]` v PRD sám o sobě nedokazuje úplnou funkčnost; `[!]` naopak neznamená, že v kódu není žádná z požadovaných změn.

## Orientace ve specifikacích

Tato sada souborů vznikla rozdělením původního zadání coderu z 7. října 2026. Závaznost, rozhodnutí a akceptační ID zůstávají zachovány. Popis „současného“ chování v auditu se vztahuje k uvedenému snapshotu; není zprávou o stavu nejnovějšího vydání. Pro návod k používanému balíčku slouží [coder guide](../docs/coder.md) a pro doložené ověření [compatibility record](../docs/compatibility.md).

[Dictionary](dictionary.md) je index důležitých pojmů. [Book language](book-language.md) rozlišuje agentní a task dialekt. Každý následující soubor vlastní jeden kontrakt a odkazuje na související specifikace.

| Specifikace | Odpovědnost |
| --- | --- |
| [Rozsah coderu](coder/scope.md) | Zahrnuté workflow, hranice jádra a odložené směry. |
| [Základní pojmy a datové kontrakty](coder/domain-model.md) | Pojmy, entity a normalizované runtime stavy. |
| [Uživatelské a CLI kontrakty](coder/cli.md) | Příkazy, volby, precedence a první použití. |
| [Projektové cesty a zdroje tasků](coder/workspace.md) | Projektové cesty, task zdroje a discovery. |
| [Inicializace projektu](coder/initialization.md) | Idempotentní setup a verzování projektových souborů. |
| [Git preflight](coder/git-preflight.md) | Ověření nebo založení Git repozitáře před mutací. |
| [Legacy Markdown tasky](coder/task-markdown.md) | Legacy sekce, stavové markery, priority a routing. |
| [Task Books](coder/task-books.md) | Task dialekt, řídicí commitments a bezeztrátový payload. |
| [Způsobilost tasku](coder/eligibility.md) | Jednotné vyhodnocení, zda lze task claimnout. |
| [Not-before: nejdřívější spuštění](coder/not-before.md) | Gramatika času, timezone a hranice AFTER. |
| [Opakované task Books](coder/recurrence.md) | Intervaly, sloty, revize schedule a coalescing. |
| [Agent Books a kontext](coder/agent-context.md) | Agentní instrukce, Books a jejich snapshot. |
| [Coding harnessy](coder/harnesses.md) | Providerové adaptéry, capabilities, login a outcomes. |
| [TEAM konzultace](coder/team.md) | Poradní nástroje a limity konzultací. |
| [Read-only plánování](coder/planning.md) | Read-only oprávnění a schválené ukládání zadání. |
| [Execution lifecycle](coder/execution.md) | Lifecycle jednoho tasku od claimu po finalizaci. |
| [Projektové checks a opravy](coder/checks.md) | Validační příkaz, check view a check-feedback opravy. |
| [Pokusy, retry a providerová omezení](coder/retries.md) | Attempt budget, technický retry a quota čekání. |
| [Vlastnictví změn a Git persistence](coder/git-persistence.md) | Owned scope, fázové commity, dirty tree a identita. |
| [Mutační lease, journal a recovery](coder/recovery.md) | Koordinace mutací, durable journal a explicitní obnova. |
| [Izolace tasku ve worktree](coder/isolation.md) | Execution worktree a bezpečná integrace. |
| [Git synchronizace](coder/git-synchronization.md) | Explicitní pull/push a samostatný sync outcome. |
| [Migrace Markdown tasků na Books](coder/migration.md) | Deterministický a restartovatelný převod tasků. |
| [Persistentní coder server](coder/server.md) | Persistentní supervision, dashboard a lokální API. |
| [Terminál a řízení běhu](coder/terminal.md) | Normal/raw výstup, klávesy a cancellation. |
| [Traces a výsledky](coder/traces.md) | Dohledatelné výsledky, usage a redakce secrets. |
| [Architektura coderu](coder/architecture.md) | Modulové hranice, runtime a testovatelné závislosti. |
| [Kompatibilita a vědomé změny](coder/compatibility.md) | Zachované chování, vědomé změny a exit codes. |
| [Akceptační scénáře](coder/acceptance.md) | Původní scénáře T01–T15, E01–E19 a U01–U14. |
| [Provozní kvalita](coder/operations.md) | Offline provoz, subprocessy a diagnostika. |
| [Implementační etapy a Definition of Done](coder/delivery.md) | Pořadí etap, dokumentace a podmínky hotové dodávky. |
| [Audit a zdrojová mapa](coder/audit-and-sources.md) | Auditní snapshot, rozhodnutí a původ kontraktů S01–S14. |

## Historické specifikace

[Deprecated / historical specifications](deprecated/_index.md) uchovávají starší materiál o agentním Book jazyce a Agents Serveru. Tyto soubory již nesly upozornění na nižší autoritu; jejich přesun neznamená deprecaci samotného Book jazyka, commitments či jednotlivých agentních schopností. Serverové cesty, databázová schémata a staré technické detaily nejsou automaticky kontraktem coderu.

Archiv old-prompts zůstává v původní podobě. Historický prompt je podklad, nikoli sám o sobě důkaz podporované funkce.
