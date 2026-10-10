# TEAM konzultace

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

TEAM reference včetně zděděných/importovaných deklarací vytvoří nástroje pro jednotlivé poradce. Primární agent rozhoduje, zda a kdy se zeptat. Poradce běží se svým Bookem a vrací označenou odpověď do téhož tasku; jeho pravidla se neslévají do hlavního system promptu.

Jména přesně rozlišovat a chyby nejednoznačnosti vysvětlit. Relativní reference řešit od deklarujícího Booku, i při dědičnosti. Opakovaný odkaz na stejný Book znamená jeden poradní nástroj. Lokální poradce nevyžaduje Agent Server. U vzdálených Books neposílat lokální credentials a nedovolit vzdálenému zdroji odkazovat do host-local filesystemu.

Všechny podporované execution harnessy používají společný dočasný tool bridge. Před prací ověřit dostupnost/discovery; nevytvářet falešnou TEAM podporu jen textem v promptu. Bez konzultace nevzniká další placené volání. Vynucovat sdílené limity hloubky, počtu konzultací, timeout a cancellation; vyčerpaný limit je konkrétní výsledek, nikoli nekonečná rekurze.

Zachovat výchozí TEAM limity: timeout konzultace 5 minut, hloubka 4, celkem 24 volání a nejvýše 128 000 znaků odpovědi. Každé skutečné inference započítat do usage právě jednou. Poradce nesmí samostatně claimnout frontu, commitovat ani provádět databázové migrace.

## Související specifikace

- [Agent Books a kontext](agent-context.md)
- [Coding harnessy](harnesses.md)
- [Read-only plánování](planning.md)
- [Pokusy, retry a providerová omezení](retries.md)
