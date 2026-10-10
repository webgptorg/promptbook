# ptbk coder: zadání nové implementace

**Samostatná produktová a technická specifikace**  
Verze 1.0 | 7. října 2026 | Pro Pavola Hejného

**Účel:** znovu vytvořit Promptbook Coder jako přehledný, samostatně udržovatelný nástroj. Zachovat jeho podstatné pracovní postupy a dokončit aktuálně zadaný přechod k tasks, bez přenášení historických vrstev celého Promptbook monorepa.

**Rozhodující zdroj:** `webgptorg/promptbook`, větev `main`, commit `12010a9a1f2df8b23c9c3934f0570caa6daa19da` z 7. 10. 2026, 10:58:27 CEST. Všechny odkazy v příloze míří na tento snapshot.

**Povaha dokumentu:** pouze zadání pro budoucí implementaci. Analýza vychází ze zdrojového kódu, testů, CLI, dokumentace a relevantních PRD. Nebyl spuštěn produkční coder, placené modely ani kompletní test suite monorepa. Akceptační scénáře v tomto dokumentu jsou požadavky na novou implementaci, nikoli hlášení o již provedených testech.

## 1. Výsledek, který má vzniknout

Vytvořit lokální CLI `ptbk coder`, které nad zvoleným projektem načte připravené úkoly, vybere způsobilou práci, předá ji zvolenému agentovi prostřednictvím coding harnessu, spustí projektové kontroly, případně vyžádá opravu, zaznamená výsledek a bezpečně uloží vlastní změny do Gitu. Uživatel může běh sledovat, pozastavit, ukončit, obnovit přerušenou práci nebo provozovat persistentní režim.

Úkoly a agenti jsou lidsky čitelné soubory v projektu. Git uchovává zdrojové zadání a výsledky práce. Coding harness je vyměnitelný adaptér; žádný konkrétní poskytovatel, webová aplikace nebo databáze nesmí být podmínkou samotného jádra.

Nová implementace musí zachovat **pozorovatelné chování a ochranu práce uživatele**, nikoli vnitřní členění historických skriptů. Stejný task engine obsluhuje Markdown, task Books, CLI, kontrolní opravy a persistentní běh. Nezakládat druhý runner pro nový formát.

### 1.1 Jak číst závaznost

| Označení | Význam v tomto dokumentu |
| --- | --- |
| **Zachovat** | Chování doložené aktuálním kódem; může být zpřesněno akceptačním kontraktem. |
| **Doplnit dle PRD** | Zamýšlená funkce z relevantních dosud nedokončených zadání. Součást cílové verze. |
| **Nové rozhodnutí** | Doporučené řešení nejasnosti nebo zlepšení pro přepis. Netvrdí, že tak funguje současný coder. |
| **Odloženo** | Známý směr nebo historické PRD mimo základní dodávku; nepředstírat podporu. |

Následující normativní věty „musí“ popisují cílovou implementaci. Pro konflikty platí: explicitní cílový kontrakt tohoto dokumentu, nejnovější relevantní PRD, skutečný kód, starší dokumentace. Stav `[x]` v PRD sám o sobě nedokazuje úplnou funkčnost; `[!]` naopak neznamená, že v kódu není žádná z požadovaných změn.

### 1.2 Co audit odhalil

| Oblast | Stav v analyzovaném snapshotu | Cíl přepisu |
| --- | --- | --- |
| Fronta | Top-level `prompts/*.md`, sekce, checkboxy, priority, alternativní runner tokeny | Zachovat a připojit task Books ke stejnému enginu. |
| Task Books a `--tasks` | PRD 2026-10-0060 čeká; současný loader čte Markdown | Implementovat jako preferovaný nový formát. |
| Datum nejdřívějšího spuštění | PRD 0050 čeká; současný matcher považuje všechny backticky za runner tokeny | Oddělit typy anotací a časovou způsobilost. |
| Opakování | PRD 0070 čeká | Výhradně task Books; nahradit starý návrh `prompts/recurring`. |
| Checks a commity | Existuje fázové ukládání, soukromý check checkout, oddělené check commity | Zachovat tento kontrakt bez monolitických orchestrace funkcí. |
| Agent pro `plan` | Kód používá Developer; starší PRD chtělo Planner | Developer jako default, Planner explicitně. Plánovací oprávnění zůstávají omezená. |
| Server | Samostatné webové UI a persistentní fronta | Zachovat základní coder server; plný sjednocený Agent Server odložit. |
| Paralelní úkoly | `--parallel` je nedokončené PRD s `@@@` | Základní verze běží sekvenčně; neplést s TEAM konzultacemi. |
| Provozní soubory | Část zámků, check views a recovery je v Git adresáři | Dle PRD 0130 vlastní soubory přesunout do `.promptbook/ptbk-coder`. |
| Identita commitů | README tvrdí povinný agentní podpis, kód dovoluje běžnou Git identitu | Výslovně dokumentovat skutečný fallback; nepřenést nepravdivé tvrzení. |

Podklady: [S01], [S02], [S04], [S05], [S06], [S09], [S10], [S11], [S12].

## 2. Rozsah a základní pojmy

### 2.1 Agent, projekt, task a běh

**Agent** je přenositelná role definovaná agent Bookem: persona, pravidla, znalosti, dědičnost a dostupní poradci. **Projekt** je zvolený adresář s materiály a konfigurací; může být podadresářem většího Git repozitáře. **Task** je konkrétní zadání s vlastním stavem a podmínkami spuštění. **Harness** je nástroj, který agentovi poskytuje přístup ke kódu a modelu, například OpenAI Codex nebo Claude Code.

**Run** je jedno spuštění coderu. **Occurrence** je jednotlivý výskyt úkolu; jednorázový task má jeden logický výskyt, opakovaný task více. **Attempt** je pokus v rámci téhož výskytu. **Check** je projektový validační příkaz. **Trace** je dohledatelný záznam průběhu. **TEAM consultation** je dotaz poradnímu agentovi uvnitř úkolu, nikoli další souběžný task.

Agent Book a task Book sdílejí čitelný jazyk a lexikální infrastrukturu. Mají však odlišný dokumentový typ, význam a runtime. Task Book se nesmí kompilovat jako agent, automaticky dědit Adama ani vytvářet chatový profil.

### 2.2 Zahrnuté pracovní postupy

- Inicializace projektu; authoring zadání, šablony a plánovací konverzace.
- Jednorázový běh fronty, read-only přehled a dry-run.
- Oprava selhávajících checks bez spuštění běžné fronty.
- Bezpečné Git commity, explicitní pull/push, izolace úkolu ve worktree a recovery.
- Persistentní coder server se sdíleným stavem a ovládáním.
- Sedm stávajících harnessů, agent Books, kontext a TEAM.
- Tasks v Book formátu, migrace Markdownu, not-before a deterministické opakování.
- Ruční ověření výsledku a archivace; pomocné příkazy pro authoring a diagnostiku.

### 2.3 Co nepřenášet do jádra

Starý pipeline engine, celý Agents Server, Studio, marketingové weby, účtování zákazníků, Supabase/PostgreSQL, vlastní editor a obecné chatové funkce nejsou závislostí coderu. Nepřepisovat celý Promptbook kvůli coderu.

Odloženy jsou: plný `ptbk server` nad Agent Serverem a SQLite (PRD 2026-09-0490 je výslovně `not-ready`), paralelní task workery, přirozenojazyčné/eventové triggery, distribuované řízení napříč klony, marketplace agentů a automatické odvozování backlogu z libovolných cílů.

**Závislosti mezi tasky:** koncept APT je připouští, ale aktuální task PRD nedefinuje vykonatelný kontrakt typu `DEPENDS ON`. Do základní verze se nevymýšlí implicitní DAG ani nová syntaxe. Rozhraní způsobilosti umožní budoucí dependency evaluator; nepodporovaná řídicí syntaxe dnes úkol viditelně zablokuje. Závislosti mezi implementačními etapami v kapitole 17 nejsou syntaxí tasků.

Origami avatary z PRD 2026-10-0030 jsou samostatná vizuální dodávka nad sdílenými událostmi. Coder musí mít výměnný renderer identity/stavu a kompatibilní fallback. Fyzikální skládání 3D origami ani úprava Agents Serveru nejsou podmínkou správnosti task enginu. Jejich nezahrnutí do základní dodávky musí být viditelné, nikoli označené jako splněné PRD.

## 3. Uživatelské a CLI kontrakty

### 3.1 Příkazy

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

### 3.2 První použití a běžný běh

```bash
ptbk coder init --path ./projekt
ptbk coder list --path ./projekt
ptbk coder run --path ./projekt --harness openai-codex --dry-run
ptbk coder run --path ./projekt --harness openai-codex \
  --check "npm run check" --check-before yes-and-fix
```

Příklady se vztahují k cílovému coderu; příklady s `--tasks`, `migrate`, `TASK`, `AFTER` a `REPEAT` nejsou tvrzením o dostupnosti v analyzovaném balíčku.

### 3.3 Konfigurace a precedence

- `--path` vybírá projekt; bez něj použít pracovní adresář zachycený na začátku příkazu. Relativní cesta se vyhodnotí od místa invokace.
- Explicitní CLI hodnoty mají přednost před existující podporovanou konfigurací. Taskovy typované požadavky se uplatní před implicitními defaulty, nesmějí však přepsat explicitní volbu uživatele.
- `--harness` vybírá nástroj, `--model` model, `--thinking-level` intenzitu uvažování. `--agent` vybírá agent Book; nejsou to zaměnitelné pojmy.
- Pro `run`, `fix`, `plan` a současný `server` je implicitní `agents/developer.book`. Explicitní Planner zůstává podporován. Neexistující default dá návod na `init`; chybná explicitní cesta skončí chybou bez fallbacku.
    - Podívej se na [specifikaci formátu `.book`](./book-language.md)
- Bez `--context` načíst projektový `AGENTS.md`. Chybějící implicitní soubor pouze jednou oznámit; existující nečitelný soubor je chyba. Explicitní text/soubor default nahrazuje. `--context ""` dodatečný kontext vypne.
- Zachovat `PTBK_HARNESS`, `PTBK_MODEL` a `PTBK_THINKING_LEVEL`; explicitní CLI hodnota vždy vyhrává. Současný non-dry run/server/plan/fix vyžaduje vybraný harness; `fix` odkládá jeho instalaci a přípravu Booku až na potřebu opravy. V cílovém Book režimu může chybějící invokační harness doplnit typovaný task požadavek, pouze je-li daný provider nakonfigurovaný. Jinak task zůstane zablokovaný. Nevytvářet skrytou všeobecnou vrstvu environment overrides.
- Read-only příkazy nesmějí implicitně inicializovat Books, instalovat harness, kompilovat vzdálenou dědičnost, kontaktovat model ani měnit Git.

### 3.4 Zachované volby běhu

| Volba | Kontrakt |
| --- | --- |
| `--min-priority`, `--max-priority` | Inkluzivní nezáporné celočíselné meze. Rozpor s `--priority` nebo minimum větší než maximum je chyba. |
| `--limit` | Maximum úspěšně dokončených tasků/výskytů. Selhání samo limit nevyčerpá. |
| `--git-changes fail/ignore/continue` | Výchozí `fail`; význam v kapitole 10. |
| `--no-commit` | Žádné automatické commity; v automatickém režimu vyžaduje `--git-changes ignore`. V interaktivním `--no-auto` zachovat možnost ručního uložení práce. |
| `--no-auto` | Interaktivní potvrzení před taskem a potvrzení commitového kroku; default je automatické pokračování. Nelze kombinovat s `--no-questions`. |
| `--auto-pull`, `--auto-push` | Explicitní opt-in, ve výchozím běhu vypnuto. |
| `--check`, `--check-before` | Kontrakt kontrol v kapitole 9. |
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

## 4. Projekt, inicializace a adresáře

Projektový kořen, Git working tree a adresář instalovaného balíčku jsou tři různé cesty. Změna `--path` musí konzistentně ovlivnit Books, kontext, tasky, šablony, cwd subprocessů, checks a artefakty. Git operace používají nalezený obalující repozitář, ale nesmějí kvůli tomu přesunout tasky pod jeho kořen.

### 4.1 Cílové rozložení

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

### 4.2 Git preflight

Read-only příkaz smí pracovat nad adresářem bez Gitu. Mutující příkaz vyřeší Git před instalací harnessu, generováním souborů nebo placeným voláním. Běžná mutující akce může v interaktivním terminálu nabídnout `git init`; odmítnutí musí být bez částečných vedlejších změn. V neinteraktivním režimu chybějící repozitář skončí s návodem. Výjimkou je explicitní `ptbk init` / `coder init`: samotný příkaz už vyjadřuje záměr inicializovat a může založit Git i s `--no-questions`, bez dalšího potvrzení.

`git init` nikdy samo necommitne původní uživatelské soubory. Případný explicitní initialization commit zahrne pouze skutečně vytvořené/změněné inicializační artefakty. Repozitář bez prvního commitu je platný podporovaný stav. Rozlišit chybějící executable Git, poškozený repozitář a bare repository; žádný z těchto problémů neskrývat novým `git init`.

Uvnitř existujícího repozitáře nikdy nezakládat vnořené `.git`. Zachovat Git worktrees i variantu, kde `.git` je soubor. Výchozí nastavení nesmí přidat remote, force-pushovat nebo přepsat cizí historii.

### 4.3 Konfigurace task zdroje

`--tasks <directory>` má default `tasks` relativně k vybranému projektu. Legacy zdroj zůstává `prompts`. Absolutní cesta uvnitř projektu je dovolena; cesty s mezerami musí fungovat. Pro mutace ověřit skutečné cesty a symlinky, aby nebylo možné zapisovat do jiného workspace.

Implicitní neexistující zdroj je prázdný. Explicitní chybějící nebo neplatný `--tasks` je pro read/run chyba; `init` a `migrate` smějí validovaný cíl vytvořit. Při aliasování cest se každý adaptér aplikuje pouze jednou. Stejnou vyřešenou konfiguraci používají všechny příkazy, child workery a izolované worktrees.

Z task zdroje načítat pouze top-level `.book` soubory, stejně nerekurzivně jako legacy frontu. Podadresáře se šablonami, archivy a traces nejsou discovery zdroj.

## 5. Task kontrakt: kompatibilní Markdown

### 5.1 Načtení a stavy

Načítat pouze top-level `.md` v legacy zdroji. Ignorovat README podle existujícího pravidla a soubory obsahující `<!--ptbk-coder-ignore-->`. Nevstupovat rekurzivně do archivů, traces, šablon ani screenshots.

Legacy parser dělí soubor podle samostatné řádky `---`. Každá neprázdná sekce je samostatný task. Jeho stav určuje první neprázdný řádek, ne checklist acceptance criteria v těle. Původní parser není plnohodnotný Markdown AST; jeho chování musí mít kompatibilitní fixtures. Přepis nesmí bez výslovné migrace předefinovat hranice existujících sekcí.

| Marker | Normalizovaný stav | Automatické nové spuštění |
| --- | --- | --- |
| `[ ]` | `todo` | Ano, pokud splní všechny další podmínky. |
| Žádný marker | `todo`, priorita 0 | Ano, pokud je sekce úplná; při zahájení se doplní stavový řádek. |
| `[-]`, historické `[.]` | `not-ready` | Ne. |
| `[^]` | `in-progress` | Ne; jen explicitní ověřená recovery. |
| `[x]`, `[X]` | `done` | Ne. |
| `[!]` | `failed` | Ne; vyžaduje vědomé opakování/recovery. |

Známý marker s neplatnými řídicími metadaty nesmí spadnout do implicitního `todo`. Sekce obsahující authoring placeholder `@@@` se nevykonává. Obyčejný úvodní emoji tag není stav úkolu.

### 5.2 Priority a routing

Počet `!` ve stavových metadatech určuje nezápornou prioritu; větší číslo se spouští dříve. Při shodě zachovat stabilní pořadí podle zdrojových cest a pořadí sekcí. **Nové rozhodnutí:** v mixed frontě explicitně dokumentovat stabilní sekundární klíč `normalizovaná relativní cesta + sekce/ID`, aby výsledek nezávisel na pořadí filesystemu.

Nečasové backtick tokeny jsou historická **any-of** skupina. Normalizovaný token se porovnává jako substring názvu harnessu, modelu a aliasů vybraného Book agenta. Například `gpt` nebo `opus` není striktní model ID. Několik tokenů znamená OR, nikoli povinné splnění všech.

```markdown
[ ] !! use `gpt` `claude`

[název nebo emoji] Oprav export CSV
Zachovej názvy sloupců a doplň ověření uvozovek.
```

Routing filtr v legacy Markdownu sám nemění vybraného providera. Při status update zachovat původní routing a časové anotace jako zdrojová metadata oddělená od historie použitého runneru; historický model v hotovém reportu se nesmí stát novým omezením.

### 5.3 Změny zdroje během práce

Adapter musí znát soubor, sekci, verzi obsahu a umístění řídicího řádku. Před zápisem stav znovu ověří. Smí zachovat záměrné task-owned změny těla, ale nesmí přepsat konkurenční editaci, přiřadit výsledek nově vložené sekci podle pouhého indexu nebo ignorovat zmizení původního úkolu.

**Nové rozhodnutí:** zdrojové revize porovnávat pomocí content hash a očekávaného task/section fingerprintu. Konflikt zastaví finalizaci a zachová obě verze k rozřešení. Zachovat newline styl a okolní obsah tam, kde to neodporuje explicitnímu normalizačnímu kroku.

## 6. Task kontrakt: nový Book formát

### 6.1 Kanonický příklad

```book
Opravit export CSV

TASK
META ID csv-export-quoting
STATUS todo
PRIORITY 2
AGENT {../agents/developer.book}
HARNESS openai-codex
AFTER 2026-10-30T09:00:00+01:00

PROMPT
Oprav export buněk s čárkou, uvozovkami a novým řádkem.
Zachovej stávající veřejné rozhraní a doplň regresní test.

RULE
Neměň oddělovač ani názvy sloupců.
```

### 6.2 Význam commitments

| Pole | Požadovaný význam |
| --- | --- |
| První neprázdný řádek | Lidsky čitelný titul. Není identitou tasku. |
| `TASK` | Explicitní deklarace typu dokumentu v hlavičce bezprostředně po titulu. |
| `META ID` | Stabilní unikátní ID v rámci workspace. Vytvořit jednou při authoringu/migraci. |
| `STATUS` | `todo`, `in-progress`, `done`, `failed`, `not-ready`. |
| `PRIORITY` | Nezáporné celé číslo; default 0. |
| `AGENT` | Požadavek na agent Book, přes stávající resolver jmen/cest. Relativní reference vůči deklarujícímu task Booku. |
| `HARNESS` | Typovaný požadavek na coding nástroj. |
| `MODEL` | Typovaný požadavek na model; nepřebírá význam agentního Book commitmentu. |
| `RUNNER` | Opakovatelné kompatibilitní legacy selektory, uvnitř skupiny OR substring matching. |
| `AFTER` | Inkluzivní nejdřívější okamžik startu. |
| `REPEAT` | Opakování ve fixním intervalu; jen pro task Books. |
| `PROMPT` | Implementační payload. |
| `RULE` | Uspořádané task-local instrukce; neupravují trvale agent Book. |

`AGENT`, `HARNESS` a `MODEL`, jsou-li uvedeny, tvoří samostatné AND podmínky. Případná `RUNNER` OR skupina je další podmínkou. Chybějící typované pole použije platný invokační/defaultní kontext. Rozpor s explicitním CLI výběrem se zobrazí jako nekompatibilní task; nedojde k tichému přepnutí nástroje, modelu ani placeného účtu.

**Nové rozhodnutí:** task bez `META ID` nebo `STATUS` je neúplný a nevykonatelný. Read-only parser identitu ani stav nedoplňuje. Autorovací příkazy hodnoty doplní jednou. Duplicitní ID zablokuje všechny konfliktní definice.

### 6.3 Parser a bezeztrátový payload

Oddělit tokenizaci Book bloků od sémantiky agentního a task dialektu. Agent Book bez header deklarace `TASK` zůstává agent Bookem. Soubory bez platné task deklarace v task zdroji se nestávají prací.

Vyžadovat neprázdný titul, právě jednu hlavičku `TASK` a právě jeden neprázdný `PROMPT`. `META ID`, `STATUS`, `PRIORITY`, `AGENT`, `HARNESS` a `MODEL` jsou singletony; `RULE` a `RUNNER` se mohou opakovat. `AFTER` a `REPEAT` se mohou opakovat pouze se sémanticky stejnou normalizovanou hodnotou. Implementovat validaci, escape/literal formy a diagnostiky s cestou a řádkem. Nerozpoznané `REPEAT`, `AFTER` nebo budoucí řídicí pole nesmí znamenat okamžitě spustitelný úkol.

**Nové rozhodnutí - přesná literal forma:** migrace zapisuje pod `PROMPT` fenced blok s info stringem `ptbk-task-literal-json`, obsahující právě jeden validní JSON string. Parser dekóduje tento string jako celý payload, bez wrapperu a bez trimování. JSON escaping zachová nové řádky, závěrečný newline, uvozovky, Unicode, řádky `MODEL`/`RULE`, fences i `---`; okolní fence má délku větší než kolidující sekvence backticků v serializaci. Normální `PROMPT` bez tohoto přesného markeru zůstává běžným multiline obsahem. Tuto speciální obálku neplést s code blockem, který je sám obsahem úkolu. Otestovat přesný round-trip.

Poznámky, historickou cenu, časy a attribution ukládat jako neexekutivní metadata, ne nové routing instrukce. **Nové rozhodnutí:** vyhradit pro ně opakovatelné `META NOTE` a pro migration provenance singleton `META ORIGIN` s validovaným JSON objektem (`sourcePath`, `sectionIndex`, `sourceChecksum`, `migrationVersion`). Neznámá metadata uchovat při round-trip; neznámé executable/control commitments blokovat.

## 7. Časování a způsobilost

### 7.1 Jeden rozhodovací mechanismus

Výběr tasku vyžaduje: platný zdroj, povolený lifecycle, dokončené zadání bez placeholderů, vyhovující prioritu, kompatibilní routing, splněný trigger a dostupný claim. Vyhodnocení musí vracet vysvětlení: `ready`, `waiting-until`, `blocked`, `invalid`, `unsupported` nebo vyřazení filtrem; může dodat příští wake-up.

Stejný evaluator používá list, dry-run, dashboard, server i skutečný claim. Dostává injektované hodiny, timezone, konfiguraci a uložený stav. Neprovádí I/O, Git, čekání ani modelové volání. Cache parsovaného dokumentu není cache jeho časové způsobilosti.

### 7.2 Not-before

Markdown rozpoznává schedule pouze v celém backtick tokenu vlastního řídicího stavového řádku. Book používá `AFTER`. Datum v názvu, těle, cestě, příkladu, URL nebo hotovém reportu není trigger.

Podporovat striktní gramatiku: `YYYY-MM-DD`; datum a čas oddělené mezerou nebo `T`, čas `HH:mm` s volitelnými sekundami a zlomkem sekund; bez zóny, s `Z` nebo offsetem `+HH:mm`/`-HH:mm`. Offset přijímat i u formy s mezerou. Netvrdit podporu libovolné ISO varianty.

```markdown
[ ] !! `2026-10-30 09:30`
[ ] `gpt` `2026-10-30T09:30:00+01:00`
[ ] `gpt-4.1-2025-04-14` `2026-10-30`
```

Datum bez času znamená půlnoc na začátku daného dne. Hranice je `now >= notBefore`. `Z`/offset určuje instant; bez offsetu použít jednu explicitně vyřešenou lokální timezone invokace a ukázat ji uživateli. **Nové rozhodnutí:** default je systémová lokální IANA timezone zachycená jednou na začátku invokace; nelze-li ji spolehlivě vyřešit, vstup bez offsetu je chyba. Při aktivaci schedule uložit i použitou timezone. Neexistující nebo dvojznačný lokální čas při změně DST vyžaduje explicitní offset.

Neplatná data, rozsahy nebo date-shaped překlepy úkol blokují. Modelové jméno s vloženým datem není datum. Stejné opakované instanty jsou redundantní; odlišné instanty v jedné definici jsou konflikt. Relativní slova, samotný čas, cron a přirozenojazyčné podmínky nejsou podporovány.

Budoucí task s vysokou prioritou neblokuje způsobilé tasky. Odložený task zůstává `todo`. `run` skončí, když nemá způsobilou práci, a vypíše budoucí úkoly/příští relevantní čas. Persistentní scheduler se znovu probudí při zdrojové změně nebo čase. `S` ani pause/resume tuto podmínku neobchází. Obnova již skutečně zahájeného tasku je recovery, nikoli nový plánovaný start.

### 7.3 Opakované task Books

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

### 7.4 Sloty, restart a výpadky

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

## 8. Agent Books, harnessy a plánování

### 8.1 Agentní kontext

Použít existující Book semantics pro persona/rules, `FROM`, `IMPORT`, znalosti a `TEAM`. Reuse stávající kompilace může být úzkou knihovní závislostí; není důvod převzít celý historický runtime. Title, cesta a podporované aliasy slouží routing identitě, nikoli nahrazení stabilního task ID.

Předávaný request odděluje orchestrace pravidla, efektivní instrukce agenta, task payload, task-local rules a dodatečný projektový kontext. Coder vlastní status a Git finalizaci; harness dostane instrukci sám necommitovat. Změny agentního souboru z disku se načtou v jasném dokumentovaném bodě, minimálně při nové invokaci; jeden běžící attempt má neměnný snapshot.

Inicializace poskytuje `agents/.core/adam.book`, `agents/developer.book`, `agents/planner.book`, `agents/lawyer.book` a `agents/copywriter.book`. Chybějící lokální TEAM odkazy na Lawyer/Copywriter doplní do Developer/Planner bez přepsání ostatních instrukcí; konfliktní či neplatný Book ponechá s diagnostikou. Znovuspuštění init nesmí přepsat jejich místní úpravy. Chybějící nebo nejednoznačné odkazy se hlásí s deklarujícím souborem.

### 8.2 Harness contract

Zachovat adaptéry `openai-codex`, `claude-code`, `github-copilot`, `cline`, `opencode`, `gemini`, `qwen-code`. Sdílejí typovaný request/result a lifecycle; providerová CLI syntaxe, dostupnost, login, verze, parsing událostí, usage a quota detekce patří do adaptéru.

Výsledek musí rozlišovat: úspěch, odmítnutí konfigurace, chybějící přihlášení, quota/credit omezení, přechodovou chybu, pád procesu a cancellation. Zachytit exit code i signal/spawn failure. Úspěšná poslední věta modelu nenahrazuje exit/check outcome.

**Oprava identifikovaného rizika:** současná cesta `runScriptUntilMarkerIdle` připouští úspěch při `code === 0 || markerSeen`, přičemž Codex marker může být usage souhrn nebo ukončení neúspěšného turnu. V nové implementaci má terminal failure, signal a nenulový exit přednost. `tokens used` ani `turn.failed` nikdy nejsou důkaz úspěchu; completion marker pouze řídí čekání na trailing output. Jde o závěr ze zdrojové analýzy, nikoli live reprodukci.

| Harness | Stávající CLI executable | Adaptační požadavek |
| --- | --- | --- |
| OpenAI Codex | `codex` | JSON i plain stream, reasoning, auth attribution, credit/limit detekce. |
| Claude Code | `claude` | Streamované zprávy, effort, usage a obnovení stejné session po doloženém limitu. |
| GitHub Copilot | `copilot` | Model/effort, strukturovaný nebo označený fallback výstup. |
| Gemini | `gemini` | Model a usage; unattended execution policy. |
| Qwen Code | `qwen` | Model a usage; unattended execution policy. |
| OpenCode | `opencode` | Provider-qualified model a JSON události. |
| Cline | `cline` | Provider/model konfigurace bez kontaminace uživatelského nastavení. |

Modely nehardcodovat v task enginu. Zachovat rozdíl `--model default`: u Codex, Copilot, Claude a OpenCode může znamenat nativní konfiguraci; Gemini, Qwen a Cline jej dle současné politiky překládají na registry default. V trace vždy uvést efektivní výběr nebo jasně přiznat, že jej provider neoznámil.

Chybějící login skončí s konkrétním návodem pro zvolený harness. Opakované retries nesmí místo autentizace pálit další běhy. Instalace/update nástroje smí proběhnout jen v povoleném execution setup; nikdy kvůli list/help/dry-run. Neinstalovat všechny providery preventivně.

U Codexu zachovat preferenci aktivního ChatGPT loginu; API key cesta je explicitní opt-in `PTBK_OPENAI_CODEX_USE_API_KEY=1` s dostupným klíčem a bez aktivní account session. Trace rozlišuje account/API/unknown; automatický fallback na placené API není dovolen. Konkrétní providerové invocation flags validuje adaptér proti podporované verzi.

### 8.3 TEAM

TEAM reference včetně zděděných/importovaných deklarací vytvoří nástroje pro jednotlivé poradce. Primární agent rozhoduje, zda a kdy se zeptat. Poradce běží se svým Bookem a vrací označenou odpověď do téhož tasku; jeho pravidla se neslévají do hlavního system promptu.

Jména přesně rozlišovat a chyby nejednoznačnosti vysvětlit. Relativní reference řešit od deklarujícího Booku, i při dědičnosti. Opakovaný odkaz na stejný Book znamená jeden poradní nástroj. Lokální poradce nevyžaduje Agent Server. U vzdálených Books neposílat lokální credentials a nedovolit vzdálenému zdroji odkazovat do host-local filesystemu.

Všechny podporované execution harnessy používají společný dočasný tool bridge. Před prací ověřit dostupnost/discovery; nevytvářet falešnou TEAM podporu jen textem v promptu. Bez konzultace nevzniká další placené volání. Vynucovat sdílené limity hloubky, počtu konzultací, timeout a cancellation; vyčerpaný limit je konkrétní výsledek, nikoli nekonečná rekurze.

Zachovat výchozí TEAM limity: timeout konzultace 5 minut, hloubka 4, celkem 24 volání a nejvýše 128 000 znaků odpovědi. Každé skutečné inference započítat do usage právě jednou. Poradce nesmí samostatně claimnout frontu, commitovat ani provádět databázové migrace.

### 8.4 `plan` je odlišný režim oprávnění

Současný podporovaný planner harness je OpenAI Codex. Ostatní musí explicitně odmítnout plánovací režim, dokud nemají ekvivalentní schopnosti. Role Developer/Planner nemění capability policy.

Model prochází projekt přes host-mediated read protocol a navrhuje PRD, ne application patches. Nesmí si sám spustit shell, zapsat aplikační soubor ani předat takové oprávnění TEAM poradci. Jen primární plánovač navrhuje tasky a až uživatelská review/save akce je uloží. Povolené PRD změny mají vlastní scoped commit; `plan` nesmí spustit implementační frontu.

Zachovat konverzační `/save` (ready), `/draft` (not-ready), `/discard` a `/exit`; EOF neuložené návrhy zahodí, již uložené soubory zůstanou. Uživatel před zápisem vidí přesnou cestu i obsah, concurrent source edit zneplatní preview. Jeden inference má limit 5 minut a 2 MiB výstupu; nedostupná read-only capability musí plánování odmítnout, nikoli spustit běžný neomezený execution runner.

## 9. Vykonání úkolu a kontroly

### 9.1 Jediný execution lifecycle

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

### 9.2 Check contract

`--check` určuje jeden projektový shell příkaz. `--check-before` má `no` (default), `yes-and-fail`, `yes-and-fix`. Zapnutý počáteční check bez explicitního příkazu použije `npm run check`. Když není uveden ani `--check`, ani zapnutý `--check-before`, volitelné check fáze se přeskočí; UI nesmí tvrdit, že testy prošly.

`yes-and-fail` po neúspěchu skončí. `yes-and-fix` vytvoří jednu opravnou úlohu a využije sdílenou repair službu před přechodem k běžné frontě. `fix` vždy provede check (bez explicitního `--check` použije `npm run check`), případně opraví, znovu ověří a skončí; vůbec nevybírá běžné tasky.

Chybějící, rekurzivní nebo neinicializovaný validační příkaz je setup error. Nepřepisovat ho na automatický úspěch. Opravná instrukce zakazuje odstraňovat assertions, snižovat thresholds, vypínat lint/checks nebo vynechávat builds pouze k získání zeleného výsledku.

Kontroly mohou měnit soubory. Musí kontrolovat přesnou obsahovou verzi určenou k uložení, včetně scoped line-ending normalizace. Soukromý check view zachová projektovou relativní polohu, závislosti a potřebné ignored soubory; výsledek se importuje jen pokud živý checkout stále odpovídá zachycené hranici.

### 9.3 Retry a chyby

Zachovat oddělení check-feedback oprav a retry technického selhání. Check-feedback je omezen na tři implementační/repair pokusy pro stejnou úlohu; technická retry smyčka má v současném kódu počáteční pokus a nejvýše tři další retries. Nesmějí se bez vysvětlení změnit v neomezené ani skrytě násobené placené volání.

**Nové rozhodnutí:** centrální attempt budget a jednotný event/report musí ukázat oba čítače i důvod každého dalšího volání. Providerové zotavení z doložené přechodové chyby zachovává identitu pokusu; persistence, signing a push error se do modelového retry nikdy nemapují. Pokud bezpečný replay nelze prokázat, stav je `recovery-required`.

Quota čekání používat podle providerem oznámeného resetu; když není dostupný, bounded backoff. Po obnovení ověřit dostupnost, neslibovat pevný reset odhadnutý z textu. U dlouhého čekání respektovat pause/cancel a neprovádět placené idle dotazy. Kreditový požadavek Codexu bez `--allow-credits` skončí s návodem.

## 10. Git, vlastnictví změn a recovery

### 10.1 Nepřekročitelné invarianty

- Coder automaticky commitne jen prokazatelně vlastní změny příslušné fáze, task status a záměrně durable artefakty.
- Předexistující staged i unstaged změny, index flags a průběžné editace uživatele zůstanou zachovány. Shoda cesty sama neprokazuje vlastnictví.
- Nepoužívat plošný `git add .`, automatický stash, destructive reset/clean, force-push ani přepis historie k vyrobení úspěšného stavu.
- Hooky a nastavené podepisování zůstávají aktivní. Změna zachyceného obsahu hookem znamená neověřený strom, ne hotový task.
- Žádný vlastní lock, journal, trace nebo check adresář se přímo nezapisuje do `.git`. Standardní Git příkazy přirozeně spravují interní Git data; PRD 0130 není zákaz použití Gitu.
- Porucha finalizace, commitu nebo push nesmí opakovat úspěšnou implementaci ani duplikovat již vytvořený lokální commit.

### 10.2 Fázové commity

Zachovat nový kontrakt samostatných check commitů. Jeden task může vytvořit více commitů. Implementační commit obsahuje agentovu verzi, check commit následnou transformaci checkeru; pokud změnili stejnou řádku, hranice musí být patrná i na ní. Není přípustné jen rozdělit soubory podle názvu.

Check commit má předmět `chore: Automatically commit changes made by checks`; tělo uvádí fázi, command, task, attempt a skutečný outcome. I selhávající check může mít vlastní souborové změny a commit; tím se validace nestává úspěšnou. Prázdné delta neprodukuje prázdný commit.

Coderem provedená normalizace, status update a finalizace patří do vlastního scope, ne do změn připsaných checkeru. Podporovat additions, deletions, renames, modes, symlinks a binary blobs; ignored výstupy ponechat dostupné pro repair/recheck, aniž se obejde Git ignore policy.

Mezilehlý commit musí označit práci jako nedokončenou. Úspěšný čistý automaticky commitující běh na konci nezanechá žádné eligible vlastní neuložené změny. Selhaný completion commit nesmí publikovat živé `[x]`/`done`. V `--no-commit` lze zachovat historické dokončení, ale výsledek a UI explicitně hlásí `completed, uncommitted` a vyjmenují retained paths.

Princip „revert vrátí i task“ platí pouze pro konkrétní sdružené změny v historii, ne univerzálně pro libovolný mezilehlý commit. Dokumentace musí vysvětlit sadu taskových commitů. Git revert nevrací externí účinky a sám neobnoví neversionovaný recurrence ledger.

### 10.3 Dirty tree

| Režim | Požadované chování |
| --- | --- |
| `fail` | Před novou implementací odmítne necommitnuté změny; zobrazí návod. |
| `ignore` | Smí pokračovat, ale zachová cizí baseline a necommitne ji. Při překryvu/nejistotě zastaví persistence. |
| `continue` | Vyžaduje právě jeden relevantní přerušený task a prokázané původní vlastnictví/recovery. Po jeho dokončení další tasky opět očekávají clean tree. |

`continue` není „považuj vše špinavé za práci agenta“. Nejde kombinovat s čerstvou izolací a `fix` jej odmítá, protože nemá obnovovat libovolný backlog. Nulový nebo vícečetný kandidát musí dát jasnou chybu. Změna harnessu při obnově je možná; historie autorů/runnerů zůstává chronologická.

Statická analýza odhalila potenciální napětí mezi současným resume a novými ownership guardy. Nový engine jej řeší explicitním persisted run scope, nikoli pouhým hledáním `[^]`. Nejde o tvrzení, že byl současný runtime bug reprodukován.

### 10.4 Lease a journal

Jeden zapisující vlastník koordinuje agentní změny, checks, status writers, migraci zdrojů, index, integraci a Git operace v dotčeném checkoutu. Live worker blokuje druhou invokaci. Stale zámek se nesmí automaticky ukrást jen podle věku.

**Nové rozhodnutí:** uložit identitu workspace/run/worktree, náhodný ownership token, PID/host a heartbeat do `.promptbook/ptbk-coder`; kritická rozhodnutí nespoléhají jen na PID. Související worktrees/nested projekty musí sdílet koordinaci operací, které zasahují tentýž Git index nebo integrační větev. Umístění společné koordinace vyřešit explicitním workspace contextem, nikoli zápisem do `.git`.

Journal uchovává hranici fáze, source hash, baseline a výsledné content/index snapshots, očekávaný HEAD, task/occurrence identity, intent vytvořit commit a již nalezený commit. Zápisy jsou atomické a verzované; porušený stav se diagnostikuje, ne resetuje na prázdno. Při restartu nejprve reconcile s historií, potom nabídnout přesný bezpečný krok pokračování.

**Nové rozhodnutí - ovladatelná recovery:** doplnit `ptbk coder recover <task-id>` jako read-only přehled zvoleného přerušeného/blocked výskytu. Mutující akce se zadá explicitně přes `--action resume`, `retry` nebo `acknowledge` a podle potřeby `--occurrence <id>`. `resume` pokračuje jen v prokázané nedokončené fázi, `retry` vědomě opakuje neúspěšný výskyt se stejnou identitou a novým attempt záznamem, `acknowledge` uzavře blokující výskyt jako přijaté selhání, nikoli úspěch. U recurrence pak smí pokračovat až novější due slot. Nejasné vnější účinky vyžadují konkrétní potvrzení obsažené v recovery plánu; příkaz nikdy nevytváří ownership nad neprokázanými bytes. `--dry-run` vypíše plán bez zápisu a všechny akce podléhají lease/revizím. Jde o nový explicitní UX kontrakt, ne existující příkaz analyzovaného coderu.

### 10.5 Izolace

`--isolate` vyžaduje pojmenovanou zdrojovou větev, zapnuté commity a ignored isolation directory. Založí worktree a větev `ptbk-coder-isolation/<task-name>` s kolizně bezpečnou identitou. Mapuje task source, Books, kontext i nested projekt do worktree. Agent, checks a lokální commity běží tam; původní zdroj tasku se během práce nesmí neřízeně přepisovat. Původní větev dostane `done` až ověřenou integrací, nikoli časnou kopií statusu.

Zachovat přípravu závislostí a kopii projektového `.env` podle izolované politiky. Neprohlašovat samotný Git worktree za bezpečnostní sandbox ani za izolaci sítě/credentials. Durable výsledky/logy a potřebné ignored výstupy se před cleanup uchovají s ochranou před přepsáním originálních dat.

Úspěšná integrace musí použít `git merge --ff-only` a zachovat fázovou historii i ověřený strom; automatický squash nebo obecný merge bez nových checks není součástí kontraktu. Refusal/conflict nebo neočekávaná změna originálu zachová oba checkouty a přesný návod. Současná politika označuje merge failure jako failed a pokračuje dalším taskem jen tehdy, je-li další mutace bezpečná. Takový task se nezapočítá do limitu úspěchů. Neodstraňovat neintegrovaný worktree/branch automaticky ani při opakovaném spuštění; existující recoverable cíl odmítnout.

### 10.6 Identita a synchronizace

Respektovat `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY` a legacy `CODING_AGENT_GPG_KEY_ID`; podpisový program se řídí Git konfigurací. Úplná agentní konfigurace se použije per command. Při neúplné konfiguraci zachovat fallback na Git konfiguraci uživatele a jednoznačně oznámit skutečnou identitu/podpisovou politiku. Neslibovat, že každý commit má dedikovaný agentní podpis.

Pull/push jsou samostatné outcomes. Chybějící remote, divergence, conflict, authentication a network failure se nepletou s výsledkem implementace. Lokální dokončení s odmítnutým push zůstává lokálně dokončené a synchronizace pending; nevolat kvůli němu znovu model.

Zapnutý auto-pull provádí standardní `git pull --rebase` před obnovením fronty mezi koly, při zachování vlastnických guardů a bez autostashe. V izolaci se nikdy nepushuje dočasná větev; push směřuje pouze z původní větve po úspěšné integraci. Pull konflikt zastaví další nebezpečné mutace a zachová stav k ručnímu rozřešení.

## 11. Migrace Markdown tasků na Books

```bash
ptbk coder migrate --path ./projekt --tasks ./work-items --dry-run
ptbk coder migrate --path ./projekt --tasks ./work-items
```

Migrace je explicitní jednosměrná lokální operace. Neprovádí modelové volání, instalaci nástroje, checks, implementaci, server startup ani databázovou migraci. Legacy běh musí fungovat bez migrace; jedna neblokující rada za invokaci může nabídnout správný příkaz.

1. Pod společnými adapters analyzovat skutečné task sekce a sestavit převodní plán. Jedna sekce vytvoří jeden Book, pojmenování a ID jsou deterministické.
2. Zachovat payload, title/emoji identifikaci, stav, prioritu, routing OR alternativy, časový instant, poznámky a dostupnou historii. Relativní reference přepočítat strukturálně, ne globálním nahrazováním v kódu a URL.
3. Opaque legacy tokeny převést na `RUNNER`, časové na `AFTER`; nehádát, který token je model nebo agent.
4. Převést všechny sekce jednoho zdrojového souboru, znovu přečíst nové Books a ověřit ekvivalenci normalizovaného významu.
5. Teprve poté vyřadit originál z aktivní fronty do neexekutivního archivu při zachování původních bytes a dostupnosti assets. Nelze archivovat originál, když část jeho sekcí selhala.
6. Úspěšnou migraci uložit jedním scoped lokálním commitem, pokud není `--no-commit`; push není implicitní.

Dry-run nesmí vytvořit adresář, lock/journal, source ID, soubor ani commit; návrhy drží v paměti. Reálná migrace musí používat mutační lease a recovery transaction s origin metadata/checksumy. Task s live claimem odmítne.

Při přerušení nesmějí být obě reprezentace nezávisle spustitelné. Runtime musí znát autoritativní reprezentaci podle migration provenance/journalu; nejednoznačné kopie blokuje. Opakovaná dokončená migrace nic neduplikuje ani necommituje znovu. Změněný source/destination, kolize ID nebo ztrátový konstrukt vyžaduje explicitní rozřešení, nikoli overwrite.

Neúplné, not-ready, failed a in-progress sekce se nesmějí převodem aktivovat. Starší coder bez Book podpory nové tasky neumí vykonat; kompatibilitu nelze slíbit i pro staré binaries. Nový init/authoring preferuje Books, existující custom šablony a skripty zůstanou zachovány.

## 12. Persistentní režim, UI a dohledatelnost

### 12.1 Coder server

Zachovat lokální přehled fronty, obsahu tasků, běžící práce, stavů a ovládání. Výchozí port současného coder serveru je `4441`. Server smí zůstávat spuštěný po vyčerpání aktuální fronty a reagovat na nové soubory nebo due časy; provádí stejné claim/execution služby jako `run`.

Server nesmí spouštět vnořený CLI proces pro každý task ani mít vlastní kopii parseru nebo Git pravidel. Jeho specifickou odpovědností je supervision, wake-up a přenos událostí do UI. UI, terminál a source snapshots musí vidět stejný stav.

**Nové rozhodnutí:** základní web server binduje pouze loopback. Mutující lokální API chrání session tokenem/origin kontrolou, limity payloadu a realpath confinement včetně symlinků. Úpravy tasků používají optimistic version check a stejnou mutační politiku jako soubory. Současná implementace nemá dostatečně explicitní host/auth/path guardy; tuto vlastnost se nepřebírá jako kompatibilitní požadavek.

Volby, které současný server nevystavuje stejně jako `run` (např. `--isolate`, `--limit`, `--check-before`), neprezentovat jako již existující paritu. **Nové rozhodnutí:** sdílené volby v cílovém CLI sjednotit jen tam, kde mají stejný význam; limit persistentního supervisoru případně explicitně odmítnout s návodem na finite run. Help a tests toto rozlišení ověří.

### 12.2 Terminál a řízení

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

### 12.3 Traces a výsledky

Každý výskyt má dohledatelný run/attempt/phase záznam: task a source snapshot, agent/harness/model/thinking, start/end, skutečný outcome, check command a výsledek, usage/cost s označením odhadu, commit IDs, retry důvody, případnou integration/sync chybu a odkazy na diagnostiku.

Legacy trace cesty a suffixy sekcí zachovat; nová recurrence historie nesmí přepisem posledního logu ztratit identitu starších výskytů. Runtime log může zůstat dočasný, ale úspěšná finalizace před cleanup uchová potřebný durable trace. Nehlásit zapushování jen z existence lokálního commitu.

**Nové rozhodnutí:** před persistencí i zobrazením redigovat známé credentials/secret env hodnoty. Raw znamená nestrukturovaný providerový výstup, nikoli oprávnění publikovat secrets. Auditní stopa uchová informaci, že proběhla redakce; logování nesmí kopírovat `.env` do Git historie. Limity a retence musí být dokumentované.

Při kritickém nedostatku místa dát konkrétní diagnostiku. Nová implementace nesmí zaměnit `--no-questions` za povinnost pokračovat v nebezpečných zápisech: **nové rozhodnutí** je bezpečné neinteraktivní ukončení/recovery místo nekonečného čekání či předstíraného úspěchu.

## 13. Architektura přepisu

Použít TypeScript a explicitní závislosti. **Nové rozhodnutí:** runtime cílit na Node 22+; současné repo uvádí Node >=18.18 a npm >=8, takže zvýšení minima je vědomá změna. Produkční npm balíček musí fungovat v cizím fixture projektu bez source checkoutu Promptbooku a bez `ts-node` v uživatelském workflow. Současné process adaptéry vyžadují Bash; nová verze jej buď výslovně ověří jako prerequisite, nebo jej nahradí ekvivalentním argv/process adaptérem. macOS/Linux musí být ověřeny; Windows podporu opřít o konkrétní procesní/Git adaptér nebo výslovně dokumentované WSL, nikoli neurčitý cross-platform slib.

### 13.1 Moduly a jejich odpovědnost

| Modul | Vlastní | Nesmí vlastnit |
| --- | --- | --- |
| Domain | TaskDefinition, Occurrence, Attempt, outcome, diagnostiky | Filesystem, subprocess, UI, Git. |
| Source adapters | Markdown/Book parse, serialize, source revision | Scheduler, harness instalaci. |
| Eligibility & schedule | Typed routing, čas, intervaly, due sloty | Čekání, Git, modelová volání. |
| Workspace & configuration | Cesty, zdroje, Book/context selection, effective options | Globální `process.chdir`, skryté změny env. |
| Claim & state store | Lease, occurrence ledger, atomické transitions, recovery | Modelové rozhodování. |
| Execution service | Lifecycle jednoho tasku, pokusy, cancellation | Čtení dalšího backlogu, kreslení UI. |
| Check service | Command setup, izolovaný snapshot, výsledky, repair feedback | Vlastní task frontu. |
| Git persistence | Ownership, fázové delta, commit/integrace/sync | Interpretaci Book syntaxe. |
| Harness adapters | Providerový proces, stream, auth/quota/capabilities | Přepis task statusu, vlastní Git commit policy. |
| Supervisor | Finite/persistent policy, výběr další práce, wake-ups | Duplikaci execution služby. |
| Presentation | CLI help, terminal/server views, commands nad services | Druhou kanonickou podobu tasků. |

### 13.2 Minimální datové kontrakty

| Entita | Povinné informace |
| --- | --- |
| `TaskDefinition` | ID, title, payload/rules, lifecycle, priority, typed routing, raw+normalized trigger, provenance, source reference/revision. |
| `SourceReference` | Formát, projekt a skutečná cesta, sekce/commitment location, verze, origin migrace. |
| `ExecutionContext` | Projekt/Git/worktree paths, agent snapshot, model/harness policy, checks, authority, cancellation. |
| `Occurrence` | Task ID, schedule revision, due slot, claim, stav, výchozí snapshot, odkazy na pokusy a výsledek. |
| `PhaseRecord` | Fáze, předchozí/výsledný obsah, owned scope, check outcome, commit intent a commit ID. |
| `EligibilityResult` | Ready/waiting/blocked/invalid/unsupported, reason a volitelný next wake-up. |
| `RunResult` | Implementace, validace, local persistence, integration a remote sync jako samostatné outcomes. |

**Nové rozhodnutí:** interní runtime stavy zahrnují `claimed`, `running`, `checking`, `repairing`, `finalizing`, `completed`, `failed`, `interrupted`, `recovery-required`. Nejsou to další povinné hodnoty `STATUS` v task Booku; veřejný lifecycle je jejich zjednodušený pohled. `waiting` je výsledek způsobilosti, nikoli přepsání `todo`.

Hodiny, timezone resolver, filesystem, Git, subprocess launcher, state store a harness musí jít nahradit deterministickými test doubles. Adaptéry se kompilují do jedné dependency graph; orchestrace nesmí importovat CLI ani React. Žádný mutable globální „aktuální agent“, task, cwd nebo sdílená cache bez klíče workspace/revize.

Nepřidávat obecný plugin framework nebo event bus s desítkami abstrakcí před reálnou potřebou. Důležité jsou úzké rozhraní, jeden vlastník každé odpovědnosti a testovatelné hranice. SQLite může být pozdějším adaptérem state store; základní coder jej nevyžaduje.

## 14. Kompatibilita a vědomé změny

### 14.1 Musí zůstat kompatibilní

Legacy fronta včetně implicitních tasků, priority a OR routing; všechny stavy a ruční verify; oddělení `fix` od queue; vybraný projekt/context; default Developer; explicitní agent Books a TEAM; základní CLI a podporované harnessy; Git scope, fázové commity, no-commit, isolation a synchronizace; ovládání Normal/Raw a plain output; použití z nainstalovaného balíčku.

Init ani migrace nesmějí hromadně přepsat existující backlog Promptbooku jako vedlejší efekt instalace nové verze. Přepis se vyvíjí v samostatném balíčku/modulu s kompatibilitním testovacím corpus a po ověření může nahradit starý vstupní bod.

### 14.2 Záměrné změny pro lepší implementaci

| Změna | Důvod a zachovaná hranice |
| --- | --- |
| Oddělený domain model místo Markdown objektu v celém runtime | Oba formáty a recurrence používají jeden engine. |
| `.promptbook` místo vlastních souborů v `.git` | Požadavek nového PRD 0130; Git samotný dále pracuje standardně. |
| Explicitní source revisions a persisted ownership při resume | Ochrana uživatelských editací a skutečná recovery. |
| Loopback a chráněné lokální mutace serveru | Zachování funkčního UI bez přenosu současných slabých guardů. |
| Redakce secrets a bounded occurrence historie | Durable diagnostika bez neúmyslného verzování credentials. |
| Bezpečný noninteractive disk failure | Zákaz dotazů neznamená automatické ignorování kritické chyby. |
| Přehled odložených/blocked úkolů v list/dry-run | Nové schedule nesmí zmizet z viditelnosti jako prázdná fronta. |

Každou změnu příkazového defaultu, exit code nebo výstupního formátu uvést v release notes. **Nové rozhodnutí:** základní exit kontrakt `0` = úspěšné ukončení podle režimu, `1` = execution/check/persistence/sync failure, `2` = neplatná konfigurace/vstup; cancellation `130` pro SIGINT. Prázdná nebo pouze budoucí fronta není chyba, ale musí být poctivě popsána.

## 15. Akceptační scénáře

Implementace je přijatelná až po ověření následujících scénářů nad dočasnými projekty, lokálními Git repozitáři a deterministickými harness/check doubles. Placené modely nejsou podmínkou regresního suite. Real-provider smoke testy jsou oddělené a explicitní.

### 15.1 Tasks a čas

| ID | Scénář a očekávaný výsledek |
| --- | --- |
| T01 | Legacy `.md`, task `.book` a mixed queue vykonají ekvivalentní úkol přes stejnou execution službu, každou identitu nejvýše jednou. |
| T02 | README, ignore marker, nested archiv/trace, `@@@`, `[-]`, `[.]`, `[x]`, `[!]`, `[^]` se nespustí jako nový task. |
| T03 | Markerless task je ready s prioritou 0; stav se doplní bez ztráty prvního obsahu. Více sekcí mění pouze správnou sekci. |
| T04 | Priority seřadí nejvyšší první, meze jsou inkluzivní, shody stabilní. Neplatné meze dávají chybu. |
| T05 | Legacy `gpt`/`opus` zůstává OR substring. Book AGENT/HARNESS/MODEL tvoří AND a RUNNER další OR skupinu. |
| T06 | Date-only token se neplete s routingem; model s datem zůstane modelem. Datum v těle/URL/reportu nescheduluje. |
| T07 | Task se nespustí 1 ms před hranicí a smí přesně na ní; timezone, leap day, offset a DST ambiguity jsou ověřeny fake clockem. |
| T08 | Neplatné/conflicting datum nebo interval je visible blocked; nepromění se na unrestricted ready. |
| T09 | Future high-priority task neblokuje ready task. `S` jej neuvolní. Finite run skončí s informací o budoucí práci. |
| T10 | Book round-trip zachová literal uppercase commitments, fences, Unicode, assets i history. Agent Book se nestane taskem. |
| T11 | Duplicitní ID/missing control metadata a concurrent source edit zabrání mylnému spuštění/finalizaci. |
| T12 | Weekly recurrence zachová definici `todo`, kotvu, due slot a historii po restartu i rename. Slow run neposouvá kotvu. |
| T13 | Několik týdnů downtime znamená jeden coalesced výskyt. Žádné překrytí stejného tasku ani catch-up storm. |
| T14 | Finite run vykoná recurring definici nejvýše jednou; persistentní režim později další slot, bez placeného idle volání. |
| T15 | Pause/retirement, schedule edit, vyčerpané retry a nejasné přerušení mají správný blocked/next due stav. |

### 15.2 Execution, checks a Git

| ID | Scénář a očekávaný výsledek |
| --- | --- |
| E01 | Run bez checks hlásí checks skipped; s `--check` kontroluje skutečné změny. Missing check není úspěch. |
| E02 | `yes-and-fail` uloží eligible check delta a skončí; `yes-and-fix` opraví a teprve pak smí do fronty. |
| E03 | `fix` na zdravém projektu nevyžaduje nainstalovaný harness ani výchozí Book, nevytvoří PRD ani empty commit. Výběr harnessu zůstává CLI konfigurací. Formatter-only delta se uloží. |
| E04 | `fix` při selhání opravuje stejný task maximálně povoleným počtem pokusů; žádný jiný backlog task se nevybere. |
| E05 | Agent a check změní stejnou řádku: první commit obsahuje agentní obsah, druhý check transformaci. |
| E06 | Failed check vytvoří vlastní delta commit se skutečným outcome; stále jde o failed validaci. |
| E07 | Add/delete/rename/mode/symlink/binary a ignored generovaný obsah přežijí správné fáze, repair a recheck. |
| E08 | Pre-existing staged+unstaged změny zůstanou v původní podobě i staging stavu. Empty owned delta nevytvoří commit z cizího indexu. |
| E09 | Konkurenční editor, changed HEAD/index a hook měnící obsah zastaví nejednoznačnou persistence, zachovají obě práce. |
| E10 | Commit/signing failure nevolá znovu model; completion zůstane pending. Rejected push zachová lokální commit bez duplikace. |
| E11 | Automatický `--no-commit` vyžaduje ignore; supervised výjimka funguje. Nevznikne automatický commit a přes více tasků se udrží vlastní scope odděleně. |
| E12 | `continue` obnoví jednu prokázanou přerušenou práci, nikoli cizí dirty bytes; 0/2 kandidáti selžou. |
| E13 | Kill mezi claim, změnou zdroje, checkem, commit intent, skutečným commitem a zápisem výsledku se bezpečně reconciliuje. |
| E14 | Dva procesy, server + run nebo migration + run nezískají současně týž claim/mutační ownership. Stale lease se neukradne. |
| E15 | Vlastní state/locks/check views vznikají pod `.promptbook`; v `.git` nejsou vlastní přímo zapisované runtime soubory. |
| E16 | Isolation mapuje nested projekt i custom tasks; úspěch zachová commity, konflikt zachová worktree a originální práci. |
| E17 | Přerušení ukončí pouze vlastní process tree a čekání, zachová diagnostiku; neukončí cizí Node procesy. |
| E18 | Quota/auth/credits a retry budget jsou rozlišeny; zakázané credits se nepoužijí. |
| E19 | Usage-limit chyba + `tokens used` + exit 1, případně JSON `turn.failed`, nikdy nepublikuje completion ani falešný úspěch. |

### 15.3 Migrace, CLI a rozhraní

| ID | Scénář a očekávaný výsledek |
| --- | --- |
| U01 | Init dvakrát zachová custom Books/scripts/AGENTS/env, dokumentaci neoznačí jako task a check nefalšuje. |
| U02 | `--path`, relativní/absolutní `--tasks`, mezery, nested project a symlink escape mají shodné chování ve všech relevantních příkazech. |
| U03 | List/help/dry-run nezapisují, nevytvářejí adresáře, neinstalují a nevolají model. Missing explicit input je chyba. |
| U04 | Migration dry-run je bez side effects; skutečný převod více sekcí zachová význam, odkazy, historii a původní bytes. |
| U05 | Migration restart v každé hranici transakce nikdy nezpůsobí dva runnable exempláře. Rerun neduplikuje soubory/commity. |
| U06 | Changed destination/source, ID collision a část nepřevoditelných sekcí se nepřepíše ani předčasně nearchivuje. |
| U07 | Developer je default i pro plan; explicitní Planner funguje. Invalid Book nevede k tichému fallbacku. |
| U08 | TEAM poradce je volán jen na žádost, se svou rolí; resolver dědičnosti a hranice remote/local neuniknou workspace policy. |
| U09 | Plan i jeho poradci nemohou měnit application code ani spouštět shell; schválený PRD save se omezí na správné soubory. |
| U10 | Normal/raw toggle zachová jeden běh a jeden stream; scroll/resize/bounded buffer a non-TTY jsou čitelné. |
| U11 | Server claimuje přes stejný engine, vidí source edits a due time; mutující API vyžaduje platný lokální kontext a správnou source revision. |
| U12 | `verify` provádí lidské review/archive a follow-up; nespustí checks a v no-questions režimu nedělá neodsouhlasené review změny. |
| U13 | Zabalené CLI funguje v externím fixture projektu, včetně Books, šablon, planning bridge a harness adapterů bez monorepo cest. |
| U14 | Trace ukazuje reálné outcomes/commit IDs; známý fixture secret se neobjeví ve výstupu ani verzovaných artefaktech. |

## 16. Provozní kvalita a dokumentace

Práce bez sítě musí být možná pro parsování, list, dry-run a migraci. Běh modelu může vyžadovat síť podle harnessu, nikoli podle task formátu. Prázdná fronta ani čekání na budoucí čas nesmějí volat model. Persistentní režim musí mít bounded čekání odolné vůči timer limitům, skokům hodin a source změnám.

Zachovat transparentní shell command semantics pro uživatelem zvolený check. Ostatní subprocess argumenty předávat jako argv nebo bezpečně escapovat pro konkrétní shell; cesty, modelové odpovědi a task text nikdy neinterpolovat jako neřízený shell kód. Ukončení procesního stromu musí mít platformní adaptér.

Každá chyba musí obsahovat fázi, task/project identitu, co zůstalo zachováno a doporučený další krok. Odlišit invalid input, missing capability, auth, check failure, timeout, canceled, persistence a remote sync. `--no-questions` nesmí viset na skrytém promptu; akce vyžadující skutečné rozhodnutí skončí s konkrétním návodem.

Historické nedokončené PRD pro `--min-remaining-limit` a jeho časová okna není hotová funkce. Základní verze zachová zobrazení známé kvóty a správné chování při vyčerpání, ale nové automatické threshold přepínání modelů/providerů je odloženo. Quota „unknown“ nesmí být přeložena jako nula ani jako neomezený účet.

Dodaná dokumentace obsahuje quick start, úplný CLI help, task/agent rozlišení, gramatiku času/intervalů, tabulku priorit/routingu, příklady legacy/mixed/Book projektu, bezpečnou migraci a downgrade omezení, checks vs verify, postup recovery a politiky commitů/synchronizace. Ukázky se validují stejným parserem jako runtime. Marketingové sliby nejsou důkaz funkce.

## 17. Doporučené implementační etapy a hotovo

| Etapa | Dodávka | Gate |
| --- | --- | --- |
| 1. Kontrakty a kostra | Domain typy, fixture corpus ze stávajícího chování, workspace/config, CLI shell | Read-only a path/Book precedence scénáře. |
| 2. Funkční legacy coder | Jeden task engine, Markdown adapter, harness boundary, Git scope, checks/fix, recovery, traces | E01-E18 a legacy T/U scénáře. |
| 3. Produktová parita | Init/add/plan/verify, sedm harnessů, TEAM, terminal a základní server, isolation | Packaged CLI a UI/capability scénáře. |
| 4. Not-before a task Books | Typed annotations, čas, Book adapter, `--tasks`, mixed queue, migrace | T01-T11 a migration crash/idempotence testy. |
| 5. Recurrence | Trigger/occurrence store, claims, coalescing, persistent wake-ups | T12-T15, restart/concurrency scénáře. |
| 6. Náhrada starého coderu | Compatibility report, release notes, odstranění superseded runner cest | Všechny povinné scénáře, bez tiché ztráty příkazů. |

Etapy určují pořadí práce, ne oprávnění vypustit některou závaznou funkci z finální dodávky. Check/Git kontrakt a ownership musí být hotové před přidáním dlouhodobých schedule. Odložené směry z kapitoly 2 mají vlastní budoucí zadání.

**Definition of Done:** coder lze nainstalovat a používat mimo Promptbook monorepo; legacy uživatel může pokračovat beze změny backlogu; nové task Books, časování a recurrence splní zde popsané chování; žádný formát neobchází společné checks/Git/recovery; CLI a server sdílejí engine; ztráta nebo přepsání cizí práce je regresní blocker. Dodávka zahrnuje běžící kód, testy, dokumentaci, kompatibilitní tabulku a záznam ověření, s jasným seznamem skutečně nepodporovaných odložených funkcí.

## 18. Zdrojová mapa a rozhodnutí z auditu

Odkazy umožňují dohledat původ kontraktů, zadání je však napsáno tak, aby nevyžadovalo převzít historické soubory jako architekturu. Zkoumány byly také navazující testy a helpery v uvedených adresářích. Aktuální zdrojový kód má při popisu existujícího chování přednost před neaktuální větou README.

- **[S01] CLI a projektový kontext:** [coder registry](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/src/cli/cli-commands/coder.ts), [run](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/src/cli/cli-commands/coder/run.ts), [default role](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/src/cli/cli-commands/coder/coderAgentRole.ts), [default agent/path/context PRD](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-09-0500-ptbk-cli-default-agent-path-and-context.md).
- **[S02] Fronta a Markdown:** [loader](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/prompts/loadPromptFiles.ts), [parser](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/prompts/parsePromptFile.ts), [routing](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/prompts/isPromptCompatibleWithRunner.ts), [výběr tasku](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/prompts/findNextTodoPrompt.ts).
- **[S03] Orchestrace a běh:** [runCodexPrompts](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/main/runCodexPrompts.ts), [runPromptRound](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/main/runPromptRound.ts), [README workflow](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/README.md).
- **[S04] Checks, repair a fix:** [check feedback](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/checks/runPromptWithCheckFeedback.ts), [runCoderFix](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/main/runCoderFix.ts), [check terminology PRD](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-09-0510-ptbk-coder-check-terminology.md), [fix-only PRD](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-09-0520-ptbk-coder-fix-checks-only.md).
- **[S05] Fázová persistence:** [separate check commits PRD](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-10-0040-ptbk-coder-separate-check-commits.md), [CoderPhasePersistence](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/git/CoderPhasePersistence.ts), [check changes workflow tests](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/checks/checkChangesWorkflow.test.ts).
- **[S06] Vlastnictví a identita:** [commit scope](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/git/coderCommitScope.ts), [workspace lock](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/common/withCoderWorkspaceLock.ts), [agentGitIdentity](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/git/agentGitIdentity.ts), [lock-file PRD 0130](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-10-0130-ptbk-coder-lock-file.md).
- **[S07] Harnessy a TEAM:** [runner resolution](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/main/resolvePromptRunner.ts), [runner adapters](https://github.com/webgptorg/promptbook/tree/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/runners), [TEAM PRD](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-09-0440-ptbk-coder-team-runtime.md), [TEAM implementation](https://github.com/webgptorg/promptbook/tree/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/team).
- **[S08] Plánování a inicializace:** [planning runtime](https://github.com/webgptorg/promptbook/tree/12010a9a1f2df8b23c9c3934f0570caa6daa19da/src/cli/cli-commands/coder/planning), [initializeCoderProjectConfiguration](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts), [generated README template](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/src/cli/cli-commands/coder/promptsReadmeTemplate.ts).
- **[S09] Not-before:** [PRD 2026-10-0050](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-10-0050-ptbk-coder-prompt-not-before.md).
- **[S10] Task Books a migrace:** [PRD 2026-10-0060](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-10-0060-ptbk-coder-task-books-and-migration.md).
- **[S11] Recurrence:** [PRD 2026-10-0070](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-10-0070-ptbk-coder-recurring-task-books.md), které nahrazuje [starší recurring-prompts návrh](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-09-0300-ptbk-coder-recurring-prompts.md).
- **[S12] Server a odložené rozšíření:** [současný server wrapper](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/main/runCodexPromptsServer.ts), [HTTP implementace](https://github.com/webgptorg/promptbook/tree/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/server), [unified server PRD](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-09-0490-ptbk-server-unified-workspace-agent-server.md), [parallel PRD](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-07-0730-ptbk-coder-parallel.md).
- **[S13] UI a širší produktový kontext:** [normal/raw PRD](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-09-0450-ptbk-coder-normal-and-raw-output.md), [origami PRD](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-10-0030-replace-agent-avatars-with-origami.md), [APT a poctivé availability claims](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/prompts/2026-10-0080-readme-autonomous-agendas-apt-framework.md).
- **[S14] Výstupní marker a procesní outcome:** [runScriptUntilMarkerIdle](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/common/runGoScript/runScriptUntilMarkerIdle.ts), [OpenAiCodexRunner](https://github.com/webgptorg/promptbook/blob/12010a9a1f2df8b23c9c3934f0570caa6daa19da/scripts/run-codex-prompts/runners/openai-codex/OpenAiCodexRunner.ts).

Pozdější číslované placeholdery typu `bar/baz/qux/brr` s `[-]` a `@@@` nejsou funkční požadavky. Obecné opravné tasky pro aktuální check failures jsou vstup do dnešního backlogu, nikoli specifikace dalších schopností nového coderu. Zadání pro manGo, Agent Server či ChatGPT plugin se do coderu nepřelévají bez skutečné runtime vazby.
