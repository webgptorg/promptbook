# Uživatelské a CLI kontrakty

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

## Příkazy

| Příkaz | Závazný účel |
| --- | --- |
| `ptbk coder init` / `initialize` | Idempotentně doplní chybějící projektové soubory a vysvětlí konfiguraci. Zachovat také současné top-level init aliasy. |
| `ptbk coder add` | Vytvoří zadání ze vstupu/šablony; současný příkaz je bez modelu. Nové projekty preferují task Books. |
| `ptbk coder generate-boilerplates` | Generuje nehotové šablony, které nejsou automaticky spustitelné. |
| `ptbk coder plan` | Diskuse nad projektem a návrh zadání; zapisuje jen schválené PRD/task soubory. |
| `ptbk coder list` | Bez modelu a zápisů ukáže frontu, filtry a důvody nezpůsobilosti. Bez `--agent` nefiltruje na Developer. |
| `ptbk coder run` | Konečný běh aktuálně způsobilé práce; nečeká neomezeně na budoucí tasky. |
| `ptbk coder fix` | Spustí checks a pouze při jejich selhání vytvoří a vykoná jednu opravnou úlohu. |
| `ptbk coder verify` | Interaktivní lidská kontrola hotových výsledků, případný follow-up a archivace. Neprovádí checks. |
| `ptbk coder server` | Persistentní fronta a lokální webový přehled nad stejným enginem. |
| `ptbk coder migrate` | Nový deterministický převod Markdown tasků na task Books. Žádné modelové volání. |
| `find-unwritten`, `find-refactor-candidates`, `find-fresh-emoji-tags`, `ping` | Zachovat užitečné authoring/diagnostické nástroje jako oddělené příkazy, ne součást task smyčky. |

Příkaz nesmí mlčky ignorovat nepodporovaný přepínač. Staré `--test` a `--test-before` skončí s návodem na `--check` a `--check-before`. `--priority` zůstává aliasem dolní meze priority.

## První použití a běžný běh

```bash
ptbk coder init --path ./projekt
ptbk coder list --path ./projekt
ptbk coder run --path ./projekt --harness openai-codex --dry-run
ptbk coder run --path ./projekt --harness openai-codex \
  --check "npm run check" --check-before yes-and-fix
```

Příklady se vztahují k cílovému coderu; příklady s `--tasks`, `migrate`, `TASK`, `AFTER` a `REPEAT` nejsou tvrzením o dostupnosti v analyzovaném balíčku.

## Konfigurace a precedence

- `--path` vybírá projekt; bez něj použít pracovní adresář zachycený na začátku příkazu. Relativní cesta se vyhodnotí od místa invokace.
- Explicitní CLI hodnoty mají přednost před existující podporovanou konfigurací. Taskovy typované požadavky se uplatní před implicitními defaulty, nesmějí však přepsat explicitní volbu uživatele.
- `--harness` vybírá nástroj, `--model` model, `--thinking-level` intenzitu uvažování. `--agent` vybírá agent Book; nejsou to zaměnitelné pojmy.
- Pro `run`, `fix`, `plan` a současný `server` je implicitní `agents/developer.book`. Explicitní Planner zůstává podporován. Neexistující default dá návod na `init`; chybná explicitní cesta skončí chybou bez fallbacku.
    - Podívej se na [specifikaci formátu `.book`](../book-language.md)
- Bez `--context` načíst projektový `AGENTS.md`. Chybějící implicitní soubor pouze jednou oznámit; existující nečitelný soubor je chyba. Explicitní text/soubor default nahrazuje. `--context ""` dodatečný kontext vypne.
- Zachovat `PTBK_HARNESS`, `PTBK_MODEL` a `PTBK_THINKING_LEVEL`; explicitní CLI hodnota vždy vyhrává. Současný non-dry run/server/plan/fix vyžaduje vybraný harness; `fix` odkládá jeho instalaci a přípravu Booku až na potřebu opravy. V cílovém Book režimu může chybějící invokační harness doplnit typovaný task požadavek, pouze je-li daný provider nakonfigurovaný. Jinak task zůstane zablokovaný. Nevytvářet skrytou všeobecnou vrstvu environment overrides.
- Read-only příkazy nesmějí implicitně inicializovat Books, instalovat harness, kompilovat vzdálenou dědičnost, kontaktovat model ani měnit Git.

## Zachované volby běhu

| Volba | Kontrakt |
| --- | --- |
| `--min-priority`, `--max-priority` | Inkluzivní nezáporné celočíselné meze. Rozpor s `--priority` nebo minimum větší než maximum je chyba. |
| `--limit` | Maximum úspěšně dokončených tasků/výskytů. Selhání samo limit nevyčerpá. |
| `--git-changes fail/ignore/continue` | Výchozí `fail`; význam v [Git persistence](git-persistence.md). |
| `--no-commit` | Žádné automatické commity; v automatickém režimu vyžaduje `--git-changes ignore`. V interaktivním `--no-auto` zachovat možnost ručního uložení práce. |
| `--no-auto` | Interaktivní potvrzení před taskem a potvrzení commitového kroku; default je automatické pokračování. Nelze kombinovat s `--no-questions`. |
| `--auto-pull`, `--auto-push` | Explicitní opt-in, ve výchozím běhu vypnuto. |
| `--check`, `--check-before` | Kontrakt kontrol v [specifikaci checks](checks.md). |
| `--isolate` | Samostatný worktree pro jeden task; základní běh stále sekvenční. |
| `--no-normalize-line-endings` | Vypne standardní normalizaci změněných textových souborů CRLF na LF. |
| `--no-ui`, `--preserve-logs`, `--no-questions` | Plain výstup, zachování diagnostiky, neinteraktivní režim. |
| `--allow-credits` | Explicitní opt-in do kreditového režimu OpenAI Codex. |
| `--wait-between-prompts` | Minimum mezi začátky dvou úkolů, default 0; doba vykonání se započítává. |
| `--wait-after-prompt` | Čekání po dokončení úkolu, default 0. |
| `--wait-after-error` | Cooldown před technickým retry, default 10 minut. Přijímá zdokumentované duration formy jako `30m`, `5s`, `1h30m`. |
| `--auto-migrate` | Stávající integrace migrací testovacích serverů; oddělený volitelný adaptér. Není to `coder migrate`. |

Přesné providerové defaulty musí být v jediném aktualizovatelném registru a help musí odpovídat runtime. Nepřevzít názvy modelů z ukázkových historických PRD jako trvalý produktový kontrakt.

Podporované thinking hodnoty jsou `low`, `medium`, `high`, `xhigh`, `max`; zvolený adaptér musí uvést, zda je používá. Současný Codex fallback je `xhigh`, generovaný `coder:run` explicitně nastavuje `max`. Nová implementace nesmí tiše přijmout nepodporovaný effort a tvrdit, že se uplatnil.

Před první mutací validovat kombinace: `--auto-pull` s `--no-commit` je zakázáno mimo read-only preview; `--isolate` nepřipouští `--no-commit` ani `continue`; `continue` nepřipouští `--check-before yes-and-fix`. `--allow-destructive-auto-migrate` vyžaduje `--auto-migrate`.

Authoring utility (`init`, `add`, `generate-boilerplates`, `plan`) mají oproti runu commity ve výchozím stavu vypnuté a používají explicitní `--commit`; push vyžaduje commit. `add [description]` přijímá argument, stdin nebo interaktivní vstup a zachová `--template`/prioritu. Boilerplates zachovají `--count` ve formách `N` a `N*M` (default `5*1`). `verify` zachová pořadí review a opakovatelný ignore filtr. `ping` je skutečné malé modelové volání, případně opakované s `--period`; nejde o read-only offline inspekci.

## Související specifikace

- [Projektové cesty a zdroje tasků](workspace.md)
- [Inicializace projektu](initialization.md)
- [Projektové checks a opravy](checks.md)
- [Read-only plánování](planning.md)
- [Kompatibilita a vědomé změny](compatibility.md)
