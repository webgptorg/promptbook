# Terminál a řízení běhu

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Interaktivní běh začíná v Normal output. Odděluje vlastní zprávy agenta od statusů runneru, příkazů, tools, změn souborů, checks a chyb. Raw output ukazuje původní stream. Přepínání nerepublikuje prompt a nevolá model; volba platí po celou invokaci, ne globálně.

| Ovládání | Chování |
| --- | --- |
| `P` | Pause/resume na bezpečných hranicích. Pause nespouští další práci; jasně ukázat pending pause běžící fáze. |
| `S` | Přeskočí aktuální pacing/backoff/poll čekání, jen pokud je to daný čekací stav; nikdy not-before/trigger podmínku. |
| `X` | Dokončit aktuální task a potom skončit; druhý stisk požadavek zruší. |
| `O` | Normal/raw output bez restartu harnessu. |
| Šipky, End | Scroll bufferu / návrat ke sledování živého výstupu. |
| Ctrl+C / SIGTERM | Zastavit claimování, ukončit jen vlastněné subprocessy, uložit recovery a uvolnit zdroje. |

Každá klávesa musí mít okamžitou zpětnou vazbu, včetně „nyní není co přeskočit“. Resize nesmí rozbít panel ani vyvolat zatížení úměrné celé historii. Non-TTY a `--no-ui` mají čitelný průběžný výstup bez dashboard escape sekvencí.

Zachovat bounded buffery: současný raw limit 256 000 znaků / 2 048 chunks a normal limit 160 položek po nejvýše 8 000 znacích mohou být kompatibilní výchozí hodnoty. Truncation označit. Progress, ETA, náklady a quota zobrazovat pouze z pozorovaných údajů/označených odhadů; nezobrazovat fiktivní procenta.

## Související specifikace

- [Persistentní coder server](server.md)
- [Not-before: nejdřívější spuštění](not-before.md)
- [Execution lifecycle](execution.md)
- [Traces a výsledky](traces.md)
