# Referencing agents and tasks

[Book language](_index.md)

## Agent syntax and normalization

An agent's identity comes from its first nonempty source line, not its filename or folder. A single token without whitespace can use `@Adam`, `@Paul` or `@Developer`. Braces enclose a complete name, including spaces: `{Adam}`, `{Paul Smith}`, `{Frontend Developer}`. `@Adam` and `{Adam}` are equivalent syntax for exactly the same reference, not different kinds of agent. An unbraced `@` reference stops at its token boundary; it must not consume following prose to guess a multiword name.

Normalize both the reference and declared name identically: ignore case, diacritics and word separators, including whitespace, underscores and hyphens. Word boundaries and camel case do not distinguish identity. All of `{Frontend Developer}`, `{FrontendDeveloper}`, `{frontend     Developer}`, `{Frontend_Developer}`, `{-Fronténd Developer}` and `@FrontendDeveloper` resolve to the same canonical name. Keep the original display name and source spelling; normalization is comparison, not a source rewrite or fuzzy semantic matching.

A dedicated reference field such as FROM also accepts the bare name. FROM, IMPORT, TEAM, TASK AGENT, CLI agent selection and Manager use this same resolution contract. Preserve literal/code examples as text; ordinary email addresses or unrelated syntax must not accidentally become dispatch instructions. Empty or malformed explicit references receive a diagnostic, not an arbitrary fallback.

## Ordered resolution

For each normalized name, consult these tiers in order, stopping at the first tier containing a match:

1. **Engine-supplied non-agents:** Void/Null (including the existing `0` alias), Expert and User. Brace and `@` forms are equivalent. Adam, Manager and Teacher are editable core Books, not non-agents in this tier.
2. **The project's agents directory:** Agent definitions in `.book` files recursively under `agents/`, including hidden subdirectories and definitions there excluded by Git. Use the configured directory where supported; the conventional directory name is not an agent identity.
3. **The rest of the project:** Agent definitions in non-Git-ignored `.book` files outside that directory, including tracked and untracked sources.
4. **The ignored remainder:** Agent definitions in Git-ignored project content outside the agents directory, including `node_modules`. Git ignore is a lower discovery priority, not a prohibition on resolving an explicitly referenced agent.

A Book must actually declare an agent under [source syntax](syntax.md); task Books, documentation snippets and filenames are not agent definitions. Report the selected source and tier on inspection. Reevaluate on relevant changes; a cached miss or lower-tier hit must not hide a newly added higher-priority definition. Discovery is read-only and must not install packages, execute package code, call models or create core files just to answer a lookup.

One matching definition at the winning tier resolves the name. Multiple distinct definitions with that normalized name in that tier are an ambiguity: report their paths and do not select by filesystem order or continue into lower tiers. A higher-tier definition intentionally shadows lower-tier copies; their mere presence is not a global duplicate-name error. Deduplicate multiple paths to the same file. A malformed higher-tier definition must not silently select a different lower-tier agent.

Reserved non-agents cannot be replaced by files. Explicitly declared project agents using reserved names are diagnosed; neither those files nor packaged copies override the engine identities. Missing required core Books follow initialization; an unresolved ordinary reference is not permission to invent an agent or silently change inheritance.

Supported explicit local Book paths resolve from the declaring Book, with an unambiguous target and the same reserved-name and workspace protections. Name lookup stays within the selected project, excludes Git metadata, `.ptbk/` runtime/browser data and root-level `traces/` audit evidence, and must not escape through symlinks or inspect another nested project's private runtime. Tracked evidence is still evidence, not a source of active agent definitions. Expensive ignored-content search may be deferred until needed but must not be silently omitted. Report incomplete discovery rather than a definitive missing-agent result.

Moving a definition does not change its normalized identity, although moving between tiers may change precedence. Hidden and dependency-provided definitions can satisfy explicit references without becoming ordinary goal-discovery candidates or authorizing edits to dependencies. Resolution does not grant permission to rewrite a source or execute all discovered agents.

## Tasks

Task titles may repeat and are never required to become unique slugs. Use a stable task reference such as `#<task-id>` from `TASK ID`, or an explicit local task source reference where unambiguous. New authoring assigns persistent [task IDs](../cli/task-identity.md); existing/manual sources lacking one receive it before execution through scoped preparation. List and dry-run never write IDs. The same identity connects source, commits and traces and survives renames, moves and format conversion.

Relationships must resolve to one task, even when two titles and commit messages are identical. Do not silently pick a matching title, change references on rename or reuse another task's identity. Show ambiguous/missing references and block only work that depends on them.

## Acceptance outcomes

Exercise both syntaxes and every Frontend Developer spelling above through FROM, TEAM and TASK AGENT. They select the same agent and visual identity. Place matching Books in agents/, ordinary project content and ignored node_modules: remove each winning definition in turn and verify the documented fallback. Same-tier collisions fail with paths; lower-tier copies do not. Engine non-agents always retain their semantics, including brace forms. A task Book, trace snapshot, filename match, cache, ignored-directory optimization or symlink outside the project cannot produce a false agent match.

See [task relationships](../cli/task-relationships.md), [TASK ID](commitments/task-id.md) and [agent consistency](../agents/consistency.md).
