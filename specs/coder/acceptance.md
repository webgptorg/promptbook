# Akceptační scénáře

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Implementace je přijatelná až po ověření následujících scénářů nad dočasnými projekty, lokálními Git repozitáři a deterministickými harness/check doubles. Placené modely nejsou podmínkou regresního suite. Real-provider smoke testy jsou oddělené a explicitní.

## Tasks a čas

| ID | Scénář a očekávaný výsledek |
| --- | --- |
| T01 | Legacy `.md`, task `.book` a mixed queue vykonají ekvivalentní úkol přes stejnou execution službu, každou identitu nejvýše jednou. |
| T02 | README, ignore marker, nested archiv/trace, `@@@`, `[-]`, `[.]`, `[x]`, `[!]`, `[^]` se nespustí jako nový task. |
| T03 | Markerless task je ready s prioritou 0; stav se doplní bez ztráty prvního obsahu. Více sekcí mění pouze správnou sekci. |
| T04 | Priority seřadí nejvyšší první, meze jsou inkluzivní, shody stabilní. Neplatné meze dávají chybu. |
| T05 | Legacy `gpt`/`opus` zůstává OR substring. Book AGENT/HARNESS/MODEL tvoří AND a RUNNER další OR skupinu. |
| T06 | Date-only token se neplete s routingem; model s datem zůstane modelem. Datum v těle/URL/reportu nescheduluje. |
| T07 | Task se nespustí 1 ms před hranicí a smí přesně na ní; timezone, leap day, offset a DST ambiguity jsou ověřeny fake clockem. |
| T08 | Neplatné/conflicting datum nebo interval je visible blocked; nepromění se na unrestricted ready. |
| T09 | Future high-priority task neblokuje ready task. `S` jej neuvolní. Finite run skončí s informací o budoucí práci. |
| T10 | Book round-trip zachová literal uppercase commitments, fences, Unicode, assets i history. Agent Book se nestane taskem. |
| T11 | Duplicitní ID/missing control metadata a concurrent source edit zabrání mylnému spuštění/finalizaci. |
| T12 | Weekly recurrence zachová definici `todo`, kotvu, due slot a historii po restartu i rename. Slow run neposouvá kotvu. |
| T13 | Několik týdnů downtime znamená jeden coalesced výskyt. Žádné překrytí stejného tasku ani catch-up storm. |
| T14 | Finite run vykoná recurring definici nejvýše jednou; persistentní režim později další slot, bez placeného idle volání. |
| T15 | Pause/retirement, schedule edit, vyčerpané retry a nejasné přerušení mají správný blocked/next due stav. |

## Execution, checks a Git

| ID | Scénář a očekávaný výsledek |
| --- | --- |
| E01 | Run bez checks hlásí checks skipped; s `--check` kontroluje skutečné změny. Missing check není úspěch. |
| E02 | `yes-and-fail` uloží eligible check delta a skončí; `yes-and-fix` opraví a teprve pak smí do fronty. |
| E03 | `fix` na zdravém projektu nevyžaduje nainstalovaný harness ani výchozí Book, nevytvoří PRD ani empty commit. Výběr harnessu zůstává CLI konfigurací. Formatter-only delta se uloží. |
| E04 | `fix` při selhání opravuje stejný task maximálně povoleným počtem pokusů; žádný jiný backlog task se nevybere. |
| E05 | Agent a check změní stejnou řádku: první commit obsahuje agentní obsah, druhý check transformaci. |
| E06 | Failed check vytvoří vlastní delta commit se skutečným outcome; stále jde o failed validaci. |
| E07 | Add/delete/rename/mode/symlink/binary a ignored generovaný obsah přežijí správné fáze, repair a recheck. |
| E08 | Pre-existing staged+unstaged změny zůstanou v původní podobě i staging stavu. Empty owned delta nevytvoří commit z cizího indexu. |
| E09 | Konkurenční editor, changed HEAD/index a hook měnící obsah zastaví nejednoznačnou persistence, zachovají obě práce. |
| E10 | Commit/signing failure nevolá znovu model; completion zůstane pending. Rejected push zachová lokální commit bez duplikace. |
| E11 | Automatický `--no-commit` vyžaduje ignore; supervised výjimka funguje. Nevznikne automatický commit a přes více tasků se udrží vlastní scope odděleně. |
| E12 | `continue` obnoví jednu prokázanou přerušenou práci, nikoli cizí dirty bytes; 0/2 kandidáti selžou. |
| E13 | Kill mezi claim, změnou zdroje, checkem, commit intent, skutečným commitem a zápisem výsledku se bezpečně reconciliuje. |
| E14 | Dva procesy, server + run nebo migration + run nezískají současně týž claim/mutační ownership. Stale lease se neukradne. |
| E15 | Vlastní state/locks/check views vznikají pod `.promptbook`; v `.git` nejsou vlastní přímo zapisované runtime soubory. |
| E16 | Isolation mapuje nested projekt i custom tasks; úspěch zachová commity, konflikt zachová worktree a originální práci. |
| E17 | Přerušení ukončí pouze vlastní process tree a čekání, zachová diagnostiku; neukončí cizí Node procesy. |
| E18 | Quota/auth/credits a retry budget jsou rozlišeny; zakázané credits se nepoužijí. |
| E19 | Usage-limit chyba + `tokens used` + exit 1, případně JSON `turn.failed`, nikdy nepublikuje completion ani falešný úspěch. |

## Migrace, CLI a rozhraní

| ID | Scénář a očekávaný výsledek |
| --- | --- |
| U01 | Init dvakrát zachová custom Books/scripts/AGENTS/env, dokumentaci neoznačí jako task a check nefalšuje. |
| U02 | `--path`, relativní/absolutní `--tasks`, mezery, nested project a symlink escape mají shodné chování ve všech relevantních příkazech. |
| U03 | List/help/dry-run nezapisují, nevytvářejí adresáře, neinstalují a nevolají model. Missing explicit input je chyba. |
| U04 | Migration dry-run je bez side effects; skutečný převod více sekcí zachová význam, odkazy, historii a původní bytes. |
| U05 | Migration restart v každé hranici transakce nikdy nezpůsobí dva runnable exempláře. Rerun neduplikuje soubory/commity. |
| U06 | Changed destination/source, ID collision a část nepřevoditelných sekcí se nepřepíše ani předčasně nearchivuje. |
| U07 | Developer je default i pro plan; explicitní Planner funguje. Invalid Book nevede k tichému fallbacku. |
| U08 | TEAM poradce je volán jen na žádost, se svou rolí; resolver dědičnosti a hranice remote/local neuniknou workspace policy. |
| U09 | Plan i jeho poradci nemohou měnit application code ani spouštět shell; schválený PRD save se omezí na správné soubory. |
| U10 | Normal/raw toggle zachová jeden běh a jeden stream; scroll/resize/bounded buffer a non-TTY jsou čitelné. |
| U11 | Server claimuje přes stejný engine, vidí source edits a due time; mutující API vyžaduje platný lokální kontext a správnou source revision. |
| U12 | `verify` provádí lidské review/archive a follow-up; nespustí checks a v no-questions režimu nedělá neodsouhlasené review změny. |
| U13 | Zabalené CLI funguje v externím fixture projektu, včetně Books, šablon, planning bridge a harness adapterů bez monorepo cest. |
| U14 | Trace ukazuje reálné outcomes/commit IDs; známý fixture secret se neobjeví ve výstupu ani verzovaných artefaktech. |

## Související specifikace

- [Legacy Markdown tasky](task-markdown.md)
- [Task Books](task-books.md)
- [Opakované task Books](recurrence.md)
- [Projektové checks a opravy](checks.md)
- [Vlastnictví změn a Git persistence](git-persistence.md)
- [Migrace Markdown tasků na Books](migration.md)
- [Implementační etapy a Definition of Done](delivery.md)
