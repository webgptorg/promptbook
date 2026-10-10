# Execution lifecycle

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

1. Vyřešit projekt, zdroje, konfiguraci, případný Git preflight a mutační lease.
2. Podle explicitní politiky synchronizovat Git a provést počáteční checks.
3. Znovu načíst task, ověřit zdrojovou revizi, způsobilost a atomicky claimnout výskyt.
4. Pokud je zvolena izolace, vytvořit execution worktree a přemapovat všechny projektové/source cesty. Claim zůstává v koordinovaném provozním stavu.
5. V execution checkoutu zachytit výchozí obsah, index, HEAD a vlastní scope; zapsat `in-progress`/occurrence start a připravit request, Books, kontext a TEAM.
6. Spustit harness se streamem událostí a cancellation. Změny přiřadit implementační fázi.
7. Provést scoped normalizaci a zvolené checks. Při opravitelné validaci předat přesný feedback do stejného tasku.
8. Uložit fázové změny a kandidáta výsledku/trace; teprve po úspěšných povinných krocích publikovat completion.
9. Případně integrovat worktree, provést explicitní test-server migrace a synchronizaci podle zachované politiky; všechny outcomes zřetelně rozlišit.
10. Uvolnit prostředky, zachovat recovery nebo durable výsledek a pokračovat podle režimu a limitů.

Konkrétní pořadí volitelné integrace/migrace vůči finálnímu stavu nesmí hlásit celkový úspěch, pokud požadovaný krok nedoběhl. Completed local implementation a pending remote sync musí být dva samostatné údaje.

## Související specifikace

- [Způsobilost tasku](eligibility.md)
- [Projektové checks a opravy](checks.md)
- [Pokusy, retry a providerová omezení](retries.md)
- [Vlastnictví změn a Git persistence](git-persistence.md)
- [Mutační lease, journal a recovery](recovery.md)
- [Izolace tasku ve worktree](isolation.md)
- [Traces a výsledky](traces.md)
