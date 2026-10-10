# Inicializace projektu

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

| Umístění | Účel a verzování |
| --- | --- |
| `agents/` | Agent Books, verzuje se. Výchozí role a pomocníci se vytvářejí bez přepsání úprav. |
| `AGENTS.md` | Projektové instrukce; běžný verzovaný kontext. |
| `tasks/` nebo `--tasks` | Preferované task Books a jejich doprovodné materiály. |
| `prompts/` | Zachovaný legacy zdroj Markdown úkolů. |
| `prompts/templates/`, `prompts/done/`, `prompts/traces/` | Legacy šablony, archiv a durable traces; nejsou aktivní fronta. |
| `.promptbook/ptbk-coder/` | Vlastní zámky, recovery journal, stav výskytů, dočasné check views a interní cache. Provozní položky ignorované Gitem. |
| `.promptbook/coder-isolation-worktrees/` | Izolované worktrees, nebo zdokumentovaný kompatibilní přesun uvnitř `.promptbook`. |
| `.env` | Lokální nastavení/secrets, ignorované. Vytvořit jen vzory, ne vymyšlené funkční credentials. |

**Nové rozhodnutí:** durable traces Book tasků ukládat pod `traces/` jejich skutečného task zdroje, klíčované stabilním ID a výskytem. Legacy trace cesty zachovat. Provozní stav a zámky nejsou historickým záznamem výsledku a nemají být commitovány.

`init` musí být opakovatelný: zachovat editované Books, kontext, skripty, `.env`, editorové nastavení a šablony; přidávat chybějící soubory/klíče bez plošného přepsání. README/šablony nesmějí být spustitelné tasky. Zachovat možnost doplnění Git ignore, gitattributes a relevantního VS Code nastavení bez závislosti samotného běhu na editoru.

Existující `scripts.check` ponechat přesně. Pokud chybí, sestavit ze skutečných použitelných projektových validačních skriptů v deterministickém pořadí a ukázat rozsah. Bez validace vytvořit selhávající setup placeholder, nikoli příkaz, který vždy vrací úspěch. Migrovat pouze přesně rozpoznané generované historické callery; custom skripty a workflow pouze diagnostikovat.

## Související specifikace

- [Projektové cesty a zdroje tasků](workspace.md)
- [Git preflight](git-preflight.md)
- [Agent Books a kontext](agent-context.md)
- [Projektové checks a opravy](checks.md)
