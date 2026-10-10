# Persistentní coder server

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Zachovat lokální přehled fronty, obsahu tasků, běžící práce, stavů a ovládání. Výchozí port současného coder serveru je `4441`. Server smí zůstávat spuštěný po vyčerpání aktuální fronty a reagovat na nové soubory nebo due časy; provádí stejné claim/execution služby jako `run`.

Server nesmí spouštět vnořený CLI proces pro každý task ani mít vlastní kopii parseru nebo Git pravidel. Jeho specifickou odpovědností je supervision, wake-up a přenos událostí do UI. UI, terminál a source snapshots musí vidět stejný stav.

**Nové rozhodnutí:** základní web server binduje pouze loopback. Mutující lokální API chrání session tokenem/origin kontrolou, limity payloadu a realpath confinement včetně symlinků. Úpravy tasků používají optimistic version check a stejnou mutační politiku jako soubory. Současná implementace nemá dostatečně explicitní host/auth/path guardy; tuto vlastnost se nepřebírá jako kompatibilitní požadavek.

Volby, které současný server nevystavuje stejně jako `run` (např. `--isolate`, `--limit`, `--check-before`), neprezentovat jako již existující paritu. **Nové rozhodnutí:** sdílené volby v cílovém CLI sjednotit jen tam, kde mají stejný význam; limit persistentního supervisoru případně explicitně odmítnout s návodem na finite run. Help a tests toto rozlišení ověří.

## Související specifikace

- [Execution lifecycle](execution.md)
- [Způsobilost tasku](eligibility.md)
- [Opakované task Books](recurrence.md)
- [Mutační lease, journal a recovery](recovery.md)
- [Terminál a řízení běhu](terminal.md)
