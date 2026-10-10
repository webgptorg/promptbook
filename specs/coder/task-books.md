# Task Books

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

## Kanonický příklad

```book
Opravit export CSV

TASK
META ID csv-export-quoting
STATUS todo
PRIORITY 2
AGENT {../agents/developer.book}
HARNESS openai-codex
AFTER 2026-10-30T09:00:00+01:00

PROMPT
Oprav export buněk s čárkou, uvozovkami a novým řádkem.
Zachovej stávající veřejné rozhraní a doplň regresní test.

RULE
Neměň oddělovač ani názvy sloupců.
```

## Význam commitments

| Pole | Požadovaný význam |
| --- | --- |
| První neprázdný řádek | Lidsky čitelný titul. Není identitou tasku. |
| `TASK` | Explicitní deklarace typu dokumentu v hlavičce bezprostředně po titulu. |
| `META ID` | Stabilní unikátní ID v rámci workspace. Vytvořit jednou při authoringu/migraci. |
| `STATUS` | `todo`, `in-progress`, `done`, `failed`, `not-ready`. |
| `PRIORITY` | Nezáporné celé číslo; default 0. |
| `AGENT` | Požadavek na agent Book, přes stávající resolver jmen/cest. Relativní reference vůči deklarujícímu task Booku. |
| `HARNESS` | Typovaný požadavek na coding nástroj. |
| `MODEL` | Typovaný požadavek na model; nepřebírá význam agentního Book commitmentu. |
| `RUNNER` | Opakovatelné kompatibilitní legacy selektory, uvnitř skupiny OR substring matching. |
| `AFTER` | Inkluzivní nejdřívější okamžik startu. |
| `REPEAT` | Opakování ve fixním intervalu; jen pro task Books. |
| `PROMPT` | Implementační payload. |
| `RULE` | Uspořádané task-local instrukce; neupravují trvale agent Book. |

`AGENT`, `HARNESS` a `MODEL`, jsou-li uvedeny, tvoří samostatné AND podmínky. Případná `RUNNER` OR skupina je další podmínkou. Chybějící typované pole použije platný invokační/defaultní kontext. Rozpor s explicitním CLI výběrem se zobrazí jako nekompatibilní task; nedojde k tichému přepnutí nástroje, modelu ani placeného účtu.

**Nové rozhodnutí:** task bez `META ID` nebo `STATUS` je neúplný a nevykonatelný. Read-only parser identitu ani stav nedoplňuje. Autorovací příkazy hodnoty doplní jednou. Duplicitní ID zablokuje všechny konfliktní definice.

## Parser a bezeztrátový payload

Oddělit tokenizaci Book bloků od sémantiky agentního a task dialektu. Agent Book bez header deklarace `TASK` zůstává agent Bookem. Soubory bez platné task deklarace v task zdroji se nestávají prací.

Vyžadovat neprázdný titul, právě jednu hlavičku `TASK` a právě jeden neprázdný `PROMPT`. `META ID`, `STATUS`, `PRIORITY`, `AGENT`, `HARNESS` a `MODEL` jsou singletony; `RULE` a `RUNNER` se mohou opakovat. `AFTER` a `REPEAT` se mohou opakovat pouze se sémanticky stejnou normalizovanou hodnotou. Implementovat validaci, escape/literal formy a diagnostiky s cestou a řádkem. Nerozpoznané `REPEAT`, `AFTER` nebo budoucí řídicí pole nesmí znamenat okamžitě spustitelný úkol.

**Nové rozhodnutí - přesná literal forma:** migrace zapisuje pod `PROMPT` fenced blok s info stringem `ptbk-task-literal-json`, obsahující právě jeden validní JSON string. Parser dekóduje tento string jako celý payload, bez wrapperu a bez trimování. JSON escaping zachová nové řádky, závěrečný newline, uvozovky, Unicode, řádky `MODEL`/`RULE`, fences i `---`; okolní fence má délku větší než kolidující sekvence backticků v serializaci. Normální `PROMPT` bez tohoto přesného markeru zůstává běžným multiline obsahem. Tuto speciální obálku neplést s code blockem, který je sám obsahem úkolu. Otestovat přesný round-trip.

Poznámky, historickou cenu, časy a attribution ukládat jako neexekutivní metadata, ne nové routing instrukce. **Nové rozhodnutí:** vyhradit pro ně opakovatelné `META NOTE` a pro migration provenance singleton `META ORIGIN` s validovaným JSON objektem (`sourcePath`, `sectionIndex`, `sourceChecksum`, `migrationVersion`). Neznámá metadata uchovat při round-trip; neznámé executable/control commitments blokovat.

## Související specifikace

- [Legacy Markdown tasky](task-markdown.md)
- [Agent Books a kontext](agent-context.md)
- [Způsobilost tasku](eligibility.md)
- [Not-before: nejdřívější spuštění](not-before.md)
- [Opakované task Books](recurrence.md)
- [Migrace Markdown tasků na Books](migration.md)
