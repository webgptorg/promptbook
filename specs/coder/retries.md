# Pokusy, retry a providerová omezení

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Zachovat oddělení check-feedback oprav a retry technického selhání. Check-feedback je omezen na tři implementační/repair pokusy pro stejnou úlohu; technická retry smyčka má v současném kódu počáteční pokus a nejvýše tři další retries. Nesmějí se bez vysvětlení změnit v neomezené ani skrytě násobené placené volání.

**Nové rozhodnutí:** centrální attempt budget a jednotný event/report musí ukázat oba čítače i důvod každého dalšího volání. Providerové zotavení z doložené přechodové chyby zachovává identitu pokusu; persistence, signing a push error se do modelového retry nikdy nemapují. Pokud bezpečný replay nelze prokázat, stav je `recovery-required`.

Quota čekání používat podle providerem oznámeného resetu; když není dostupný, bounded backoff. Po obnovení ověřit dostupnost, neslibovat pevný reset odhadnutý z textu. U dlouhého čekání respektovat pause/cancel a neprovádět placené idle dotazy. Kreditový požadavek Codexu bez `--allow-credits` skončí s návodem.

## Související specifikace

- [Projektové checks a opravy](checks.md)
- [Coding harnessy](harnesses.md)
- [Mutační lease, journal a recovery](recovery.md)
- [Provozní kvalita](operations.md)
