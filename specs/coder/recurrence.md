# Opakované task Books

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

```book
Týdenní kontrola modelového katalogu

TASK
META ID weekly-model-catalog
STATUS todo
AGENT {../agents/developer.book}
AFTER 2026-10-30T09:00:00+01:00
REPEAT every 1 week

PROMPT
Ověř změny u podporovaných poskytovatelů a aktualizuj katalog.
Zapiš ověřené zdroje a spusť projektové checks.
```

Podporovat kladné celočíselné intervaly se sekundami, minutami, hodinami, dny a týdny: například `30m`, `24h`, `7d`, `1w`, `every 2 weeks`, `PT30M`, `P7D`, `P1W`. Jeden den je přesně 24 hodin, týden sedm takových dní. Kalendářní měsíc, rok a zachování stejné lokální hodiny přes DST nejsou tímto kontraktem slíbeny. Nulové, záporné, přetékající a nesrozumitelné intervaly odmítnout.

S `AFTER` je tento okamžik kotvou a prvním slotem. Další sloty jsou `anchor + n × interval`; doba dokončení schedule neposouvá. Bez `AFTER` je první výskyt okamžitě způsobilý při aktivaci a kotva se pod vlastnictvím jednou uloží. Preview před aktivací ukáže, že kotva ještě není uložená; nesmí ji vytvořit.

Definice zůstává aktivní se `STATUS todo`, zatímco konkrétní výskyt může běžet, uspět nebo selhat. `not-ready` pozastaví nové výskyty a explicitní `done` definici ukončí. Úspěšný první výskyt nesmí definici trvale dokončit ani archivovat.

## Sloty, restart a výpadky

- Identita výskytu je odvozena z task ID, revize schedule a due slotu. Retry zůstává ve stejném výskytu.
- Ukládat kotvu, normalizovanou revizi schedule, poslední spotřebovaný/dokončený slot, next due, claim a omezenou historii s časy, outcomes, retry a odkazy na traces/commity.
- Přejmenování souboru/titulu při zachování ID zachová historii. Změna timezone po aktivaci nepřepočítá uložené instanty.
- Zmeškané sloty sloučit do nejvýše jednoho catch-up výskytu pro poslední due slot. Zaznamenat sloučení; negenerovat frontu za měsíce výpadku.
- Jeden task nesmí mít překrývající se výskyty. Dlouhý běh se po dokončení posuzuje stejnou coalescing politikou, bez těsné nekonečné smyčky.
- Konečný `run` smí během jedné invokace claimnout nejvýše jeden výskyt každé opakované definice. Persistentní režim může později claimnout další slot.
- Vyčerpané retry nebo nejasný přerušený outcome zablokuje automatické další výskyty do explicitní recovery/acknowledgement. Neoznačovat selhání jako automaticky vyřešené příchodem nového týdne.
- Restart nejprve porovná claim s výsledkem, journalem a Git historií. Selhaný push ani přerušení posledního zápisu nesmí automaticky znovu vykonat hotový task.

**Nové rozhodnutí pro neupřesněný detail PRD:** sémantická změna normalizovaného `AFTER`/`REPEAT` vytvoří novou schedule revision. Pouhé `1w` → `7d`, ekvivalentní offset, whitespace nebo přejmenování revizi ani kotvu nezmění. S explicitním `AFTER` nová revize znovu použije jeho instant; bez něj uloží okamžik přijetí nové revize. Již běžící výskyt dokončí starý snapshot; nová revize jej nepřepíše a čeká na uvolnění claimu. Před dalším startem ukázat přepočtený due čas.

Základní garance platí pro jeden sdílený workspace. Nezaručuje globální exactly-once napříč nezávislými klony ani vratnost vnějších vedlejších účinků.

## Související specifikace

- [Task Books](task-books.md)
- [Not-before: nejdřívější spuštění](not-before.md)
- [Způsobilost tasku](eligibility.md)
- [Mutační lease, journal a recovery](recovery.md)
- [Persistentní coder server](server.md)
- [Traces a výsledky](traces.md)
