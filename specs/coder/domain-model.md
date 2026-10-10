# Základní pojmy a datové kontrakty

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

**Agent** je přenositelná role definovaná agent Bookem: persona, pravidla, znalosti, dědičnost a dostupní poradci. **Projekt** je zvolený adresář s materiály a konfigurací; může být podadresářem většího Git repozitáře. **Task** je konkrétní zadání s vlastním stavem a podmínkami spuštění. **Harness** je nástroj, který agentovi poskytuje přístup ke kódu a modelu, například OpenAI Codex nebo Claude Code.

**Run** je jedno spuštění coderu. **Occurrence** je jednotlivý výskyt úkolu; jednorázový task má jeden logický výskyt, opakovaný task více. **Attempt** je pokus v rámci téhož výskytu. **Check** je projektový validační příkaz. **Trace** je dohledatelný záznam průběhu. **TEAM consultation** je dotaz poradnímu agentovi uvnitř úkolu, nikoli další souběžný task.

Agent Book a task Book sdílejí čitelný jazyk a lexikální infrastrukturu. Mají však odlišný dokumentový typ, význam a runtime. Task Book se nesmí kompilovat jako agent, automaticky dědit Adama ani vytvářet chatový profil.

## Minimální datové kontrakty

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

## Související specifikace

- [Architektura coderu](architecture.md)
- [Task Books](task-books.md)
- [Execution lifecycle](execution.md)
- [Způsobilost tasku](eligibility.md)
- [Mutační lease, journal a recovery](recovery.md)
- [Traces a výsledky](traces.md)
