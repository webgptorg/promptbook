# Coding harnessy

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

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

## Související specifikace

- [Agent Books a kontext](agent-context.md)
- [TEAM konzultace](team.md)
- [Read-only plánování](planning.md)
- [Pokusy, retry a providerová omezení](retries.md)
- [Traces a výsledky](traces.md)
