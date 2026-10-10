# Historical specifications

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

## Authority and retention

The older agent/server specifications already carried a lower-authority warning, especially for concrete implementation details. They are retained for language principles and historical context, alongside the APT whitepaper. Their normative wording and broader product descriptions refer to earlier designs; they do not add requirements to the current CLI or certify present support. Promptbook's product scope is the single `ptbk` utility, defined by the contracts linked from the [main specification](../_main.md).

The folder name marks the specification's status, not the deprecation of Book language or every capability mentioned here. No new deprecation of an implemented feature is declared by this reorganization.

Links to historical pages that were absent from specs are rendered as plain text with their original target in a “historical page” annotation. This preserves provenance without inventing a replacement specification or leaving broken navigation. Existing links between retained pages are redirected to their focused files.

The old-prompts archive remains untouched and is not part of this reorganization.

## Retained responsibilities

- [APT whitepaper](whitepaper.md): Historical conceptual model and broader framework/server vision; not the current product contract.
- [Agent Book syntax](book-language.md): Source structure, parameters and composition rules.
- [Commitment registry](commitment-registry.md): Older agent commitment keywords, aliases and effects.
- [Agent compilation](agent-compilation.md): Profile parsing and model-requirements compilation.
- [Generated Book documentation](book-documentation.md): Documentation endpoints and registry-derived output.
- [Source resolution](agents/source-resolution.md): Unresolved/resolved sources and resolution consumers.
- [Agent references](agents/references.md): Compact references, pseudo-agents and book-scoped agents.
- [Inheritance](agents/inheritance.md): FROM and the Adam ancestor.
- [Imports](agents/imports.md): IMPORT expansion, import retries, fallback and cycles.
- [Federation](agents/federation.md): Read-only discovery and reuse across Agents Servers.
- [Self-learning](agents/self-learning.md): OPEN/CLOSED, append-only learning and the Teacher.
- [Avatars and visuals](agents/avatars-and-visuals.md): Historical visual identity and generated image assets.
