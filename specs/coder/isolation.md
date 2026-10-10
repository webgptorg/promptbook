# Izolace tasku ve worktree

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

`--isolate` vyžaduje pojmenovanou zdrojovou větev, zapnuté commity a ignored isolation directory. Založí worktree a větev `ptbk-coder-isolation/<task-name>` s kolizně bezpečnou identitou. Mapuje task source, Books, kontext i nested projekt do worktree. Agent, checks a lokální commity běží tam; původní zdroj tasku se během práce nesmí neřízeně přepisovat. Původní větev dostane `done` až ověřenou integrací, nikoli časnou kopií statusu.

Zachovat přípravu závislostí a kopii projektového `.env` podle izolované politiky. Neprohlašovat samotný Git worktree za bezpečnostní sandbox ani za izolaci sítě/credentials. Durable výsledky/logy a potřebné ignored výstupy se před cleanup uchovají s ochranou před přepsáním originálních dat.

Úspěšná integrace musí použít `git merge --ff-only` a zachovat fázovou historii i ověřený strom; automatický squash nebo obecný merge bez nových checks není součástí kontraktu. Refusal/conflict nebo neočekávaná změna originálu zachová oba checkouty a přesný návod. Současná politika označuje merge failure jako failed a pokračuje dalším taskem jen tehdy, je-li další mutace bezpečná. Takový task se nezapočítá do limitu úspěchů. Neodstraňovat neintegrovaný worktree/branch automaticky ani při opakovaném spuštění; existující recoverable cíl odmítnout.

## Související specifikace

- [Projektové cesty a zdroje tasků](workspace.md)
- [Execution lifecycle](execution.md)
- [Vlastnictví změn a Git persistence](git-persistence.md)
- [Git synchronizace](git-synchronization.md)
- [Mutační lease, journal a recovery](recovery.md)
