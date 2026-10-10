# Provozní kvalita

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Práce bez sítě musí být možná pro parsování, list, dry-run a migraci. Běh modelu může vyžadovat síť podle harnessu, nikoli podle task formátu. Prázdná fronta ani čekání na budoucí čas nesmějí volat model. Persistentní režim musí mít bounded čekání odolné vůči timer limitům, skokům hodin a source změnám.

Zachovat transparentní shell command semantics pro uživatelem zvolený check. Ostatní subprocess argumenty předávat jako argv nebo bezpečně escapovat pro konkrétní shell; cesty, modelové odpovědi a task text nikdy neinterpolovat jako neřízený shell kód. Ukončení procesního stromu musí mít platformní adaptér.

Každá chyba musí obsahovat fázi, task/project identitu, co zůstalo zachováno a doporučený další krok. Odlišit invalid input, missing capability, auth, check failure, timeout, canceled, persistence a remote sync. `--no-questions` nesmí viset na skrytém promptu; akce vyžadující skutečné rozhodnutí skončí s konkrétním návodem.

Historické nedokončené PRD pro `--min-remaining-limit` a jeho časová okna není hotová funkce. Základní verze zachová zobrazení známé kvóty a správné chování při vyčerpání, ale nové automatické threshold přepínání modelů/providerů je odloženo. Quota „unknown“ nesmí být přeložena jako nula ani jako neomezený účet.

## Související specifikace

- [Coding harnessy](harnesses.md)
- [Pokusy, retry a providerová omezení](retries.md)
- [Persistentní coder server](server.md)
- [Traces a výsledky](traces.md)
- [Implementační etapy a Definition of Done](delivery.md)
