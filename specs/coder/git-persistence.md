# Vlastnictví změn a Git persistence

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

## Nepřekročitelné invarianty

- Coder automaticky commitne jen prokazatelně vlastní změny příslušné fáze, task status a záměrně durable artefakty.
- Předexistující staged i unstaged změny, index flags a průběžné editace uživatele zůstanou zachovány. Shoda cesty sama neprokazuje vlastnictví.
- Nepoužívat plošný `git add .`, automatický stash, destructive reset/clean, force-push ani přepis historie k vyrobení úspěšného stavu.
- Hooky a nastavené podepisování zůstávají aktivní. Změna zachyceného obsahu hookem znamená neověřený strom, ne hotový task.
- Žádný vlastní lock, journal, trace nebo check adresář se přímo nezapisuje do `.git`. Standardní Git příkazy přirozeně spravují interní Git data; PRD 0130 není zákaz použití Gitu.
- Porucha finalizace, commitu nebo push nesmí opakovat úspěšnou implementaci ani duplikovat již vytvořený lokální commit.

## Fázové commity

Zachovat nový kontrakt samostatných check commitů. Jeden task může vytvořit více commitů. Implementační commit obsahuje agentovu verzi, check commit následnou transformaci checkeru; pokud změnili stejnou řádku, hranice musí být patrná i na ní. Není přípustné jen rozdělit soubory podle názvu.

Check commit má předmět `chore: Automatically commit changes made by checks`; tělo uvádí fázi, command, task, attempt a skutečný outcome. I selhávající check může mít vlastní souborové změny a commit; tím se validace nestává úspěšnou. Prázdné delta neprodukuje prázdný commit.

Coderem provedená normalizace, status update a finalizace patří do vlastního scope, ne do změn připsaných checkeru. Podporovat additions, deletions, renames, modes, symlinks a binary blobs; ignored výstupy ponechat dostupné pro repair/recheck, aniž se obejde Git ignore policy.

Mezilehlý commit musí označit práci jako nedokončenou. Úspěšný čistý automaticky commitující běh na konci nezanechá žádné eligible vlastní neuložené změny. Selhaný completion commit nesmí publikovat živé `[x]`/`done`. V `--no-commit` lze zachovat historické dokončení, ale výsledek a UI explicitně hlásí `completed, uncommitted` a vyjmenují retained paths.

Princip „revert vrátí i task“ platí pouze pro konkrétní sdružené změny v historii, ne univerzálně pro libovolný mezilehlý commit. Dokumentace musí vysvětlit sadu taskových commitů. Git revert nevrací externí účinky a sám neobnoví neversionovaný recurrence ledger.

## Dirty tree

| Režim | Požadované chování |
| --- | --- |
| `fail` | Před novou implementací odmítne necommitnuté změny; zobrazí návod. |
| `ignore` | Smí pokračovat, ale zachová cizí baseline a necommitne ji. Při překryvu/nejistotě zastaví persistence. |
| `continue` | Vyžaduje právě jeden relevantní přerušený task a prokázané původní vlastnictví/recovery. Po jeho dokončení další tasky opět očekávají clean tree. |

`continue` není „považuj vše špinavé za práci agenta“. Nejde kombinovat s čerstvou izolací a `fix` jej odmítá, protože nemá obnovovat libovolný backlog. Nulový nebo vícečetný kandidát musí dát jasnou chybu. Změna harnessu při obnově je možná; historie autorů/runnerů zůstává chronologická.

Statická analýza odhalila potenciální napětí mezi současným resume a novými ownership guardy. Nový engine jej řeší explicitním persisted run scope, nikoli pouhým hledáním `[^]`. Nejde o tvrzení, že byl současný runtime bug reprodukován.

## Identita commitů

Respektovat `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY` a legacy `CODING_AGENT_GPG_KEY_ID`; podpisový program se řídí Git konfigurací. Úplná agentní konfigurace se použije per command. Při neúplné konfiguraci zachovat fallback na Git konfiguraci uživatele a jednoznačně oznámit skutečnou identitu/podpisovou politiku. Neslibovat, že každý commit má dedikovaný agentní podpis.

## Související specifikace

- [Git preflight](git-preflight.md)
- [Projektové checks a opravy](checks.md)
- [Mutační lease, journal a recovery](recovery.md)
- [Izolace tasku ve worktree](isolation.md)
- [Git synchronizace](git-synchronization.md)
