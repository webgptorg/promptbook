# Naming and canonicalization

[Architecture and coding standards](_index.md) · [Configuration](../cli/configuration.md) · [Automatic repair](../concepts/automatic-repair.md)

## Three distinct naming categories

| Meaning | Canonical notation | Examples |
| --- | --- | --- |
| Promptbook-owned JSON property or ordinary variable name | lower camelCase, starting with a lowercase letter and usable as a JavaScript identifier; no spaces or hyphens | `promptbookVersion`, `tools`, `apiKey`, `profilePath` |
| Boolean property | lower camelCase with the `is` prefix | `isEnabled`, `isHeadless`, `isAutoSync` |
| User-defined configuration identifier | lowercase kebab-case | `work-browser`, `codex-company`, `personal-fallback` |
| Fixed system-defined enum value | SCREAMING_SNAKE_CASE | `BROWSER`, `HARNESS`, `OPENAI_CODEX`, `CLAUDE_CODE`, `API_KEY` |

The last two rows describe values, not JSON property spellings. A tool is therefore `{ "type": "HARNESS", "variant": "OPENAI_CODEX", "name": "codex-company", "isEnabled": true }`, never an object with `is-enabled` or a fixed variant stored as a user-defined name. `name` identifies an instance; `variant` identifies its implementation. `description` is optional free text and is not normalized as an identifier.

Apply these rules to Promptbook-owned configuration, including existing boolean fields when migrated. Do not rewrite arbitrary user prose, filesystem paths, URLs, provider model IDs, environment-variable names, externally specified protocol fields or Book name content to fit a configuration identifier convention. Agent/task/chat identity and reference normalization remain defined by the [Book language](../book-language/references.md); this change does not rename existing Books. CLI flags retain conventional dashed spelling and are not JSON keys. Provider adapters translate canonical configuration enums to a provider's required spelling at the boundary.

## Tolerant input, canonical saved output

Accept unambiguous spelling differences in known fields and enum values, including case and separator differences. For example, a known `type` value `browser` becomes `BROWSER`, `variant: "openai-codex"` becomes `OPENAI_CODEX`, and an unambiguous tool name `Work Browser` becomes `work-browser`. Use one shared normalizer across file loading, initialization, CLI and dashboard, not different guesses in each frontend.

On a mutating/runtime configuration load, save deterministic corrections in a scoped automatic commit with an understandable reason. A repeated load of canonical input is a no-op. Read-only inspection may report proposed corrections but must not modify files or Git. When an owned operation already creates the affected configuration, canonicalize inside that operation rather than generating a redundant second commit. Preserve explicit false values, unrelated fields and user edits.

Normalization is not permission to guess a different implementation, rename two colliding tools arbitrarily, merge conflicting values or redirect credentials. Detect duplicate keys/identifiers and reference collisions before accepting the corrected configuration. Hand unresolved or judgment-dependent problems to the ordinary Fixer under [automatic repair](../concepts/automatic-repair.md). Fixer uses available evidence to resolve what it can and asks its team only when needed; users are not automatically asked about every imperfect spelling.

The same canonicalization used for comparisons must be used for uniqueness and references. A deterministic identifier correction updates its known references as one operation. Unknown values remain diagnosed, never silently replaced with a convenient default or discarded. Secret values are never included in correction reports or commits.

## Acceptance outcomes

Round-trip canonical keys, booleans, tool names and enums without changes. Correct a uniquely recognizable noncanonical enum/name once, commit only that correction and preserve its references. Two names that normalize to the same identifier, conflicting alias keys and an unknown variant produce a repair problem rather than silent replacement. Read-only inspection creates no correction commit. Provider IDs, environment names, descriptions and free-form Book names retain their meaning.
