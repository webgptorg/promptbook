# Traces a výsledky

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Každý výskyt má dohledatelný run/attempt/phase záznam: task a source snapshot, agent/harness/model/thinking, start/end, skutečný outcome, check command a výsledek, usage/cost s označením odhadu, commit IDs, retry důvody, případnou integration/sync chybu a odkazy na diagnostiku.

Legacy trace cesty a suffixy sekcí zachovat; nová recurrence historie nesmí přepisem posledního logu ztratit identitu starších výskytů. Runtime log může zůstat dočasný, ale úspěšná finalizace před cleanup uchová potřebný durable trace. Nehlásit zapushování jen z existence lokálního commitu.

**Nové rozhodnutí:** před persistencí i zobrazením redigovat známé credentials/secret env hodnoty. Raw znamená nestrukturovaný providerový výstup, nikoli oprávnění publikovat secrets. Auditní stopa uchová informaci, že proběhla redakce; logování nesmí kopírovat `.env` do Git historie. Limity a retence musí být dokumentované.

Při kritickém nedostatku místa dát konkrétní diagnostiku. Nová implementace nesmí zaměnit `--no-questions` za povinnost pokračovat v nebezpečných zápisech: **nové rozhodnutí** je bezpečné neinteraktivní ukončení/recovery místo nekonečného čekání či předstíraného úspěchu.

## Související specifikace

- [Základní pojmy a datové kontrakty](domain-model.md)
- [Execution lifecycle](execution.md)
- [Opakované task Books](recurrence.md)
- [Git synchronizace](git-synchronization.md)
- [Provozní kvalita](operations.md)
